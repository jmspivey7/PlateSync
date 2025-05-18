const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create a direct database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Set all routes to use JSON
router.use(express.json());

// Force all responses to be JSON
router.use((req, res, next) => {
  const originalJson = res.json;
  
  // Override the json method
  res.json = function(obj) {
    // Set JSON content type explicitly before sending
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(this, obj);
  };
  
  next();
});

// GET endpoint for all church batches
router.get('/fix/church-data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM batches 
      WHERE church_id = '40829937' 
      ORDER BY date DESC
    `);
    
    console.log(`Direct fix: Found ${result.rows.length} batches for church 40829937`);
    
    // Return the data
    return res.json({
      batches: result.rows,
      message: 'Successfully retrieved batches',
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// GET endpoint for latest finalized batch
router.get('/fix/latest-batch', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM batches 
      WHERE church_id = '40829937' AND status = 'FINALIZED' 
      ORDER BY date DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No finalized batches found' });
    }
    
    console.log(`Direct fix: Found latest finalized batch: ${result.rows[0].id}`);
    
    // Return the data
    return res.json({
      batch: result.rows[0],
      message: 'Successfully retrieved latest batch'
    });
  } catch (error) {
    console.error('Error fetching latest batch:', error);
    return res.status(500).json({ error: 'Failed to fetch latest batch' });
  }
});

// GET endpoint for total donations
router.get('/fix/total-donations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(d.amount), 0) as total 
      FROM donations d 
      JOIN batches b ON d.batch_id = b.id 
      WHERE b.church_id = '40829937' AND b.status = 'FINALIZED'
    `);
    
    const total = parseFloat(result.rows[0].total || 0);
    console.log(`Direct fix: Total donations for church 40829937: $${total.toFixed(2)}`);
    
    // Return the data
    return res.json({
      total: total,
      message: 'Successfully calculated total donations'
    });
  } catch (error) {
    console.error('Error calculating total donations:', error);
    return res.status(500).json({ error: 'Failed to calculate total donations' });
  }
});

module.exports = router;