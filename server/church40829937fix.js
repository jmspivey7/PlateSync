const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create a connection to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Direct query for church 40829937 batches
router.get('/api/direct/40829937/batches', async (req, res) => {
  try {
    // Direct SQL query to get batches
    const result = await pool.query(`
      SELECT * FROM batches 
      WHERE church_id = '40829937' 
      ORDER BY date DESC
    `);
    
    console.log(`Found ${result.rows.length} batches for church ID 40829937`);
    
    // Send direct JSON response
    res.json(result.rows);
  } catch (error) {
    console.error('Error in direct batch query:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Direct query for latest finalized batch
router.get('/api/direct/40829937/latest-finalized', async (req, res) => {
  try {
    // Direct SQL query to get latest finalized batch
    const result = await pool.query(`
      SELECT * FROM batches 
      WHERE church_id = '40829937' AND status = 'FINALIZED' 
      ORDER BY date DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log(`Direct query found latest finalized batch: ${result.rows[0].id}`);
      res.json(result.rows[0]);
    } else {
      console.log('No finalized batches found for church ID 40829937');
      res.status(404).json({ error: 'No finalized batches found' });
    }
  } catch (error) {
    console.error('Error in direct latest batch query:', error);
    res.status(500).json({ error: 'Failed to fetch latest batch' });
  }
});

// Direct query for total donation amount
router.get('/api/direct/40829937/total', async (req, res) => {
  try {
    // Direct SQL query to get total donations
    const result = await pool.query(`
      SELECT COALESCE(SUM(d.amount), 0) as total 
      FROM donations d 
      JOIN batches b ON d.batch_id = b.id 
      WHERE b.church_id = '40829937' AND b.status = 'FINALIZED'
    `);
    
    const total = parseFloat(result.rows[0].total || 0);
    console.log(`Direct query found total donations: $${total.toFixed(2)}`);
    
    res.json({ total });
  } catch (error) {
    console.error('Error in direct total query:', error);
    res.status(500).json({ error: 'Failed to calculate total' });
  }
});

module.exports = router;