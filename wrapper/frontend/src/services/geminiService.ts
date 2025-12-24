import { GoogleGenerativeAI } from "@google/generative-ai";

import { Product } from '../types';

let aiClient: GoogleGenerativeAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.");
    }
    aiClient = new GoogleGenerativeAI(apiKey);
  }
  return aiClient;
};

export const generateDashboardInsight = async (product: Product): Promise<string> => {
  const client = getAiClient();

  const prompt = `
    You are Zopkit AI, an advanced system monitor embedded in a dashboard.
    Product: "${product.name}" (Tagline: ${product.tagline}).
    Context: Key stat is ${product.stats[0].value} ${product.stats[0].label}. Features include ${product.features.join(', ')}.

    Task: Generate a single, highly technical but concise status message (max 12 words).
    Tone: Futuristic, precise, affirmative. Like a HUD display.

    Examples:
    - "Latency reduced by 40%. Workflow velocity nominal."
    - "New lead cluster identified. Probability updated to 92%."
    - "Financial anomalies cleared. Budget forecasting active."
    - "Resource allocation optimized. Team efficiency at 98%."

    Output ONLY the message string.
  `;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    const fallbacks = [
      "System parameters optimized.",
      "Real-time data synchronization complete.",
      "Workflow efficiency increased by 14%.",
      "Predictive analytics module active."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
};
export const getSmartSuggestions = async (query: string, applications: any[]): Promise<string[]> => {
  const client = getAiClient();

  const appData = applications.map(app => ({
    id: app.appId,
    name: app.appName,
    code: app.appCode,
    desc: app.description
  }));

  const prompt = `
    You are Zopkit AI, a smart workspace orchestrator.
    User Query: "${query}"
    Available Applications: ${JSON.stringify(appData)}

    Task: Identify which applications are most relevant to the user's query.
    Return ONLY a JSON array of strings containing the 'id' of the matching applications.
    If no apps are relevant, return an empty array [].
    
    Example Output: ["app-123", "app-456"]
  `;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Attempt to parse the array from the response
    const match = text.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch (error) {
    console.error("Gemini Smart Suggestions Error:", error);
    // Simple local fallback search if AI fails
    return applications
      .filter(app =>
        app.appName.toLowerCase().includes(query.toLowerCase()) ||
        (app.description || '').toLowerCase().includes(query.toLowerCase())
      )
      .map(app => app.appId);
  }
};
