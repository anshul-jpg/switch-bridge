/**
 * Nintendo Switch GATT Postcard Protocol (Titan / Saturday)
 * Clean-room implementation of the BLE GATT protocol between
 * Pokémon GO (Peripheral) and Nintendo Switch (Central).
 */

// --- BLE GATT UUIDs ---
export const GATT_CONFIG = Object.freeze({
  // Advertising Service (used in navigator.bluetooth scan filter)
  ADVERTISEMENT_SERVICE: "b6c3089a-7e4f-487d-b9f8-73a281dd718f",

  // Primary GATT Service (discovered after connection)
  PRIMARY_SERVICE: "abfaf4c7-5a44-445a-a007-ad19fcb29e99",

  // Characteristics
  CHARS: {
    PROTOCOL_VERSION: "291e0889-cb21-4add-a587-3bb494ca2acf", // Read: expects 0x01
    PLAYER_NAME: "95c33c9a-9b76-4194-8e41-3b66aa8bb021", // Read: 4..15 UTF-8 bytes
    SESSION_MODE: "8f860fd8-51e4-497d-afed-94253dbe2e0a", // Read: 0x00=Pair, 0x01=Transfer
    APPLICATION_ID: "28fdc6ec-b073-4e4a-bf7e-91af16c3e890", // Write w/ Resp: 69 bytes
    INITIAL_NONCE: "2f8b06c2-0e80-45e5-a0dd-ad34c9f7ceb0", // Write w/o Resp: hex + \0
    SERVER_DATA: "000dd3aa-d916-4bc7-8a08-ae1a8a008e8a", // Indicate: SaturdayBleSendProto
    COMPLETE: "c5b318da-89e6-481f-98e4-b4e0a4203487", // Write w/o Resp: SaturdayCompleteProto
    FINALIZE_STAGE: "e35da264-384e-4db3-ae27-a1ba2b1f533d", // Indicate (iOS): SaturdayBleFinalize
    FINAL_NONCE: "6324802e-5266-4f4a-95be-3a8f811874fc", // Write w/ Resp: hex (no \0)
  },

  APPLICATION_ID_SUFFIX: "+titan",
  APPLICATION_ID_LENGTH: 69,
});

// Vivillon regional pattern mapping (CompositionData enum, 0-20)
export const VIVILLON_PATTERNS = Object.freeze({
  0: { name: "Icy Snow", region: "Northern Canada, Norway, Finland, Greenland" },
  1: { name: "Polar", region: "Canada, Alaska, Northern Europe" },
  2: { name: "Tundra", region: "Iceland, Northern Japan" },
  3: { name: "Continental", region: "Central Europe, Korea" },
  4: { name: "Garden", region: "UK, Ireland, New Zealand" },
  5: { name: "Elegant", region: "Japan" },
  6: { name: "Meadow", region: "France, Italy, Germany" },
  7: { name: "Modern", region: "Midwest USA" },
  8: { name: "Marine", region: "Mediterranean, Spain, Portugal" },
  9: { name: "Archipelago", region: "Caribbean, South Africa" },
  10: { name: "High Plains", region: "Western USA, Mexico" },
  11: { name: "Sandstorm", region: "Middle East" },
  12: { name: "River", region: "Australia, Southern Africa" },
  13: { name: "Monsoon", region: "India, Southeast Asia" },
  14: { name: "Savanna", region: "Brazil, Argentina" },
  15: { name: "Sun", region: "Mexico, Madagascar" },
  16: { name: "Ocean", region: "Hawaii, Galapagos" },
  17: { name: "Jungle", region: "Northern South America, Central Africa" },
  18: { name: "Fancy", region: "Special Event Distribution" },
  19: { name: "Poké Ball", region: "Special Event Distribution" },
});

// RSA-2048 accessory key pair extracted from Switch firmware
const RSA_MODULUS = BigInt(
  "0x00cf9edb2ab214b636f3a4ea63f76e82f2067b746563b37b68d01fcb5272c1307a222ab7d9" +
  "ac5d8e909bc02061b071059529431574cca75ad3f63997294accf1c35ed9d79b18f7da90eef" +
  "f246e3ac806f57f40e4cbe421fded58669591be6a8948e630474622676c822a0482becf2c93" +
  "ffbe153ae1a13292ac1713934959c7a6695d53d7cfaf8b7f001c222f7554a1a93309bca085f" +
  "f3844fe37d1888e76f6d36b7a59f0bd3ce1be79583be1c3a60c7db396941d8d7a8a406d3202" +
  "810d93e4fc59ef2bed02e1e27b68228f515f9c2c2c2a538641941279128337404b85d6e3564" +
  "47a66bbcf53653d21f26761932f011c00e16c570fc82977ff209ad96f65ecf1d7"
);

