const express = require('express');
const router = express.Router();
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const upload = multer({ storage: multer.memoryStorage() });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/analyze-lease', upload.single('lease'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const base64PDF = req.file.buffer.toString('base64');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64PDF
            }
          },
          {
            type: 'text',
            text: `You are a lease document analyzer. Extract the following information from this lease document and return ONLY a valid JSON object with no other text, no markdown, no explanation:

{
  "tenant_name": "full name of tenant",
  "monthly_rent": 0.00,
  "security_deposit": 0.00,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "late_fee_amount": 0.00,
  "late_fee_grace_days": 0,
  "rent_due_day": 1,
  "pet_allowed": false,
  "pet_deposit": 0.00,
  "monthly_pet_fee": 0.00,
  "utilities_included": [],
  "property_address": "full address",
  "unit_number": "unit number if applicable",
  "confidence": {
    "overall": 95,
    "monthly_rent": 99,
    "dates": 99,
    "late_fee": 90
  },
  "notes": "any important clauses or unusual terms"
}`
          }
        ]
      }]
    });

    const responseText = message.content[0].text;
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const extractedData = JSON.parse(cleanJson);

    res.json({
      success: true,
      data: extractedData,
      confidence: extractedData.confidence?.overall || 95,
      needs_review: (extractedData.confidence?.overall || 95) < 95
    });

  } catch (err) {
    console.error('AI analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;