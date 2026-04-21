const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const propertiesRoutes = require('./routes/properties');
app.use('/api/properties', propertiesRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Rental tracker API is running'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});