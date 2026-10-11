// The APNs token is a valid ES256 JWT that verifies with the key's public half.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { makeApnsJwt } from "../src/apns.js";

test("APNs JWT is ES256, carries key and team ids, and verifies", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const jwt = await makeApnsJwt({ key: pem, keyId: "ABC123DEFG", teamId: "TEAM123456", now: 1_700_000_000_000 });
  const [h, p, s] = jwt.split(".");
  const dec = x => JSON.parse(Buffer.from(x, "base64url").toString());
  assert.deepEqual(dec(h), { alg: "ES256", kid: "ABC123DEFG" });
  assert.deepEqual(dec(p), { iss: "TEAM123456", iat: 1_700_000_000 });
  const sig = Buffer.from(s, "base64url");
  assert.equal(sig.length, 64);
  const ok = createVerify("SHA256").update(`${h}.${p}`).verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, sig);
  assert.ok(ok, "signature verifies");
});
