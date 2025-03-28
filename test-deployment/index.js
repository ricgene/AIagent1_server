const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: "Hello World! The API is running.",
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('*', (req, res) => {
  res.json({
    message: `Received request for path: ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Cloud Function handler
exports.helloWorld = app;