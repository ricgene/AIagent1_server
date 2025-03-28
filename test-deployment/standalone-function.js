const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  next();
});

// Simple test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World! The function is running.',
    timestamp: new Date().toISOString()
  });
});

// Route for any other path
app.get('*', (req, res) => {
  res.json({
    message: `Received request for path: ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// For Cloud Functions
exports.helloWorld = app;

// For local testing and Cloud Run compatibility
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});