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
      like(users.churchLogoUrl, '%logos/%')
    );
  
  console.log(`Found ${usersWithLocalLogos.length} users with logo URLs to update`);
  
  // 2. Update each user's logo URL to use S3
  for (const user of usersWithLocalLogos) {
    if (user.churchLogoUrl) {
      // Extract filename from the path - handles both absolute and relative URLs
      let filename = '';
      
      if (user.churchLogoUrl.includes('/logos/')) {
        filename = user.churchLogoUrl.split('/logos/')[1];
      }
      
      if (!filename) {
        console.log(`Could not extract filename from URL: ${user.churchLogoUrl}`);
        continue;
      }
      
      if (!process.env.AWS_S3_BUCKET) {
        console.error('AWS_S3_BUCKET environment variable not set, cannot update to S3 URLs');
        return;
      }
      
      // Create S3 URL
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/${filename}`;
      
      // Only update if it's not already an S3 URL
      if (!user.churchLogoUrl.includes('s3.amazonaws.com')) {
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
      } else {
        console.log(`User ${user.id} already has an S3 URL: ${user.churchLogoUrl}`);
      }
    }
  }
  
  // 3. Update churches table as well
  const churchesWithLocalLogos = await db
    .select()
    .from(churches)
    .where(
      like(churches.logoUrl, '%logos/%')
    );
  
  console.log(`Found ${churchesWithLocalLogos.length} churches with logo URLs to update`);
  
  for (const church of churchesWithLocalLogos) {
    if (church.logoUrl) {
      // Extract filename from the path - handles both absolute and relative URLs
      let filename = '';
      
      if (church.logoUrl.includes('/logos/')) {
        filename = church.logoUrl.split('/logos/')[1];
      }
      
      if (!filename) {
        console.log(`Could not extract filename from URL: ${church.logoUrl}`);
        continue;
      }
      
      if (!process.env.AWS_S3_BUCKET) {
        console.error('AWS_S3_BUCKET environment variable not set, cannot update to S3 URLs');
        return;
      }
      
      // Create S3 URL
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/${filename}`;
      
      // Only update if it's not already an S3 URL
      if (!church.logoUrl.includes('s3.amazonaws.com')) {
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
      } else {
        console.log(`Church ${church.id} already has an S3 URL: ${church.logoUrl}`);
      }
    }
  }
  
  // 4. Update hardcoded URLs in email templates
  const templates = await db
    .select()
    .from(emailTemplates);
  
  console.log(`Checking ${templates.length} email templates for hardcoded URL references`);
  
  for (const template of templates) {
    if (template.bodyHtml) {
      // Replace absolute URLs to replit domain with the churchLogoUrl placeholder
      let updatedHtml = template.bodyHtml;
      
      // Look for any absolute URL patterns to logos
      const replitDomainPattern = /https:\/\/plate-sync-jspivey\.replit\.app\/logos\/[^"'\s]+/g;
      if (replitDomainPattern.test(updatedHtml)) {
        console.log(`Found replit domain URLs in template ${template.id}`);
        updatedHtml = updatedHtml.replace(
          replitDomainPattern,
          '{{churchLogoUrl}}'
        );
      }
      
      // Also check for any other absolute URLs that might be images
      const otherDomainPatterns = [
        /https:\/\/[^"'\s]+\.png/g,
        /https:\/\/[^"'\s]+\.jpg/g,
        /https:\/\/[^"'\s]+\.jpeg/g,
        /https:\/\/[^"'\s]+\.gif/g
      ];
      
      for (const pattern of otherDomainPatterns) {
        const matches = updatedHtml.match(pattern);
        if (matches && matches.length > 0) {
          // Only replace URLs that appear to be church logos
          for (const match of matches) {
            if (match.includes('/logos/') && !match.includes('s3.amazonaws.com')) {
              console.log(`Found other domain image URL in template ${template.id}: ${match}`);
              
              // Only if it's clearly a church logo, replace with placeholder
              if (match.includes('church-logo-')) {
                updatedHtml = updatedHtml.replace(match, '{{churchLogoUrl}}');
                console.log(`Replaced with {{churchLogoUrl}} placeholder`);
              }
            }
          }
        }
      }
      
      // Update the template if changes were made
      if (updatedHtml !== template.bodyHtml) {
        console.log(`Updating email template ${template.id} to use {{churchLogoUrl}} placeholder`);
        
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

// Run the function immediately when this file is executed
updateLogoUrls()
  .then(() => {
    console.log('Logo URL update completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error updating logo URLs:', error);
    process.exit(1);
  });