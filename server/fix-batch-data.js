const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Direct SQL endpoint for church 40829937's batches
router.get('/api/fix/batches', async (req, res) => {
  try {
    // Make sure to set content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Direct SQL query to get all batches for church 40829937
    const result = await pool.query(`
      SELECT id, name, date, status, total_amount as "totalAmount", church_id as "churchId", service
      FROM batches 
      WHERE church_id = '40829937' 
      ORDER BY date DESC
    `);
    
    console.log(`Found ${result.rows.length} batches for church ID 40829937`);
    
    // Send plain JSON response
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Direct SQL endpoint for latest finalized batch
router.get('/api/fix/latest-finalized', async (req, res) => {
  try {
    // Make sure to set content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Direct SQL query to get the latest finalized batch
    const result = await pool.query(`
      SELECT id, name, date, status, total_amount as "totalAmount", church_id as "churchId", service
      FROM batches 
      WHERE church_id = '40829937' AND status = 'FINALIZED' 
      ORDER BY date DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log(`Found latest finalized batch: ${result.rows[0].id}`);
      return res.json(result.rows[0]);
    } else {
      console.log('No finalized batches found for church ID 40829937');
      return res.status(404).json({ error: 'No finalized batches found' });
    }
  } catch (error) {
    console.error('Error fetching latest finalized batch:', error);
    return res.status(500).json({ error: 'Failed to fetch latest finalized batch' });
  }
});

// Direct SQL endpoint for total batch amount
router.get('/api/fix/total', async (req, res) => {
  try {
    // Make sure to set content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Direct SQL query to get the total amount of all finalized batches
    const result = await pool.query(`
      SELECT SUM(total_amount) as total
      FROM batches 
      WHERE church_id = '40829937' AND status = 'FINALIZED'
    `);
    
    console.log(`Total amount for church 40829937: ${result.rows[0].total || 0}`);
    return res.json({ total: result.rows[0].total || 0 });
  } catch (error) {
    console.error('Error calculating total amount:', error);
    return res.status(500).json({ error: 'Failed to calculate total amount' });
  }
});

module.exports = router;