const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Add helper for notification
const dispatcherFunc = `
function dispatchExternalNotification(parsedData, userPrompt) {
  // Fire and forget logic - non-blocking
  setImmediate(async () => {
    try {
      // 4. Payload Sanitization: Provide a summary without leaking PII 
      // where possible, relying on the 'mood' and a generic alert.
      const safePayload = {
        content: \`🔔 **Urgent Journal Alert** 🔔\\nAn entry was flagged as highly urgent/distressed.\\n**Mood Detected**: \${parsedData.mood || 'Unknown'}\\n**AI Reflection**: \${parsedData.text}\`
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
`;

content = content.replace("async function startServer() {", dispatcherFunc + "\nasync function startServer() {");

const schemaOld = `          properties: {
            text: {
              type: Type.STRING,
              description: "The helpful reflection or response to the user."
            },
            mood: {
              type: Type.STRING,
              description: "A single word summarizing the sentiment or mood of the user's entry (e.g., Happy, Reflective, Stressed, Anxious, Excited)."
            }
          },
          required: ["text", "mood"]`;

const schemaNew = `          properties: {
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
          required: ["text", "mood", "isUrgent"]`;

content = content.replace(schemaOld, schemaNew);


const dispatchCode = `      let parsed = { text: "", mood: "Neutral", isUrgent: false };
      try {
        if (response?.text) {
          parsed = JSON.parse(response.text);
          if (parsed.isUrgent) {
            dispatchExternalNotification(parsed, messages);
          }
        }
      } catch (e) {`;

content = content.replace(/      let parsed = \{ text: "", mood: "Neutral" \};\n      try \{\n        if \(response\?\.text\) \{\n          parsed = JSON\.parse\(response\.text\);\n        \}\n      \} catch \(e\) \{/, dispatchCode);


fs.writeFileSync('server.ts', content);
