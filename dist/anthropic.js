"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchBusinessesToQuery = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
}
const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024. do not change this unless explicitly requested by the user
async function matchBusinessesToQuery(query, businesses) {
    try {
        console.log("Calling Anthropic API with query:", query);
        console.log("Number of businesses to match:", businesses.length);
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [
                {
                    role: "user",
                    content: `As an expert business matcher with industry-specific knowledge, analyze this query: "${query}" against these business profiles: ${JSON.stringify(businesses.map(b => ({
                        id: b.id,
                        description: b.description,
                        category: b.category,
                        location: b.location,
                        services: b.services,
                        industryRules: b.industryRules,
                    })))}

Consider the following in your analysis:
1. Industry-specific keywords and requirements defined in industryRules
2. Priority levels for different types of services
3. Specialized capabilities and certifications
4. Service area and location relevance
5. Semantic relationship between query needs and business capabilities

Match businesses not just on exact terms, but on capability and context. For example, if a user needs "home cooling solution", match with businesses offering "AC installation" or "HVAC services", giving higher scores to those with specific HVAC certifications in their industryRules.

Return a JSON response with this structure:
{
  "matches": [business_ids],
  "reasoning": "detailed explanation of matches",
  "industrySpecificFactors": ["list of key industry factors that influenced the matching"]
}`
                },
            ],
        });
        console.log("Received response from Anthropic:", response.content);
        if (!response.content[0] || typeof response.content[0] !== 'object') {
            throw new Error("Invalid response format");
        }
        const content = response.content[0].type === 'text' ? response.content[0].text : null;
        if (!content) {
            throw new Error("No text content in response");
        }
        console.log("Parsed content from response:", content);
        const result = JSON.parse(content);
        console.log("Parsed JSON result:", result);
        const matchedIds = new Set(result.matches);
        console.log("Matched business IDs:", Array.from(matchedIds));
        console.log("Industry-specific factors:", result.industrySpecificFactors);
        // Log the AI reasoning for debugging
        console.log("AI Matching Reasoning:", result.reasoning);
        // Sort businesses by their order in the matches array to maintain priority
        return businesses
            .filter((b) => matchedIds.has(b.id))
            .sort((a, b) => {
            const aIndex = result.matches.indexOf(a.id);
            const bIndex = result.matches.indexOf(b.id);
            if (aIndex === -1)
                return 1;
            if (bIndex === -1)
                return -1;
            return aIndex - bIndex;
        });
    }
    catch (error) {
        console.error("Failed to match businesses:", error);
        return businesses; // Return all businesses as fallback
    }
}
exports.matchBusinessesToQuery = matchBusinessesToQuery;
//# sourceMappingURL=anthropic.js.map