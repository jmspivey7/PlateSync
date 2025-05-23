import { db } from "./db";
import { members, churchMembers } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
  
  console.log(`Starting import of ${records.length} members for church ${churchId}`);
  
  for (const record of records) {
    try {
      const memberData = {
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email || null,
        phone: record.phone || null,
        notes: record.notes || null,
        isVisitor: false,
      };

      let isDuplicate = false;
      let existingMemberId: number | null = null;

      // Check for duplicates by email first (if email exists)
      if (memberData.email) {
        const existingMemberByEmail = await db.select()
          .from(members)
          .where(eq(members.email, memberData.email));
          
        if (existingMemberByEmail.length > 0) {
          existingMemberId = existingMemberByEmail[0].id;
          
          // Check if this member is already associated with this church
          const existingChurchMembership = await db.select()
            .from(churchMembers)
            .where(
              and(
                eq(churchMembers.churchId, churchId),
                eq(churchMembers.memberId, existingMemberId)
              )
            );
            
          if (existingChurchMembership.length > 0) {
            console.log(`Skipping duplicate member with email ${memberData.email} - already associated with this church`);
            duplicatesSkipped++;
            isDuplicate = true;
          } else {
            // Member exists but not associated with this church - we'll add the association
            console.log(`Found existing member with email ${memberData.email} - adding to church ${churchId}`);
          }
        }
      }

      // If not found by email, check by first name and last name
      if (!isDuplicate && !existingMemberId) {
        const existingMemberByName = await db.select()
          .from(members)
          .where(
            and(
              eq(members.firstName, memberData.firstName),
              eq(members.lastName, memberData.lastName)
            )
          );
          
        if (existingMemberByName.length > 0) {
          existingMemberId = existingMemberByName[0].id;
          
          // Check if this member is already associated with this church
          const existingChurchMembership = await db.select()
            .from(churchMembers)
            .where(
              and(
                eq(churchMembers.churchId, churchId),
                eq(churchMembers.memberId, existingMemberId)
              )
            );
            
          if (existingChurchMembership.length > 0) {
            console.log(`Skipping duplicate member with name ${memberData.firstName} ${memberData.lastName} - already associated with this church`);
            duplicatesSkipped++;
            isDuplicate = true;
          } else {
            // Member exists but not associated with this church - we'll add the association
            console.log(`Found existing member with name ${memberData.firstName} ${memberData.lastName} - adding to church ${churchId}`);
          }
        }
      }
      
      // If not a duplicate, process the member
      if (!isDuplicate) {
        try {
          // If we found an existing member, use their ID, otherwise create new member
          if (existingMemberId) {
            // Add existing member to this church
            await db.insert(churchMembers).values({
              churchId: churchId,
              memberId: existingMemberId,
              notes: record.notes || null,
              isActive: true,
            });
            console.log(`✅ Successfully added existing member to church: ${memberData.firstName} ${memberData.lastName}`);
          } else {
            // Create new member and associate with church
            const [newMember] = await db.insert(members).values(memberData).returning();
            
            await db.insert(churchMembers).values({
              churchId: churchId,
              memberId: newMember.id,
              notes: record.notes || null,
              isActive: true,
            });
            console.log(`✅ Successfully imported new member: ${memberData.firstName} ${memberData.lastName}`);
          }
          
          importedCount++;
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