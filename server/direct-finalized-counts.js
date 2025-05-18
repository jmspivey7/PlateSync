const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create database connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Direct endpoint for finalized counts - COMPLETELY BYPASSES ALL MIDDLEWARE
router.get('/api/direct-finalized-counts', async (req, res) => {
  // Force content type to application/json
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const client = await pool.connect();
    try {
      // DIRECT QUERY for church 40829937's finalized batches
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
      
      console.log(`Direct query found ${result.rows.length} finalized batches for church 40829937`);
      
      // Return the data as direct JSON output
      return res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error executing direct finalized counts query:', error);
    return res.status(500).json({ error: 'Failed to retrieve finalized counts' });
  }
});

module.exports = router;