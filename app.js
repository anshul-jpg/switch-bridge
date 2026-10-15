/**
 * SwitchBridge — Interactive Application Controller
 * Automatically detects whether Pokémon GO is in Pairing (0x00)
 * or Postcard Transfer (0x01) mode and executes the sync.
 * 
 * Includes:
 * - Real-time Nintendo Switch HUD synchronization (OLED screen, step nodes, carrier wave)
 * - Neurological Web Audio synthesizer & haptic tactile triggers
 * - Vivillon Regional Pattern Atlas search & exploration
 * - Persistent Postcard Transfer Ledger with latency benchmarking
 */

import { BleEngine } from "./ble-engine.js";
import { createVirtualSwitchId } from "./protocol.js";

// DOM References — Controls & Action Deck
const btnExecute = document.getElementById("btn-execute");
const btnLabel = document.getElementById("btn-label");
const btnSubLabel = document.getElementById("btn-sub-label");
const statusText = document.getElementById("status-text");
const statusSub = document.getElementById("status-sub");
const machineDot = document.getElementById("machine-dot");
const machineText = document.getElementById("machine-text");
const appIdDisplay = document.getElementById("app-id-display");
const btnCopyId = document.getElementById("btn-copy-id");
const btnRegenId = document.getElementById("btn-regen-id");
const logFeed = document.getElementById("log-feed");
const btnClearLog = document.getElementById("btn-clear-log");
const toggleBroadScan = document.getElementById("toggle-broad-scan");
const timerVal = document.getElementById("timer-val");
const historyContainer = document.getElementById("history-container");
const btnClearHistory = document.getElementById("btn-clear-history");
const checkIconBle = document.getElementById("check-icon-ble");
const checkTitleBle = document.getElementById("check-title-ble");
const checkSubBle = document.getElementById("check-sub-ble");
const btnAudioToggle = document.getElementById("btn-audio-toggle");
const audioLabel = document.getElementById("audio-label");
const scannerLine = document.getElementById("scanner-line");
const statusBox = document.getElementById("status-box");
const consoleLinkCard = document.getElementById("console-link-card");
const consoleLinkTitle = document.getElementById("console-link-title");
const consoleLinkSub = document.getElementById("console-link-sub");
const consoleLinkBadge = document.getElementById("console-link-badge");

// DOM References — Nintendo Switch Console HUD
const screenHeroTitle = document.getElementById("screen-hero-title");
const screenHeroDesc = document.getElementById("screen-hero-desc");
const screenTrainerBadge = document.getElementById("screen-trainer-badge");
const screenTrainerText = document.getElementById("screen-trainer-text");
const carrierWaveBox = document.getElementById("carrier-wave-box");
const bleSignalBars = document.getElementById("ble-signal-bars");
const screenConsoleClock = document.getElementById("screen-console-clock");
const stepNode1 = document.getElementById("step-node-1");
const stepNode2 = document.getElementById("step-node-2");
const stepNode3 = document.getElementById("step-node-3");
const stepNode4 = document.getElementById("step-node-4");

// State
let virtualAppId = null;
let isBusy = false;

// --- Neurological & Psychological Sensory Feedback Engine ---
class SensoryEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  vibrate(pattern) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch { }
    }
  }

  // Mechanical tactile switch click (Cherry/Joy-Con mechanical transient snap)
  triggerClick() {
    this.vibrate(15);
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.035);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Harmonic BLE lock chirp on GATT channel establishment
  triggerLock() {
    this.vibrate([20, 30, 20]);
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;
    [480, 720].forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, t + 0.08);

      gain.gain.setValueAtTime(0.12, t + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + idx * 0.02);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t + idx * 0.02);
      osc.stop(t + 0.14 + idx * 0.02);
    });
  }

  // Heavy mechanical solenoid latch stamp when postcard packet is received
  triggerStamp() {
    this.vibrate([35, 40, 60]);
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.09);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Pentatonic golden dopamine bell chime (Gimmighoul Coin Bag unlocked!)
  // C6, E6, G6, B6 ascending harmonic cascade with gentle exponential decay
  triggerReward() {
    this.vibrate([40, 50, 40, 60, 100]);
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const notes = [1046.5, 1318.5, 1567.9, 1975.5];
    const baseTime = this.audioCtx.currentTime;

    notes.forEach((freq, i) => {
      const noteTime = baseTime + i * 0.07;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.5);
    });
  }

  // Damped low frequency error thud
  triggerError() {
    this.vibrate([60, 60, 60]);
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}

