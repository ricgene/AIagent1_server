"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const schema_js_1 = require("./shared/schema.js");
const anthropic_js_1 = require("./anthropic.js");
const zod_1 = require("zod");
const assistant_js_1 = require("./assistant.js");
const storage_js_1 = require("./storage.js");
// Flag to track if sample data has been initialized
let samplesInitialized = false;
async function registerRoutes(app) {
    // Only create sample businesses once to avoid duplication on cold starts
    if (!samplesInitialized) {
        await initializeSampleData();
        samplesInitialized = true;
    }
    // User routes
    app.post("/api/users", async (req, res) => {
        try {
            const userData = schema_js_1.insertUserSchema.parse(req.body);
            const user = await storage_js_1.storage.createUser(userData);
            res.json(user);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({ error: error.errors });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    // Business routes
    app.post("/api/businesses", async (req, res) => {
        try {
            const businessData = schema_js_1.insertBusinessSchema.parse(req.body);
            if (!req.body.userId) {
                throw new Error("userId is required");
            }
            const business = await storage_js_1.storage.createBusiness(req.body.userId, businessData);
            res.json(business);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({ error: error.errors });
            }
            else if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    app.get("/api/businesses/search", async (req, res) => {
        try {
            const query = req.query.q;
            console.log("Search query received:", query);
            if (!query) {
                console.log("No query provided, returning empty array");
                return res.json([]);
            }
            // Get all businesses first
            const businesses = await storage_js_1.storage.searchBusinesses(query);
            console.log("Found businesses before AI matching:", businesses.length);
            // Use Anthropic to perform semantic matching
            const matches = await (0, anthropic_js_1.matchBusinessesToQuery)(query, businesses);
            console.log("AI matched businesses:", matches.length);
            res.json(matches);
        }
        catch (error) {
            console.error("Search error:", error);
            if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    // Message routes
    app.get("/api/messages/:userId1/:userId2", async (req, res) => {
        try {
            const messages = await storage_js_1.storage.getMessages(parseInt(req.params.userId1), parseInt(req.params.userId2));
            res.json(messages);
        }
        catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    app.post("/api/messages", async (req, res) => {
        try {
            const messageData = schema_js_1.insertMessageSchema.parse(req.body);
            const message = await storage_js_1.storage.createMessage(messageData);
            // Note: WebSocket notifications removed for serverless compatibility
            res.json(message);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({ error: error.errors });
            }
            else if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    // AI Assistant routes
    app.get("/api/messages/ai/:userId", async (req, res) => {
        try {
            const messages = await storage_js_1.storage.getMessages(parseInt(req.params.userId), 0 // Using 0 as the AI assistant's ID
            );
            res.json(messages);
        }
        catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    app.post("/api/messages/ai", async (req, res) => {
        try {
            console.log("Received AI message request:", req.body);
            const { fromId, content } = req.body;
            // Save user message
            const userMessage = await storage_js_1.storage.createMessage({
                fromId,
                toId: 0, // AI assistant ID
                content,
                isAiAssistant: false
            });
            console.log("Created user message:", userMessage);
            // Get conversation history
            const messages = await storage_js_1.storage.getMessages(fromId, 0);
            console.log("Retrieved message history:", messages);
            // Get AI response
            const aiResponse = await (0, assistant_js_1.getAssistantResponse)(messages);
            console.log("Received AI response:", aiResponse);
            // Save AI response
            const assistantMessage = await storage_js_1.storage.createMessage({
                fromId: 0, // AI assistant ID
                toId: fromId,
                content: aiResponse,
                isAiAssistant: true
            });
            console.log("Created assistant message:", assistantMessage);
            // Return both messages to update the UI
            res.json([userMessage, assistantMessage]);
        }
        catch (error) {
            console.error("AI message error:", error);
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({ error: error.errors });
            }
            else if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: "Internal server error" });
            }
        }
    });
    return app;
}
// Separate function to initialize sample data
async function initializeSampleData() {
    console.log("Checking if sample data needs to be initialized...");
    // You might want to add a check here to see if data already exists
    // before creating samples, for example:
    // const existingBusinesses = await storage.getAllBusinesses();
    // if (existingBusinesses.length > 0) {
    //   console.log("Sample data already exists, skipping initialization");
    //   return;
    // }
    const sampleBusinesses = [
        {
            username: "techhub",
            password: "password123",
            type: "business",
            name: "TechHub Solutions",
        },
        {
            username: "homefix",
            password: "password123",
            type: "business",
            name: "HomeFix Pro",
        },
        {
            username: "healthplus",
            password: "password123",
            type: "business",
            name: "HealthPlus Services",
        },
    ];
    console.log("Creating sample businesses...");
    for (const business of sampleBusinesses) {
        try {
            console.log(`Creating user for ${business.name}...`);
            const user = await storage_js_1.storage.createUser(business);
            console.log(`Created user:`, user);
            console.log(`Creating business profile for ${business.name}...`);
            await storage_js_1.storage.createBusiness(user.id, {
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
        }
        catch (error) {
            console.error(`Error creating sample business ${business.name}:`, error);
        }
    }
}
//# sourceMappingURL=routes.js.map