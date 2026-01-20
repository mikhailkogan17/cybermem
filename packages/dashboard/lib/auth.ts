/**
 * JWT Token Verification
 *
 * Uses the same public key as auth-sidecar (RS256).
 * Only needs PUBLIC key - no secrets required.
 */

import { importSPKI, jwtVerify } from "jose";

// Public key for verification (same as auth-sidecar)
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkrWPslHt+dcX/lckX4mw
AaI4koCqn7NqEkTtuyJuzFv969Da0ghhWdTIRR6H8pYfsTtqtX2UAZox8i5IJ9t9
JS8nBfbL2fFiuEz51LMNKMSLw7j2dJT/g5iIdT64LyJZ/9+kLMXC
EBWPIyEvx4GMzKSf2L+jNaUY/0J8n/JNAbKtIplKtfOU/tNWuoZfcj3SnoxrmApN
Xw+LsE26EM2Gq7MKLQf3r3GUIm2dBgs7XUNJRiezrPgFzekiaiDyFsNhhk1jkx2I
ljQgSslGQ4dODE73KB07b0Qi7zPWAtGlCyDQD5RLICzht1mMENta7x+TlPJfDv8g
XeEmW5ihAgMBAAE=
-----END PUBLIC KEY-----`;

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  avatar?: string;
  iat: number;
  exp: number;
  iss: string;
}

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (!cachedPublicKey) {
    cachedPublicKey = await importSPKI(PUBLIC_KEY_PEM, "RS256");
  }
  return cachedPublicKey;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "cybermem.dev",
    });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
