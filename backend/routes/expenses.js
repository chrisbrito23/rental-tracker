const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { property_id } = req.query;
    let query = `
      SELECT e.*, p.name as property_name
      FROM expenses e
      LEFT JOIN properties p ON p.id = e.property_id
    `;
    const params = [];
    if (property_id) {
      query += ' WHERE e.property_id = $1';
      params.push(property_id);
    }
    query += ' ORDER BY e.expense_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { property_id } = req.query;
    let whereClause = property_id ? 'WHERE e.property_id = $1' : '';
    const params = property_id ? [property_id] : [];

    const monthly = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', expense_date), 'Mon YYYY') as month,
        DATE_TRUNC('month', expense_date) as month_date,
        category,
        SUM(amount) as total
      FROM expenses e
      ${whereClause}
      GROUP BY DATE_TRUNC('month', expense_date), category
      ORDER BY month_date DESC
      LIMIT 24
    `, params);

    const yearly = await pool.query(`
      SELECT
        EXTRACT(YEAR FROM expense_date) as year,
        category,
        SUM(amount) as total
      FROM expenses e
      ${whereClause}
      GROUP BY EXTRACT(YEAR FROM expense_date), category
      ORDER BY year DESC
    `, params);

    const totals = await pool.query(`
      SELECT
        SUM(CASE WHEN DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) as this_month,
        SUM(CASE WHEN EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount ELSE 0 END) as this_year,
        SUM(amount) as all_time
      FROM expenses e
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        monthly: monthly.rows,
        yearly: yearly.rows,
        totals: totals.rows[0]
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
      property_id, unit_id, category, amount,
      expense_date, description, vendor,
      is_recurring, tax_deductible, receipt_url
    } = req.body;
    const result = await pool.query(
      `INSERT INTO expenses
        (property_id, unit_id, category, amount, expense_date,
         description, vendor, is_recurring, tax_deductible, receipt_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [property_id, unit_id, category, amount, expense_date,
       description, vendor, is_recurring, tax_deductible, receipt_url]
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
      category, amount, expense_date,
      description, vendor, is_recurring, tax_deductible
    } = req.body;
    const result = await pool.query(
      `UPDATE expenses SET category=$1, amount=$2, expense_date=$3,
       description=$4, vendor=$5, is_recurring=$6, tax_deductible=$7
       WHERE id=$8 RETURNING *`,
      [category, amount, expense_date, description, vendor, is_recurring, tax_deductible, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;