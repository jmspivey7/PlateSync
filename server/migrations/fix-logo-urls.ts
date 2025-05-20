import { db } from '../db';
import { users, churches } from '../../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Fixes church logo URLs by converting relative URLs to absolute URLs
 * This ensures the email templates can properly display church logos
 */
export async function fixLogoUrls(baseUrl: string): Promise<{
  usersFixed: number;
  churchesFixed: number;
  churchesUpdated: number;
}> {
  console.log('🔧 Starting logo URL migration - converting relative URLs to absolute URLs');
  console.log(`Using base URL: ${baseUrl}`);
  
  try {
    // First, fix user records with relative logo URLs
    const fixUsersResult = await db.execute(sql`
      UPDATE users 
      SET 
        church_logo_url = ${baseUrl} || church_logo_url,
        updated_at = NOW()
      WHERE 
        church_logo_url IS NOT NULL 
        AND church_logo_url LIKE '/logos/%'
        AND church_logo_url NOT LIKE 'http%'
    `);
    
    // Then, fix churches table records with relative logo URLs
    const fixChurchesResult = await db.execute(sql`
      UPDATE churches 
      SET 
        logo_url = ${baseUrl} || logo_url,
        updated_at = NOW()
      WHERE 
        logo_url IS NOT NULL 
        AND logo_url LIKE '/logos/%'
        AND logo_url NOT LIKE 'http%'
    `);
    
    // Now, sync church logo URLs from users table to churches table where logo_url is NULL
    console.log('Syncing church logos from user records to churches table...');
    
    // First, get all users with church logo URLs
    const usersWithLogos = await db.select({
      id: users.id,
      churchLogoUrl: users.churchLogoUrl,
      role: users.role
    })
    .from(users)
    .where(sql`${users.churchLogoUrl} IS NOT NULL`);
    
    console.log(`Found ${usersWithLogos.length} users with logo URLs`);
    
    // Then update churches with NULL logo_url
    let updatedCount = 0;
    for (const user of usersWithLogos) {
      // Use raw SQL for more direct control
      const result = await db.execute(sql`
        UPDATE churches 
        SET 
          logo_url = ${user.churchLogoUrl},
          updated_at = NOW()
        WHERE 
          id = ${user.id}
          AND (logo_url IS NULL OR logo_url = '')
      `);
      
      if (result && 'rowCount' in result && result.rowCount > 0) {
        updatedCount += result.rowCount;
        console.log(`Updated church ${user.id} with logo URL: ${user.churchLogoUrl}`);
      }
    }
    
    const syncChurchLogosResult = { rowCount: updatedCount };
    
    // Count affected records
    const usersFixed = typeof fixUsersResult === 'object' && 'rowCount' in fixUsersResult 
                     ? fixUsersResult.rowCount 
                     : Array.isArray(fixUsersResult) ? fixUsersResult.length : 0;
                      
    const churchesFixed = typeof fixChurchesResult === 'object' && 'rowCount' in fixChurchesResult 
                        ? fixChurchesResult.rowCount 
                        : Array.isArray(fixChurchesResult) ? fixChurchesResult.length : 0;
                        
    const churchesUpdated = typeof syncChurchLogosResult === 'object' && 'rowCount' in syncChurchLogosResult 
                          ? syncChurchLogosResult.rowCount 
                          : Array.isArray(syncChurchLogosResult) ? syncChurchLogosResult.length : 0;
    
    console.log(`✅ Logo URL migration complete: Fixed ${usersFixed} user records, ${churchesFixed} church records with relative paths, and updated ${churchesUpdated} church records with NULL logo URLs`);
    
    return {
      usersFixed: typeof usersFixed === 'number' ? usersFixed : 0,
      churchesFixed: typeof churchesFixed === 'number' ? churchesFixed : 0,
      churchesUpdated: typeof churchesUpdated === 'number' ? churchesUpdated : 0
    };
  } catch (error) {
    console.error('❌ Error during logo URL migration:', error);
    throw error;
  }
}