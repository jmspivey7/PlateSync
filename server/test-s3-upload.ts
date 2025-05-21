// Test script for S3 upload functionality
import { uploadFileToS3, getS3KeyFromFilename } from './services/s3';
import path from 'path';
import fs from 'fs';

async function testS3Upload() {
  try {
    // Path to existing logo
    const logoPath = path.resolve(process.cwd(), 'public/logos/church-logo-1747841573548-217531304.png');
    
    if (!fs.existsSync(logoPath)) {
      console.error(`Logo file does not exist at path: ${logoPath}`);
      return;
    }
    
    console.log(`Found logo file at: ${logoPath}`);
    console.log(`File size: ${fs.statSync(logoPath).size} bytes`);
    
    // Create S3 key from the filename
    const filename = path.basename(logoPath);
    const s3Key = getS3KeyFromFilename(filename);
    
    console.log(`Using S3 key: ${s3Key}`);
    
    // Upload the file to S3
    console.log('Starting S3 upload...');
    const s3Url = await uploadFileToS3(
      logoPath, 
      s3Key,
      'image/png'
    );
    
    console.log(`✅ Logo successfully uploaded to S3: ${s3Url}`);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testS3Upload();