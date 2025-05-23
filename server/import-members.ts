import { db } from './db';
import { members } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface MemberRecord {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface ImportResult {
  importedCount: number;
  duplicatesSkipped: number;
}

export async function importMembers(records: MemberRecord[], churchId: string): Promise<ImportResult> {
  let importedCount = 0;
  let duplicatesSkipped = 0;
  
  console.log(`Starting member import for church ${churchId} with ${records.length} records`);
  
  // Process members one by one to handle duplicates properly
  for (const record of records) {
    try {
      // Set up basic member data
      const memberData = {
        firstName: record.firstName.trim(),
        lastName: record.lastName.trim(),
        email: record.email?.trim() || null,
        phone: record.phone?.trim() || null,
        notes: record.notes?.trim() || null,
        churchId: churchId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Check for duplicate based on first name, last name and email (if available)
      let isDuplicate = false;
      
      if (memberData.email) {
        // Check by email first if available
        const existingMemberByEmail = await db.select()
          .from(members)
          .where(
            and(
              eq(members.churchId, churchId),
              eq(members.email, memberData.email)
            )
          );
          
        if (existingMemberByEmail.length > 0) {
          console.log(`Skipping duplicate member with email ${memberData.email}`);
          duplicatesSkipped++;
          isDuplicate = true;
        }
      }
      
      // If not a duplicate by email, check by first name and last name
      if (!isDuplicate) {
        const existingMemberByName = await db.select()
          .from(members)
          .where(
            and(
              eq(members.churchId, churchId),
              eq(members.firstName, memberData.firstName),
              eq(members.lastName, memberData.lastName)
            )
          );
          
        if (existingMemberByName.length > 0) {
          console.log(`Skipping duplicate member with name ${memberData.firstName} ${memberData.lastName}`);
          duplicatesSkipped++;
          isDuplicate = true;
        }
      }
      
      // If not a duplicate, insert the new member
      if (!isDuplicate) {
        try {
          await db.insert(members).values(memberData);
          importedCount++;
          console.log(`✅ Successfully imported member: ${memberData.firstName} ${memberData.lastName}`);
        } catch (insertError: any) {
          // Handle unique constraint violations as duplicates
          if (insertError.code === '23505' && insertError.constraint === 'members_email_unique') {
            console.log(`Skipping duplicate member with email ${memberData.email} (constraint violation)`);
            duplicatesSkipped++;
          } else {
            console.error(`Error importing member ${record.firstName} ${record.lastName}:`, insertError);
            // Continue processing other records even if one fails
          }
        }
      }
    } catch (error) {
      console.error(`Error processing member ${record.firstName} ${record.lastName}:`, error);
      // Continue processing other records even if one fails
    }
  }
  
  console.log(`Import completed: ${importedCount} members imported, ${duplicatesSkipped} duplicates skipped`);
  
  return {
    importedCount,
    duplicatesSkipped
  };
}