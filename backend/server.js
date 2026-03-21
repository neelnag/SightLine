const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const voiceRoutes = require('./routes/voice');
const commandRoutes = require('./routes/commands');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/voice', voiceRoutes);
app.use('/api/commands', commandRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
