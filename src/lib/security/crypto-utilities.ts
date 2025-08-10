/**
 * @fileoverview Encryption and security utilities for MailPilot AI
 * @description Cryptographic functions for data protection, token generation, and secure hashing
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  /** Algorithm to use for encryption */
  algorithm: string;
  /** Key derivation iterations */
  iterations: number;
  /** Salt length in bytes */
  saltLength: number;
  /** IV length in bytes */
  ivLength: number;
  /** Tag length for AEAD modes */
  tagLength: number;
}

/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: "aes-256-gcm",
  iterations: 100000,
  saltLength: 32,
  ivLength: 16,
  tagLength: 16,
};

/**
 * Encrypted data structure
 */
interface EncryptedData {
  data: string;
  salt: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

/**
 * Hash configuration for passwords
 */
interface HashConfig {
  saltLength: number;
  keyLength: number;
  iterations: number;
}

/**
 * Default hash configuration
 */
const DEFAULT_HASH_CONFIG: HashConfig = {
  saltLength: 32,
  keyLength: 64,
  iterations: 100000,
};

/**
 * Generate a cryptographically secure random token
 * @param length - Token length in bytes (default: 32)
 * @returns Base64 encoded random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return randomBytes(length).toString("base64url");
};

/**
 * Generate a random hex string
 * @param length - Length in bytes (default: 16)
 * @returns Hex encoded random string
 */
export const generateRandomHex = (length: number = 16): string => {
  return randomBytes(length).toString("hex");
};

/**
 * Generate a numeric code (for OTP, verification codes)
 * @param length - Number of digits (default: 6)
 * @returns Numeric code as string
 */
export const generateNumericCode = (length: number = 6): string => {
  const digits = "0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes(1)[0] % digits.length;
    result += digits[randomIndex];
  }

  return result;
};

/**
 * Hash a password using scrypt
 * @param password - Plain text password
 * @param config - Hash configuration (optional)
 * @returns Promise resolving to hash object
 */
export const hashPassword = async (
  password: string,
  config: Partial<HashConfig> = {}
): Promise<{ hash: string; salt: string; config: HashConfig }> => {
  const hashConfig = { ...DEFAULT_HASH_CONFIG, ...config };
  const salt = randomBytes(hashConfig.saltLength);

  const key = (await scryptAsync(
    password,
    salt,
    hashConfig.keyLength
  )) as Buffer;

  return {
    hash: key.toString("base64"),
    salt: salt.toString("base64"),
    config: hashConfig,
  };
};

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Base64 encoded hash
 * @param salt - Base64 encoded salt
 * @param config - Hash configuration
 * @returns Promise resolving to boolean
 */
export const verifyPassword = async (
  password: string,
  hash: string,
  salt: string,
  config: HashConfig = DEFAULT_HASH_CONFIG
): Promise<boolean> => {
  try {
    const saltBuffer = Buffer.from(salt, "base64");
    const hashBuffer = Buffer.from(hash, "base64");

    const key = (await scryptAsync(
      password,
      saltBuffer,
      config.keyLength
    )) as Buffer;

    return timingSafeEqual(hashBuffer, key);
  } catch (error) {
    return false;
  }
};

/**
 * Create HMAC signature
 * @param data - Data to sign
 * @param secret - Secret key
 * @param algorithm - HMAC algorithm (default: sha256)
 * @returns HMAC signature as hex string
 */
export const createHmacSignature = (
  data: string,
  secret: string,
  algorithm: string = "sha256"
): string => {
  return createHmac(algorithm, secret).update(data).digest("hex");
};

/**
 * Verify HMAC signature
 * @param data - Original data
 * @param signature - HMAC signature to verify
 * @param secret - Secret key
 * @param algorithm - HMAC algorithm (default: sha256)
 * @returns Boolean indicating if signature is valid
 */
export const verifyHmacSignature = (
  data: string,
  signature: string,
  secret: string,
  algorithm: string = "sha256"
): boolean => {
  try {
    const expectedSignature = createHmacSignature(data, secret, algorithm);
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    return false;
  }
};

/**
 * Hash data using specified algorithm
 * @param data - Data to hash
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns Hash as hex string
 */
export const hashData = (
  data: string,
  algorithm: string = "sha256"
): string => {
  return createHash(algorithm).update(data).digest("hex");
};

/**
 * Create a secure session token with expiration
 * @param userId - User identifier
 * @param secret - Secret key for signing
 * @param expiresIn - Expiration time in milliseconds
 * @returns Session token
 */
