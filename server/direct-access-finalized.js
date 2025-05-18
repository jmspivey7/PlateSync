const express = require('express');
const router = express.Router();
const { Pool } = require('@neondatabase/serverless');

// Create a simple direct database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/direct-finalized', async (req, res) => {
  // Set headers to prevent caching and ensure proper content type
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  
  try {
    // Direct database query with no middleware or other code interference
    const result = await pool.query(`
      SELECT id, name, date, status, total_amount as "totalAmount", church_id as "churchId", service
      FROM batches 
      WHERE church_id = '40829937' AND status = 'FINALIZED' 
      ORDER BY date DESC
    `);
    
    console.log(`[DIRECT QUERY] Found ${result.rows.length} finalized batches for church 40829937`);
    
    // Send back as JSON
    res.json(result.rows);
  } catch (error) {
    console.error('Error in direct-access-finalized query:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;