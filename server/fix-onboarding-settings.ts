// One-time fix to apply onboarding settings to existing users
import { db } from './db';
import { users, serviceOptions } from '@shared/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';
import * as fs from 'fs';

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
      isMasterAdmin: user.isMasterAdmin,
      churchLogoUrl: user.churchLogoUrl
    });
    
    // Get the churchId to use - either the user's churchId or their own ID
    const churchId = user.churchId || user.id;
    console.log(`Using churchId: ${churchId}`);
    
    // 2. Look for any logo URLs either in the user's own record or in other church members
    let logoUrl = user.churchLogoUrl;
    
    if (!logoUrl) {
      // Try to find logo from other church members
      const [churchMember] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.churchId, churchId),
            sql`${users.churchLogoUrl} IS NOT NULL`
          )
        );
      
      if (churchMember?.churchLogoUrl) {
        logoUrl = churchMember.churchLogoUrl;
        console.log(`Found logo URL from another church member: ${logoUrl}`);
      }
    }
    
    // 3. Update all church users with the logo if found
    if (logoUrl) {
      console.log(`Applying logo URL to all church members: ${logoUrl}`);
      
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
      
      console.log("Logo URL updated for all church members");
    } else {
      console.log("No logo URL found in database. Looking for uploaded logo files from the same timeframe...");
      
      // Check if this user had a recent upload by looking at the creation time
      // Find files that may have been uploaded within 15 minutes of user creation
      const userCreatedAt = user.createdAt?.getTime() || Date.now();
      
      // Search for logos uploaded 15 minutes before/after user creation
      const logoTimestampPrefix = Math.floor(userCreatedAt / 1000);
      console.log(`Looking for logo files with timestamp around: ${logoTimestampPrefix} (user created: ${new Date(userCreatedAt).toISOString()})`);
      
      // List the most recent logo files
      try {
        // Get list of recent PNG files (these are likely to be uploads)
        console.log("Looking for recently uploaded logo files in public/logos/");
        const recentLogos = fs.readdirSync('public/logos/')
          .filter(filename => filename.includes('church-logo-') && filename.endsWith('.png'))
          .map(filename => ({
            filename,
            path: `/logos/${filename}`,
            timestamp: parseInt(filename.split('-')[2]) || 0
          }))
          .sort((a, b) => Math.abs(logoTimestampPrefix - a.timestamp) - Math.abs(logoTimestampPrefix - b.timestamp));
          
        console.log(`Found ${recentLogos.length} logo files, sorted by closest timestamp to user creation`);
        
        // If we found any logo files, use the one closest to user creation time
        if (recentLogos.length > 0) {
          const matchingLogo = recentLogos[0];
          console.log(`Using logo with closest timestamp: ${matchingLogo.path}, created ${Math.abs(logoTimestampPrefix - matchingLogo.timestamp)} seconds from user creation`);
          
          // Update the user's own record with the logo we found
          await db
            .update(users)
            .set({ churchLogoUrl: matchingLogo.path })
            .where(eq(users.id, userId));
          
          // Update all users with the same churchId with this logo
          if (churchId) {
            await db
              .update(users)
              .set({ churchLogoUrl: matchingLogo.path })
              .where(eq(users.churchId, churchId));
          }
          
          console.log(`Restored likely original logo: ${matchingLogo.path}`);
          return true;
        }
      } catch (fsError) {
        console.error("Error searching for logo files:", fsError);
      }
      
      console.log("No suitable logo file found. User will need to upload a logo in settings.");
    }
    
    // 4. Check for service options
    const existingOptions = await db
      .select()
      .from(serviceOptions)
      .where(eq(serviceOptions.churchId, churchId));
    
    if (existingOptions.length === 0) {
      console.log("No service options found, creating defaults");
      
      // Create default service options
      const defaultOptions = ['Sunday Morning', 'Sunday Evening', 'Wednesday Night'];
      
      // Get the schema for service options
      const serviceOptionFields = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'service_options'
      `);
      
      console.log("Service option schema fields:", serviceOptionFields);
      
      for (const option of defaultOptions) {
        try {
          // Direct SQL insert to avoid schema issues
          await db.execute(sql`
            INSERT INTO service_options (name, value, church_id, created_at, updated_at)
            VALUES (${option}, ${option}, ${churchId}, NOW(), NOW())
          `);
          console.log(`Service option '${option}' created successfully`);
        } catch (insertError) {
          console.error(`Error inserting service option '${option}':`, insertError);
        }
      }
      
      console.log("Default service options created");
    } else {
      console.log(`Found ${existingOptions.length} existing service options`);
    }
    
    console.log("Settings fix completed successfully");
    return true;
  } catch (error) {
    console.error("Error fixing onboarding settings:", error);
    return false;
  }
}