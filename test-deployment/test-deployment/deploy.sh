#!/bin/bash

# Follow these steps to create a simplified version for testing:

# 1. Create a new directory for the test version
mkdir -p test-deployment

# 2. Copy only the necessary files for a basic API
cp -v package.json test-deployment/
cp -v package-lock.json test-deployment/
cp -v tsconfig.json test-deployment/
cp -v index.ts test-deployment/
cp -v routes.ts test-deployment/
cp -v cloud-function.js test-deployment/
cp -v deploy.sh test-deployment/
cp -v gcp-config.js test-deployment/

# 3. Create a minimal shared/schema.ts file
mkdir -p test-deployment/shared
cat > test-deployment/shared/schema.ts << 'EOF'
import { z } from "zod";

// User schema
export const insertUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  type: z.enum(["user", "business"]),
  name: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User extends InsertUser {
  id: number;
}

export const users: User[] = [];

// Business schema
export const insertBusinessSchema = z.object({
  description: z.string(),
  category: z.string(),
  location: z.string(),
  services: z.array(z.string()).optional(),
  industryRules: z.object({
    keywords: z.array(z.string()).optional(),
    priority: z.number().optional(),
    requirements: z.array(z.string()).optional(),
    specializations: z.array(z.string()).optional(),
  }).optional(),
});

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export interface Business extends InsertBusiness {
  id: number;
  userId: number;
}

export interface IndustryRule {
  keywords?: string[];
  priority?: number;
  requirements?: string[];
  specializations?: string[];
}

export const businesses: Business[] = [];

// Message schema
export const insertMessageSchema = z.object({
  fromId: z.number(),
  toId: z.number(),
  content: z.string(),
  isAiAssistant: z.boolean().optional(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;

export interface Message extends InsertMessage {
  id: number;
  timestamp: Date;
  isAiAssistant: boolean;
}

export const messages: Message[] = [];
EOF

# 4. Create a simplified storage.ts file
cat > test-deployment/storage.ts << 'EOF'
import { users, businesses, messages } from "./shared/schema";
import type { User, Business, Message, InsertUser, InsertBusiness, InsertMessage } from "./shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Business operations
  getBusiness(id: number): Promise<Business | undefined>;
  getBusinessByUserId(userId: number): Promise<Business | undefined>;
  createBusiness(userId: number, business: InsertBusiness): Promise<Business>;
  searchBusinesses(query: string): Promise<Business[]>;
  
  // Message operations
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businesses: Map<number, Business>;
  private messages: Message[];
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.messages = [];
    this.currentId = {
      users: 1,
      businesses: 1,
      messages: 1,
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }

  async getBusinessByUserId(userId: number): Promise<Business | undefined> {
    return Array.from(this.businesses.values()).find(
      (business) => business.userId === userId,
    );
  }

  async createBusiness(userId: number, insertBusiness: InsertBusiness): Promise<Business> {
    const id = this.currentId.businesses++;
    const business: Business = { ...insertBusiness, id, userId };
    this.businesses.set(id, business);
    return business;
  }

  async searchBusinesses(query: string): Promise<Business[]> {
    console.log("Searching businesses with query:", query);
    // Return all businesses for testing
    return Array.from(this.businesses.values());
  }

  async getMessages(userId1: number, userId2: number): Promise<Message[]> {
    return this.messages.filter(
      (msg) =>
        (msg.fromId === userId1 && msg.toId === userId2) ||
        (msg.fromId === userId2 && msg.toId === userId1)
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId.messages++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      isAiAssistant: insertMessage.isAiAssistant ?? false
    };
    this.messages.push(message);
    return message;
  }
}

export const storage = new MemStorage();
EOF

# 5. Create a simplified routes.ts file with the test endpoint
cat > test-deployment/routes.ts << 'EOF'
import type { Express } from "express";
import { insertUserSchema, insertBusinessSchema, insertMessageSchema } from "./shared/schema";
import { ZodError } from "zod";
import { storage } from "./storage";

// Flag to track if sample data has been initialized
let samplesInitialized = false;

export async function registerRoutes(app: Express) {
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

  return app;
}

// Separate function to initialize sample data
async function initializeSampleData() {
  console.log("Initializing sample data...");
  
  const sampleUser = {
    username: "testuser",
    password: "password123",
    type: "user" as const,
    name: "Test User",
  };

  try {
    const user = await storage.createUser(sampleUser);
    console.log("Created sample user:", user);
  } catch (error) {
    console.error("Error creating sample user:", error);
  }
}
EOF

# 6. Create a simplified index.ts file
cat > test-deployment/index.ts << 'EOF'
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

// Routes setup
let setupComplete = false;
const setupApp = async () => {
  if (!setupComplete) {
    await registerRoutes(app);
    setupComplete = true;
  }
};

// For serverless deployment
export const apiHandler = async (req: Request, res: Response) => {
  await setupApp();
  return app(req, res);
};

// For local development
if (process.env.NODE_ENV === 'development') {
  (async () => {
    await setupApp();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })();
}

// CommonJS style export for Cloud Functions
exports.apiHandler = apiHandler;
EOF

# 7. Create a minimal .env.yaml file for GCP deployment
cat > test-deployment/.env.yaml << 'EOF'
ANTHROPIC_API_KEY: "your-api-key-here"
EOF

echo "Simplified test deployment files created in the test-deployment directory."
echo "Make sure to add your Anthropic API key to the .env.yaml file."
echo "Then cd into test-deployment and run the deploy script."