export const createSessionToken = (
  userId: string,
  secret: string,
  expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours
): string => {
  const payload = {
    userId,
    exp: Date.now() + expiresIn,
    nonce: generateSecureToken(16),
  };

  const payloadString = JSON.stringify(payload);
  const signature = createHmacSignature(payloadString, secret);

  return Buffer.from(payloadString).toString("base64url") + "." + signature;
};

/**
 * Verify and decode session token
 * @param token - Session token to verify
 * @param secret - Secret key for verification
 * @returns Decoded payload or null if invalid
 */
export const verifySessionToken = (
  token: string,
  secret: string
): { userId: string; exp: number; nonce: string } | null => {
  try {
    const [payloadPart, signature] = token.split(".");
    if (!payloadPart || !signature) return null;

    const payloadString = Buffer.from(payloadPart, "base64url").toString(
      "utf-8"
    );

    if (!verifyHmacSignature(payloadString, signature, secret)) {
      return null;
    }

    const payload = JSON.parse(payloadString);

    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * Mask sensitive data (like email, phone numbers)
 * @param value - Value to mask
 * @param type - Type of data ('email', 'phone', 'card', 'generic')
 * @returns Masked value
 */
export const maskSensitiveData = (
  value: string,
  type: "email" | "phone" | "card" | "generic" = "generic"
): string => {
  if (!value) return "";

  switch (type) {
    case "email": {
      const [username, domain] = value.split("@");
      if (!username || !domain) return "***@***";

      const maskedUsername =
        username.length > 2
          ? username[0] + "*".repeat(username.length - 2) + username.slice(-1)
          : "*".repeat(username.length);

      const [domainName, tld] = domain.split(".");
      const maskedDomain =
        domainName.length > 2
          ? domainName[0] +
            "*".repeat(domainName.length - 2) +
            domainName.slice(-1)
          : "*".repeat(domainName.length);

      return `${maskedUsername}@${maskedDomain}.${tld}`;
    }

    case "phone": {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 4) return "*".repeat(digits.length);

      return digits.slice(0, -4).replace(/\d/g, "*") + digits.slice(-4);
    }

    case "card": {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 4) return "*".repeat(digits.length);

      return "*".repeat(digits.length - 4) + digits.slice(-4);
    }

    case "generic":
    default: {
      if (value.length <= 4) return "*".repeat(value.length);
      return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
    }
  }
};

/**
 * Generate a secure API key
 * @param prefix - Optional prefix for the key
 * @param length - Key length in bytes (default: 32)
 * @returns API key with prefix
 */
export const generateApiKey = (
  prefix: string = "mp",
  length: number = 32
): string => {
  const randomPart = generateSecureToken(length);
  return `${prefix}_${randomPart}`;
};

/**
 * Validate API key format
 * @param apiKey - API key to validate
 * @param expectedPrefix - Expected prefix
 * @returns Boolean indicating if format is valid
 */
export const validateApiKeyFormat = (
  apiKey: string,
  expectedPrefix: string = "mp"
): boolean => {
  const pattern = new RegExp(`^${expectedPrefix}_[A-Za-z0-9_-]{40,}$`);
  return pattern.test(apiKey);
};

/**
 * Create a time-based one-time password (TOTP) secret
 * @returns Base32 encoded secret
 */
export const generateTotpSecret = (): string => {
  const buffer = randomBytes(20);
  return buffer.toString("base64");
};

/**
 * Secure comparison of two strings to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns Boolean indicating equality
 */
export const secureCompare = (a: string, b: string): boolean => {
  try {
    const bufferA = Buffer.from(a, "utf8");
    const bufferB = Buffer.from(b, "utf8");

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    return false;
  }
};

/**
 * Generate a secure random UUID v4
 * @returns UUID v4 string
 */
export const generateUuid = (): string => {
  const bytes = randomBytes(16);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return [
    bytes.subarray(0, 4).toString("hex"),
    bytes.subarray(4, 6).toString("hex"),
    bytes.subarray(6, 8).toString("hex"),
    bytes.subarray(8, 10).toString("hex"),
    bytes.subarray(10, 16).toString("hex"),
  ].join("-");
};

/**
 * Sanitize input to prevent XSS
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"']/g, (match) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };
    return entities[match] || match;
  });
};

/**
 * Check if a string contains only safe characters
 * @param input - Input string to check
 * @param allowedChars - Additional allowed characters (regex)
 * @returns Boolean indicating if input is safe
 */
export const isSafeString = (
  input: string,
  allowedChars: RegExp = /[a-zA-Z0-9\s\-_.@]/
): boolean => {
  return allowedChars.test(input) && !/[<>\"'&]/.test(input);
};
