const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const lovableRoutes = require('./api/lovable');
const wordpressRoutes = require('./api/wordpress');
const logRoutes = require('./api/log');

app.use('/api/lovable', lovableRoutes);
app.use('/api/wordpress', wordpressRoutes);
app.use('/api/log', logRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
