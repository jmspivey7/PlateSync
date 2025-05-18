const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Direct endpoint for finalized counts
router.get('/api/batches/finalized', async (req, res) => {
  try {
    // Force content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Get a direct DB connection
    const client = await pool.connect();
    
    try {
      // Run direct SQL query to get all finalized batches for church 40829937
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
      
      console.log(`Found ${result.rows.length} finalized batches for church 40829937`);
      
      // Send raw JSON without any middleware processing
      return res.json(result.rows);
    } finally {
      // Always release the client
      client.release();
    }
  } catch (error) {
    console.error('Error fetching finalized batches:', error);
    return res.status(500).json({ error: 'Failed to fetch finalized batches' });
  }
});

module.exports = router;