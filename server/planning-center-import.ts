import axios from 'axios';
import { storage } from './storage';

// Planning Center API constants
const PLANNING_CENTER_API_BASE = 'https://api.planningcenteronline.com';

/**
 * Import members from Planning Center using proper pagination to get all members
 */
export async function importMembersFromPlanningCenter(churchId: string) {
  console.log(`Importing Planning Center members for church: ${churchId}`);
  
  // Get Planning Center tokens for this church
  const tokens = await storage.getPlanningCenterTokensByChurchId(churchId);
  
  if (!tokens || !tokens.accessToken) {
    throw new Error('Planning Center not connected. No access tokens found.');
  }
  
  // Check if token is expired and needs refresh
  const now = new Date();
  const tokenExpiresAt = tokens.expiresAt ? new Date(tokens.expiresAt) : null;
  const isExpired = tokenExpiresAt ? now > tokenExpiresAt : false;
  
  console.log('Planning Center tokens:', {
    accessToken: tokens.accessToken.substring(0, 10) + '...',
    refreshToken: tokens.refreshToken?.substring(0, 10) + '...',
    expiresAt: tokens.expiresAt,
    now: now.toISOString(),
    isExpired
  });
  
  // If token is expired, try to refresh it
  if (isExpired) {
    console.log('Token is expired, attempting to refresh...');
    // Refresh token logic should be handled in the main planning-center.ts file
    return { success: false, error: 'Token expired. Please reconnect to Planning Center.' };
  }
  
  // Store all people to import
  let allPeople: any[] = [];
  let emailsByPersonId = new Map();
  let phonesByPersonId = new Map();
  
  try {
    // Make API requests with pagination to fetch all people
    console.log('Making API request to Planning Center People API');
    
    let nextUrl = `${PLANNING_CENTER_API_BASE}/people/v2/people?include=emails,phone_numbers&per_page=100`;
    let hasMorePages = true;
    const maxPages = 20; // Maximum 20 pages (up to 2,000 members)
    let currentPage = 0;
    
    // Fetch all pages of people
    while (hasMorePages && nextUrl && currentPage < maxPages) {
      currentPage++;
      console.log(`Fetching Planning Center people page ${currentPage}`);
      
      // Make the API request
      const response = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      });
      
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Planning Center API');
      }
      
      // Add people from this page to our collection
      allPeople = [...allPeople, ...response.data.data];
      
      // Process included data for emails and phone numbers
      if (response.data.included && Array.isArray(response.data.included)) {
        response.data.included.forEach((item: any) => {
          if (!item || !item.type) return;
          
          if (item.type === 'Email') {
            const personId = item.relationships?.person?.data?.id;
            if (personId && item.attributes?.address) {
              if (!emailsByPersonId.has(personId)) {
                emailsByPersonId.set(personId, []);
              }
              emailsByPersonId.get(personId).push(item.attributes.address);
            }
          } else if (item.type === 'PhoneNumber') {
            const personId = item.relationships?.person?.data?.id;
            if (personId && item.attributes?.number) {
              if (!phonesByPersonId.has(personId)) {
                phonesByPersonId.set(personId, []);
              }
              phonesByPersonId.get(personId).push(item.attributes.number);
            }
          }
        });
      }
      
      // Check if there are more pages
      nextUrl = response.data.links?.next || null;
      hasMorePages = !!nextUrl;
      
      console.log(`Retrieved ${response.data.data.length} more people (total so far: ${allPeople.length})`);
      
      // If this is the first page, log the total count if available
      if (currentPage === 1 && response.data.meta?.total_count) {
        console.log(`Planning Center reports a total of ${response.data.meta.total_count} people`);
      }
    }
    
    console.log(`Planning Center API requests complete, retrieved ${allPeople.length} total people`);
    console.log(`Processed ${emailsByPersonId.size} people with emails and ${phonesByPersonId.size} with phones`);
    
    // Filter out people without both first and last names
    const peopleWithNames = allPeople.filter(person => 
      person.attributes?.first_name && person.attributes?.last_name
    );
    
    console.log(`Total people from Planning Center: ${allPeople.length}`);
    console.log(`People with first and last names: ${peopleWithNames.length}`);
    
    // Log examples of people with names but no contact info
    const peopleWithoutContactInfo = peopleWithNames.filter(person => 
      !emailsByPersonId.has(person.id) && !phonesByPersonId.has(person.id)
    );
    
    if (peopleWithoutContactInfo.length > 0) {
      console.log(`Examples of people with names but no contact info:`);
      peopleWithoutContactInfo.slice(0, 5).forEach(p => {
        console.log(`- ${p.attributes.first_name} ${p.attributes.last_name} (ID: ${p.id})`);
      });
    }
    
    // Transform people into our database format
    const membersToImport = peopleWithNames.map(person => {
      // Get email and phone if available
      const emails = emailsByPersonId.get(person.id) || [];
      const phones = phonesByPersonId.get(person.id) || [];
      
      // Log sample of members we're about to import
      if (allPeople.indexOf(person) < 3) {
        console.log(`- ${person.attributes.first_name} ${person.attributes.last_name} (Email: ${emails[0] || 'none'}, Phone: ${phones[0] || 'none'}, ID: ${person.id})`);
      }
      
      return {
        firstName: person.attributes.first_name,
        lastName: person.attributes.last_name,
        email: emails[0] || null,
        phone: phones[0] || null,
        planningCenterId: person.id,
        churchId
      };
    });
    
    console.log(`Found ${membersToImport.length} valid members to import`);
    
    // Bulk import all members
    const importedCount = await storage.importPlanningCenterMembers(membersToImport);
    console.log(`Successfully imported ${importedCount} members`);
    
    // Update the stats in the planning_center_tokens table
    await storage.updatePlanningCenterImportStats(churchId, allPeople.length);
    console.log(`Updated Planning Center stats for church ${churchId}: ${allPeople.length} people available`);
    
    return {
      success: true,
      importedCount,
      totalPeople: allPeople.length
    };
    
  } catch (error: any) {
    console.error('Error importing members from Planning Center:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during import'
    };
  }
}