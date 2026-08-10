import { env } from "@/lib/env";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

function getEncryptKey(): string {
  if (!env.ENCRYPT_KEY) {
    throw new Error("ENCRYPT_KEY is not set in environment variables");
  }
  return env.ENCRYPT_KEY;
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getKey(): Promise<CryptoKey> {
  const raw = hexToBuffer(getEncryptKey());
  return crypto.subtle.importKey("raw", raw, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt plaintext → "iv:ciphertext" hex string for DB storage.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoded.buffer as ArrayBuffer
  );
  return `${bufferToHex(iv.buffer as ArrayBuffer)}:${bufferToHex(ciphertext)}`;
}

/**
 * Decrypt "iv:ciphertext" hex string → original plaintext.
 */
export async function decrypt(encrypted: string): Promise<string> {
  const [ivHex, ciphertextHex] = encrypted.split(":");
  if (!ivHex || !ciphertextHex) {
    throw new Error("Invalid encrypted value format");
  }

  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: hexToBuffer(ivHex) },
    key,
    hexToBuffer(ciphertextHex)
  );
  return new TextDecoder().decode(decrypted);
}
