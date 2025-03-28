"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchBusinessesToQuery = matchBusinessesToQuery;
exports.extractCategories = extractCategories;
exports.detectEmergency = detectEmergency;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
// Initialize Anthropic client
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
});
/**
 * Match businesses to a user query using Anthropic's semantic understanding
 * @param query User's search query
 * @param businesses List of businesses to match against
 * @returns Array of businesses sorted by relevance to the query
 */
async function matchBusinessesToQuery(query, businesses) {
    try {
        if (businesses.length === 0) {
            return [];
        }
        // Format businesses data for the prompt
        const businessData = businesses.map((business, index) => {
            const rules = business.industryRules || {};
            return `Business ${index + 1}:
ID: ${business.id}
Name: ${business.userId} 
Description: ${business.description}
Category: ${business.category}
Location: ${business.location}
Services: ${business.services ? business.services.join(", ") : "N/A"}
Keywords: ${rules.keywords ? rules.keywords.join(", ") : "N/A"}
Specializations: ${rules.specializations ? rules.specializations.join(", ") : "N/A"}`;
        }).join("\n\n");
        // Create prompt for Claude
        const prompt = `I need to match the following user query to the most relevant businesses. Please analyze the query and return the IDs of businesses that match, in order of relevance.

User Query: "${query}"

${businessData}

Analyze which businesses are most relevant to the user's query. Consider service offerings, specializations, keywords, and the semantic meaning of the query.
Return a comma-separated list of business IDs, ordered by relevance (most relevant first).
Only include businesses that are genuinely relevant to the query. If none are relevant, return an empty list.`;
        // Get response from Anthropic
        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 300,
            system: "You are a business matching algorithm that finds relevant service providers for user queries.",
            messages: [{ role: "user", content: prompt }],
        });
        // Extract business IDs from the response
        const responseText = response.content[0].text.trim();
        if (!responseText) {
            return [];
        }
        // Parse the response to get business IDs
        const businessIds = responseText
            .split(",")
            .map(id => id.trim())
            .filter(id => /^\d+$/.test(id)) // Ensure we only have numeric IDs
            .map(id => parseInt(id, 10));
        // Map business IDs back to actual businesses and maintain the order
        const matchedBusinesses = businessIds
            .map(id => businesses.find(b => b.id === id))
            .filter(Boolean);
        // Add any businesses not matched but in the original list at the end
        const matchedIds = new Set(matchedBusinesses.map(b => b.id));
        const unmatchedBusinesses = businesses.filter(b => !matchedIds.has(b.id));
        return [...matchedBusinesses, ...unmatchedBusinesses];
    }
    catch (error) {
        console.error("Error matching businesses to query:", error);
        return businesses; // Return original list on error
    }
}
/**
 * Extract categories from a user query
 * @param query User's query about home improvement
 * @param categories List of available categories
 * @returns The most relevant category IDs
 */
async function extractCategories(query, categories) {
    try {
        const categoriesText = categories
            .map(cat => `${cat.id} - ${cat.name}`)
            .join("\n");
        const prompt = `From the following user query about home improvement, identify which categories are most relevant:

User Query: "${query}"

Available Categories:
${categoriesText}

Return only the category IDs that match, as a comma-separated list (e.g., "1,3,5").
If no categories match, return an empty list.`;
        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 50,
            system: "You are a home improvement category classifier.",
            messages: [{ role: "user", content: prompt }],
        });
        const responseText = response.content[0].text.trim();
        if (!responseText) {
            return [];
        }
        // Parse the response to get category IDs
        return responseText
            .split(",")
            .map(id => id.trim())
            .filter(id => /^\d+$/.test(id))
            .map(id => parseInt(id, 10));
    }
    catch (error) {
        console.error("Error extracting categories:", error);
        return [];
    }
}
/**
 * Determine if a query represents an emergency situation
 * @param query User's query
 * @returns Object with isEmergency flag and reason
 */
async function detectEmergency(query) {
    try {
        const prompt = `Analyze this home improvement query and determine if it describes an emergency situation that requires immediate attention:

Query: "${query}"

An emergency is defined as a situation that:
- Poses immediate danger to people (e.g., electrical hazards, gas leaks)
- Could cause significant property damage if not addressed quickly (e.g., active water leaks, structural issues)
- Creates unhealthy or unsafe living conditions (e.g., sewage backups, heating failure in winter)

First, determine if this is an emergency (yes/no).
Then, if it is an emergency, briefly explain why in one short sentence.`;
        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 100,
            system: "You are an emergency detection system for home improvement issues.",
            messages: [{ role: "user", content: prompt }],
        });
        const responseText = response.content[0].text.trim().toLowerCase();
        if (responseText.includes("yes")) {
            // Extract the reason from the response
            const reasonMatch = responseText.match(/yes[,.\s]+(.*)/i);
            const reason = reasonMatch ? reasonMatch[1].trim() : undefined;
            return { isEmergency: true, reason };
        }
        else {
            return { isEmergency: false };
        }
    }
    catch (error) {
        console.error("Error detecting emergency:", error);
        return { isEmergency: false };
    }
}
//# sourceMappingURL=anthropic.js.map