const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        l.monthly_rent,
        l.lease_status,
        l.end_date,
        u.unit_number,
        u.rental_type,
        p.name as property_name
      FROM tenants t
      LEFT JOIN leases l ON l.tenant_id = t.id
      LEFT JOIN units u ON u.id = l.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await pool.query(
      'SELECT * FROM tenants WHERE id = $1', [id]
    );
    if (tenant.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    const leases = await pool.query(
      'SELECT * FROM leases WHERE tenant_id = $1 ORDER BY start_date DESC', [id]
    );
    const payments = await pool.query(
      `SELECT p.* FROM payments p
       JOIN leases l ON l.id = p.lease_id
       WHERE l.tenant_id = $1
       ORDER BY p.payment_date DESC
       LIMIT 12`, [id]
    );
    res.json({
      success: true,
      data: {
        ...tenant.rows[0],
        leases: leases.rows,
        recent_payments: payments.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone,
      date_of_birth, move_in_date, id_type,
      id_number, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO tenants
        (first_name, last_name, email, phone, date_of_birth, move_in_date, id_type, id_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [first_name, last_name, email, phone, date_of_birth, move_in_date, id_type, id_number, notes]
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
      first_name, last_name, email, phone,
      date_of_birth, move_in_date, id_type,
      id_number, notes
    } = req.body;
    const result = await pool.query(
      `UPDATE tenants SET
        first_name=$1, last_name=$2, email=$3, phone=$4,
        date_of_birth=$5, move_in_date=$6, id_type=$7,
        id_number=$8, notes=$9
       WHERE id=$10
       RETURNING *`,
      [first_name, last_name, email, phone, date_of_birth, move_in_date, id_type, id_number, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
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
    await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
    res.json({ success: true, message: 'Tenant deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;