const sensory = new SensoryEngine();

if (btnAudioToggle) {
  btnAudioToggle.addEventListener("click", () => {
    sensory.enabled = !sensory.enabled;
    if (sensory.enabled) {
      btnAudioToggle.classList.add("active");
      audioLabel.textContent = "Sound: ON";
      sensory.triggerClick();
    } else {
      btnAudioToggle.classList.remove("active");
      audioLabel.textContent = "Sound: OFF";
    }
  });
}

// --- Telemetry Feed Logging ---
function appendLogEntry({ level, message, detail, timestamp }) {
  const d = new Date(timestamp);
  const timeStr = `[${d.toTimeString().split(" ")[0]}]`;

  const entry = document.createElement("div");
  entry.className = "log-entry";

  const timeSpan = document.createElement("span");
  timeSpan.className = "log-time";
  timeSpan.textContent = timeStr;

  const msgSpan = document.createElement("span");
  msgSpan.className = `log-msg ${level}`;
  msgSpan.textContent = message;

  entry.appendChild(timeSpan);
  entry.appendChild(msgSpan);
  logFeed.appendChild(entry);
  logFeed.scrollTop = logFeed.scrollHeight;
}

if (btnClearLog) {
  btnClearLog.addEventListener("click", () => {
    logFeed.innerHTML = "";
    appendLogEntry({
      level: "info",
      message: "Log cleared by operator.",
      timestamp: Date.now(),
    });
  });
}

// --- Console Connected State Helper ---
function setConsoleConnectedUI(trainerName, statusMessage = "Nintendo Switch Linked • Ready to send daily postcards", badgeText = "Linked") {
  if (consoleLinkCard) {
    consoleLinkCard.classList.remove("connected");
    void consoleLinkCard.offsetWidth; // re-trigger animation
    consoleLinkCard.classList.add("connected");
  }

  if (consoleLinkTitle) consoleLinkTitle.textContent = `Nintendo Switch Paired: ${trainerName}`;
  if (consoleLinkSub) consoleLinkSub.textContent = statusMessage;
  if (consoleLinkBadge) consoleLinkBadge.textContent = badgeText;

  if (statusBox) {
    statusBox.classList.remove("connected");
    void statusBox.offsetWidth;
    statusBox.classList.add("connected");
  }

  if (screenTrainerBadge) {
    screenTrainerText.textContent = `Paired: ${trainerName}`;
  }
  if (bleSignalBars) {
    bleSignalBars.classList.add("connected");
  }
}

function loadPairedTrainer() {
  const remembered = localStorage.getItem("switch_bridge_paired_trainer");
  if (remembered) {
    if (consoleLinkTitle) consoleLinkTitle.textContent = `Nintendo Switch Paired: ${remembered}`;
    if (consoleLinkSub) consoleLinkSub.textContent = "Registered in Pokémon GO • Click trigger below when sending a postcard";
    if (consoleLinkBadge) consoleLinkBadge.textContent = "Paired Profile";
    if (consoleLinkCard) consoleLinkCard.classList.add("connected");
    if (btnSubLabel) btnSubLabel.textContent = `Tap 'Send to Nintendo Switch' in Pokémon GO, then click here`;
    if (screenTrainerText) screenTrainerText.textContent = `Paired Profile: ${remembered}`;
    if (bleSignalBars) bleSignalBars.classList.add("connected");
  }
}

