const express = require('express');
const pool = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Rental tracker API is running'
  });
});

app.get('/api/properties', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM properties ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});