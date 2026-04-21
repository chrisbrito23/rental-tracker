const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const propertiesRoutes = require('./routes/properties');
const tenantsRoutes = require('./routes/tenants');
const unitsRoutes = require('./routes/units');
const paymentsRoutes = require('./routes/payments');
const invoicesRoutes = require('./routes/invoices');

app.use('/api/properties', propertiesRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/invoices', invoicesRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Rental tracker API is running',
    endpoints: [
      'GET/POST /api/properties',
      'GET/POST /api/tenants',
      'GET/POST /api/units',
      'GET/POST /api/payments',
      'GET /api/payments/summary',
      'GET/POST /api/invoices',
      'GET /api/invoices/unpaid'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});