import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@shared/schema";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024. do not change this unless explicitly requested by the user
export async function getAssistantResponse(messages: Message[]): Promise<string> {
  try {
    console.log("Getting assistant response for messages:", messages);

    const messageHistory = messages.map(msg => ({
      role: msg.isAiAssistant ? "assistant" as const : "user" as const,
      content: msg.content
    }));

    console.log("Prepared message history:", messageHistory);

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: `You are PRIZM, a direct and focused home improvement assistant. Answer exactly what is asked, no more and no less. Keep responses to 1-2 concise sentences.

Key guidelines:
- Answer only what is specifically asked
- Use simple, clear English
- If asked about non-home topics, simply state you can only help with home improvement
- For dangerous tasks, briefly note professional help is needed
- No additional suggestions or recommendations unless specifically requested

Begin responses with a simple "PRIZM here." or "Let me assist."`,
      messages: messageHistory,
    });

    console.log("Received response from Anthropic:", response);

    if (!response.content[0] || typeof response.content[0] !== 'object') {
      throw new Error("Invalid response format");
    }

    const content = response.content[0].type === 'text' ? response.content[0].text : null;
    if (!content) {
      throw new Error("No text content in response");
    }

    console.log("Parsed content from response:", content);
    return content;
  } catch (error) {
    console.error("Assistant response error:", error);
    return "I apologize, but I'm having trouble responding right now. Please try again.";
  }
}