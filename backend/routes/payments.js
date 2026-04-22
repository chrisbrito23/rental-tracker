const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        u.unit_number, u.rental_type,
        pr.name as property_name
      FROM payments p
      JOIN leases l ON l.id = p.lease_id
      JOIN tenants t ON t.id = l.tenant_id
      JOIN units u ON u.id = l.unit_id
      JOIN properties pr ON pr.id = u.property_id
      ORDER BY p.payment_date DESC
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'late' THEN amount ELSE 0 END) as total_late,
        SUM(late_fee_applied) as total_late_fees,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM payments
      WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      lease_id, amount, payment_date,
      due_date, payment_method, payment_type,
      status, late_fee_applied, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO payments
        (lease_id, amount, payment_date, due_date, payment_method, payment_type, status, late_fee_applied, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [lease_id, amount, payment_date, due_date, payment_method, payment_type, status, late_fee_applied, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
