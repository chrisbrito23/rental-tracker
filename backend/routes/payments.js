const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*,
        p.name as property_name,
        t.first_name || ' ' || t.last_name as tenant_name,
        l.monthly_rent, l.lease_status, l.end_date,
        l.pet_allowed, l.monthly_pet_fee
      FROM units u
      LEFT JOIN properties p ON p.id = u.property_id
      LEFT JOIN leases l ON l.unit_id = u.id AND l.lease_status = 'active'
      LEFT JOIN tenants t ON t.id = l.tenant_id
      ORDER BY p.name, u.unit_number
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      property_id, unit_number, rental_type,
      floor_number, bedrooms, bathrooms,
      square_feet, monthly_rent
    } = req.body;
    const result = await pool.query(
      `INSERT INTO units
        (property_id, unit_number, rental_type, floor_number, bedrooms, bathrooms, square_feet, monthly_rent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [property_id, unit_number, rental_type, floor_number, bedrooms, bathrooms, square_feet, monthly_rent]
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
    const {
      unit_number, rental_type, floor_number,
      bedrooms, bathrooms, square_feet,
      monthly_rent, is_occupied
    } = req.body;
    const result = await pool.query(
      `UPDATE units SET
        unit_number=$1, rental_type=$2, floor_number=$3,
        bedrooms=$4, bathrooms=$5, square_feet=$6,
        monthly_rent=$7, is_occupied=$8
       WHERE id=$9
       RETURNING *`,
      [unit_number, rental_type, floor_number, bedrooms, bathrooms, square_feet, monthly_rent, is_occupied, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM units WHERE id = $1', [id]);
    res.json({ success: true, message: 'Unit deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;