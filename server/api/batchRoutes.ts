import express from 'express';
import { storage } from '../storage';

const router = express.Router();

// Get all batches for a church
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.claims?.sub;
    
    // Get church ID - user might be linked to a different church
    let churchId: string;
    if (req.user.churchId && req.user.churchId !== userId) {
      // User is linked to a specific church
      churchId = req.user.churchId;
    } else {
      // User is the church admin (their ID is the church ID)
      churchId = userId;
    }
    
    console.log(`Fetching batches for church ID: ${churchId} (requested by user: ${userId})`);
    
    // Check if any batches exist for this church
    const batches = await storage.getBatches(churchId);
    
    // Return the batches, even if it's an empty array
    console.log(`Found ${batches.length} batches for church ${churchId}`);
    return res.json(batches);
  } catch (error) {
    console.error("Error in /api/batches:", error);
    res.status(500).json({ message: "Failed to fetch batches" });
  }
});

// Get the latest finalized batch
router.get('/latest-finalized', async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.claims?.sub;
    
    // Get church ID - user might be linked to a different church
    let churchId: string;
    if (req.user.churchId && req.user.churchId !== userId) {
      // User is linked to a specific church
      churchId = req.user.churchId;
    } else {
      // User is the church admin (their ID is the church ID)
      churchId = userId;
    }
    
    console.log(`Fetching latest finalized batch for church ID: ${churchId}`);
    
    // Get all batches then filter for finalized ones
    const batches = await storage.getBatches(churchId);
    const finalizedBatches = batches
      .filter(b => b.status === 'FINALIZED')
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    
    if (finalizedBatches.length > 0) {
      console.log(`Found latest finalized batch: ${finalizedBatches[0].id}`);
      return res.json(finalizedBatches[0]);
    } else {
      console.log('No finalized batches found');
      return res.status(404).json({ message: "No finalized batches found" });
    }
  } catch (error) {
    console.error("Error in /api/batches/latest-finalized:", error);
    res.status(500).json({ message: "Failed to fetch latest finalized batch" });
  }
});

// Get batch by ID with donations
router.get('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.claims?.sub;
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({ message: "Invalid batch ID" });
    }
    
    // Get church ID - user might be linked to a different church
    let churchId: string;
    if (req.user.churchId && req.user.churchId !== userId) {
      // User is linked to a specific church
      churchId = req.user.churchId;
    } else {
      // User is the church admin (their ID is the church ID)
      churchId = userId;
    }
    
    console.log(`Fetching batch ${batchId} for church ID: ${churchId}`);
    
    // Get batch with donations
    const batch = await storage.getBatchWithDonations(batchId, churchId);
    
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    
    return res.json(batch);
  } catch (error) {
    console.error(`Error in /api/batches/:id:`, error);
    res.status(500).json({ message: "Failed to fetch batch details" });
  }
});

// Get donations for a batch
router.get('/:id/donations', async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.claims?.sub;
    const batchId = parseInt(req.params.id);
    
    if (isNaN(batchId)) {
      return res.status(400).json({ message: "Invalid batch ID" });
    }
    
    // Get church ID - user might be linked to a different church
    let churchId: string;
    if (req.user.churchId && req.user.churchId !== userId) {
      // User is linked to a specific church
      churchId = req.user.churchId;
    } else {
      // User is the church admin (their ID is the church ID)
      churchId = userId;
    }
    
    console.log(`Fetching donations for batch ${batchId}, church ID: ${churchId}`);
    
    // Get batch with donations
    const batch = await storage.getBatchWithDonations(batchId, churchId);
    
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    
    return res.json(batch.donations);
  } catch (error) {
    console.error(`Error in /api/batches/:id/donations:`, error);
    res.status(500).json({ message: "Failed to fetch donations" });
  }
});

export default router;