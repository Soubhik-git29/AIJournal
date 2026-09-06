import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();


let aiClient;
function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. AI features will fail.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || "dummy" });
  }
  return aiClient;
}

// Helper for resilient model fallback ladder
async function generateContentWithFallback(contents, config) {
  const ai = getAI();
  const models = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  
  let lastError: any;
  for (let i = 0; i < models.length; i++) {
    try {
      return await getAI().models.generateContent({
        model: models[i],
        contents,
        config
      });
    } catch (error: any) {
      lastError = error;
      const isRecoverable = error?.status === 503 || error?.status === 429 || error?.status === 500 || error?.message?.includes("503") || error?.message?.includes("429");
      
      if (isRecoverable && i < models.length - 1) {
        console.log(`[Fallback] Model ${models[i]} is unavailable (high demand), seamlessly switching to ${models[i+1]}...`);
        continue;
      }
      
      console.warn(`Model ${models[i]} failed with a non-recoverable error.`, error.message);
      if (i === models.length - 1) throw error;
    }
  }
  throw lastError;
}


function dispatchExternalNotification(parsedData, userPrompt) {
  // Fire and forget logic - non-blocking
  setImmediate(async () => {
    try {
      // 4. Payload Sanitization: Provide a summary without leaking PII 
      // where possible, relying on the 'mood' and a generic alert.
      const safePayload = {
        content: `🔔 **Urgent Journal Alert** 🔔\nAn entry was flagged as highly urgent/distressed.\n**Mood Detected**: ${parsedData.mood || 'Unknown'}\n**AI Reflection**: ${parsedData.text}`
      };

      if (process.env.DISCORD_WEBHOOK_URL) {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safePayload)
        });
      }

      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: safePayload.content
          })
        });
      }
    } catch (e) {
      console.error('Failed to dispatch external notification:', e);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API endpoints
  app.post("/api/chat", async (req, res) => {
    try {
      const data = (req.body && typeof req.body === 'object') ? req.body : {};
      const { messages, systemInstruction } = data;
      
      if (!messages) {
         res.status(400).json({ error: "messages field is required" });
         return;
      }

      const response = await generateContentWithFallback(messages, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "The helpful reflection or response to the user."
            },
            mood: {
              type: Type.STRING,
              description: "A single word summarizing the sentiment or mood of the user's entry (e.g., Happy, Reflective, Stressed, Anxious, Excited)."
            },
            isUrgent: {
              type: Type.BOOLEAN,
              description: "Set to true if the entry indicates a severe crisis, immediate danger, or extremely high distress requiring external notification."
            }
          },
          required: ["text", "mood", "isUrgent"]
        }
      });

      let parsed = { text: "", mood: "Neutral", isUrgent: false };
      try {
        if (response?.text) {
          parsed = JSON.parse(response.text);
          if (parsed.isUrgent) {
            dispatchExternalNotification(parsed, messages);
          }
        }
      } catch (e) {
        console.error("Failed to parse Gemini response", e);
      }

      res.json(parsed);
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  app.post("/api/counsellor", async (req, res) => {
    try {
      const data = (req.body && typeof req.body === 'object') ? req.body : {};
      const { messages, journalContext } = data;

      if (!messages) {
        res.status(400).json({ error: "messages field is required" });
        return;
      }

      const systemInstruction = `You are a realistic, grounded AI counsellor. Read the user's recent journal entries for context:
${journalContext}

Act as a counsellor providing realistic advice. If you observe unrealistic ambition, gently suggest grounded, achievable goals. Maintain a supportive, empathetic, but objective tone. Help the user break down their goals realistically. Keep your response concise, conversational, and under 3 paragraphs.`;

      // 1. Generate the text response
      const response = await generateContentWithFallback(messages, {
        systemInstruction,
      });
      
      const responseText = response?.text || "";
      
      // 2. Generate the TTS audio using the response text
      let audioBase64 = null;
      let mimeType = "audio/pcm;rate=24000";
      if (responseText) {
        try {
          // Use the Modality enum from @google/genai, or just string 'AUDIO'
          const ttsResponse = await getAI().models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: responseText,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" }, // Soothing female voice
                },
              },
            },
          });
          
          const inlineData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineData?.data) {
            audioBase64 = inlineData.data;
            if (inlineData.mimeType) {
              mimeType = inlineData.mimeType;
            }
          }
        } catch (ttsError) {
          console.error("Error generating TTS:", ttsError);
          // Non-fatal, continue and return text
        }
      }

      res.json({ text: responseText, audio: audioBase64, mimeType });
    } catch (error) {
      console.error("Error generating counsellor content:", error);
      res.status(500).json({ error: "Failed to generate counsellor response" });
    }
  });

  app.post("/api/weekly-reflection", async (req, res) => {
    try {
      const data = (req.body && typeof req.body === 'object') ? req.body : {};
      const { entriesContext } = data;

      if (!entriesContext) {
        res.status(400).json({ error: "entriesContext is required" });
        return;
      }

      const systemInstruction = `You are a thoughtful AI assistant. The user has provided their journal entries from the past 7 days. Your task is to analyze these entries and provide a summary of recurring themes, emotional trends, and behavioral patterns. Keep it insightful, structured (using markdown headers and bullet points), and supportive.`;
      
      const response = await generateContentWithFallback(entriesContext, {
        systemInstruction,
      });

      res.json({ reflection: response?.text || "" });
    } catch (error) {
      console.error("Error generating weekly reflection:", error);
      res.status(500).json({ error: "Failed to generate weekly reflection" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
