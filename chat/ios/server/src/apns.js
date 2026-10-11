// Signing Apple push requests: an ES256 JSON Web Token made with the .p8 key
// from developer.apple.com, as APNs token-based authentication requires.
// Kept apart from index.js so the tests can run it under Node.

export const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function makeApnsJwt({ key, keyId, teamId, now = Date.now() }) {
  const pem = String(key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), ch => ch.charCodeAt(0));
  const signingKey = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const head = `${enc({ alg: "ES256", kid: keyId })}.${enc({ iss: teamId, iat: Math.floor(now / 1000) })}`;
  // WebCrypto's ECDSA signature is already the raw r||s form that JWS wants.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, new TextEncoder().encode(head));
  return `${head}.${b64url(sig)}`;
}
