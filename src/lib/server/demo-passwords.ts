/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import "server-only";

import { scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { normaliseId } from "@/lib/demo-accounts";

// The demo passwords, kept only as salted scrypt keys and read only by the sign-in route on
// the server. "server-only" makes the build fail if a client component ever imports this.
// A new account's key comes from the same settings and a fresh 16-byte salt:
//   crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 }), both written as base64.
// These settings suit passwords shared for a demo; real accounts need a stronger setting.

const SETTINGS: ScryptOptions = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 32;

type Stored = readonly [salt: string, key: string];

/** Account ID to [salt, key], both base64. */
const KEYS = new Map<string, Stored>([
  ["meera.iyer", ["RQJBNSndG96jT6sEndk/Rw==", "lZrG1I3cXtjVFw2yePA2Ky7HieA7CmdyWByYiXiSlCk="]],
  ["rohan.menon", ["mJuYKTdhl6AEiaUkE9eKxQ==", "Btg14zhCB7/4WoR7WE2yq5R4HXIb+IHvHrbDSO2AsRw="]],
  ["vikram.desai", ["rKkbAdYZ8VadisAEN5avyQ==", "VfayUVVr2bLpPhQ2slBv2GsYqSPl7+XrYiBxGOX3Z/o="]],
  ["ananya.rao", ["SOWbdb0ldl6SZ2fbGSr7Mw==", "5iIe+Y/00uv6lo2yGa/u2dOFLroHxdoGYlbn3EcNHPg="]],
  ["suresh.gowda", ["NlDTxmfaKNePjnBg0KCqpw==", "EUrVYrRvoFeOVQqPBLfHkFCXGaaEqd52TMpN39Byx5s="]],
  ["manjunath.k", ["tcn6C7v2xeImHvx8FfwFPA==", "jeaB0U6vpUGjVIeGTSRG2gcW3YfBG3Uh7sbs8eEXcmg="]],
  ["prakash.hegde", ["nWY/f/zmGRop76QdA7k7dA==", "WPnJTxzsykEf82ggan/ruirgmxQzGO6lYv3geOFAR5Q="]],
  ["divya.shenoy", ["bDmp/hyWVmNKLNHWcgTXbg==", "Ui9Hvi8Yud9CtH7JaMK3CXUFvRuynhF2XECWqNs6kbU="]],
  ["shalini.murthy", ["QE7gaSpNd+UuzY05NKmhkA==", "+SQNKFmihUWC8nKxUbwVmSBPeii+CrncPCQwHoxXc2Q="]],
]);

/** The key of a random password nobody knows: an ID that is no account costs the same to check. */
const DECOY: Stored = ["zaUFYVet+UVjPDiO9DXOsA==", "z/9arjJglfMlZl42O0m1XqKEcY4wa0VZU2cz+vy4Z4E="];

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SETTINGS, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/**
 * The account an ID and password sign in to, or null. The ID is read as the sign-in card
 * reads it: trimmed, any case, with or without "@poetrydesigns.in". A space picked up at
 * either end of the password does not count; case does.
 */
export async function checkDemoPassword(id: string, password: string): Promise<string | null> {
  const accountId = normaliseId(id);
  const stored = KEYS.get(accountId);
  const [salt, key] = stored ?? DECOY;
  const typed = await derive(password.trim(), Buffer.from(salt, "base64"));
  // Compared in constant time, and always compared, so the answer's timing says nothing.
  const same = timingSafeEqual(typed, Buffer.from(key, "base64"));
  return same && stored ? accountId : null;
}
