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
      // Skip if missing required data
      if (!memberData.firstName || !memberData.lastName) {
        console.log('Skipping member - missing first or last name');
        continue;
      }
      
      // First, try to find by external ID if available
      if (memberData.externalId && memberData.externalSystem) {
        const [existingByExternalId] = await db
          .select()
          .from(members)
          .where(and(
            eq(members.externalId, memberData.externalId),
            eq(members.externalSystem, memberData.externalSystem),
            eq(members.churchId, churchId)
          ))
          .limit(1);
        
        if (existingByExternalId) {
          // Update existing member
          await db
            .update(members)
            .set({
              firstName: memberData.firstName || existingByExternalId.firstName,
              lastName: memberData.lastName || existingByExternalId.lastName,
              email: memberData.email || existingByExternalId.email,
              phone: memberData.phone || existingByExternalId.phone,
              notes: memberData.notes || existingByExternalId.notes,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingByExternalId.id));
            
          importedCount++;
          continue;
        }
      }
      
      // Next, check if there's a matching member by name
      const [existingByName] = await db
        .select()
        .from(members)
        .where(and(
          eq(sql`LOWER(${members.firstName})`, memberData.firstName.toLowerCase()),
          eq(sql`LOWER(${members.lastName})`, memberData.lastName.toLowerCase()),
          eq(members.churchId, churchId)
        ))
        .limit(1);
      
      if (existingByName) {
        // We have an existing member with the same name
        
        // If the existing member has contact info or external ID, update it
        if (existingByName.email || existingByName.phone || existingByName.externalId) {
          // Set external ID if not already set
          if (memberData.externalId && !existingByName.externalId) {
            await db
              .update(members)
              .set({
                externalId: memberData.externalId,
                externalSystem: memberData.externalSystem,
                // Only update contact info if it's missing
                email: existingByName.email || memberData.email,
                phone: existingByName.phone || memberData.phone,
                notes: existingByName.notes || memberData.notes,
                updatedAt: new Date()
              })
              .where(eq(members.id, existingByName.id));
            
            console.log(`Updated existing member: ${existingByName.firstName} ${existingByName.lastName} with external ID`);
          }
          
          importedCount++;
          continue;
        } 
        // If both members don't have contact info, just update with any new info
        else if (!memberData.email && !memberData.phone) {
          await db
            .update(members)
            .set({
              externalId: memberData.externalId || existingByName.externalId,
              externalSystem: memberData.externalSystem || existingByName.externalSystem,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingByName.id));
            
          importedCount++;
          continue;
        }
        // If new data has contact info but existing doesn't, update existing
        else if ((memberData.email || memberData.phone) && 
                 (!existingByName.email && !existingByName.phone)) {
          await db
            .update(members)
            .set({
              email: memberData.email,
              phone: memberData.phone,
              externalId: memberData.externalId || existingByName.externalId,
              externalSystem: memberData.externalSystem || existingByName.externalSystem,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingByName.id));
            
          console.log(`Added contact info to existing member: ${existingByName.firstName} ${existingByName.lastName}`);
          importedCount++;
          continue;
        }
      }
      
      // If we reach here, we need to create a new member
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
        
      console.log(`Created new member: ${memberData.firstName} ${memberData.lastName}`);
      importedCount++;
    }
    
    // After import, check for and remove any duplicates
    const cleanupCount = await removeDuplicateMembers(churchId);
    if (cleanupCount > 0) {
      console.log(`Auto-cleaned ${cleanupCount} duplicate members after import`);
      // Important: adjust importedCount to reflect actual net additions
      importedCount = importedCount - cleanupCount;
      console.log(`Adjusted importedCount to ${importedCount} after duplicate cleanup`);
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