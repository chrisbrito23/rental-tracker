const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        p.name as property_name
      FROM invoices i
      JOIN tenants t ON t.id = i.tenant_id
      JOIN properties p ON p.id = i.property_id
      ORDER BY i.issued_date DESC
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/unpaid', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        p.name as property_name
      FROM invoices i
      JOIN tenants t ON t.id = i.tenant_id
      JOIN properties p ON p.id = i.property_id
      WHERE i.status = 'unpaid'
      ORDER BY i.due_date ASC
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
      lease_id, tenant_id, property_id,
      amount, description, category,
      due_date, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO invoices
        (lease_id, tenant_id, property_id, amount, description, category, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [lease_id, tenant_id, property_id, amount, description, category, due_date, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_date } = req.body;
    const result = await pool.query(
      `UPDATE invoices SET status=$1, paid_date=$2 WHERE id=$3 RETURNING *`,
      [status, paid_date, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;