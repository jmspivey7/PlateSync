import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function testPassword() {
  // The stored password from database
  const storedPassword = "022f6a769e99e07a2c1a58b9216bf72973b565817f1eede6ee4090e2d763ced377fae93207fd7dc5f4abd47255a9fe22aa1c96971223b92bbbb03e12e4eb0a3e:de9fe5460e3bea95512f9216a4c6355a";
  
  // Extract salt from stored password
  const [storedHash, salt] = storedPassword.split(":");
  
  console.log("Stored hash:", storedHash);
  console.log("Salt:", salt);
  
  // Test different possible passwords
  const testPasswords = ["Test1234", "test1234", "TEST1234"];
  
  for (const testPassword of testPasswords) {
    console.log(`\nTesting password: "${testPassword}"`);
    
    try {
      const hashedBuf = Buffer.from(storedHash, "hex");
      const suppliedBuf = await scryptAsync(testPassword, salt, 64);
      const matches = timingSafeEqual(hashedBuf, suppliedBuf);
      
      console.log(`Result: ${matches}`);
      if (matches) {
        console.log(`✅ MATCH FOUND: "${testPassword}"`);
        return;
      }
    } catch (error) {
      console.log(`Error testing "${testPassword}":`, error.message);
    }
  }
  
  console.log("\n❌ No matching password found");
}

testPassword().catch(console.error);