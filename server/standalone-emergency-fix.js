// This is a standalone express server that directly queries the database
const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const cors = require('cors');

// Create the app
const app = express();
app.use(cors());
app.use(express.json());

// Create a direct pool connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Direct route with no middleware
app.get('/api/church-40829937/finalized-batches', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Direct SQL query to get finalized batches for church ID 40829937
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
      
      // Send raw JSON with proper headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching finalized batches:', error);
    res.status(500).json({ error: 'Failed to fetch finalized batches' });
  }
});

// Create a simple HTML page that shows the batches
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Finalized Batches for Church 40829937</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        tr:hover { background-color: #f5f5f5; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .finalized { background-color: #e6f7ff; color: #0070f3; }
        .amount { text-align: right; color: #38a169; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Finalized Batches for Church 40829937</h1>
      <div id="loading">Loading finalized batches...</div>
      <table id="batches" style="display: none;">
        <thead>
          <tr>
            <th>Status</th>
            <th>Date</th>
            <th>Name</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody id="batch-list"></tbody>
      </table>
      
      <script>
        // Fetch the finalized batches
        fetch('/api/church-40829937/finalized-batches')
          .then(response => response.json())
          .then(data => {
            const batchList = document.getElementById('batch-list');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('batches').style.display = 'table';
            
            if (data.length === 0) {
              batchList.innerHTML = '<tr><td colspan="4">No finalized batches found</td></tr>';
              return;
            }
            
            // Format currency
            const formatCurrency = (amount) => {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(parseFloat(amount));
            };
            
            // Format date
            const formatDate = (dateString) => {
              const date = new Date(dateString);
              return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              });
            };
            
            // Create table rows
            data.forEach(batch => {
              const row = document.createElement('tr');
              
              // Status cell
              const statusCell = document.createElement('td');
              const statusBadge = document.createElement('span');
              statusBadge.className = 'badge finalized';
              statusBadge.textContent = batch.status;
              statusCell.appendChild(statusBadge);
              
              // Date cell
              const dateCell = document.createElement('td');
              dateCell.textContent = formatDate(batch.date);
              
              // Name cell
              const nameCell = document.createElement('td');
              nameCell.textContent = batch.name;
              
              // Amount cell
              const amountCell = document.createElement('td');
              amountCell.className = 'amount';
              amountCell.textContent = formatCurrency(batch.totalAmount);
              
              // Add cells to row
              row.appendChild(statusCell);
              row.appendChild(dateCell);
              row.appendChild(nameCell);
              row.appendChild(amountCell);
              
              // Add row to table
              batchList.appendChild(row);
            });
            
            // Add total row
            const totalRow = document.createElement('tr');
            totalRow.style.fontWeight = 'bold';
            
            const totalLabelCell = document.createElement('td');
            totalLabelCell.colSpan = 3;
            totalLabelCell.textContent = 'TOTAL';
            totalLabelCell.style.textAlign = 'right';
            
            const totalAmountCell = document.createElement('td');
            totalAmountCell.className = 'amount';
            const total = data.reduce((sum, batch) => sum + parseFloat(batch.totalAmount), 0);
            totalAmountCell.textContent = formatCurrency(total);
            
            totalRow.appendChild(totalLabelCell);
            totalRow.appendChild(totalAmountCell);
            batchList.appendChild(totalRow);
            
            console.log('Successfully loaded', data.length, 'finalized batches');
          })
          .catch(error => {
            console.error('Error fetching finalized batches:', error);
            document.getElementById('loading').innerHTML = 'Error loading finalized batches: ' + error.message;
          });
      </script>
    </body>
    </html>
  `);
});

// Start the server on port 3456
const port = 3456;
app.listen(port, '0.0.0.0', () => {
  console.log(`Standalone emergency fix server running at http://localhost:${port}`);
});
