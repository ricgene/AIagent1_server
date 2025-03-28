"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.MemStorage = void 0;
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
    async getUser(id) {
        return this.users.get(id);
    }
    async getUserByUsername(username) {
        return Array.from(this.users.values()).find((user) => user.username === username);
    }
    async createUser(insertUser) {
        const id = this.currentId.users++;
        const user = { ...insertUser, id };
        this.users.set(id, user);
        return user;
    }
    async getBusiness(id) {
        return this.businesses.get(id);
    }
    async getBusinessByUserId(userId) {
        return Array.from(this.businesses.values()).find((business) => business.userId === userId);
    }
    async createBusiness(userId, insertBusiness) {
        const id = this.currentId.businesses++;
        const business = { ...insertBusiness, id, userId };
        this.businesses.set(id, business);
        return business;
    }
    async searchBusinesses(query) {
        console.log("Searching businesses with query:", query);
        // Return all businesses for AI matching to have the full context
        return Array.from(this.businesses.values());
    }
    async getMessages(userId1, userId2) {
        return this.messages.filter((msg) => (msg.fromId === userId1 && msg.toId === userId2) ||
            (msg.fromId === userId2 && msg.toId === userId1));
    }
    async createMessage(insertMessage) {
        const id = this.currentId.messages++;
        const message = {
            ...insertMessage,
            id,
            timestamp: new Date(),
            isAiAssistant: insertMessage.isAiAssistant ?? false
        };
        this.messages.push(message);
        return message;
    }
}
exports.MemStorage = MemStorage;
exports.storage = new MemStorage();
//# sourceMappingURL=storage.js.map