// --- Update Step Nodes on Virtual Switch Display ---
function updateStepNodes(currentStep) {
  const nodes = [stepNode1, stepNode2, stepNode3, stepNode4];
  nodes.forEach((node, idx) => {
    if (!node) return;
    const stepNum = idx + 1;
    node.className = "screen-step-node";
    if (stepNum < currentStep) {
      node.classList.add("done");
    } else if (stepNum === currentStep) {
      node.classList.add("active");
    }
  });
}

// --- Hardware State Updates ---
function updateMachineState(state, meta = {}) {
  machineDot.className = "status-dot";

  // Scanner beam & Carrier wave control
  const isScanningOrActive = ["SCANNING", "CONNECTING", "DISCOVERING", "PAIRING", "TRANSFERRING"].includes(state);
  if (scannerLine) {
    if (isScanningOrActive) scannerLine.classList.add("active");
    else scannerLine.classList.remove("active");
  }

  if (carrierWaveBox) {
    carrierWaveBox.className = "carrier-wave-box";
    if (state === "SCANNING" || state === "CONNECTING") carrierWaveBox.classList.add("scanning");
    else if (state === "TRANSFERRING" || state === "TRANSFER_SUCCESS") carrierWaveBox.classList.add("active");
  }

  switch (state) {
    case "IDLE":
      machineDot.classList.add("active");
      machineText.textContent = "GATT Ready";
      updateStepNodes(1);
      if (screenHeroTitle) screenHeroTitle.textContent = "Nintendo Switch Standby";
      if (screenHeroDesc) screenHeroDesc.textContent = "Open Pokémon GO on your phone and tap 'Send to Nintendo Switch'.";
      break;

    case "SCANNING":
      machineDot.classList.add("busy");
      machineText.textContent = "Scanning";
      statusText.textContent = "Scanning for phone...";
      statusSub.textContent = "Select your device in the browser pairing dialog.";
      if (consoleLinkBadge) consoleLinkBadge.textContent = "Scanning...";
      if (btnExecute) btnExecute.className = "primary-action-btn busy";
      if (btnLabel) btnLabel.textContent = "Scanning for Pokémon GO...";
      if (btnSubLabel) btnSubLabel.textContent = "Select your phone in the browser popup";
      if (screenHeroTitle) screenHeroTitle.textContent = "Scanning BLE Airwaves...";
      if (screenHeroDesc) screenHeroDesc.textContent = "Listening for Saturday/Titan GATT advertisements from Pokémon GO.";
      updateStepNodes(2);
      break;

    case "CONNECTING":
      machineDot.classList.add("busy");
      machineText.textContent = "Connecting";
      statusText.textContent = `Connecting to ${meta.deviceName || "device"}...`;
      statusSub.textContent = "Establishing GATT channel...";
      if (consoleLinkSub && meta.deviceName) {
        consoleLinkSub.textContent = `Establishing connection to ${meta.deviceName}...`;
      }
      if (btnExecute) btnExecute.className = "primary-action-btn busy";
      if (btnLabel) btnLabel.textContent = `Connecting to ${meta.deviceName || "phone"}...`;
      if (btnSubLabel) btnSubLabel.textContent = "Handshaking with Pokémon GO...";
      if (screenHeroTitle) screenHeroTitle.textContent = `Connecting: ${meta.deviceName || "Device"}`;
      if (screenHeroDesc) screenHeroDesc.textContent = "Binding primary GATT service and resolving characteristics.";
      sensory.triggerLock();
      updateStepNodes(3);
      break;

    case "DISCOVERING":
      machineDot.classList.add("busy");
      machineText.textContent = "Discovering";
      statusText.textContent = "Discovering primary service...";
      statusSub.textContent = "Validating Titan protocol characteristics.";
      if (screenHeroTitle) screenHeroTitle.textContent = "Resolving GATT Services";
      if (screenHeroDesc) screenHeroDesc.textContent = "Accessing characteristic UUIDs for player metadata and nonce.";
      updateStepNodes(3);
      break;

    case "READING_METADATA":
      machineDot.classList.add("busy");
      machineText.textContent = "Reading Meta";
      statusText.textContent = "Checking mode...";
      statusSub.textContent = "Inspecting trainer name and current operation mode.";
      break;

    case "PAIRING":
      machineDot.classList.add("busy");
      machineText.textContent = "Registering";
      statusText.textContent = `Pairing mode detected! Registering for ${meta.playerName}...`;
      statusSub.textContent = `Writing virtual console ID ${virtualAppId.slice(0, 18)}...`;
      if (consoleLinkBadge) consoleLinkBadge.textContent = "Registering...";
      if (btnExecute) btnExecute.className = "primary-action-btn busy";
      if (btnLabel) btnLabel.textContent = `Registering Switch for ${meta.playerName}...`;
      if (btnSubLabel) btnSubLabel.textContent = "Pairing console identity with Pokémon GO...";
      if (screenHeroTitle) screenHeroTitle.textContent = `Pairing Profile: ${meta.playerName}`;
      if (screenHeroDesc) screenHeroDesc.textContent = "Registering console identity in phone's paired devices list.";
      updateStepNodes(3);
      break;

    case "PAIRED_SUCCESS":
      machineDot.classList.add("active");
      machineText.textContent = "Paired";
      statusText.textContent = `Console paired with trainer ${meta.playerName}!`;
      statusSub.textContent = "Phone registered! Now in Pokémon GO, simply send your daily postcards.";
      localStorage.setItem("switch_bridge_paired_trainer", meta.playerName);
      setConsoleConnectedUI(meta.playerName, "Paired Profile Registered! In Pokémon GO, select any postcard and send.", "Paired");

      if (btnExecute) btnExecute.className = "primary-action-btn";
      if (btnLabel) btnLabel.textContent = `▷ Receive Postcard from ${meta.playerName}`;
      if (btnSubLabel) btnSubLabel.textContent = "Phone searching? Tap here to receive postcard & unlock Coin Bag!";
      if (screenHeroTitle) screenHeroTitle.textContent = `Paired With ${meta.playerName}`;
      if (screenHeroDesc) screenHeroDesc.textContent = "Profile linked. You can now transfer postcards every day!";
      updateStepNodes(4);
      sensory.triggerReward();
      break;

    case "TRANSFERRING":
      machineDot.classList.add("busy");
      machineText.textContent = "Transferring";
      statusText.textContent = `Postcard transfer detected from ${meta.playerName}...`;
      statusSub.textContent = "Processing payload & computing hardware RSA signature...";
      if (consoleLinkBadge) consoleLinkBadge.textContent = "Receiving...";
      if (btnExecute) btnExecute.className = "primary-action-btn busy";
      if (btnLabel) btnLabel.textContent = `Receiving Postcard from ${meta.playerName}...`;
      if (btnSubLabel) btnSubLabel.textContent = "Computing hardware RSA signature & unlocking Coin Bag...";
      if (screenHeroTitle) screenHeroTitle.textContent = "Transferring Postcard...";
      if (screenHeroDesc) screenHeroDesc.textContent = `Computing hardware RSA-2048 accessory signature for ${meta.playerName}.`;
      sensory.triggerStamp();
      updateStepNodes(3);
      break;

    case "TRANSFER_SUCCESS":
      machineDot.classList.add("active");
      machineText.textContent = "Success";
      const latencyStr = meta.durationMs ? ` (${meta.durationMs}ms)` : "";
      statusText.textContent = `Postcard received from ${meta.playerName}!${latencyStr}`;
      statusSub.textContent = "Coin Bag unlocked! Postcard transfer complete.";

      if (meta.playerName) {
        localStorage.setItem("switch_bridge_paired_trainer", meta.playerName);
        setConsoleConnectedUI(meta.playerName, "Postcard received • Daily Coin Bag unlocked", "Synced");
      }

      if (btnExecute) btnExecute.className = "primary-action-btn success";
      if (btnLabel) btnLabel.textContent = `✓ Postcard Received & Coin Bag Claimed!`;
      if (btnSubLabel) btnSubLabel.textContent = "Postcard transferred • Click to send another";

      if (screenHeroTitle) screenHeroTitle.textContent = "Coin Bag Unlocked! 💰";
      if (screenHeroDesc) screenHeroDesc.textContent = `Postcard transfer succeeded from ${meta.playerName}! Daily bag refreshed.`;

      recordReward();
      saveHistoryEntry(meta);

      const rewardBox = document.querySelector(".reward-stat-box");
      if (rewardBox) {
        rewardBox.classList.remove("stamped");
        void rewardBox.offsetWidth; // force DOM reflow
        rewardBox.classList.add("stamped");
      }
      updateStepNodes(4);
      sensory.triggerReward();
      break;

    case "ERROR":
      machineDot.classList.add("error");
      machineText.textContent = "Error";
      statusText.textContent = "Operation failed";
      statusSub.textContent = meta.message || "An unexpected error occurred.";
      if (statusBox) statusBox.classList.remove("connected");
      if (btnExecute) btnExecute.className = "primary-action-btn";
      if (btnLabel) btnLabel.textContent = "Retry Postcard Transfer";
      if (btnSubLabel) btnSubLabel.textContent = meta.message || "Tap 'Send to Switch' in GO, then click here";
      if (screenHeroTitle) screenHeroTitle.textContent = "Hardware Link Error";
      if (screenHeroDesc) screenHeroDesc.textContent = meta.message || "Operation could not be completed. Check Pokémon GO.";
      sensory.triggerError();
      break;
  }
}

