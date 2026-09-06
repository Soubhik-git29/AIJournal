const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `
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
`;

content = content.replace(
  'const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });\n\n// Helper for resilient model fallback ladder\nasync function generateContentWithFallback(contents: any, config: any) {\n',
  replacement
);

content = content.replace(/await ai\.models\.generateContent/g, 'await getAI().models.generateContent');

fs.writeFileSync('server.ts', content);
