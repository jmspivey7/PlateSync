// One-time fix to apply onboarding settings to existing users
import { db } from './db';
import { users, serviceOptions } from '@shared/schema';
import { eq, isNull, and, sql, not, like } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * This script fixes issues where onboarding settings weren't properly applied to user accounts
 * It ensures logos and service options are properly shared with all users in a church
 */
export async function fixOnboardingSettings(userId: string) {
  console.log(`Fixing onboarding settings for user ID: ${userId}`);
  
  try {
    // 1. Get the user's information
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      return false;
    }
    
    console.log("User found:", {
      id: user.id,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
      isAccountOwner: user.isAccountOwner,
      churchLogoUrl: user.churchLogoUrl
    });
    
    // Get the churchId to use - either the user's churchId or their own ID
    const churchId = user.churchId || user.id;
    console.log(`Using churchId: ${churchId}`);
    
    // 2. Look for any logo URLs either in the user's own record or in other church members
    // IMPORTANT: Skip default logos - we only want to use custom logos
    let logoUrl = user.churchLogoUrl;
    
    // Check if current logo is a default logo and clear it if so
    if (logoUrl && (logoUrl.includes('default-church-logo') || logoUrl === '')) {
      console.log(`Found default logo: ${logoUrl}. Will search for a custom logo instead.`);
      logoUrl = null;
    }
    
    if (!logoUrl) {
      // Try to find logo from other church members (excluding default logos)
      const churchMembers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.churchId, churchId),
            sql`${users.churchLogoUrl} IS NOT NULL`,
            not(like(users.churchLogoUrl, '%default-church-logo%')), // exclude default logos
            not(eq(users.churchLogoUrl, ''))
          )
        );
      
      if (churchMembers.length > 0) {
        // Find the first non-default logo
        const validMember = churchMembers.find(m => 
          m.churchLogoUrl && 
          !m.churchLogoUrl.includes('default-church-logo') && 
          m.churchLogoUrl !== ''
        );
        
        if (validMember?.churchLogoUrl) {
          logoUrl = validMember.churchLogoUrl;
          console.log(`Found custom logo URL from another church member: ${logoUrl}`);
        }
      }
    }
    
    // 3. Update all church users with the logo if found
    if (logoUrl && !logoUrl.includes('default-church-logo') && logoUrl !== '') {
      console.log(`Applying custom logo URL to all church members: ${logoUrl}`);
      
      // Check if the file exists
      const localPath = path.join('public', logoUrl.replace(/^\/logos\//, 'logos/'));
      const fileExists = fs.existsSync(localPath);
      console.log(`Checking if logo file exists at ${localPath}: ${fileExists ? 'Yes' : 'No'}`);
      
      if (fileExists) {
        // Update the user's own record
        await db
          .update(users)
          .set({ churchLogoUrl: logoUrl })
          .where(eq(users.id, userId));
        
        // Update all users with the same churchId
        await db
          .update(users)
          .set({ churchLogoUrl: logoUrl })
          .where(eq(users.churchId, churchId));
        
        console.log("Custom logo URL updated for all church members");
        return true;
      } else {
        console.log("Logo file doesn't exist on disk. Will search for another logo.");
        logoUrl = null;
      }
    } else {
      console.log("No custom logo URL found in database. Looking for uploaded logo files...");
    }
    
    // If we don't have a valid logo URL at this point, search for uploaded files
    if (!logoUrl) {
      // Check both by timestamp and any custom uploaded file
      const userCreatedAt = user.createdAt?.getTime() || Date.now();
      
      // Search for logos uploaded around user creation time
      const logoTimestampPrefix = Math.floor(userCreatedAt / 1000);
      console.log(`Looking for logo files uploaded around: ${logoTimestampPrefix} (user created: ${new Date(userCreatedAt).toISOString()})`);
      
      try {
        // First look for church-specific logo files in the logos directory
        console.log("Looking for custom uploaded logo files in public/logos/");
        if (!fs.existsSync('public/logos/')) {
          fs.mkdirSync('public/logos/', { recursive: true });
        }
        
        const allLogos = fs.readdirSync('public/logos/')
          .filter(filename => 
            filename.includes('church-logo-') && 
            filename.endsWith('.png') && 
            !filename.includes('default')
          )
          .map(filename => ({
            filename,
            path: `/logos/${filename}`,
            timestamp: parseInt(filename.split('-')[2]) || 0,
            stats: fs.statSync(`public/logos/${filename}`),
            // Calculate timestamp difference from user creation
            timeDiff: Math.abs(
              (fs.statSync(`public/logos/${filename}`).mtimeMs / 1000) - 
              (userCreatedAt / 1000)
            )
          }));

        console.log(`Found ${allLogos.length} custom logo files`);
        
        if (allLogos.length > 0) {
          // Sort by closest upload time to user creation
          const sortedLogos = [...allLogos].sort((a, b) => a.timeDiff - b.timeDiff);
          
          // Use the logo with closest timestamp to user creation
          const bestMatchLogo = sortedLogos[0];
          console.log(`Found best matching logo: ${bestMatchLogo.path} (upload time diff: ${bestMatchLogo.timeDiff.toFixed(2)} seconds)`);
          
          // Update the user record
          await db
            .update(users)
            .set({ churchLogoUrl: bestMatchLogo.path })
            .where(eq(users.id, userId));
          
          // Update all users with this churchId
          if (churchId) {
            await db
              .update(users)
              .set({ churchLogoUrl: bestMatchLogo.path })
              .where(eq(users.churchId, churchId));
          }
          
          console.log(`Applied best matching logo: ${bestMatchLogo.path} to all church members`);
          return true;
        } else {
          console.log("No custom logo files found. User will need to upload a logo in settings.");
        }
      } catch (fsError) {
        console.error("Error searching for logo files:", fsError);
      }
    }
    
    // 4. Check for service options - DON'T create defaults during registration
    // The user's chosen service options from the onboarding flow should be the only ones
    const existingOptions = await db
      .select()
      .from(serviceOptions)
      .where(eq(serviceOptions.churchId, churchId));
    
    console.log(`Found ${existingOptions.length} existing service options for church ${churchId}`);
    
    // Only create defaults if this is NOT part of a registration flow
    // (Registration should only use service options explicitly chosen by the user)
    if (existingOptions.length === 0) {
      console.log("No service options found, but NOT creating defaults during registration flow");
      console.log("Service options should be created only by user choice during onboarding");
    }
    
    console.log("Settings fix completed successfully");
    return true;
  } catch (error) {
    console.error("Error fixing onboarding settings:", error);
    return false;
  }
}