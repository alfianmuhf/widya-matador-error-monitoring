import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Hash plain text password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare plain text password with hashed password.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