const RSA_PRIVATE_EXPONENT = BigInt(
  "0x495ee224dc79e54ad61f5995aa432b934c2724a30ff0c593ecb8cfa97" +
  "b543a456efd99ab1af69503158777ea0de86308ab644198dd19e74730a4797ee62836e7cc05" +
  "3fe457967f6ee886d1e10274ddc0b40fc2cb2afbb838c01cc08e98b41d7fdd9902170ee16db" +
  "f320a160a483c80b0c803c8a323cc33790d4ea5a62e4c17ca5163fa01d63d653429c309c645" +
  "2c00f0e19fd8afa76d316f899790a53d9e29891ac5e992249475443526271a11ea5a68f8031" +
  "90a896d4efc5fa33dcad3e1f6155e2531654757f737e15814d16f396eb25833c518fbeb53fc" +
  "c39394510a79b07a384fc26a0ef4f3524ba6062aebc06fa26bbe6fcaa1435304904498ed5c9" +
  "a42c1"
);

// ASN.1 prefix for SHA-256 in PKCS#1 v1.5
const SHA256_DIGEST_INFO = new Uint8Array([
  0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04,
  0x02, 0x01, 0x05, 0x00, 0x04, 0x20
]);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

// --- Byte Utilities ---
export function concatBytes(...arrays) {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const arr of arrays) {
    out.set(arr, pos);
    pos += arr.length;
  }
  return out;
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex) {
  const clean = hex.trim();
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(clean)) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

// --- Protobuf Wire Serialization & Deserialization ---
export function encodeVarint(input) {
  let val = typeof input === "bigint" ? input : BigInt(input);
  if (val < 0n) val &= (1n << 64n) - 1n;
  const bytes = [];
  while (val > 0x7fn) {
    bytes.push(Number((val & 0x7fn) | 0x80n));
    val >>= 7n;
  }
  bytes.push(Number(val));
  return Uint8Array.from(bytes);
}

export function decodeVarint(buffer, startOffset = 0) {
  let value = 0n;
  let shift = 0n;
  let offset = startOffset;
  while (offset < buffer.length && shift < 70n) {
    const byte = BigInt(buffer[offset++]);
    value |= (byte & 0x7fn) << shift;
    if ((byte & 0x80n) === 0n) {
      return { value, offset };
    }
    shift += 7n;
  }
  throw new Error("Malformed or truncated protobuf varint");
}

function fieldVarint(number, value) {
  return concatBytes(encodeVarint(BigInt(number << 3)), encodeVarint(value));
}

function fieldBytes(number, raw) {
  return concatBytes(
    encodeVarint(BigInt((number << 3) | 2)),
    encodeVarint(raw.length),
    raw
  );
}

function fieldString(number, str) {
  return fieldBytes(number, textEncoder.encode(str));
}

export function parseProtobuf(buffer) {
  const fields = new Map();
  let offset = 0;
  while (offset < buffer.length) {
    const { value: tag, offset: tagEnd } = decodeVarint(buffer, offset);
    offset = tagEnd;
    const fieldNum = Number(tag >> 3n);
    const wireType = Number(tag & 7n);

    if (fieldNum === 0) throw new Error("Protobuf field index 0 is invalid");

    if (wireType === 0) { // Varint
      const { value, offset: valEnd } = decodeVarint(buffer, offset);
      fields.set(fieldNum, { wireType, value });
      offset = valEnd;
    } else if (wireType === 2) { // Length-delimited
      const { value: lengthBig, offset: lenEnd } = decodeVarint(buffer, offset);
      const length = Number(lengthBig);
      offset = lenEnd;
      if (offset + length > buffer.length) {
        throw new Error("Protobuf length-delimited payload exceeds boundary");
      }
      fields.set(fieldNum, { wireType, value: buffer.slice(offset, offset + length) });
      offset += length;
    } else {
      throw new Error(`Unsupported wire type: ${wireType}`);
    }
  }
  return fields;
}

// --- Nintendo Nonce (FNV-1a 64-bit emulation) ---
export function generateSystemNonce() {
  const entropy = new Uint32Array(2);
  crypto.getRandomValues(entropy);
  let tick = BigInt(entropy[0]) | (BigInt(entropy[1]) << 32n);
  tick &= (1n << 64n) - 1n;

  let hash = 0xcbf29ce484222645n; // FNV offset basis
  for (let i = 0n; i < 8n; i += 1n) {
    const octet = (tick >> (8n * i)) & 0xffn;
    hash ^= octet;
    hash = (hash * 0x100000001b3n) & ((1n << 64n) - 1n); // FNV prime
  }
  return hash.toString(16);
}

