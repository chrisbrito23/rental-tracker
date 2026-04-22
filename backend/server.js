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
const leasesRoutes = require('./routes/leases');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const documentsRoutes = require('./routes/documents');
const expensesRoutes = require('./routes/expenses');

app.use('/api/properties', propertiesRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/leases', leasesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/expenses', expensesRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Rental tracker API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});