const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

async function generateHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  const hash = `${buf.toString('hex')}:${salt}`;
  console.log('Password:', password);
  console.log('Hash:', hash);
  return hash;
}

generateHash('Password123!').then(() => process.exit(0));