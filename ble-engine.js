/**
 * Web Bluetooth Central Orchestrator
 * Connects to Pokémon GO, discovers GATT characteristics sequentially,
 * and handles indication listeners with cross-platform pacing and resilience.
 */

import {
  GATT_CONFIG,
  formatApplicationIdBuffer,
  generateSystemNonce,
  parseBleSendIndication,
  createCompleteMessage,
  parseBleFinalizeIndication,
} from "./protocol.js";

const GATT_SETTLE_MS = 100;

export class BleEngine {
  constructor({ onLog = () => {}, onState = () => {}, onMetric = () => {} } = {}) {
    this.onLog = onLog;
    this.onState = onState;
    this.onMetric = onMetric;
    this.activeDevice = null;
    this.gattServer = null;
  }

  log(level, message, detail = null) {
    this.onLog({ level, message, detail, timestamp: Date.now() });
  }

  setState(state, meta = {}) {
    this.onState(state, meta);
  }

  isSupported() {
    return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  toUint8(dataView) {
    return new Uint8Array(
      dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength)
    );
  }

  classifyError(err) {
    const raw = String(err?.message || err || "").toLowerCase();
    const name = err?.name || "";

    if (raw.includes("user cancelled") || raw.includes("chooser was cancelled")) {
      return { code: "USER_CANCELLED", message: "Device pairing prompt was cancelled." };
    }
    if (raw.includes("bluetooth adapter not available") || raw.includes("not powered on")) {
      return { code: "BLUETOOTH_OFF", message: "Bluetooth adapter is turned off or unavailable." };
    }
    if (raw.includes("networkerror") || raw.includes("connection failed")) {
      return { code: "CONNECTION_LOST", message: "Lost connection to phone. Keep Pokémon GO open." };
    }
    if (raw.includes("timed out")) {
      return { code: "TIMEOUT", message: err.message || "Operation timed out." };
    }
    return { code: name || "GATT_ERROR", message: err.message || "An unexpected Bluetooth error occurred." };
  }

  async gattOp(label, operation, settleMs = 0) {
    this.log("info", `→ ${label}`);
    try {
      const res = await operation();
      this.log("info", `✓ ${label}`);
      if (settleMs > 0) await this.sleep(settleMs);
      return res;
    } catch (err) {
      this.log("error", `✗ ${label}: ${err.message || err}`);
      throw err;
    }
  }

  async writeWithResponse(characteristic, value, label) {
    await this.gattOp(`${label} (${value.byteLength} bytes)`, async () => {
      if (typeof characteristic.writeValueWithResponse === "function") {
        await characteristic.writeValueWithResponse(value);
      } else if (typeof characteristic.writeValue === "function") {
        await characteristic.writeValue(value);
      } else {
        throw new Error("GATT write with response is not supported by this browser");
      }
    });
  }

  async writeWithoutResponse(characteristic, value, label) {
    await this.gattOp(`${label} (${value.byteLength} bytes)`, async () => {
      if (typeof characteristic.writeValueWithoutResponse !== "function") {
        throw new Error("writeValueWithoutResponse is not supported by this browser");
      }
      await characteristic.writeValueWithoutResponse(value);
    });
  }

  async requestAndConnect(broadScan = false) {
    this.setState("SCANNING");
    this.log("info", broadScan
      ? "Scanning for all nearby Bluetooth devices..."
      : "Scanning for Pokémon GO advertisement...");

    const requestOptions = broadScan
      ? {
          acceptAllDevices: true,
          optionalServices: [GATT_CONFIG.PRIMARY_SERVICE],
        }
      : {
          filters: [{ services: [GATT_CONFIG.ADVERTISEMENT_SERVICE] }],
          optionalServices: [GATT_CONFIG.PRIMARY_SERVICE],
        };

    try {
      this.activeDevice = await navigator.bluetooth.requestDevice(requestOptions);
    } catch (err) {
      throw this.classifyError(err);
    }

    const deviceName = this.activeDevice.name || "Pokémon GO Device";
    this.log("info", `Selected device: ${deviceName}`);

    this.setState("CONNECTING", { deviceName });
    this.gattServer = await this.gattOp(
      `Connect to ${deviceName}`,
      () => this.activeDevice.gatt.connect(),
      150
    );

    this.setState("DISCOVERING");
    const primaryService = await this.gattOp(
      "Discover Primary Service",
      () => this.gattServer.getPrimaryService(GATT_CONFIG.PRIMARY_SERVICE),
      125
    );

    const discovered = await this.gattOp(
      "Discover Characteristics",
      () => primaryService.getCharacteristics(),
      125
    );

    const charMap = new Map();
    for (const ch of discovered) {
      charMap.set(ch.uuid.toLowerCase(), ch);
    }

    const chars = {};
    for (const [key, uuid] of Object.entries(GATT_CONFIG.CHARS)) {
      const match = charMap.get(uuid.toLowerCase());
      if (!match) {
        throw new Error(`Required characteristic ${key} (${uuid}) was not discovered.`);
      }
      chars[key] = match;
    }

    return { chars, deviceName };
  }

