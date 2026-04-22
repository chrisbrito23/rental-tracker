const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        COUNT(DISTINCT u.id) as total_units,
        COUNT(DISTINCT CASE WHEN l.lease_status = 'active' THEN l.id END) as occupied_units
      FROM properties p
      LEFT JOIN units u ON u.property_id = p.id
      LEFT JOIN leases l ON l.unit_id = u.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, address, city, state, zip, property_type } = req.body;
    const result = await pool.query(
      'INSERT INTO properties (name, address, city, state, zip, property_type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, address, city, state, zip, property_type]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, zip, property_type } = req.body;
    const result = await pool.query(
      'UPDATE properties SET name=$1, address=$2, city=$3, state=$4, zip=$5, property_type=$6 WHERE id=$7 RETURNING *',
      [name, address, city, state, zip, property_type, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Property not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

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