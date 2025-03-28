import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { insertUserSchema, insertBusinessSchema, insertMessageSchema } from "@shared/schema.js";
import { matchBusinessesToQuery } from "./anthropic.js";
import { ZodError } from "zod";
import { getAssistantResponse } from "./assistant.js";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Update the sample business creation section
  const sampleBusinesses = [
    {
      username: "techhub",
      password: "password123",
      type: "business" as const,
      name: "TechHub Solutions",
    },
    {
      username: "homefix",
      password: "password123",
      type: "business" as const,
      name: "HomeFix Pro",
    },
    {
      username: "healthplus",
      password: "password123",
      type: "business" as const,
      name: "HealthPlus Services",
    },
  ];

  // Update the business creation part
  console.log("Creating sample businesses...");
  for (const business of sampleBusinesses) {
    try {
      console.log(`Creating user for ${business.name}...`);
      const user = await storage.createUser(business);
      console.log(`Created user:`, user);

      console.log(`Creating business profile for ${business.name}...`);
      await storage.createBusiness(user.id, {
        description: business.name === "TechHub Solutions"
          ? "Expert IT consulting and software development services. Specializing in web applications, mobile apps, and cloud solutions."
          : business.name === "HomeFix Pro"
          ? "Professional home repair and maintenance services. From basic repairs to major renovations, we do it all."
          : "Comprehensive healthcare services including preventive care, wellness programs, and specialized treatments.",
        category: business.name === "TechHub Solutions"
          ? "Technology"
          : business.name === "HomeFix Pro"
          ? "Home Services"
          : "Healthcare",
        location: "New York, NY",
        services: business.name === "TechHub Solutions"
          ? ["Web Development", "Mobile Apps", "Cloud Computing", "IT Consulting"]
          : business.name === "HomeFix Pro"
          ? ["Home Repairs", "Renovation", "Plumbing", "Electrical", "HVAC"]
          : ["Primary Care", "Wellness Programs", "Specialized Care", "Telemedicine"],
        industryRules: business.name === "TechHub Solutions"
          ? {
              keywords: ["software", "web", "mobile", "cloud", "IT", "digital", "tech", "application"],
              priority: 8,
              requirements: ["Software Development", "Cloud Architecture", "Agile Methodology"],
              specializations: ["Web Applications", "Mobile Development", "Cloud Solutions"]
            }
          : business.name === "HomeFix Pro"
          ? {
              keywords: ["repair", "renovation", "maintenance", "install", "fix", "home", "house", "building"],
              priority: 9,
              requirements: ["Licensed Contractor", "HVAC Certified", "Electrical License"],
              specializations: ["Home Renovation", "HVAC Systems", "Electrical Work", "Plumbing"]
            }
          : {
              keywords: ["health", "medical", "wellness", "care", "treatment", "therapy", "diagnosis"],
              priority: 7,
              requirements: ["Medical License", "Board Certification", "HIPAA Compliance"],
              specializations: ["Primary Care", "Preventive Medicine", "Telemedicine"]
            }
      });
      console.log(`Created business profile for ${business.name}`);
    } catch (error) {
      console.error(`Error creating sample business ${business.name}:`, error);
    }
  }

  // WebSocket setup for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Ensure WebSocket server shuts down cleanly
  httpServer.on('close', () => {
    wss.clients.forEach(client => {
      client.terminate();
    });
    console.log("WebSocket server closed");
  });

  const clients = new Map<number, WebSocket>();

  wss.on("connection", (ws) => {
    console.log("WebSocket connection established");

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "auth" && msg.userId) {
          clients.set(msg.userId, ws);
          console.log(`User ${msg.userId} authenticated via WebSocket`);
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    ws.on("close", (code, reason) => {
      console.log(`WebSocket closed with code ${code}. Reason: ${reason}`);
      // Remove client from the map when disconnected
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });

    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Business routes
  app.post("/api/businesses", async (req, res) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);
      if (!req.body.userId) {
        throw new Error("userId is required");
      }
      const business = await storage.createBusiness(req.body.userId, businessData);
      res.json(business);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/businesses/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      console.log("Search query received:", query);

      if (!query) {
        console.log("No query provided, returning empty array");
        return res.json([]);
      }

      // Get all businesses first
      const businesses = await storage.searchBusinesses(query);
      console.log("Found businesses before AI matching:", businesses.length);

      // Use Anthropic to perform semantic matching
      const matches = await matchBusinessesToQuery(query, businesses);
      console.log("AI matched businesses:", matches.length);

      res.json(matches);
    } catch (error) {
      console.error("Search error:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Message routes
  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const messages = await storage.getMessages(
        parseInt(req.params.userId1),
        parseInt(req.params.userId2)
      );
      res.json(messages);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);

      // Notify recipient through WebSocket if connected
      const recipientWs = clients.get(message.toId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify(message));
      }

      res.json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // AI Assistant routes
  app.get("/api/messages/ai/:userId", async (req, res) => {
    try {
      const messages = await storage.getMessages(
        parseInt(req.params.userId),
        0  // Using 0 as the AI assistant's ID
      );
      res.json(messages);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/messages/ai", async (req, res) => {
    try {
      console.log("Received AI message request:", req.body);
      const { fromId, content } = req.body;

      // Save user message
      const userMessage = await storage.createMessage({
        fromId,
        toId: 0,  // AI assistant ID
        content,
        isAiAssistant: false
      });
      console.log("Created user message:", userMessage);

      // Get conversation history
      const messages = await storage.getMessages(fromId, 0);
      console.log("Retrieved message history:", messages);

      // Get AI response
      const aiResponse = await getAssistantResponse(messages);
      console.log("Received AI response:", aiResponse);

      // Save AI response
      const assistantMessage = await storage.createMessage({
        fromId: 0,  // AI assistant ID
        toId: fromId,
        content: aiResponse,
        isAiAssistant: true
      });
      console.log("Created assistant message:", assistantMessage);

      // Return both messages to update the UI
      res.json([userMessage, assistantMessage]);
    } catch (error) {
      console.error("AI message error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return httpServer;
}