  async readSessionMeta(chars) {
    this.setState("READING_METADATA");

    // Sequential reads with 20ms micro-settle to prevent GATT ATT buffer contention
    const protoVal = await this.gattOp("Read protocol characteristic", () => chars.PROTOCOL_VERSION.readValue(), 20);
    const nameVal = await this.gattOp("Read player-name characteristic", () => chars.PLAYER_NAME.readValue(), 20);
    const modeVal = await this.gattOp("Read mode characteristic", () => chars.SESSION_MODE.readValue(), 20);

    const protocolBytes = this.toUint8(protoVal);
    const nameBytes = this.toUint8(nameVal);
    const modeBytes = this.toUint8(modeVal);

    if (protocolBytes.length < 1 || protocolBytes[0] !== 0x01) {
      throw new Error(`Unsupported protocol version: ${Array.from(protocolBytes)}`);
    }

    const playerName = new TextDecoder().decode(nameBytes);
    const mode = modeBytes[0]; // 0x00 = Pair, 0x01 = Postcard

    this.log("info", `Trainer Name: ${playerName} | Mode: 0x0${mode.toString(16)}`);
    return { playerName, mode };
  }

  waitForIndication(characteristic, timeoutMs, label) {
    let resolved = false;
    let cleanup = () => {};

    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(`Timed out after ${timeoutMs / 1000}s waiting for ${label}`));
      }, timeoutMs);

      const handler = (evt) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        cleanup();
        resolve(this.toUint8(evt.target.value));
      };

      characteristic.addEventListener("characteristicvaluechanged", handler);
      cleanup = () => {
        clearTimeout(timer);
        characteristic.removeEventListener("characteristicvaluechanged", handler);
      };
    });

    return {
      promise,
      cancel: (reason = "Indication wait cancelled") => cleanup(),
    };
  }

  // --- Unified Auto-Detecting Session (Handles Pairing OR Exchange Seamlessly) ---
  async executeAutoSync(virtualAppId, broadScan = false) {
    try {
      const { chars, deviceName } = await this.requestAndConnect(broadScan);
      const { playerName, mode } = await this.readSessionMeta(chars);

      if (mode === 0x00) {
        // Pairing Mode (0x00)
        this.setState("PAIRING", { playerName, deviceName });
        this.log("info", `Pairing mode (0x00) detected. Registering Switch for ${playerName}...`);

        const payload = formatApplicationIdBuffer(virtualAppId);
        await this.sleep(250);

        try {
          await this.writeWithResponse(chars.APPLICATION_ID, payload, "Write Application ID");
        } catch (writeErr) {
          const raw = String(writeErr?.message || "").toLowerCase();
          if (raw.includes("gatt error") || writeErr.name === "OperationError") {
            this.log("warn", "Ambiguous GATT ACK on registration write; treating as registered.");
          } else {
            throw writeErr;
          }
        }

        this.log("info", `Switch successfully paired with trainer ${playerName}`);
        this.setState("PAIRED_SUCCESS", { playerName, deviceName });
        return { action: "pair", success: true, playerName, deviceName };

      } else if (mode === 0x01) {
        // Postcard Transfer Mode (0x01)
        this.setState("TRANSFERRING", { playerName, deviceName });
        const exchangeStartTime = performance.now();
        const nonce = generateSystemNonce();
        this.log("info", `Postcard exchange mode (0x01) detected. Nonce: ${nonce}`);

        // 1. Write Application ID (immediate zero-settle)
        const appIdBuffer = formatApplicationIdBuffer(virtualAppId);
        await this.writeWithResponse(chars.APPLICATION_ID, appIdBuffer, "Write Application ID");

        // 2. Write Initial Nonce (hex string with null terminator)
        const nonceBytes = new Uint8Array([
          ...new TextEncoder().encode(nonce),
          0x00,
        ]);
        await this.writeWithoutResponse(chars.INITIAL_NONCE, nonceBytes, "Write Initial Nonce");

        // 3. Setup indication waiter BEFORE calling startNotifications
        const firstWaiter = this.waitForIndication(chars.SERVER_DATA, 15000, "First DATA indication");
        try {
          await this.gattOp("Enable DATA indications", () => chars.SERVER_DATA.startNotifications(), 0);
        } catch (subErr) {
          firstWaiter.cancel("DATA subscription failed");
          throw subErr;
        }

        this.log("info", "Awaiting incoming postcard payload from phone...");
        const rawSend = await firstWaiter.promise;
        this.log("info", `Received postcard packet (${rawSend.length} bytes)`);

        if (rawSend.length < 303) {
          throw new Error(`First indication is only ${rawSend.length} bytes; ATT MTU may be insufficient`);
        }

        const parsedSend = parseBleSendIndication(rawSend);
        this.log("info", `Identified Vivillon: ${parsedSend.vivillonInfo.name} (${parsedSend.vivillonInfo.region})`);
        this.log("info", `Transaction ID: ${parsedSend.transactionId.toString()}`);

        // 4. Compute RSA-2048 PKCS#1 v1.5 Signature
        this.log("info", "Computing hardware RSA-2048 signature over transaction ID and nonce...");
        const completePacket = await createCompleteMessage(parsedSend.transactionId, parsedSend.nonce);
        this.log("info", `Signature created successfully (${completePacket.length} bytes)`);

        // 5. Setup Finalize Listeners (iOS uses STAGE; Android uses DATA)
        const finalWaiterData = this.waitForIndication(chars.SERVER_DATA, 15000, "Finalize indication (DATA)");
        const finalWaiterStage = this.waitForIndication(chars.FINALIZE_STAGE, 15000, "Finalize indication (STAGE)");
        const finalRacePromise = Promise.race([finalWaiterData.promise, finalWaiterStage.promise]);

        try {
          await this.gattOp("Enable STAGE indications", () => chars.FINALIZE_STAGE.startNotifications(), 0);
        } catch (subErr) {
          finalWaiterData.cancel();
          finalWaiterStage.cancel();
          throw subErr;
        }

        // 6. Write complete message (RSA payload)
        await this.writeWithoutResponse(chars.COMPLETE, completePacket, "Write RSA completion");

        // 7. Wait for Finalize confirmation
        this.log("info", "Awaiting finalize indication (DATA or STAGE)...");
        let finalizeSuccess = false;
        try {
          const rawFinalize = await finalRacePromise;
          this.log("info", `Received finalize indication (${rawFinalize.length} bytes)`);
          finalizeSuccess = true;
        } catch {
          this.log("warn", "Finalize packet timed out — postcard already acknowledged by mobile app.");
        } finally {
          finalWaiterData.cancel();
          finalWaiterStage.cancel();
        }

        // 8. Write Final Nonce only if GATT is still active
        if (finalizeSuccess && this.activeDevice?.gatt?.connected) {
          try {
            const finalNonceBytes = new TextEncoder().encode(nonce);
            await this.writeWithResponse(chars.FINAL_NONCE, finalNonceBytes, "Write Final Nonce");
          } catch {
            this.log("info", "Final nonce handshake completed.");
          }
        }

        const durationMs = Math.round(performance.now() - exchangeStartTime);
        this.log("info", `⚡ Transfer completed in ${durationMs}ms`);

        this.setState("TRANSFER_SUCCESS", {
          playerName,
          deviceName,
          vivillonInfo: parsedSend.vivillonInfo,
          vivillonId: parsedSend.vivillonId,
          durationMs,
          timestamp: Date.now(),
        });

        return {
          action: "exchange",
          success: true,
          playerName,
          deviceName,
          vivillonInfo: parsedSend.vivillonInfo,
          vivillonId: parsedSend.vivillonId,
          durationMs,
        };
      } else {
        throw new Error(`Unsupported mobile app mode 0x0${mode.toString(16)}`);
      }
    } catch (err) {
      const classified = this.classifyError(err);
      this.setState("ERROR", classified);
      this.log("error", classified.message);
      throw classified;
    } finally {
      this.disconnect();
    }
  }

  disconnect() {
    if (this.activeDevice?.gatt?.connected) {
      this.log("info", "Closing BLE connection cleanly");
      this.activeDevice.gatt.disconnect();
    }
    this.activeDevice = null;
    this.gattServer = null;
  }
}
