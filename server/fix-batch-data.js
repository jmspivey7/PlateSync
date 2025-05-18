const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Simple direct database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Emergency direct endpoint for finalized batches 
router.get('/fix-batches/finalized', async (req, res) => {
  // Force JSON content type and no caching
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  
  try {
    const client = await pool.connect();
    try {
      // Direct SQL query for church 40829937 finalized batches
      const result = await client.query(`
        SELECT 
          id, 
          name, 
          date, 
          status, 
          total_amount as "totalAmount", 
          church_id as "churchId", 
          service
        FROM batches 
        WHERE church_id = '40829937' AND status = 'FINALIZED' 
        ORDER BY date DESC
      `);
      
      console.log(`[FIX] Found ${result.rows.length} finalized batches`);
      return res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[FIX] Error fetching finalized batches:', error);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;