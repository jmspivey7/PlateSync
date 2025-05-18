const express = require('express');
const router = express.Router();
const { Pool } = require('@neondatabase/serverless');

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Add a direct route for finalized batches - completely bypasses middleware
router.get('/church-40829937-finalized-batches', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    // Direct SQL query to get finalized batches
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
    
    console.log(`Found ${result.rows.length} finalized batches for church 40829937`);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error in direct finalized batches query:', error);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;