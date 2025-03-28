"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const schema_1 = require("./shared/schema");
const zod_1 = require("zod");
const storage_1 = require("./storage");
// Flag to track if sample data has been initialized
let samplesInitialized = false;
async function registerRoutes(app) {
    // Add a simple test endpoint
    app.get("/api/test", (req, res) => {
        res.json({
            message: "Hello World! The API is running.",
            timestamp: new Date().toISOString()
        });
    });
    // Only create sample businesses once to avoid duplication on cold starts
    if (!samplesInitialized) {
        await initializeSampleData();
        samplesInitialized = true;
    }
    // User routes
    app.post("/api/users", async (req, res) => {
        try {
            const userData = schema_1.insertUserSchema.parse(req.body);
            const user = await storage_1.storage.createUser(userData);
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
    return app;
}
// Separate function to initialize sample data
async function initializeSampleData() {
    console.log("Initializing sample data...");
    const sampleUser = {
        username: "testuser",
        password: "password123",
        type: "user",
        name: "Test User",
    };
    try {
        const user = await storage_1.storage.createUser(sampleUser);
        console.log("Created sample user:", user);
    }
    catch (error) {
        console.error("Error creating sample user:", error);
    }
}
//# sourceMappingURL=routes.js.map