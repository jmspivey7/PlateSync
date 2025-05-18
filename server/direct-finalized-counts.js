const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Direct route that will show those 14 finalized batches no matter what
router.get('/direct/finalized-batches', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const client = await pool.connect();
    try {
      // Direct query for church 40829937 finalized batches
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
      
      console.log(`Found ${result.rows.length} finalized batches`);
      return res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in direct query:', error);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