// --- Initialize BLE Engine ---
const bleEngine = new BleEngine({
  onLog: (entry) => appendLogEntry(entry),
  onState: (state, meta) => updateMachineState(state, meta),
});

// --- Virtual Switch ID Management ---
async function initIdentity() {
  let stored = localStorage.getItem("applicationId") || localStorage.getItem("switch_bridge_app_id");
  if (!stored) {
    stored = await createVirtualSwitchId();
  }
  localStorage.setItem("applicationId", stored);
  localStorage.setItem("switch_bridge_app_id", stored);
  virtualAppId = stored;
  appIdDisplay.textContent = virtualAppId;
}

if (btnCopyId) {
  btnCopyId.addEventListener("click", async () => {
    sensory.triggerClick();
    try {
      await navigator.clipboard.writeText(virtualAppId);
      const originalText = btnCopyId.innerHTML;
      btnCopyId.textContent = "Copied!";
      setTimeout(() => {
        btnCopyId.innerHTML = originalText;
      }, 1500);
    } catch {
      appendLogEntry({ level: "warn", message: "Clipboard write failed.", timestamp: Date.now() });
    }
  });
}

if (btnRegenId) {
  btnRegenId.addEventListener("click", async () => {
    sensory.triggerClick();
    const confirmed = window.confirm(
      "Regenerating your Virtual Switch ID will cause previously paired phones to treat this as a new console. You will need to pair again in Pokémon GO settings. Continue?"
    );
    if (!confirmed) return;

    virtualAppId = await createVirtualSwitchId();
    localStorage.setItem("applicationId", virtualAppId);
    localStorage.setItem("switch_bridge_app_id", virtualAppId);
    appIdDisplay.textContent = virtualAppId;
    appendLogEntry({
      level: "info",
      message: `Regenerated fresh Virtual Switch ID: ${virtualAppId}`,
      timestamp: Date.now(),
    });
  });
}

