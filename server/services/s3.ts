import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const bucketName = process.env.AWS_S3_BUCKET!;

// Validate the AWS credentials and S3 bucket configuration
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || 
    !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
  console.error('⚠️ AWS S3 configuration not complete. Check environment variables.');
}

/**
 * Upload a file to S3 from a local path
 */
export async function uploadFileToS3(
  localFilePath: string, 
  s3Key: string, 
  contentType: string = 'image/png'
): Promise<string> {
  try {
    const fileContent = fs.readFileSync(localFilePath);
    
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read' // Make the file publicly accessible
    };
    
    await s3Client.send(new PutObjectCommand(params));
    
    // Return the public URL to the uploaded file
    const s3Url = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
    console.log(`✅ File successfully uploaded to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error(`❌ Error uploading file to S3: ${error}`);
    throw error;
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(s3Key: string): Promise<void> {
  try {
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };
    
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`✅ File successfully deleted from S3: ${s3Key}`);
  } catch (error) {
    console.error(`❌ Error deleting file from S3: ${error}`);
    throw error;
  }
}

/**
 * Get a file from S3 and stream it to a local file
 */
export async function downloadFileFromS3(s3Key: string, localFilePath: string): Promise<string> {
  try {
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };
    
    const { Body } = await s3Client.send(new GetObjectCommand(params));
    
    if (Body instanceof Readable) {
      // Create the directory if it doesn't exist
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Stream the file to disk
      const writeStream = fs.createWriteStream(localFilePath);
      
      return new Promise((resolve, reject) => {
        (Body as Readable).pipe(writeStream)
          .on('error', err => {
            reject(err);
          })
          .on('finish', () => {
            resolve(localFilePath);
          });
      });
    } else {
      throw new Error('Response body is not a readable stream');
    }
  } catch (error) {
    console.error(`❌ Error downloading file from S3: ${error}`);
    throw error;
  }
}

/**
 * Check if a file exists in S3
 */
export async function fileExistsInS3(s3Key: string): Promise<boolean> {
  try {
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };
    
    await s3Client.send(new GetObjectCommand(params));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate an S3 URL for a given key
 */
export function getS3Url(s3Key: string): string {
  return `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
}

/**
 * Extract the S3 key from an S3 URL
 */
export function getKeyFromS3Url(s3Url: string): string | null {
  const regex = new RegExp(`https?://${bucketName}.s3.amazonaws.com/(.+)`);
  const match = s3Url.match(regex);
  return match ? match[1] : null;
}

/**
 * Get S3 key from a filename, adding the logos prefix
 */
export function getS3KeyFromFilename(filename: string): string {
  // Remove any leading path components and get just the filename
  const baseFilename = path.basename(filename);
  // Add the logos/ prefix to the key for organization in the S3 bucket
  return `logos/${baseFilename}`;
}