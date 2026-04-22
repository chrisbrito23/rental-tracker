const express = require('express');
const router = express.Router();
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const mammoth = require('mammoth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = 'You are a lease document analyzer. Extract the following information and return ONLY a valid JSON object with no other text: { "tenant_name": "full name", "monthly_rent": 0.00, "security_deposit": 0.00, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "late_fee_amount": 0.00, "late_fee_grace_days": 0, "rent_due_day": 1, "pet_allowed": false, "pet_deposit": 0.00, "monthly_pet_fee": 0.00, "utilities_included": [], "property_address": "full address", "unit_number": "unit if applicable", "confidence": { "overall": 95, "monthly_rent": 99, "dates": 99, "late_fee": 90 }, "notes": "important clauses" }';

router.post('/analyze-lease', upload.single('lease'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileName = req.file.originalname.toLowerCase();
    const isPDF = req.file.mimetype === 'application/pdf' || fileName.endsWith('.pdf');
    const isWord = fileName.endsWith('.doc') || fileName.endsWith('.docx');
    let message;

    if (isPDF) {
      const base64PDF = req.file.buffer.toString('base64');
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64PDF } },
            { type: 'text', text: PROMPT }
          ]
        }]
      });
    } else if (isWord) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: PROMPT + '\n\nLease document:\n' + result.value
        }]
      });
    } else {
      const textContent = req.file.buffer.toString('utf8');
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: PROMPT + '\n\nLease document:\n' + textContent
        }]
      });
    }

    const responseText = message.content[0].text;
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const extractedData = JSON.parse(cleanJson);
    const confidence = (extractedData.confidence && extractedData.confidence.overall) || 95;

    const savedDoc = await pool.query(
      'INSERT INTO documents (document_type, file_name, file_url, file_data, file_type, file_size, ai_extracted_data, ai_confidence, needs_review) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      ['lease', req.file.originalname, 'stored_in_db', req.file.buffer, req.file.mimetype, req.file.size, JSON.stringify(extractedData), confidence, confidence < 95]
    );

    res.json({
      success: true,
      document_id: savedDoc.rows[0].id,
      data: extractedData,
      confidence: confidence,
      needs_review: confidence < 95,
      file_saved: true,
      file_name: req.file.originalname,
      file_size: req.file.size
    });

  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/populate-from-document/:document_id', async (req, res) => {
  try {
    const { document_id } = req.params;
    const { property_id, confirmed_data } = req.body;

    const doc = await pool.query('SELECT * FROM documents WHERE id = $1', [document_id]);
    if (doc.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const data = confirmed_data || doc.rows[0].ai_extracted_data;
    const nameParts = (data.tenant_name || 'Unknown Tenant').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';

    const existingTenant = await pool.query(
      'SELECT id FROM tenants WHERE first_name = $1 AND last_name = $2',
      [firstName, lastName]
    );

    let tenant_id;
    if (existingTenant.rows.length > 0) {
      tenant_id = existingTenant.rows[0].id;
    } else {
      const newTenant = await pool.query(
        'INSERT INTO tenants (first_name, last_name) VALUES ($1, $2) RETURNING id',
        [firstName, lastName]
      );
      tenant_id = newTenant.rows[0].id;
    }

    let unit_id = null;
    let lease_id = null;

    if (property_id) {
      const unitNumber = data.unit_number || 'Unit 1';
      const existingUnit = await pool.query(
        'SELECT id FROM units WHERE property_id = $1 AND unit_number = $2',
        [property_id, unitNumber]
      );

      if (existingUnit.rows.length > 0) {
        unit_id = existingUnit.rows[0].id;
      } else {
        const newUnit = await pool.query(
          'INSERT INTO units (property_id, unit_number, rental_type, monthly_rent) VALUES ($1, $2, $3, $4) RETURNING id',
          [property_id, unitNumber, 'room', data.monthly_rent || 0]
        );
        unit_id = newUnit.rows[0].id;
      }

      const newLease = await pool.query(
        'INSERT INTO leases (unit_id, tenant_id, monthly_rent, security_deposit, start_date, end_date, late_fee_amount, late_fee_grace_days, rent_due_day, pet_allowed, pet_deposit, monthly_pet_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
        [unit_id, tenant_id, data.monthly_rent || 0, data.security_deposit || 0, data.start_date || new Date().toISOString().split('T')[0], data.end_date || null, data.late_fee_amount || 0, data.late_fee_grace_days || 5, data.rent_due_day || 1, data.pet_allowed || false, data.pet_deposit || 0, data.monthly_pet_fee || 0]
      );
      lease_id = newLease.rows[0].id;
    }

    await pool.query(
      'UPDATE documents SET lease_id = $1, tenant_id = $2, ai_reviewed = true WHERE id = $3',
      [lease_id, tenant_id, document_id]
    );

    res.json({
      success: true,
      message: 'Dashboard populated successfully',
      tenant_id,
      unit_id,
      lease_id
    });

  } catch (err) {
    console.error('Populate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/retrieve/:document_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT file_data, file_name, file_type FROM documents WHERE id = $1', [req.params.document_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    const doc = result.rows[0];
    res.set('Content-Type', doc.file_type || 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="' + doc.file_name + '"');
    res.send(doc.file_data);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve file' });
  }
});

module.exports = router;