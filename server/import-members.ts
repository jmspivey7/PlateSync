import { db } from "./db";
import { members } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Helper function to import members from Planning Center one by one
 * with better error handling, especially for duplicate emails
 */
export async function importMembers(membersData: any[], churchId: string) {
  let importedCount = 0;
  const processedEmails = new Set<string>();
  
  console.log(`Starting member import process for ${membersData.length} members`);
  
  for (const member of membersData) {
    try {
      // Skip already processed emails in this batch
      if (member.email && processedEmails.has(member.email)) {
        console.log(`Skipping duplicate email in batch: ${member.email}`);
        continue;
      }
      
      // Add email to processed set if it exists
      if (member.email) {
        processedEmails.add(member.email);
        
        // CRITICAL: First check if email already exists in database
        const existingByEmail = await db.select()
          .from(members)
          .where(and(
            eq(members.email, member.email),
            eq(members.churchId, churchId)
          ));
          
        if (existingByEmail.length > 0) {
          // Update existing member with this email
          const existingMember = existingByEmail[0];
          console.log(`Updating existing member with email ${member.email}`);
          
          await db.update(members)
            .set({
              // Only update these fields if the incoming data has them
              firstName: member.firstName || existingMember.firstName,
              lastName: member.lastName || existingMember.lastName,
              phone: member.phone || existingMember.phone,
              externalId: member.externalId || existingMember.externalId,
              externalSystem: member.externalSystem || existingMember.externalSystem,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingMember.id));
            
          importedCount++;
          continue; // Skip to next member
        }
      }
      
      // Check by external ID if available
      if (member.externalId && member.externalSystem) {
        const existingByExtId = await db.select()
          .from(members)
          .where(and(
            eq(members.externalId, member.externalId),
            eq(members.externalSystem, member.externalSystem),
            eq(members.churchId, churchId)
          ));
          
        if (existingByExtId.length > 0) {
          // Update existing member with matching external ID
          const existingMember = existingByExtId[0];
          console.log(`Updating existing member with external ID ${member.externalId}`);
          
          await db.update(members)
            .set({
              firstName: member.firstName || existingMember.firstName,
              lastName: member.lastName || existingMember.lastName,
              email: member.email || existingMember.email,
              phone: member.phone || existingMember.phone,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingMember.id));
            
          importedCount++;
          continue; // Skip to next member
        }
      }
      
      // If we get here, insert a new member
      if (member.firstName && member.lastName) {
        try {
          // Final safety check for email duplicate before insert
          if (member.email) {
            // Use parameterized raw SQL query to check if email exists
            const emailExists = await db.execute(
              sql`SELECT COUNT(*) as count FROM members WHERE email = ${member.email} AND church_id = ${churchId}`
            );
            
            // Safely check result (avoiding array index access)
            const result = emailExists as any;
            if (result && result[0] && Number(result[0].count) > 0) {
              console.log(`Skipping create due to duplicate email found at last check: ${member.email}`);
              continue;
            }
          }
          
          await db.insert(members)
            .values({
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phone: member.phone,
              isVisitor: member.isVisitor || false,
              externalId: member.externalId,
              externalSystem: member.externalSystem,
              churchId: churchId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
          importedCount++;
          console.log(`Created new member: ${member.firstName} ${member.lastName} ${member.email ? `(${member.email})` : ''}`);
        } catch (insertError: any) {
          if (insertError.code === '23505' && insertError.constraint === 'members_email_unique') {
            console.log(`Caught duplicate email during insert: ${member.email}`);
            // One more try to update instead of insert for this member
            const [duplicateMember] = await db.select()
              .from(members)
              .where(and(
                eq(members.email, member.email),
                eq(members.churchId, churchId)
              ));
              
            if (duplicateMember) {
              await db.update(members)
                .set({
                  firstName: member.firstName || duplicateMember.firstName,
                  lastName: member.lastName || duplicateMember.lastName,
                  phone: member.phone || duplicateMember.phone,
                  externalId: member.externalId || duplicateMember.externalId,
                  externalSystem: member.externalSystem || duplicateMember.externalSystem,
                  updatedAt: new Date()
                })
                .where(eq(members.id, duplicateMember.id));
                
              importedCount++;
              console.log(`Recovered from email conflict by updating: ${member.email}`);
            }
          } else {
            // Log but continue with next member
            console.error(`Error inserting member ${member.firstName} ${member.lastName}:`, insertError);
          }
        }
      }
    } catch (memberError) {
      // Log error but continue processing other members
      console.error(`Error processing member ${member.firstName} ${member.lastName}:`, memberError);
    }
  }
  
  return importedCount;
}