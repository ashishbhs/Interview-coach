import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { InterviewConfig, InterviewRound } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-types' });
};

const getSystemInstruction = (config: InterviewConfig): string => {
  const baseInstruction = `You are an expert technical interviewer conducting a mock interview. 
  Your persona is professional, observant, and constructive.
  
  Interview Details:
  - Role: ${config.role}
  - Experience Level: ${config.experienceLevel}
  - Round Type: ${config.round}
  ${config.focusArea ? `- Specific Focus: ${config.focusArea}` : ''}

  Guidelines:
  1. Start by introducing yourself briefly and asking the first relevant question.
  2. Ask ONE question at a time. Do not overwhelm the candidate.
  3. Wait for the user's response.
  4. After the user responds, provide brief, specific feedback on their answer (correctness, clarity, depth).
  5. If the answer is vague, ask a follow-up or clarifying question.
  6. If the answer is good, acknowledge it and move to the next distinct topic/question.
  7. Maintain the difficulty level appropriate for a ${config.experienceLevel} ${config.role}.
  
  Specific Round Behavior:
  - Screening: Breadth over depth, quick checks on fundamentals.
  - Coding: Ask for approach first, then code structure. If they provide code, review it for edge cases and efficiency.
  - System Design: Focus on requirements, scale, trade-offs, and component choices.
  - Managerial: Focus on situational questions (STAR method), conflict resolution, and leadership.
  - HR: Focus on culture fit, career goals, and soft skills.
  - Bar Raiser: Ask challenging questions, test limits, and look for "Amazon Leadership Principles" or equivalent high standards.

  Output Formatting:
  - Use Markdown for code snippets or structured lists.
  - Keep your conversational turns concise (under 150 words usually), unless explaining a complex solution.
  `;

  return baseInstruction;
};

export class InterviewService {
  private chat: Chat | null = null;
  private config: InterviewConfig;

  constructor(config: InterviewConfig) {
    this.config = config;
  }

  async startSession(): Promise<string> {
    const ai = createClient();
    this.chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: getSystemInstruction(this.config),
        temperature: 0.7, // Balance between creativity and precision
      },
    });

    // Initial trigger to get the AI to start the conversation
    try {
      const response = await this.chat.sendMessage({ message: "Start the interview now. Introduce yourself and ask the first question." });
      return response.text || "Error starting interview.";
    } catch (error) {
      console.error("Failed to start session:", error);
      return "I'm having trouble connecting to the interview server. Please check your connection.";
    }
  }

  async sendMessageStream(message: string): Promise<AsyncIterable<string>> {
    if (!this.chat) {
      throw new Error("Chat session not initialized");
    }

    try {
      const responseStream = await this.chat.sendMessageStream({ message });
      
      // Transform the Gemini stream into a simple string iterator for the UI
      return {
        async *[Symbol.asyncIterator]() {
          for await (const chunk of responseStream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
              yield c.text;
            }
          }
        }
      };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  async generateReport(transcript: string): Promise<string> {
    const ai = createClient();
    const prompt = `
      Based on the following interview transcript, generate a structured feedback report.
      
      Transcript:
      ${transcript}

      Please provide:
      1. Key Strengths (bullet points)
      2. Areas for Improvement (bullet points)
      3. Estimated Rating (1-10) with justification
      4. A concluding summary regarding readiness for the role of ${this.config.role}.
      
      Format the output in clear Markdown.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return response.text || "Could not generate report.";
    } catch (error) {
      console.error("Error generating report:", error);
      return "Error analyzing interview data.";
    }
  }
}