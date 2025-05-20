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
    const syncChurchLogosResult = await db.execute(sql`
      UPDATE churches c
      SET 
        logo_url = u.church_logo_url,
        updated_at = NOW()
      FROM 
        users u
      WHERE 
        c.id = u.id
        AND u.church_logo_url IS NOT NULL
        AND u.role = 'ACCOUNT_OWNER'
        AND (c.logo_url IS NULL OR c.logo_url = '')
    `);
    
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