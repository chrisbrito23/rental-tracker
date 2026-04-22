const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/summary', async (req, res) => {
  try {
    const income = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon') as month,
        DATE_TRUNC('month', payment_date) as month_date,
        SUM(amount) as total
      FROM payments
      WHERE payment_date >= NOW() - INTERVAL '6 months'
      AND status = 'paid'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month_date ASC
    `);

    const properties = await pool.query('SELECT COUNT(*) as count FROM properties');
    const tenants = await pool.query('SELECT COUNT(*) as count FROM tenants');
    const units = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_occupied THEN 1 END) as occupied FROM units');

    const monthlyTotal = await pool.query(`
      SELECT SUM(amount) as total
      FROM payments
      WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
      AND status = 'paid'
    `);

    const expenses = await pool.query(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    res.json({
      success: true,
      data: {
        income_chart: income.rows,
        monthly_income: monthlyTotal.rows[0].total || 0,
        monthly_expenses: expenses.rows[0].total || 0,
        net_income: (monthlyTotal.rows[0].total || 0) - (expenses.rows[0].total || 0),
        properties: properties.rows[0].count,
        tenants: tenants.rows[0].count,
        total_units: units.rows[0].total,
        occupied_units: units.rows[0].occupied,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;