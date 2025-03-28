const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client with API key from environment variable
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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
  
  // Add a tech business for variety
  const techUser = {
    id: storage.currentId.users++,
    username: "techhub",
    type: "business",
    name: "TechHub Solutions"
  };
  storage.users.set(techUser.id, techUser);
  
  const techBusiness = {
    id: storage.currentId.businesses++,
    userId: techUser.id,
    description: "Expert IT consulting and software development services. Specializing in web applications, mobile apps, and cloud solutions.",
    category: "Technology",
    location: "San Francisco, CA",
    services: ["Web Development", "Mobile Apps", "Cloud Computing", "IT Consulting"],
    industryRules: {
      keywords: ["software", "web", "mobile", "cloud", "IT", "digital", "tech", "application"],
      specializations: ["Web Applications", "Mobile Development", "Cloud Solutions"]
    }
  };
  storage.businesses.set(techBusiness.id, techBusiness);
  
  console.log("Sample data initialized with businesses:", Array.from(storage.businesses.values()).map(b => b.id));
}

// Initialize on first run
let initialized = false;

// Endpoint to log API key status (without revealing the key)
app.get('/api/status', (req, res) => {
  if (!initialized) {
    initSampleData();
    initialized = true;
  }
  
  const apiKeyStatus = process.env.ANTHROPIC_API_KEY ? 
    "API key is set (first 4 chars: " + process.env.ANTHROPIC_API_KEY.substring(0, 4) + "...)" : 
    "API key is NOT set";
  
  res.json({
    message: "API status",
    timestamp: new Date().toISOString(),
    anthropicApiKeyStatus: apiKeyStatus,
    initialized: initialized,
    businessCount: storage.businesses.size
  });
});

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

// Business search endpoint with Anthropic AI
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
    
    // Use Anthropic to match businesses to the query
    try {
      // Format business data for the prompt
      const businessData = businesses.map((business, index) => {
        return `Business ${index + 1}:
ID: ${business.id}
Name: ${business.name || `User ${business.userId}`}
Description: ${business.description}
Category: ${business.category}
Location: ${business.location}
Services: ${business.services ? business.services.join(", ") : "N/A"}
Keywords: ${business.industryRules?.keywords ? business.industryRules.keywords.join(", ") : "N/A"}
Specializations: ${business.industryRules?.specializations ? business.industryRules.specializations.join(", ") : "N/A"}`;
      }).join("\n\n");

      // Create prompt for Claude
      const prompt = `I need to match the following user query to the most relevant businesses. Please analyze the query and return the IDs of businesses that match, in order of relevance.

User Query: "${query}"

${businessData}

Analyze which businesses are most relevant to the user's query. Consider service offerings, specializations, keywords, and the semantic meaning of the query.
Return a comma-separated list of business IDs, ordered by relevance (most relevant first).
Only include businesses that are genuinely relevant to the query. If none are relevant, return an empty list.`;

      console.log("Sending request to Anthropic API");
      
      // Get response from Anthropic
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        system: "You are a business matching algorithm that finds relevant service providers for user queries.",
        messages: [{ role: "user", content: prompt }],
      });

      console.log("Received response from Anthropic API:", response.content[0].text);

      // Extract business IDs from the response
      const responseText = response.content[0].text.trim();
      if (!responseText) {
        return res.json({ businesses: [], message: "No matching businesses found" });
      }

      // Parse the response to get business IDs
      const businessIds = responseText
        .split(",")
        .map(id => id.trim())
        .filter(id => /^\d+$/.test(id)) // Ensure we only have numeric IDs
        .map(id => parseInt(id, 10));

      // Map business IDs back to actual businesses and maintain the order
      const matchedBusinesses = businessIds
        .map(id => businesses.find(b => b.id === id))
        .filter(Boolean);

      return res.json({
        query: query,
        businesses: matchedBusinesses,
        response: responseText
      });
    } catch (anthropicError) {
      console.error("Error using Anthropic API:", anthropicError);
      return res.json({
        query: query,
        businesses: businesses,
        error: "Error using Anthropic API: " + anthropicError.message,
        note: "Returning all businesses as fallback"
      });
    }
  } catch (error) {
    console.error("Error in business search:", error);
    res.status(500).json({ error: "Failed to search businesses" });
  }
});

// Chat endpoint with Anthropic AI
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
    
    // Create a user message
    const userMessage = {
      id: storage.currentId.messages++,
      fromId: userId,
      toId: 0, // AI assistant ID
      content: message,
      timestamp: new Date(),
      isAiAssistant: false
    };
    
    // Store the message
    storage.messages.push(userMessage);
    
    try {
      // Get recent conversation history
      const conversationHistory = storage.messages
        .filter(msg => (msg.fromId === userId && msg.toId === 0) || (msg.fromId === 0 && msg.toId === userId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-10) // Get last 10 messages
        .map(msg => ({
          role: msg.isAiAssistant ? "assistant" : "user",
          content: msg.content
        }));
      
      // Define system prompt
      const systemPrompt = `You are a helpful AI assistant for a home improvement service. 
      Provide friendly, professional responses to customer inquiries about home improvement services.
      If asked about urgent situations like water leaks, electrical hazards, or structural damage, 
      emphasize the importance of immediate professional help.
      Never promise specific prices, but you can discuss general price ranges and factors that affect pricing.`;
      
      console.log("Sending chat request to Anthropic API");
      
      // Make API call to Anthropic
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        system: systemPrompt,
        messages: conversationHistory,
      });
      
      console.log("Received chat response from Anthropic API");
      
      const aiContent = response.content[0].text;
      
      // Create and store AI response
      const assistantMessage = {
        id: storage.currentId.messages++,
        fromId: 0, // AI assistant ID
        toId: userId,
        content: aiContent,
        timestamp: new Date(),
        isAiAssistant: true
      };
      
      storage.messages.push(assistantMessage);
      
      return res.json({
        userMessage,
        assistantMessage
      });
    } catch (anthropicError) {
      console.error("Error using Anthropic API for chat:", anthropicError);
      
      // Create a fallback response
      const assistantMessage = {
        id: storage.currentId.messages++,
        fromId: 0,
        toId: userId,
        content: "I apologize, but I'm having trouble connecting to my AI service right now. Please try again later.",
        timestamp: new Date(),
        isAiAssistant: true
      };
      
      storage.messages.push(assistantMessage);
      
      return res.json({
        userMessage,
        assistantMessage,
        error: "Error using Anthropic API: " + anthropicError.message
      });
    }
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
      "/api/status",
      "/api/test",
      "/api/businesses/search?q=query",
      "/api/chat (POST)"
    ]
  });
});

// Export for Cloud Functions
exports.helloWorld = app;