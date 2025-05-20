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
}> {
  console.log('🔧 Starting logo URL migration - converting relative URLs to absolute URLs');
  
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
    `);
    
    // Count affected records
    const usersFixed = Array.isArray(fixUsersResult) ? fixUsersResult.length : 
                      'rowCount' in fixUsersResult ? fixUsersResult.rowCount : 0;
                      
    const churchesFixed = Array.isArray(fixChurchesResult) ? fixChurchesResult.length : 
                         'rowCount' in fixChurchesResult ? fixChurchesResult.rowCount : 0;
    
    console.log(`✅ Logo URL migration complete: Fixed ${usersFixed} user records and ${churchesFixed} church records`);
    
    return {
      usersFixed: typeof usersFixed === 'number' ? usersFixed : 0,
      churchesFixed: typeof churchesFixed === 'number' ? churchesFixed : 0
    };
  } catch (error) {
    console.error('❌ Error during logo URL migration:', error);
    throw error;
  }
}