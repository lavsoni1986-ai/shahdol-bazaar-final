import { Groq } from "groq-sdk";

let groqInstance: Groq | null = null;
let groqErrorLogged = false;

export const getGroq = (): Groq | null => {
  if (groqInstance) return groqInstance;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    if (!groqErrorLogged) {
      console.error("🚨 [GROQ] GROQ_API_KEY not found in environment variables");
      groqErrorLogged = true;
    }
    return null;
  }

  try {
    groqInstance = new Groq({ 
      apiKey,
      maxRetries: 2,
      timeout: 15000 // 15 second timeout
    });
    return groqInstance;
  } catch (error: any) {
    if (!groqErrorLogged) {
      console.error("🚨 [GROQ] Failed to initialize Groq client:", error?.message);
      groqErrorLogged = true;
    }
    return null;
  }
};

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function callGroqChat(
  messages: { role: string; content: string | object }[],
  model: string = DEFAULT_MODEL,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const groq = getGroq();
  if (!groq) return null;

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: messages as any,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
    });
    return response.choices[0]?.message?.content ?? null;
  } catch (error: any) {
    console.error("🚨 [GROQ] API call failed:", error?.message);
    return null;
  }
}

export function isGroqAvailable(): boolean {
  return getGroq() !== null;
}