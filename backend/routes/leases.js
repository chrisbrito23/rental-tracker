const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        u.unit_number, p.name as property_name
      FROM leases l
      JOIN tenants t ON t.id = l.tenant_id
      JOIN units u ON u.id = l.unit_id
      JOIN properties p ON p.id = u.property_id
      ORDER BY l.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/tenant-summary/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;

    const lease = await pool.query(`
      SELECT l.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        u.unit_number, p.name as property_name
      FROM leases l
      JOIN tenants t ON t.id = l.tenant_id
      JOIN units u ON u.id = l.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE l.tenant_id = $1
     AND (l.lease_status = 'active' OR l.lease_status IS NULL)
      LIMIT 1
    `, [tenant_id]);

    if (lease.rows.length === 0) {
      return res.json({ success: false, error: 'No active lease found' });
    }

    const payments = await pool.query(`
      SELECT * FROM payments
      WHERE lease_id = $1
      ORDER BY payment_date DESC
      LIMIT 12
    `, [lease.rows[0].id]);

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'paid' AND payment_date <= due_date THEN 1 END) as on_time,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END) as total_unpaid,
        SUM(late_fee_applied) as total_late_fees
      FROM payments
      WHERE lease_id = $1
    `, [lease.rows[0].id]);

    const totalDue = parseInt(stats.rows[0].total_payments);
    const onTime = parseInt(stats.rows[0].on_time);
    const score = totalDue > 0 ? Math.round((onTime / totalDue) * 100) : 100;

    const today = new Date();
    const leaseStart = new Date(lease.rows[0].start_date);
    const monthsElapsed = Math.max(0, (today.getFullYear() - leaseStart.getFullYear()) * 12 + (today.getMonth() - leaseStart.getMonth()));
    const monthlyRent = parseFloat(lease.rows[0].monthly_rent) || 0;
    const totalExpected = monthsElapsed * monthlyRent;
    const totalPaid = parseFloat(stats.rows[0].total_paid) || 0;
    const totalOwed = Math.max(0, totalExpected - totalPaid);

    const dueDay = lease.rows[0].rent_due_day || 1;
    const graceDays = lease.rows[0].late_fee_grace_days || 5;
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    const deadline = new Date(dueDate);
    deadline.setDate(deadline.getDate() + graceDays);
    const isLate = today > deadline;
    const lateFeeApplicable = isLate ? lease.rows[0].late_fee_amount : 0;

    res.json({
      success: true,
      data: {
        lease: lease.rows[0],
        payments: payments.rows,
        stats: stats.rows[0],
        score,
        total_owed: totalOwed,
        total_expected: totalExpected,
        total_paid: totalPaid,
        months_elapsed: monthsElapsed,
        is_late: isLate,
        late_fee_applicable: lateFeeApplicable,
        due_date: dueDate.toISOString().split('T')[0],
        score_color: score >= 90 ? 'green' : score >= 70 ? 'amber' : 'red'
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
      unit_id, tenant_id, monthly_rent,
      security_deposit, start_date, end_date,
      late_fee_amount, late_fee_grace_days,
      rent_due_day, pet_allowed, pet_deposit,
      monthly_pet_fee, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO leases
        (unit_id, tenant_id, monthly_rent, security_deposit,
         start_date, end_date, late_fee_amount, late_fee_grace_days,
         rent_due_day, pet_allowed, pet_deposit, monthly_pet_fee, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [unit_id, tenant_id, monthly_rent, security_deposit,
       start_date, end_date, late_fee_amount, late_fee_grace_days,
       rent_due_day, pet_allowed, pet_deposit, monthly_pet_fee, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;