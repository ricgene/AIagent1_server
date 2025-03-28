// Simple in-memory storage implementation
class MemStorage {
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

  // User operations
  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData) {
    const id = this.currentId.users++;
    const user = { ...userData, id };
    this.users.set(id, user);
    return user;
  }
  
  // Business operations
  async getBusiness(id) {
    return this.businesses.get(id);
  }

  async getBusinessByUserId(userId) {
    return Array.from(this.businesses.values()).find(
      (business) => business.userId === userId
    );
  }

  async createBusiness(userId, businessData) {
    const id = this.currentId.businesses++;
    const business = { ...businessData, id, userId };
    this.businesses.set(id, business);
    return business;
  }

  async searchBusinesses(query) {
    console.log("Searching businesses with query:", query);
    // Return all businesses for AI matching to have the full context
    return Array.from(this.businesses.values());
  }

  // Message operations
  async getMessages(userId1, userId2) {
    return this.messages.filter(
      (msg) =>
        (msg.fromId === userId1 && msg.toId === userId2) ||
        (msg.fromId === userId2 && msg.toId === userId1)
    );
  }

  async createMessage(messageData) {
    const id = this.currentId.messages++;
    const message = {
      ...messageData,
      id,
      timestamp: new Date(),
      isAiAssistant: messageData.isAiAssistant ?? false
    };
    this.messages.push(message);
    return message;
  }
}

// Create a singleton instance
const storage = new MemStorage();

// Initialize with sample data
async function initializeSampleData() {
  console.log("Initializing sample data...");
  
  const sampleUser = {
    username: "testuser",
    password: "password123",
    type: "user",
    name: "Test User",
  };

  try {
    const user = await storage.createUser(sampleUser);
    console.log("Created sample user:", user);
    
    const sampleBusiness = {
      description: "Professional home repair and maintenance services.",
      category: "Home Services",
      location: "New York, NY",
      services: ["Home Repairs", "Plumbing", "Electrical"],
      industryRules: {
        keywords: ["repair", "maintenance", "home"],
        specializations: ["Home Renovation", "Electrical Work"]
      }
    };
    
    const business = await storage.createBusiness(user.id, sampleBusiness);
    console.log("Created sample business:", business);
  } catch (error) {
    console.error("Error creating sample data:", error);
  }
}

module.exports = { storage, initializeSampleData };