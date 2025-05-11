// One-time fix to apply onboarding settings to existing users
import { db } from './db';
import { users, serviceOptions } from '@shared/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';

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
      console.log("No logo URL found to apply");
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
            INSERT INTO service_options (name, church_id, created_at, updated_at)
            VALUES (${option}, ${churchId}, NOW(), NOW())
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