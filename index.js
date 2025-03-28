const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`Request received: ${req.method} ${req.path}`);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`Response sent: ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  
  next();
});

// Add simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: "Hello World! The API is running.",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown'
  });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Cloud Function handler
exports.apiHandler = (req, res) => {
  return app(req, res);
};
