/**
 * Script to safely remove duplicate Church555 entries and related data
 */
import { db } from "../server/db.js";
import { churches, users, members, donations, batches, serviceOptions, reportRecipients } from "../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";

async function removeDuplicateChurches() {
  console.log("Starting cleanup of Church 555 duplicate entries...");
  
  try {
    // Get all Church 555 IDs
    const duplicateChurches = await db
      .select({ id: churches.id })
      .from(churches)
      .where(eq(churches.name, "Church 555"));
    
    const churchIds = duplicateChurches.map(church => church.id);
    console.log(`Found ${churchIds.length} duplicate churches named "Church 555"`);
    
    if (churchIds.length === 0) {
      console.log("No duplicate churches found. Exiting.");
      return;
    }
    
    for (const churchId of churchIds) {
      console.log(`Processing church ID: ${churchId}`);
      
      // Delete all report recipients for this church
      const deletedReportRecipients = await db
        .delete(reportRecipients)
        .where(eq(reportRecipients.churchId, churchId))
        .returning({ id: reportRecipients.id });
      console.log(`Deleted ${deletedReportRecipients.length} report recipients`);
      
      // Delete all service options for this church
      const deletedServiceOptions = await db
        .delete(serviceOptions)
        .where(eq(serviceOptions.churchId, churchId))
        .returning({ id: serviceOptions.id });
      console.log(`Deleted ${deletedServiceOptions.length} service options`);
      
      // Delete all donations for this church
      const deletedDonations = await db
        .delete(donations)
        .where(eq(donations.churchId, churchId))
        .returning({ id: donations.id });
      console.log(`Deleted ${deletedDonations.length} donations`);
      
      // Delete all batches for this church
      const deletedBatches = await db
        .delete(batches)
        .where(eq(batches.churchId, churchId))
        .returning({ id: batches.id });
      console.log(`Deleted ${deletedBatches.length} batches`);
      
      // Delete all members for this church
      const deletedMembers = await db
        .delete(members)
        .where(eq(members.churchId, churchId))
        .returning({ id: members.id });
      console.log(`Deleted ${deletedMembers.length} members`);
      
      // Delete all users for this church
      const deletedUsers = await db
        .delete(users)
        .where(eq(users.churchId, churchId))
        .returning({ id: users.id });
      console.log(`Deleted ${deletedUsers.length} users`);
      
      // Finally delete the church
      const deletedChurch = await db
        .delete(churches)
        .where(eq(churches.id, churchId))
        .returning({ id: churches.id, name: churches.name });
      console.log(`Deleted church: ${JSON.stringify(deletedChurch)}`);
    }
    
    console.log("Cleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Run the cleanup function
removeDuplicateChurches();