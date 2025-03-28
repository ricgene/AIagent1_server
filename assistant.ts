import type { Message } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Get a response from Anthropic's Claude for the AI assistant
 * @param messages Previous messages in the conversation
 * @returns AI assistant response
 */
export async function getAssistantResponse(messages: Message[]): Promise<string> {
  try {
    // Format conversation history for Anthropic
    const conversationHistory = messages.map(msg => ({
      role: msg.isAiAssistant ? "assistant" as const : "user" as const,
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