// --- Rewards & History ---
function recordReward() {
  localStorage.setItem("switch_bridge_last_claim", Date.now().toString());
}

function getHistory() {
  try {
    const raw = localStorage.getItem("switch_bridge_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(meta) {
  const history = getHistory();
  const entry = {
    id: Date.now(),
    timestamp: Date.now(),
    trainer: meta.playerName || "Unknown",
    device: meta.deviceName || "Pokémon GO Device",
    switchId: virtualAppId || "Unknown Console",
    durationMs: meta.durationMs || null,
  };
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem("switch_bridge_history", JSON.stringify(history));
  renderHistory();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHistory() {
  if (!historyContainer) return;
  const history = getHistory();

  if (history.length === 0) {
    historyContainer.innerHTML = `
      <div class="history-empty">
        No postcards logged yet. When you transfer a postcard from Pokémon GO, its timestamp, trainer name, and latency benchmark will appear here.
      </div>
    `;
    return;
  }

  historyContainer.innerHTML = "";
  for (const item of history) {
    const d = new Date(item.timestamp);
    const dateStr = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const latencyTag = item.durationMs
      ? `<span class="latency-tag">⚡ ${item.durationMs}ms</span>`
      : "";

    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <div class="history-top-row">
        <div>
          <span class="history-badge">Postcard Synced</span>
          ${latencyTag}
        </div>
        <span class="history-timestamp">${dateStr} • ${timeStr}</span>
      </div>
      <div class="history-details-grid">
        <div class="history-detail-item">
          <span class="history-detail-key">Trainer</span>
          <span class="history-detail-val">${escapeHtml(item.trainer)}</span>
        </div>
        <div class="history-detail-item">
          <span class="history-detail-key">Device</span>
          <span class="history-detail-val">${escapeHtml(item.device)}</span>
        </div>
        <div class="history-detail-item">
          <span class="history-detail-key">Console ID</span>
          <span class="history-detail-val" title="${escapeHtml(item.switchId)}">${escapeHtml(item.switchId.slice(0, 14))}...</span>
        </div>
      </div>
    `;
    historyContainer.appendChild(card);
  }
}

if (btnClearHistory) {
  btnClearHistory.addEventListener("click", () => {
    sensory.triggerClick();
    if (getHistory().length === 0) return;
    const confirmed = window.confirm("Clear all recorded postcard transfer history?");
    if (!confirmed) return;
    localStorage.removeItem("switch_bridge_history");
    renderHistory();
    appendLogEntry({ level: "info", message: "Transfer history cleared.", timestamp: Date.now() });
  });
}

// --- Daily Midnight Countdown Timer & Console Clock ---
function updateClocks() {
  const now = new Date();
  
  // Update Console Screen Clock
  if (screenConsoleClock) {
    screenConsoleClock.textContent = now.toTimeString().split(" ")[0];
  }

  // Daily Midnight Timer
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (timerVal) {
    timerVal.textContent = `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  }
}

// --- Preflight Check ---
function runPreflight() {
  if (!bleEngine.isSupported()) {
    checkIconBle.className = "check-icon warn";
    checkIconBle.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
    checkTitleBle.textContent = "Web Bluetooth Unsupported";
    checkSubBle.textContent = "Use Chrome on Android/Desktop or Bluefy browser on iOS.";

    btnExecute.disabled = true;
    btnLabel.textContent = "Browser Not Supported";
    statusText.textContent = "Web Bluetooth is unavailable in this browser.";
    statusSub.textContent = "iOS users: Download 'Bluefy - Web BLE Browser' from App Store. Android/Desktop: Use Chrome or Edge.";
  }
}

// --- Primary Action Trigger (Auto-Detects Mode) ---
btnExecute.addEventListener("click", async () => {
  if (isBusy) return;
  sensory.triggerClick();
  isBusy = true;
  btnExecute.disabled = true;

  const broadScan = toggleBroadScan ? toggleBroadScan.checked : false;

  try {
    await bleEngine.executeAutoSync(virtualAppId, broadScan);
  } catch {
    // Errors classified and logged by engine
  } finally {
    isBusy = false;
    btnExecute.disabled = false;
  }
});

// --- Boot Initialization ---
async function boot() {
  await initIdentity();
  loadPairedTrainer();
  renderHistory();
  runPreflight();
  updateClocks();
  setInterval(updateClocks, 1000);
}

boot();
