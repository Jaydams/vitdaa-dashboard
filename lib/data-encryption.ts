import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Generates a secure encryption key from environment variable
 * @returns Buffer containing the encryption key
 */
function getEncryptionKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY environment variable is required");
  }

  // If key is hex-encoded, decode it
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }

  // Otherwise, hash the key to get consistent 32-byte key
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encryptSensitiveData(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from("staff-management-data"));

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    const result = {
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      encrypted: encrypted,
    };

    return Buffer.from(JSON.stringify(result)).toString("base64");
  } catch (error) {
    console.error("Error encrypting sensitive data:", error);
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * Decrypts sensitive data using AES-256-GCM
 * @param encryptedData - The encrypted data to decrypt
 * @returns Decrypted plaintext
 */
export function decryptSensitiveData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const data = JSON.parse(Buffer.from(encryptedData, "base64").toString());

    const iv = Buffer.from(data.iv, "hex");
    const authTag = Buffer.from(data.authTag, "hex");
    const encrypted = data.encrypted;

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from("staff-management-data"));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Error decrypting sensitive data:", error);
    throw new Error("Failed to decrypt sensitive data");
  }
}

/**
 * Encrypts salary information
 * @param salaryData - Salary data object
 * @returns Encrypted salary data
 */
export function encryptSalaryData(salaryData: {
  base_salary?: number;
  hourly_rate?: number;
  commission_rate?: number;
  bonus_amount?: number;
}): {
  base_salary_encrypted?: string;
  hourly_rate_encrypted?: string;
  commission_rate_encrypted?: string;
  bonus_amount_encrypted?: string;
} {
  const encrypted: any = {};

  if (salaryData.base_salary !== undefined) {
    encrypted.base_salary_encrypted = encryptSensitiveData(
      salaryData.base_salary.toString()
    );
  }

  if (salaryData.hourly_rate !== undefined) {
    encrypted.hourly_rate_encrypted = encryptSensitiveData(
      salaryData.hourly_rate.toString()
    );
  }

  if (salaryData.commission_rate !== undefined) {
    encrypted.commission_rate_encrypted = encryptSensitiveData(
      salaryData.commission_rate.toString()
    );
  }

  if (salaryData.bonus_amount !== undefined) {
    encrypted.bonus_amount_encrypted = encryptSensitiveData(
      salaryData.bonus_amount.toString()
    );
  }

  return encrypted;
}

/**
 * Decrypts salary information
 * @param encryptedSalaryData - Encrypted salary data
 * @returns Decrypted salary data
 */
export function decryptSalaryData(encryptedSalaryData: {
  base_salary_encrypted?: string;
  hourly_rate_encrypted?: string;
  commission_rate_encrypted?: string;
  bonus_amount_encrypted?: string;
}): {
  base_salary?: number;
  hourly_rate?: number;
  commission_rate?: number;
  bonus_amount?: number;
} {
  const decrypted: any = {};

  if (encryptedSalaryData.base_salary_encrypted) {
    decrypted.base_salary = parseFloat(
      decryptSensitiveData(encryptedSalaryData.base_salary_encrypted)
    );
  }

  if (encryptedSalaryData.hourly_rate_encrypted) {
    decrypted.hourly_rate = parseFloat(
      decryptSensitiveData(encryptedSalaryData.hourly_rate_encrypted)
    );
  }

  if (encryptedSalaryData.commission_rate_encrypted) {
    decrypted.commission_rate = parseFloat(
      decryptSensitiveData(encryptedSalaryData.commission_rate_encrypted)
    );
  }

  if (encryptedSalaryData.bonus_amount_encrypted) {
    decrypted.bonus_amount = parseFloat(
      decryptSensitiveData(encryptedSalaryData.bonus_amount_encrypted)
    );
  }

  return decrypted;
}

/**
 * Encrypts personal information
 * @param personalData - Personal data object
 * @returns Encrypted personal data
 */
export function encryptPersonalData(personalData: {
  date_of_birth?: string;
  address?: object;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  employee_id?: string;
}): {
  date_of_birth_encrypted?: string;
  address_encrypted?: string;
  emergency_contact_name_encrypted?: string;
  emergency_contact_phone_encrypted?: string;
  employee_id_encrypted?: string;
} {
  const encrypted: any = {};

  if (personalData.date_of_birth) {
    encrypted.date_of_birth_encrypted = encryptSensitiveData(
      personalData.date_of_birth
    );
  }

  if (personalData.address) {
    encrypted.address_encrypted = encryptSensitiveData(
      JSON.stringify(personalData.address)
    );
  }

  if (personalData.emergency_contact_name) {
    encrypted.emergency_contact_name_encrypted = encryptSensitiveData(
      personalData.emergency_contact_name
    );
  }

  if (personalData.emergency_contact_phone) {
    encrypted.emergency_contact_phone_encrypted = encryptSensitiveData(
      personalData.emergency_contact_phone
    );
  }

  if (personalData.employee_id) {
    encrypted.employee_id_encrypted = encryptSensitiveData(
      personalData.employee_id
    );
  }

  return encrypted;
}

/**
 * Decrypts personal information
 * @param encryptedPersonalData - Encrypted personal data
 * @returns Decrypted personal data
 */
export function decryptPersonalData(encryptedPersonalData: {
  date_of_birth_encrypted?: string;
  address_encrypted?: string;
  emergency_contact_name_encrypted?: string;
  emergency_contact_phone_encrypted?: string;
  employee_id_encrypted?: string;
}): {
  date_of_birth?: string;
  address?: object;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  employee_id?: string;
} {
  const decrypted: any = {};

  if (encryptedPersonalData.date_of_birth_encrypted) {
    decrypted.date_of_birth = decryptSensitiveData(
      encryptedPersonalData.date_of_birth_encrypted
    );
  }

  if (encryptedPersonalData.address_encrypted) {
    decrypted.address = JSON.parse(
      decryptSensitiveData(encryptedPersonalData.address_encrypted)
    );
  }

  if (encryptedPersonalData.emergency_contact_name_encrypted) {
    decrypted.emergency_contact_name = decryptSensitiveData(
      encryptedPersonalData.emergency_contact_name_encrypted
    );
  }

  if (encryptedPersonalData.emergency_contact_phone_encrypted) {
    decrypted.emergency_contact_phone = decryptSensitiveData(
      encryptedPersonalData.emergency_contact_phone_encrypted
    );
  }

  if (encryptedPersonalData.employee_id_encrypted) {
    decrypted.employee_id = decryptSensitiveData(
      encryptedPersonalData.employee_id_encrypted
    );
  }

  return decrypted;
}

/**
 * Hashes sensitive data for search/comparison purposes
 * @param data - Data to hash
 * @returns SHA-256 hash of the data
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generates a secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Validates if data appears to be encrypted
 * @param data - Data to validate
 * @returns True if data appears to be encrypted
 */
export function isEncryptedData(data: string): boolean {
  try {
    // Check if it's base64 encoded
    const decoded = Buffer.from(data, "base64").toString();
    const parsed = JSON.parse(decoded);

    // Check if it has the expected structure
    return !!(parsed.iv && parsed.authTag && parsed.encrypted);
  } catch {
    return false;
  }
}
