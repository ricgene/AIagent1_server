const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Simple in-memory storage
const storage = {
  users: new Map(),
  businesses: new Map(),
  messages: [],
  currentId: {
    users: 1,
    businesses: 1,
    messages: 1
  }
};

// Initialize sample data
function initSampleData() {
  // Add a sample user
  const user = {
    id: storage.currentId.users++,
    username: "homefix",
    type: "business",
    name: "HomeFix Pro"
  };
  storage.users.set(user.id, user);
  
  // Add a sample business
  const business = {
    id: storage.currentId.businesses++,
    userId: user.id,
    description: "Professional home repair and maintenance services. From basic repairs to major renovations, we do it all.",
    category: "Home Services",
    location: "New York, NY",
    services: ["Home Repairs", "Renovation", "Plumbing", "Electrical", "HVAC"],
    industryRules: {
      keywords: ["repair", "renovation", "maintenance", "install", "fix", "home", "house", "building"],
      specializations: ["Home Renovation", "HVAC Systems", "Electrical Work", "Plumbing"]
    }
  };
  storage.businesses.set(business.id, business);
  
  console.log("Sample data initialized:", { user, business });
}

// Initialize on first run
let initialized = false;

// Test endpoint
app.get('/api/test', (req, res) => {
  if (!initialized) {
    initSampleData();
    initialized = true;
  }
  
  res.json({
    message: "Hello World! The API is running.",
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
});

// Business search endpoint
app.get('/api/businesses/search', async (req, res) => {
  try {
    if (!initialized) {
      initSampleData();
      initialized = true;
    }
    
    const query = req.query.q || "";
    console.log("Search query:", query);
    
    // Get all businesses
    const businesses = Array.from(storage.businesses.values());
    
    if (!query) {
      return res.json(businesses);
    }
    
    // Since this is a simple demo, we'll just return all businesses
    // In a real implementation, you would call Anthropic's API here
    return res.json({
      query: query,
      businesses: businesses,
      message: "AI matching is disabled in this demo"
    });
  } catch (error) {
    console.error("Error in business search:", error);
    res.status(500).json({ error: "Failed to search businesses" });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    if (!initialized) {
      initSampleData();
      initialized = true;
    }
    
    const { userId, message } = req.body;
    console.log("Chat request:", { userId, message });
    
    if (!userId || !message) {
      return res.status(400).json({ error: "Missing userId or message" });
    }
    
    // For demo purposes, just echo the message back
    return res.json({
      userMessage: {
        id: storage.currentId.messages++,
        fromId: userId,
        toId: 0,
        content: message,
        timestamp: new Date(),
        isAiAssistant: false
      },
      assistantMessage: {
        id: storage.currentId.messages++,
        fromId: 0,
        toId: userId,
        content: `Echo: ${message}\n\nThis is a demo response without using the Anthropic API.`,
        timestamp: new Date(),
        isAiAssistant: true
      }
    });
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Default route
app.all('*', (req, res) => {
  if (!initialized) {
    initSampleData();
    initialized = true;
  }
  
  res.json({
    message: `Endpoint accessed: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    available: [
      "/api/test",
      "/api/businesses/search?q=query",
      "/api/chat (POST)"
    ]
  });
});

// Export for Cloud Functions
exports.helloWorld = app;