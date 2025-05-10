import {
  members,
  type InsertMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// These functions will be copied into storage.ts to fix syntax errors

export async function bulkImportMembers(membersToImport: Array<Partial<InsertMember>>, churchId: string): Promise<number> {
  let importedCount = 0;
  
  try {
    // Process each member one by one
    for (const memberData of membersToImport) {
      // If the member has an externalId, check if they already exist
      if (memberData.externalId && memberData.externalSystem) {
        const [existingMember] = await db
          .select()
          .from(members)
          .where(and(
            eq(members.externalId, memberData.externalId),
            eq(members.externalSystem, memberData.externalSystem),
            eq(members.churchId, churchId)
          ))
          .limit(1);
        
        if (existingMember) {
          // Update existing member
          await db
            .update(members)
            .set({
              firstName: memberData.firstName || existingMember.firstName,
              lastName: memberData.lastName || existingMember.lastName,
              email: memberData.email || existingMember.email,
              phone: memberData.phone || existingMember.phone,
              notes: memberData.notes || existingMember.notes,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingMember.id));
            
          importedCount++;
          continue;
        }
      }
      
      // If no external ID or member not found, check by name and email/phone if available
      // Or just by name if no contact info is available
      let existingMemberQuery = db
        .select()
        .from(members)
        .where(and(
          eq(members.firstName, memberData.firstName || ''),
          eq(members.lastName, memberData.lastName || ''),
          eq(members.churchId, churchId)
        ));
          
      // If we have email or phone, make the match more specific
      if (memberData.email || memberData.phone) {
        if (memberData.email) {
          existingMemberQuery = existingMemberQuery.where(eq(members.email, memberData.email));
        }
        if (memberData.phone) {
          existingMemberQuery = existingMemberQuery.where(eq(members.phone, memberData.phone || ''));
        }
      }
      
      const [existingMember] = await existingMemberQuery.limit(1);
        
      if (existingMember) {
        // Update existing member and add the external IDs
        await db
          .update(members)
          .set({
            externalId: memberData.externalId || existingMember.externalId,
            externalSystem: memberData.externalSystem || existingMember.externalSystem,
            phone: memberData.phone || existingMember.phone,
            notes: memberData.notes || existingMember.notes,
            updatedAt: new Date()
          })
          .where(eq(members.id, existingMember.id));
          
        importedCount++;
        continue;
      }
      
      // If we reach here, we need to create a new member
      if (memberData.firstName && memberData.lastName) {
        await db
          .insert(members)
          .values({
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            email: memberData.email,
            phone: memberData.phone,
            notes: memberData.notes,
            isVisitor: memberData.isVisitor || false,
            externalId: memberData.externalId,
            externalSystem: memberData.externalSystem,
            churchId: churchId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
        importedCount++;
      }
    }
  } catch (error) {
    console.error("Error in bulkImportMembers:", error);
    throw error;
  }
  
  return importedCount;
}

export async function removeDuplicateMembers(churchId: string): Promise<number> {
  let deletedCount = 0;
  
  try {
    // Find members with the same first and last name but no email or phone
    const query = sql`
      WITH duplicates AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY "first_name", "last_name", "church_id" 
            ORDER BY 
              CASE WHEN "external_id" IS NOT NULL THEN 0 ELSE 1 END,
              CASE WHEN "email" IS NOT NULL OR "phone" IS NOT NULL THEN 0 ELSE 1 END,
              "created_at"
          ) as row_num
        FROM 
          members
        WHERE 
          "church_id" = ${churchId}
          AND ("email" IS NULL OR "email" = '')
          AND ("phone" IS NULL OR "phone" = '')
      )
      DELETE FROM members
      WHERE id IN (
        SELECT id FROM duplicates WHERE row_num > 1
      )
      RETURNING id;
    `;
    
    const result = await db.execute(query);
    // The result will be an array of objects with the deleted IDs
    deletedCount = Array.isArray(result) ? result.length : 0;
  } catch (error) {
    console.error("Error in removeDuplicateMembers:", error);
    throw error;
  }
  
  return deletedCount;
}

export type DuplicateCandidateGroup = {
  name: string;
  count: number;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    externalId: string | null;
    externalSystem: string | null;
    createdAt: Date;
  }>;
};

// Function to find potential duplicate members based on name similarity
export async function findPotentialDuplicates(churchId: string): Promise<DuplicateCandidateGroup[]> {
  try {
    // Find groups of members with the same first and last name
    const query = sql`
      WITH name_groups AS (
        SELECT 
          "first_name",
          "last_name",
          COUNT(*) as member_count
        FROM 
          members
        WHERE 
          "church_id" = ${churchId}
        GROUP BY 
          "first_name", "last_name"
        HAVING 
          COUNT(*) > 1
      )
      SELECT 
        m.id, 
        m.first_name as "firstName", 
        m.last_name as "lastName", 
        m.email, 
        m.phone,
        m.external_id as "externalId",
        m.external_system as "externalSystem",
        m.created_at as "createdAt",
        ng.member_count as "groupCount"
      FROM 
        members m
      JOIN 
        name_groups ng 
        ON m.first_name = ng.first_name 
        AND m.last_name = ng.last_name
      WHERE 
        m.church_id = ${churchId}
      ORDER BY 
        m.last_name, 
        m.first_name, 
        m.created_at;
    `;
    
    const results = await db.execute(query);
    
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }
    
    // Group the results by name
    const duplicateGroups: DuplicateCandidateGroup[] = [];
    const nameGroups = new Map<string, any[]>();
    
    for (const member of results) {
      const nameKey = `${member.lastName}, ${member.firstName}`;
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey)?.push(member);
    }
    
    // Convert the map to the expected format
    for (const [name, members] of nameGroups.entries()) {
      if (members.length > 1) {
        duplicateGroups.push({
          name,
          count: members.length,
          members: members.map(m => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            phone: m.phone,
            externalId: m.externalId,
            externalSystem: m.externalSystem,
            createdAt: m.createdAt
          }))
        });
      }
    }
    
    return duplicateGroups;
  } catch (error) {
    console.error("Error in findPotentialDuplicates:", error);
    throw error;
  }
}