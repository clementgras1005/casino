const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

module.exports = app;
