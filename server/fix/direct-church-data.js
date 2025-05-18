const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const router = express.Router();

// Create a direct database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Direct hardcoded route to get all batches for church ID 40829937
router.get('/fix-church-40829937/batches', async (req, res) => {
  try {
    console.log('Fixing batch data for church ID 40829937');
    
    // Force content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Direct SQL query to get church batches
    const result = await pool.query(
      'SELECT * FROM batches WHERE church_id = $1 ORDER BY date DESC', 
      ['40829937']
    );
    
    console.log(`Found ${result.rows.length} batches for church ID 40829937`);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching church batches:', error);
    return res.status(500).json({ message: 'Failed to fetch batches' });
  }
});

// Direct hardcoded route to get latest finalized batch for church ID 40829937
router.get('/fix-church-40829937/latest-finalized', async (req, res) => {
  try {
    console.log('Fixing latest finalized batch data for church ID 40829937');
    
    // Force content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Direct SQL query to get latest finalized batch
    const result = await pool.query(
      'SELECT * FROM batches WHERE church_id = $1 AND status = $2 ORDER BY date DESC LIMIT 1', 
      ['40829937', 'FINALIZED']
    );
    
    if (result.rows.length > 0) {
      console.log(`Found latest finalized batch for church ID 40829937: ${result.rows[0].id}`);
      return res.json(result.rows[0]);
    } else {
      console.log('No finalized batches found for church ID 40829937');
      return res.status(404).json({ message: 'No finalized batches found' });
    }
  } catch (error) {
    console.error('Error fetching latest finalized batch:', error);
    return res.status(500).json({ message: 'Failed to fetch latest finalized batch' });
  }
});

module.exports = router;