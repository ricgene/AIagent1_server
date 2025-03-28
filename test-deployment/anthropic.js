const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Match businesses to a user query using Anthropic's semantic understanding
 */
async function matchBusinessesToQuery(query, businesses) {
  try {
    if (businesses.length === 0) {
      return [];
    }

    // Format businesses data for the prompt
    const businessData = businesses.map((business, index) => {
      return `Business ${index + 1}:
ID: ${business.id}
Name: User ${business.userId} 
Description: ${business.description}
Category: ${business.category}
Location: ${business.location}
Services: ${business.services ? business.services.join(", ") : "N/A"}
Keywords: ${business.industryRules?.keywords ? business.industryRules.keywords.join(", ") : "N/A"}
Specializations: ${business.industryRules?.specializations ? business.industryRules.specializations.join(", ") : "N/A"}`;
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

    return matchedBusinesses;
  } catch (error) {
    console.error("Error matching businesses to query:", error);
    return businesses; // Return original list on error
  }
}

/**
 * Get AI assistant response to a user message
 */
async function getAssistantResponse(messages) {
  try {
    // Format conversation history for Anthropic
    const conversationHistory = messages.map(msg => ({
      role: msg.isAiAssistant ? "assistant" : "user",
      content: msg.content
    }));

    // Get the latest 10 messages to stay within context limits
    const recentMessages = conversationHistory.slice(-10);

    // Define system prompt
    const systemPrompt = `You are a helpful AI assistant for a home improvement service. 
    Provide friendly, professional responses to customer inquiries about home improvement services.
    If asked about urgent situations like water leaks, electrical hazards, or structural damage, 
    emphasize the importance of immediate professional help.
    Never promise specific prices, but you can discuss general price ranges and factors that affect pricing.`;

    // Make API call to Anthropic
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      system: systemPrompt,
      messages: recentMessages,
    });

    return response.content[0].text;
  } catch (error) {
    console.error("Error getting assistant response:", error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again shortly.";
  }
}

module.exports = { matchBusinessesToQuery, getAssistantResponse };