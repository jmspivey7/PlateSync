import express from 'express';
import { Pool } from '@neondatabase/serverless';
import { batches } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';

const router = express.Router();

// Direct endpoint for finalized counts using proper ESM syntax
router.get('/api/direct-finalized', async (req, res) => {
  try {
    // Force JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    // Use Drizzle ORM to get all finalized batches for church 40829937
    const finalizedBatches = await db.query.batches.findMany({
      where: (batch) => eq(batch.churchId, '40829937') && eq(batch.status, 'FINALIZED'),
      orderBy: (batch) => batch.date,
    });
    
    console.log(`Found ${finalizedBatches.length} finalized batches for church 40829937 via direct endpoint`);
    
    return res.json(finalizedBatches);
  } catch (error) {
    console.error('Error fetching finalized batches:', error);
    return res.status(500).json({ error: 'Failed to retrieve finalized counts' });
  }
});

export default router;