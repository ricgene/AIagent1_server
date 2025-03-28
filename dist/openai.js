"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchBusinessesToQuery = void 0;
const openai_1 = __importDefault(require("openai"));
if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
}
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
async function matchBusinessesToQuery(query, businesses) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert business matcher. Given a user's need and business profiles, analyze the semantic relationship between what the user needs and what businesses can provide. Consider capabilities, context, and potential solutions even if the exact terms don't match. For example, if a user needs 'home cooling solution', match with businesses offering 'AC installation' or 'HVAC services'. Return business IDs ranked by relevance in JSON format: { 'matches': number[], 'reasoning': string }",
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        query,
                        businesses: businesses.map((b) => ({
                            id: b.id,
                            description: b.description,
                            category: b.category,
                            location: b.location,
                            services: b.services,
                        })),
                    }),
                },
            ],
            response_format: { type: "json_object" },
        });
        const result = JSON.parse(response.choices[0].message.content);
        const matchedIds = new Set(result.matches);
        // Log the AI reasoning for debugging
        console.log("AI Matching Reasoning:", result.reasoning);
        return businesses
            .filter((b) => matchedIds.has(b.id))
            .sort((a, b) => {
            return result.matches.indexOf(a.id) - result.matches.indexOf(b.id);
        });
    }
    catch (error) {
        console.error("Failed to match businesses:", error);
        return businesses;
    }
}
exports.matchBusinessesToQuery = matchBusinessesToQuery;
//# sourceMappingURL=openai.js.map