const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, document_type, file_name, file_url,
             file_type, file_size, ai_extracted_data,
             ai_confidence, needs_review, uploaded_at
      FROM documents
      ORDER BY uploaded_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      lease_id, property_id, tenant_id,
      document_type, file_name, file_url,
      ai_extracted_data, ai_confidence, needs_review
    } = req.body;
    const result = await pool.query(
      `INSERT INTO documents
        (lease_id, property_id, tenant_id, document_type,
         file_name, file_url, ai_extracted_data, ai_confidence, needs_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [lease_id, property_id, tenant_id, document_type,
       file_name, file_url,
       JSON.stringify(ai_extracted_data),
       ai_confidence, needs_review]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;