// --- Virtual Switch Application ID (UUIDv5 + "+titan") ---
export async function createVirtualSwitchId() {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const namespace = hexToBytes("6ba7b8109dad11d180b400c04fd430c8"); // DNS namespace
  const digestBuffer = await crypto.subtle.digest("SHA-1", concatBytes(namespace, randomBytes));
  const hash = new Uint8Array(digestBuffer);

  // Set UUID version 5 and variant RFC 4122
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = bytesToHex(hash.slice(0, 16));
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return `${uuid}${GATT_CONFIG.APPLICATION_ID_SUFFIX}`;
}

export function formatApplicationIdBuffer(appId) {
  const bytes = textEncoder.encode(appId);
  if (bytes.length > GATT_CONFIG.APPLICATION_ID_LENGTH) {
    throw new Error(`App ID exceeds maximum buffer size (${GATT_CONFIG.APPLICATION_ID_LENGTH} bytes)`);
  }
  const buffer = new Uint8Array(GATT_CONFIG.APPLICATION_ID_LENGTH);
  buffer.set(bytes);
  return buffer;
}

// --- RSA PKCS#1 v1.5 Modular Exponentiation Signer ---
function modularExponentiation(base, exp, mod) {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

function bigIntToBytes(value, width) {
  if (value < 0n) {
    throw new Error("Cannot encode a negative integer as unsigned bytes");
  }
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  const raw = hexToBytes(hex);
  if (raw.length > width) {
    throw new Error(`Integer does not fit in ${width} bytes`);
  }
  const result = new Uint8Array(width);
  result.set(raw, width - raw.length);
  return result;
}

export async function signWithSwitchKey(payload) {
  const digestBuffer = await crypto.subtle.digest("SHA-256", payload);
  const digest = new Uint8Array(digestBuffer);

  const padLength = 256 - 3 - SHA256_DIGEST_INFO.length - digest.length;
  if (padLength < 8) throw new Error("PKCS#1 padding overflow");

  const pkcs1Block = concatBytes(
    Uint8Array.of(0x00, 0x01),
    new Uint8Array(padLength).fill(0xff),
    Uint8Array.of(0x00),
    SHA256_DIGEST_INFO,
    digest
  );

  const blockInt = BigInt(`0x${bytesToHex(pkcs1Block)}`);
  const signatureInt = modularExponentiation(blockInt, RSA_PRIVATE_EXPONENT, RSA_MODULUS);
  return bigIntToBytes(signatureInt, 256);
}

// --- High-Level Message Codecs ---

export function parseBleSendIndication(rawBytes) {
  const outer = parseProtobuf(rawBytes);
  const prepRaw = outer.get(1)?.value;
  if (!prepRaw) throw new Error("Missing SaturdayBleSendPrepProto in DATA indication");

  const prep = parseProtobuf(prepRaw);
  const vivillonId = Number(prep.get(1)?.value ?? 0n);
  const transactionId = prep.get(2)?.value;
  const applicationId = textDecoder.decode(prep.get(3)?.value ?? new Uint8Array());
  const nonce = textDecoder.decode(prep.get(4)?.value ?? new Uint8Array());

  return {
    vivillonId,
    vivillonInfo: VIVILLON_PATTERNS[vivillonId] ?? { name: `Unknown (${vivillonId})`, region: "Unmapped" },
    transactionId,
    applicationId,
    nonce,
    serverSignature: outer.get(2)?.value,
  };
}

export async function createCompleteMessage(transactionId, nonce) {
  // Inner message: SaturdayBleCompleteRequestProto
  const requestProto = concatBytes(
    fieldVarint(1, transactionId),
    fieldString(2, nonce)
  );

  // Compute 256-byte RSA-2048 PKCS#1 v1.5 signature
  const appSignature = await signWithSwitchKey(requestProto);
  const firmwareSignature = appSignature.slice(0, 16);

  // Outer message: SaturdayCompleteProto
  return concatBytes(
    fieldBytes(1, requestProto),
    fieldBytes(2, appSignature),
    fieldBytes(3, firmwareSignature)
  );
}

export function parseBleFinalizeIndication(rawBytes) {
  const outer = parseProtobuf(rawBytes);
  const completeRaw = outer.get(1)?.value;
  if (!completeRaw) throw new Error("Missing finalize inner payload");

  const complete = parseProtobuf(completeRaw);
  return {
    nonce: textDecoder.decode(complete.get(1)?.value ?? new Uint8Array()),
    applicationId: textDecoder.decode(complete.get(2)?.value ?? new Uint8Array()),
    serverSignature: outer.get(2)?.value,
  };
}
