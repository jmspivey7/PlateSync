/**
 * Helper functions for Planning Center import
 */

// Helper to safely handle duplicate emails during import
export async function importPlanningCenterMembers(db, membersData, churchId, members) {
  let importedCount = 0;
  const processedEmails = new Set();
  
  console.log(`Preparing to import ${membersData.length} members...`);
  
  for (const memberData of membersData) {
    try {
      // Skip if this email has already been processed in this batch
      if (memberData.email && processedEmails.has(memberData.email)) {
        console.log(`Skipping duplicate email in batch: ${memberData.email}`);
        continue;
      }
      
      // Track this email if it exists
      if (memberData.email) {
        processedEmails.add(memberData.email);
        
        // First check if a member with this email already exists
        const existingMembers = await db.select().from(members).where({
          email: memberData.email,
          churchId: churchId
        });
        
        if (existingMembers.length > 0) {
          const existingMember = existingMembers[0];
          
          // Update the existing member
          console.log(`Updating existing member with email: ${memberData.email}`);
          await db.update(members).set({
            firstName: memberData.firstName || existingMember.firstName,
            lastName: memberData.lastName || existingMember.lastName,
            phone: memberData.phone || existingMember.phone,
            externalId: memberData.externalId || existingMember.externalId,
            externalSystem: memberData.externalSystem || existingMember.externalSystem,
            updatedAt: new Date()
          }).where({
            id: existingMember.id
          });
          
          importedCount++;
          continue;
        }
      }
      
      // If no existing member with this email, check for external ID match
      if (memberData.externalId && memberData.externalSystem) {
        const existingMembers = await db.select().from(members).where({
          externalId: memberData.externalId,
          externalSystem: memberData.externalSystem,
          churchId: churchId
        });
        
        if (existingMembers.length > 0) {
          const existingMember = existingMembers[0];
          
          // Update the existing member
          console.log(`Updating existing member with external ID: ${memberData.externalId}`);
          await db.update(members).set({
            firstName: memberData.firstName || existingMember.firstName,
            lastName: memberData.lastName || existingMember.lastName,
            email: memberData.email || existingMember.email,
            phone: memberData.phone || existingMember.phone,
            updatedAt: new Date()
          }).where({
            id: existingMember.id
          });
          
          importedCount++;
          continue;
        }
      }
      
      // If we get here, create a new member
      console.log(`Creating new member: ${memberData.firstName} ${memberData.lastName}`);
      await db.insert(members).values({
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email,
        phone: memberData.phone,
        isVisitor: memberData.isVisitor || false,
        externalId: memberData.externalId,
        externalSystem: memberData.externalSystem,
        churchId: churchId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      importedCount++;
    } catch (error) {
      console.error(`Error processing member ${memberData.firstName} ${memberData.lastName}:`, error);
      // Continue with next member instead of stopping the whole import
    }
  }
  
  return importedCount;
}