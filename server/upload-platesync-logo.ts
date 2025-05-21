import { uploadFileToS3, getS3KeyFromFilename } from './services/s3';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { emailTemplates } from '@shared/schema';
import { like, sql } from 'drizzle-orm';

async function uploadPlateSyncLogo() {
  console.log('Starting PlateSync logo upload to S3...');
  
  // Define logo paths to check
  const possibleLogoPaths = [
    'public/assets/logo-with-text.png',
    'public/email-templates/logo-with-text.png',
    'public/assets/platesync-logo.png'
  ];
  
  // Find the first logo that exists
  let logoPath = '';
  for (const path of possibleLogoPaths) {
    if (fs.existsSync(path)) {
      logoPath = path;
      console.log(`Found logo at: ${logoPath}`);
      break;
    }
  }
  
  if (!logoPath) {
    console.error('Could not find PlateSync logo file.');
    return;
  }
  
  // Create a sanitized filename
  const filename = path.basename(logoPath);
  const s3Key = getS3KeyFromFilename(filename);
  
  try {
    // Upload to S3
    const s3Url = await uploadFileToS3(
      logoPath,
      s3Key,
      'image/png'
    );
    
    console.log(`Successfully uploaded PlateSync logo to S3: ${s3Url}`);
    
    // Update email templates that use PlateSync logo
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(
        sql`${emailTemplates.bodyHtml} LIKE '%platesync.replit.app/logo-with-text.png%' OR 
            ${emailTemplates.bodyHtml} LIKE '%plate-sync-jspivey.replit.app/logo-with-text.png%'`
      );
    
    console.log(`Found ${templates.length} templates with PlateSync logo references`);
    
    for (const template of templates) {
      if (template.bodyHtml) {
        // Replace all instances of the logo URL with the S3 URL
        let updatedHtml = template.bodyHtml;
        
        // Replace all variations of the URL
        const patterns = [
          'https://platesync.replit.app/logo-with-text.png',
          'https://plate-sync-jspivey.replit.app/logo-with-text.png',
          'https://plate-sync-jspivey.replit.app/assets/logo-with-text.png',
          '/logo-with-text.png',
          '/assets/logo-with-text.png'
        ];
        
        for (const pattern of patterns) {
          if (updatedHtml.includes(pattern)) {
            console.log(`Replacing pattern '${pattern}' in template ${template.id}`);
            updatedHtml = updatedHtml.replace(new RegExp(pattern, 'g'), s3Url);
          }
        }
        
        // Update the template if changes were made
        if (updatedHtml !== template.bodyHtml) {
          console.log(`Updating email template ${template.id} with S3 logo URL`);
          
          await db
            .update(emailTemplates)
            .set({
              bodyHtml: updatedHtml,
              updatedAt: new Date()
            })
            .where(sql`id = ${template.id}`);
            
          console.log(`Template ${template.id} updated successfully`);
        }
      }
    }
    
    console.log('PlateSync logo update completed successfully!');
    return s3Url;
  } catch (error) {
    console.error('Error uploading PlateSync logo to S3:', error);
    throw error;
  }
}

// Run the function immediately
uploadPlateSyncLogo()
  .then((url) => {
    console.log(`PlateSync logo upload completed. URL: ${url}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error updating PlateSync logo:', error);
    process.exit(1);
  });