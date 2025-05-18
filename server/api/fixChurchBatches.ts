import express from 'express';
import { db } from '../db';
import { batches } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Direct access to church 40829937 batches for debugging/fixing purposes
router.get('/church-batches/40829937', async (req, res) => {
  try {
    console.log('Fetching batches for church ID 40829937 via direct route');
    
    // Direct database query for the specific church ID
    const churchBatches = await db.query.batches.findMany({
      where: eq(batches.churchId, '40829937'),
      orderBy: (batches, { desc }) => [desc(batches.date)]
    });
    
    console.log(`Found ${churchBatches.length} batches for church 40829937`);
    
    return res.json(churchBatches);
  } catch (error) {
    console.error('Error fetching church batches:', error);
    return res.status(500).json({ message: 'Failed to fetch batches for church' });
  }
});

// Get latest finalized batch for church 40829937
router.get('/church-batches/40829937/latest-finalized', async (req, res) => {
  try {
    console.log('Fetching latest finalized batch for church ID 40829937');
    
    // Direct database query for the specific church ID's latest finalized batch
    const churchBatches = await db.query.batches.findMany({
      where: eq(batches.churchId, '40829937'),
      orderBy: (batches, { desc }) => [desc(batches.date)]
    });
    
    // Filter for finalized batches
    const finalizedBatches = churchBatches.filter(batch => batch.status === 'FINALIZED');
    
    if (finalizedBatches.length > 0) {
      console.log(`Found latest finalized batch for church 40829937: ${finalizedBatches[0].id}`);
      return res.json(finalizedBatches[0]);
    } else {
      console.log('No finalized batches found for church 40829937');
      return res.status(404).json({ message: 'No finalized batches found' });
    }
  } catch (error) {
    console.error('Error fetching latest finalized batch:', error);
    return res.status(500).json({ message: 'Failed to fetch latest finalized batch' });
  }
});

export default router;