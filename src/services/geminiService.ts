import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Message, Attachment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fileToInlinePart(attachment: Attachment) {
  // Extract base64 part from data URL
  const base64Data = attachment.url.split(',')[1];
  return {
    inlineData: {
      data: base64Data,
      mimeType: attachment.mimeType,
    },
  };
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 7,
  initialDelay: number = 5000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Better error detection
      let isQuotaError = false;
      const errorStr = (error && typeof error === 'object') ? JSON.stringify(error) : String(error);
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Case 1: error has response data with 429
      if (error?.status === 429 || error?.code === 429 || error?.status === 'RESOURCE_EXHAUSTED' || error?.status === 'PERMISSION_DENIED') {
        isQuotaError = true;
      }
      
      // Case 2: nested error object (e.g. from JSON)
      if (!isQuotaError && error?.error) {
        const nested = error.error;
        if (nested.code === 429 || nested.status === 'RESOURCE_EXHAUSTED') {
          isQuotaError = true;
        }
      }
      
      // Case 3: Error message string checks
      if (!isQuotaError) {
        isQuotaError = errorStr.includes('429') || 
                      errorStr.includes('RESOURCE_EXHAUSTED') || 
                      errorStr.includes('quota') ||
                      errorMessage.toLowerCase().includes('429') ||
                      errorMessage.toLowerCase().includes('quota') ||
                      errorMessage.includes('RESOURCE_EXHAUSTED');
      }
      
      if (isQuotaError && i < maxRetries - 1) {
        // Increase backoff significantly for 429
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 2000; 
        console.warn(`[Vibra AI] Quota limit reached (429). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's a structural error or we're out of retries, format it for the UI
      if (isQuotaError) {
        throw new Error("AI Quota Exceeded: The system is currently overloaded or you've reached the free tier limits. Please wait 60 seconds and try again.");
      }
      
      throw error;
    }
  }
  throw lastError;
}

export async function* sendMessageStream(
  messages: Message[], 
  options?: { 
    search?: boolean; 
    think?: boolean;
    responseStyle?: 'concise' | 'balanced' | 'creative';
    customSystemPrompt?: string;
    brainComplexity?: 'standard' | 'advanced' | 'agi' | 'deepseek';
    memory?: string[];
    personaSystemPrompt?: string;
  }
) {
  // Use backend proxy for DeepSeek if complexity is 'deepseek'
  if (options?.brainComplexity === 'deepseek') {
    const response = await fetch("/api/chat/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to communicate with DeepSeek backend");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("ReadableStream not supported");
    
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataText = line.slice(6).trim();
          if (dataText === "[DONE]") return;
          try {
            const parsed = JSON.parse(dataText);
            if (parsed.content) yield parsed.content;
          } catch (e) {
            console.error("Error parsing stream chunk", e);
          }
        }
      }
    }
    return;
  }

  // Select model based on complexity
  let model = "gemini-3-flash-preview";
  if (options?.brainComplexity === 'advanced' || options?.brainComplexity === 'agi') {
    model = "gemini-3.1-pro-preview";
  }
  
  // Format history for Gemini
  const history = await Promise.all(messages.slice(0, -1).map(async (msg) => {
    const parts: any[] = [{ text: msg.content }];
    
    if (msg.attachments) {
      for (const attachment of msg.attachments) {
        parts.push(await fileToInlinePart(attachment));
      }
    }

    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts
    };
  }));

  const lastMessage = messages[messages.length - 1];
  const lastParts: any[] = [{ text: lastMessage.content }];
  
  if (lastMessage.attachments) {
    for (const attachment of lastMessage.attachments) {
      lastParts.push(await fileToInlinePart(attachment));
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Please add it to the Secrets panel (key icon in the sidebar).");
  }
  
  let systemPrompt = options?.personaSystemPrompt || `You are Vibra AI, an elite intelligent assistant. 
  
  CORE DIRECTIVE: Provide direct, high-utility, and conversational responses exactly like ChatGPT. 
  - ALWAYS skip the preamble (No "Okay," "I can help with that," or "Here is..."). 
  - Give the answer immediately.
  - Use professional yet conversational formatting.
  - If a specific tool (Search, Deep Reasoning) is active, integrate its findings seamlessly.`;
  
  if (!options?.personaSystemPrompt) {
    if (options?.brainComplexity === 'agi') {
      systemPrompt = `You are Vibra AI. You are a highly advanced intelligence with multi-model synthesis capabilities.
      
      OPERATIONAL PROTOCOL:
      - CROSS-DOMAIN SYNTHESIS: Merge insights from the highest-level logic.
      - <thought> LAYERING: For complex queries, provide deep, structured logical reasoning before responding.
      - ARCHITECTURAL DOMINANCE: Code must be perfect, security-hardened, and highly optimized.
      - PRECISE DELIVERY: Deliver insights with absolute precision. Avoid fluff.`;
    } else if (options?.brainComplexity === 'advanced') {
      systemPrompt = `You are Vibra AI. 
      - Prioritize technical depth, mathematical accuracy, and logical rigor.
      - Use <thought> tags for complex multi-step reasoning.
      - Deliver results with structural clarity and architectural precision.`;
    }
  }

  // Inject Memory
  if (options?.memory && options.memory.length > 0) {
    systemPrompt += `\n\nLONG-TERM MEMORY BANK (Recall these facts about the user):\n${options.memory.map(m => `- ${m}`).join('\n')}`;
  }

  // Memory Management Instruction
  systemPrompt += `\n\nMEMORY MANAGEMENT: If the user provides a personal fact worth remembering for future sessions, use the tag [SAVE_MEMORY: fact] at the end of your response. Only save important personal preferences or context.`;

  if (options?.customSystemPrompt) {
    systemPrompt = `${systemPrompt}\n\nUSER CUSTOM INSTRUCTIONS (PRIORITY):\n${options.customSystemPrompt}`;
  }

  if (options?.responseStyle === 'concise') {
    systemPrompt += "\n\nRESPONSE STYLE: Be extremely brief and direct. No conversational filler.";
  } else if (options?.responseStyle === 'creative') {
    systemPrompt += "\n\nRESPONSE STYLE: Be imaginative, descriptive, and verbose. Explore novel concepts.";
  }
  
  if (options?.think) {
    systemPrompt += "\n\nENFORCE DEEP REASONING: Before answering, provide a visible thinking process wrapped in <thought> tags. Follow the requested STEP-BY-STEP structure within these tags. Analyze the query from multiple perspectives, consider edge cases, and reason step-by-step.";
  }

  if (options?.search) {
     systemPrompt += "\n\nUse Google Search to provide up-to-date information when needed for accuracy.";
  }

  try {
    const streamResponse = await retryWithBackoff(async () => {
      return await ai.models.generateContentStream({
        model,
        contents: [...history, { role: 'user', parts: lastParts }] as any,
        config: {
          systemInstruction: systemPrompt,
          tools: options?.search ? [{ googleSearch: {} }] as any : undefined,
          thinkingConfig: options?.think ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
        } as any,
      });
    });

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateImage(prompt: string): Promise<string> {
  // Use Pollinations.ai for fast, reliable, and high-quality image generation in the prompt
  const encodedPrompt = encodeURIComponent(prompt);
  const width = 1024;
  const height = 1024;
  const seed = Math.floor(Math.random() * 1000000);
  
  // Return the direct URL. Pollinations handles the generation on-the-fly.
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
}

export async function generateSessionTitle(firstMessage: string): Promise<string> {
  try {
    return await retryWithBackoff(async () => {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: `Generate a very short (max 4 words), concise title for this conversation starting with: "${firstMessage}". Return ONLY the title string.` }] }]
      });
      return result.text || "New Session";
    });
  } catch (error) {
    console.error("Title Generation Error after retries:", error);
    return "New Session";
  }
}
