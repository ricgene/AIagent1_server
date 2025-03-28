import { users, businesses, messages } from "@shared/schema";
import type { User, Business, Message, InsertUser, InsertBusiness, InsertMessage } from "@shared/schema";

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
    // Return all businesses for AI matching to have the full context
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