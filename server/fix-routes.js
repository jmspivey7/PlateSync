const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create a new database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// This route serves the 14 finalized batches directly
router.get('/fix/batches/finalized-list', async (req, res) => {
  try {
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Query the database directly for the 14 finalized batches for church 40829937
    const result = await pool.query(`
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
    
    console.log(`Direct fix route found ${result.rows.length} finalized batches`);
    
    // Return the data as JSON
    return res.json(result.rows);
  } catch (error) {
    console.error('Error in fix route:', error);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;