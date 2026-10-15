# SwitchBridge

A lightweight, clean-room Web Bluetooth bridge that emulates a Nintendo Switch console to communicate directly with Pokémon GO. 

It handles the official Saturday/Titan GATT protocol handshake, allowing trainers to send daily postcards and unlock the in-game **Gimmighoul Coin Bag** directly from any Web Bluetooth-enabled browser without needing physical console hardware.

Built with vanilla JavaScript (ES modules), native Web Cryptography (`SubtleCrypto` + BigInt RSA-2048), Web Audio API sound synthesis, and zero external build tools, frameworks, or backend servers.

---

## How It Works

When you tap **Send to Nintendo Switch** in Pokémon GO, the phone advertises over Bluetooth Low Energy (BLE) searching for a Nintendo Switch peripheral. SwitchBridge acts as a central GATT client:

1. **BLE Advertising Detection**: Discovers Pokémon GO's Titan GATT advertisement service (`b6c3089a-7e4f-487d-b9f8-73a281dd718f`).
2. **GATT Characteristic Discovery**: Resolves primary service `abfaf4c7-5a44-445a-a007-ad19fcb29e99` and reads the session mode (`0x00` = Pairing, `0x01` = Postcard Transfer).
3. **Application Identity Exchange**: Writes a persistent, deterministic 69-byte UUIDv5 virtual console identity (`28fdc6ec-...`).
4. **Hardware Cryptographic Signature**: Computes the official RSA-2048 PKCS#1 v1.5 SHA-256 signature required by Pokémon GO to verify console authenticity.
5. **Instant Bag Unlock**: Acknowledges postcard packet delivery via Saturday protocol indications, completing the transfer and refreshing your daily Coin Bag.

---

## Project Structure

```
switch-bridge/
├── index.html        # Semantic workstation markup & virtual Switch chassis
├── style.css         # Industrial design system, hardware layout & mobile adaptations
├── tokens.css        # Polycarbonate chassis tokens, typography, and spacing scales
├── app.js            # Sensory feedback engine, HUD state transitions, and audit ledger
├── ble-engine.js     # Web Bluetooth GATT central orchestrator & race handling
├── protocol.js       # Titan GATT UUIDs, FNV-1a nonce generator, and RSA-2048 signer
└── README.md         # Documentation and setup instructions
```

---

## Quickstart (Running Locally)

Web Bluetooth requires a secure origin (`https://` or `localhost`). You can run SwitchBridge locally using any static web server:

### Python 3
```bash
cd switch-bridge
python -m http.server 8765
```
Open [http://localhost:8765](http://localhost:8765) in Chrome, Edge, or Brave.

### Node.js (npx)
```bash
npx serve .
```

---

## How to Use

### Daily Postcard Transfer & Coin Bag Claim
1. Open **Pokémon GO** on your phone.
2. Go to **Items** &rarr; **Postcard Book** &rarr; open any saved postcard.
3. Tap the **&equiv;** menu icon in the bottom right, then tap **Send to Nintendo Switch**.
4. While your phone is searching, click **Send Postcard & Claim Coin Bag** in SwitchBridge.
5. In the browser's Bluetooth pairing prompt, select your phone.
6. The bridge automatically completes the handshake, accepts the postcard, and triggers your daily Coin Bag.

### One-Time Console Pairing (First Time Only)
If your phone has never connected to a Nintendo Switch before:
1. In Pokémon GO, go to **Settings** &rarr; **Connected Devices and Services** &rarr; **Nintendo Switch**.
2. Tap **Connect to Nintendo Switch**.
3. In SwitchBridge, click the primary action button.
4. Select your phone in the browser dialog. SwitchBridge detects Pairing Mode (`0x00`) and registers your virtual Switch identity.

Once paired, you do not need to repeat pairing—subsequent transfers take only a single click.

---

## Browser & Device Compatibility

| Platform | Supported Browsers | Notes |
|---|---|---|
| **Android** | Google Chrome, Edge, Brave | Native Web Bluetooth. Ensure Bluetooth and Location services are enabled. |
| **iOS / iPadOS** | [Bluefy Browser](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) | Safari blocks Web Bluetooth on iOS. Bluefy is a free Web BLE browser with full GATT support. |
| **Windows / macOS / Linux** | Google Chrome, Edge, Brave | Built-in or USB Bluetooth 4.0+ adapter required. |

---

## Privacy & Security

* **100% Client-Side**: All Bluetooth communication, cryptographic hashing, and signature generation execute purely within browser memory.
* **No Account Required**: Never asks for Nintendo, Google, or Pokémon GO login credentials.
* **No Telemetry**: Zero external network requests, cookies, or remote logging. Transfer history is stored locally in your browser's `localStorage` and can be cleared at any time.

---

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In your repository on GitHub, navigate to **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Branch**, select `main` (or `master`) and `/ (root)`.
4. Click **Save**. GitHub Pages will deploy the site with free HTTPS at:
   ```
   https://anshul-jpg.github.io/switch-bridge/
   ```

---

## License

MIT License. Clean-room implementation intended for personal interoperability and research.
