const express = require('express');
const cors = require('cors');
const { storage, initializeSampleData } = require('./storage');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  next();
});

// Initialize sample data (will run only once per instance due to Cloud Functions cold start)
let initialized = false;
app.use(async (req, res, next) => {
  if (!initialized) {
    await initializeSampleData();
    initialized = true;
  }
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: "Hello World! The API is running.",
    timestamp: new Date().toISOString()
  });
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = Array.from(storage.users.values());
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create a user
app.post('/api/users', async (req, res) => {
  try {
    // Simple validation (you can add more robust validation later)
    const { username, password, type, name } = req.body;
    
    if (!username || !password || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const user = await storage.createUser({ username, password, type, name });
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Search businesses
app.get('/api/businesses/search', async (req, res) => {
  try {
    const query = req.query.q || "";
    console.log("Search query received:", query);
    
    const businesses = await storage.searchBusinesses(query);
    res.json(businesses);
  } catch (error) {
    console.error("Error searching businesses:", error);
    res.status(500).json({ error: "Failed to search businesses" });
  }
});

// Default route
app.get('*', (req, res) => {
  res.json({
    message: `API endpoint not found: ${req.path}`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "/api/test",
      "/api/users",
      "/api/users/:id",
      "/api/businesses/search?q=query"
    ]
  });
});

// Cloud Function handler
exports.helloWorld = app;