import { db } from './db';
import { users, churches, emailTemplates } from '@shared/schema';
import { eq, like } from 'drizzle-orm';
import path from 'path';

/**
 * This script updates logo URLs in the database to use S3 URLs instead of relative paths
 * It ensures all emails will use S3 URLs for better delivery
 */
async function updateLogoUrls() {
  console.log('Starting logo URL update process...');
  
  // 1. Get all users with logo URLs that don't use S3
  const usersWithLocalLogos = await db
    .select()
    .from(users)
    .where(
      like(users.churchLogoUrl, '/logos/%')
    );
  
  console.log(`Found ${usersWithLocalLogos.length} users with local logo URLs`);
  
  // 2. Update each user's logo URL to use S3
  for (const user of usersWithLocalLogos) {
    if (user.churchLogoUrl && user.churchLogoUrl.startsWith('/logos/')) {
      // Extract filename from the path
      const filename = path.basename(user.churchLogoUrl);
      
      if (!process.env.AWS_S3_BUCKET) {
        console.error('AWS_S3_BUCKET environment variable not set, cannot update to S3 URLs');
        return;
      }
      
      // Create S3 URL
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/${filename}`;
      
      console.log(`Updating user ${user.id} logo URL:`);
      console.log(`  From: ${user.churchLogoUrl}`);
      console.log(`  To:   ${s3Url}`);
      
      // Update the user record
      await db
        .update(users)
        .set({ 
          churchLogoUrl: s3Url,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
    }
  }
  
  // 3. Update churches table as well
  const churchesWithLocalLogos = await db
    .select()
    .from(churches)
    .where(
      like(churches.logoUrl, '/logos/%')
    );
  
  console.log(`Found ${churchesWithLocalLogos.length} churches with local logo URLs`);
  
  for (const church of churchesWithLocalLogos) {
    if (church.logoUrl && church.logoUrl.startsWith('/logos/')) {
      // Extract filename from the path
      const filename = path.basename(church.logoUrl);
      
      if (!process.env.AWS_S3_BUCKET) {
        console.error('AWS_S3_BUCKET environment variable not set, cannot update to S3 URLs');
        return;
      }
      
      // Create S3 URL
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/${filename}`;
      
      console.log(`Updating church ${church.id} logo URL:`);
      console.log(`  From: ${church.logoUrl}`);
      console.log(`  To:   ${s3Url}`);
      
      // Update the church record
      await db
        .update(churches)
        .set({ 
          logoUrl: s3Url,
          updatedAt: new Date()
        })
        .where(eq(churches.id, church.id));
    }
  }
  
  // 4. Update hardcoded URLs in email templates
  const templates = await db
    .select()
    .from(emailTemplates)
    .where(
      like(emailTemplates.bodyHtml, '%plate-sync-jspivey.replit.app/logos/%')
    );
  
  console.log(`Found ${templates.length} email templates with hardcoded logo URLs`);
  
  for (const template of templates) {
    if (template.bodyHtml) {
      // Replace any URLs that use the replit domain with the churchLogoUrl placeholder
      const updatedHtml = template.bodyHtml.replace(
        /https:\/\/plate-sync-jspivey\.replit\.app\/logos\/[^"'\s]+/g,
        '{{churchLogoUrl}}'
      );
      
      if (updatedHtml !== template.bodyHtml) {
        console.log(`Updating email template ${template.id} to use {{churchLogoUrl}} placeholder`);
        
        // Update the template
        await db
          .update(emailTemplates)
          .set({
            bodyHtml: updatedHtml,
            updatedAt: new Date()
          })
          .where(eq(emailTemplates.id, template.id));
      }
    }
  }
  
  console.log('Logo URL update process completed successfully!');
}

// Export the function for use in API routes
export { updateLogoUrls };

// Run the function if this file is executed directly
if (require.main === module) {
  updateLogoUrls()
    .then(() => {
      console.log('Logo URL update completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error updating logo URLs:', error);
      process.exit(1);
    });
}