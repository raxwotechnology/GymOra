const crypto = require("crypto");

const PBKDF2_PREFIX = "pbkdf2";
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function legacyHashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .pbkdf2Sync(String(password), salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  return [PBKDF2_PREFIX, PBKDF2_ITERATIONS, salt, derivedKey].join("$");
}

function isLegacyPasswordHash(passwordHash = "") {
  return !String(passwordHash).startsWith(`${PBKDF2_PREFIX}$`);
}

function verifyPassword(password, passwordHash) {
  const normalizedHash = String(passwordHash || "");

  if (isLegacyPasswordHash(normalizedHash)) {
    return legacyHashPassword(password) === normalizedHash;
  }

  const [, iterationsValue, salt, expectedHash] = normalizedHash.split("$");
  const iterations = Number(iterationsValue || PBKDF2_ITERATIONS);
  const derivedKey = crypto
    .pbkdf2Sync(String(password), salt, iterations, KEY_LENGTH, DIGEST)
    .toString("hex");

  const actualBuffer = Buffer.from(derivedKey, "hex");
  const expectedBuffer = Buffer.from(expectedHash || "", "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let password = "";

  while (password.length < length) {
    const nextIndex = crypto.randomInt(0, alphabet.length);
    password += alphabet[nextIndex];
  }

  return password;
}

module.exports = {
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash,
  generateTemporaryPassword
};
