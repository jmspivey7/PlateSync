import express from 'express';
import { Pool } from '@neondatabase/serverless';
import { batches, donations } from '@shared/schema';
import { eq, desc, sum, sql } from 'drizzle-orm';
import { db } from '../db';

const router = express.Router();

// Middleware to force JSON content type
const forceJsonResponse = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Override the express content-type to guarantee JSON response
  res.setHeader('Content-Type', 'application/json');
  
  // Store original res.send to intercept
  const originalSend = res.send;
  
  // Override res.send to ensure JSON format
  res.send = function(body: any): express.Response {
    // If body is not already a string, stringify it
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    } else {
      // Try to parse and re-stringify to ensure valid JSON
      try {
        const parsed = JSON.parse(body);
        body = JSON.stringify(parsed);
      } catch (e) {
        // If it's not valid JSON, wrap it in a JSON object
        body = JSON.stringify({ data: body });
      }
    }
    
    // Call the original send with our processed body
    return originalSend.call(this, body);
  };
  
  next();
};

// Apply our JSON middleware to all routes
router.use(forceJsonResponse);

// Direct endpoint to get batches for church 40829937
router.get('/church-data/40829937/batches', async (req, res) => {
  try {
    console.log('Direct endpoint: Fetching batches for church 40829937');
    
    // Get batches directly from the database
    const churchBatches = await db.select()
      .from(batches)
      .where(eq(batches.churchId, '40829937'))
      .orderBy(desc(batches.date));
    
    console.log(`Found ${churchBatches.length} batches for church 40829937`);
    
    // Return the batches
    return res.json(churchBatches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Direct endpoint to get latest finalized batch
router.get('/church-data/40829937/latest-finalized', async (req, res) => {
  try {
    console.log('Direct endpoint: Fetching latest finalized batch for church 40829937');
    
    // Get latest finalized batch
    const finalizedBatches = await db.select()
      .from(batches)
      .where(
        eq(batches.churchId, '40829937'),
      )
      .where(
        eq(batches.status, 'FINALIZED')
      )
      .orderBy(desc(batches.date))
      .limit(1);
    
    if (finalizedBatches.length > 0) {
      console.log(`Found latest finalized batch: ${finalizedBatches[0].id}`);
      return res.json(finalizedBatches[0]);
    } else {
      console.log('No finalized batches found');
      return res.status(404).json({ error: 'No finalized batches found' });
    }
  } catch (error) {
    console.error('Error fetching latest finalized batch:', error);
    return res.status(500).json({ error: 'Failed to fetch latest finalized batch' });
  }
});

// Direct endpoint to get total donations amount
router.get('/church-data/40829937/total-donations', async (req, res) => {
  try {
    console.log('Direct endpoint: Calculating total donations for church 40829937');
    
    // Get total donations with proper Drizzle syntax
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(amount), 0)`.as('total')
    })
    .from(donations)
    .innerJoin(batches, eq(donations.batchId, batches.id))
    .where(
      sql`${batches.churchId} = '40829937' AND ${batches.status} = 'FINALIZED'`
    );
    
    const total = result[0]?.total || 0;
    console.log(`Total donations: $${total}`);
    
    return res.json({ total });
  } catch (error) {
    console.error('Error calculating total donations:', error);
    return res.status(500).json({ error: 'Failed to calculate total donations' });
  }
});

export default router;