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

// Arrays for in-memory storage - declared only once
export const users: User[] = [];
export const businesses: Business[] = [];
export const messages: Message[] = [];