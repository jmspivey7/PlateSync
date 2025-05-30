import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function generateHash() {
  const password = 'Test1234';
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  const hash = buf.toString('hex') + ':' + salt;
  console.log(hash);
}

generateHash().catch(console.error);