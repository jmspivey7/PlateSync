import express from 'express';
import { db } from '../db';
import { batches, donations } from '@shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

const router = express.Router();

// Direct access to church 40829937 batches for debugging/fixing purposes
router.get('/direct-access/church-batches/40829937', async (req, res) => {
  try {
    console.log('Fetching batches for church ID 40829937 via direct route');
    
    // Set proper JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    // Direct raw SQL query for the specific church ID
    const rawBatches = await db.execute(
      sql`SELECT * FROM batches WHERE church_id = '40829937' ORDER BY date DESC`
    );
    
    if (rawBatches && Array.isArray(rawBatches.rows)) {
      console.log(`Found ${rawBatches.rows.length} batches for church 40829937`);
      return res.json(rawBatches.rows);
    } else {
      // Attempt direct drizzle query as fallback
      const churchBatches = await db.select().from(batches)
        .where(eq(batches.churchId, '40829937'))
        .orderBy(desc(batches.date));
    
      console.log(`Found ${churchBatches.length} batches for church 40829937 (drizzle query)`);
      return res.json(churchBatches);
    }
  } catch (error) {
    console.error('Error fetching church batches:', error);
    return res.status(500).json({ message: 'Failed to fetch batches for church' });
  }
});

// Get latest finalized batch for church 40829937
router.get('/direct-access/church-batches/40829937/latest-finalized', async (req, res) => {
  try {
    console.log('Fetching latest finalized batch for church ID 40829937');
    
    // Set proper JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    // Direct raw SQL query for the specific church ID's latest finalized batch
    const rawFinalizedBatch = await db.execute(
      sql`SELECT * FROM batches WHERE church_id = '40829937' AND status = 'FINALIZED' ORDER BY date DESC LIMIT 1`
    );
    
    if (rawFinalizedBatch && Array.isArray(rawFinalizedBatch.rows) && rawFinalizedBatch.rows.length > 0) {
      console.log(`Found latest finalized batch for church 40829937 via SQL: ${rawFinalizedBatch.rows[0].id}`);
      return res.json(rawFinalizedBatch.rows[0]);
    } else {
      // Fallback to Drizzle query
      const churchBatches = await db.select().from(batches)
        .where(and(
          eq(batches.churchId, '40829937'),
          eq(batches.status, 'FINALIZED')
        ))
        .orderBy(desc(batches.date))
        .limit(1);
      
      if (churchBatches.length > 0) {
        console.log(`Found latest finalized batch for church 40829937 via Drizzle: ${churchBatches[0].id}`);
        return res.json(churchBatches[0]);
      } else {
        console.log('No finalized batches found for church 40829937');
        return res.status(404).json({ message: 'No finalized batches found' });
      }
    }
  } catch (error) {
    console.error('Error fetching latest finalized batch:', error);
    return res.status(500).json({ message: 'Failed to fetch latest finalized batch' });
  }
});

export default router;