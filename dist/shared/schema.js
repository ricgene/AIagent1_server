"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.businesses = exports.users = exports.insertMessageSchema = exports.insertBusinessSchema = exports.insertUserSchema = void 0;
const zod_1 = require("zod");
// User schema
exports.insertUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(6),
    type: zod_1.z.enum(["user", "business"]),
    name: zod_1.z.string().optional(),
});
// Business schema
exports.insertBusinessSchema = zod_1.z.object({
    description: zod_1.z.string(),
    category: zod_1.z.string(),
    location: zod_1.z.string(),
    services: zod_1.z.array(zod_1.z.string()).optional(),
    industryRules: zod_1.z.object({
        keywords: zod_1.z.array(zod_1.z.string()).optional(),
        priority: zod_1.z.number().optional(),
        requirements: zod_1.z.array(zod_1.z.string()).optional(),
        specializations: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
});
// Message schema
exports.insertMessageSchema = zod_1.z.object({
    fromId: zod_1.z.number(),
    toId: zod_1.z.number(),
    content: zod_1.z.string(),
    isAiAssistant: zod_1.z.boolean().optional(),
});
// Arrays for in-memory storage - declared only once
exports.users = [];
exports.businesses = [];
exports.messages = [];
//# sourceMappingURL=schema.js.map