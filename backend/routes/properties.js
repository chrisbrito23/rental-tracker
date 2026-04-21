const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all properties
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        COUNT(u.id) as total_units,
        COUNT(CASE WHEN u.is_occupied = true THEN 1 END) as occupied_units
       FROM properties p
       LEFT JOIN units u ON u.property_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET single property with units
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = await pool.query(
      'SELECT * FROM properties WHERE id = $1', [id]
    );
    if (property.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    const units = await pool.query(
      'SELECT * FROM units WHERE property_id = $1 ORDER BY unit_number', [id]
    );
    res.json({
      success: true,
      data: { ...property.rows[0], units: units.rows }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST create new property
router.post('/', async (req, res) => {
  try {
    const { name, address, city, state, zip, property_type } = req.body;
    const result = await pool.query(
      `INSERT INTO properties (name, address, city, state, zip, property_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, address, city, state, zip, property_type]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH update property
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, zip, property_type } = req.body;
    const result = await pool.query(
      `UPDATE properties 
       SET name=$1, address=$2, city=$3, state=$4, zip=$5, property_type=$6
       WHERE id=$7
       RETURNING *`,
      [name, address, city, state, zip, property_type, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE property
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM properties WHERE id = $1', [id]);
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;