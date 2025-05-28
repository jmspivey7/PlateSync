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

      // For "Add to Existing Members" mode, we need to check if this specific member
      // is already associated with THIS church, not just if the member exists globally
      
      // First, check for existing church-member relationship by email
      if (memberData.email) {
        const existingChurchMemberByEmail = await db.select({
          memberId: churchMembers.memberId,
          memberFirstName: members.firstName,
          memberLastName: members.lastName
        })
        .from(churchMembers)
        .innerJoin(members, eq(churchMembers.memberId, members.id))
        .where(
          and(
            eq(churchMembers.churchId, churchId),
            eq(members.email, memberData.email)
          )
        );
        
        if (existingChurchMemberByEmail.length > 0) {
          console.log(`Skipping duplicate member with email ${memberData.email} - already in church ${churchId}`);
          duplicatesSkipped++;
          isDuplicate = true;
        }
      }

      // If not found by email, check by first name and last name within this church
      if (!isDuplicate) {
        const existingChurchMemberByName = await db.select({
          memberId: churchMembers.memberId,
          memberFirstName: members.firstName,
          memberLastName: members.lastName
        })
        .from(churchMembers)
        .innerJoin(members, eq(churchMembers.memberId, members.id))
        .where(
          and(
            eq(churchMembers.churchId, churchId),
            eq(members.firstName, memberData.firstName),
            eq(members.lastName, memberData.lastName)
          )
        );
        
        if (existingChurchMemberByName.length > 0) {
          console.log(`Skipping duplicate member with name ${memberData.firstName} ${memberData.lastName} - already in church ${churchId}`);
          duplicatesSkipped++;
          isDuplicate = true;
        }
      }
      
      // If not a duplicate, create new member and associate with church
      if (!isDuplicate) {
        try {
          // Create new member
          const [newMember] = await db.insert(members).values(memberData).returning();
          
          // Associate member with this church
          await db.insert(churchMembers).values({
            churchId: churchId,
            memberId: newMember.id,
            notes: record.notes || null,
            isActive: true,
          });
          
          console.log(`✅ Successfully imported new member: ${memberData.firstName} ${memberData.lastName} (ID: ${newMember.id})`);
          importedCount++;
        } catch (insertError: any) {
          // Handle unique constraint violations as duplicates
          if (insertError.code === '23505') {
            if (insertError.constraint === 'members_email_unique') {
              console.log(`Skipping duplicate member with email ${memberData.email} (email constraint violation)`);
            } else if (insertError.constraint === 'church_members_church_id_member_id_unique') {
              console.log(`Skipping duplicate member ${memberData.firstName} ${memberData.lastName} (already in church)`);
            } else {
              console.log(`Skipping duplicate member ${memberData.firstName} ${memberData.lastName} (constraint: ${insertError.constraint})`);
            }
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