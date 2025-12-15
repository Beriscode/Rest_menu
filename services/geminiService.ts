
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem, MenuCategory, CartItem } from '../types';

/**
 * Initializes GenAI client instance.
 */
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Robustly extracts and parses JSON from model output.
 * Handles markdown blocks and partial text gracefully.
 */
const safeParseJSON = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    // Regex extracts the first JSON-like structure (object or array)
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[GeminiService] JSON Parse Failure. Raw:", text, "Error:", e);
    return fallback;
  }
};

/**
 * Simplified image resizing for model input.
 * Reduces complexity while ensuring reliable base64 output.
 */
const resizeImage = async (base64Str: string, maxSize = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str.split(',')[1] || base64Str);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = () => resolve(base64Str.split(',')[1] || base64Str);
  });
};

export const parseVoiceOrder = async (transcript: string, menuContext: MenuItem[]): Promise<{ items: any[] }> => {
  try {
    const ai = getClient();
    const menuSummary = menuContext.filter(m => m.available).map(m => `${m.name} (ID:${m.id})`).join('; ');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `POS Voice Task: "${transcript}". Menu: ${menuSummary}. Output JSON with "items" array ([{id, quantity, notes}]).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  notes: { type: Type.STRING }
                },
                required: ["id", "quantity"]
              }
            }
          }
        }
      }
    });
    return safeParseJSON(response.text, { items: [] });
  } catch (err) {
    console.error("[GeminiService] parseVoiceOrder Error:", err);
    return { items: [] };
  }
};

export const digitizeMenuFromImage = async (base64: string, categories: MenuCategory[]): Promise<Partial<MenuItem>[]> => {
  try {
    const ai = getClient();
    const optimized = await resizeImage(base64);
    const catMap = categories.map(c => `${c.name}:${c.id}`).join(',');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimized } }, { text: `Digitize menu into JSON array. Map to category IDs: ${catMap}.` }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              description: { type: Type.STRING },
              categoryId: { type: Type.STRING }
            },
            required: ["name", "price", "categoryId"]
          }
        }
      }
    });
    return safeParseJSON(response.text, []);
  } catch (err) {
    console.error("[GeminiService] digitizeMenu Error:", err);
    return [];
  }
};

export const askAssistant = async (query: string, menu: MenuItem[], cart: CartItem[], loc?: { lat: number, lng: number }) => {
  try {
    const ai = getClient();
    const cartSummary = cart.length > 0 ? cart.map(i => `${i.quantity}x ${i.name}`).join(',') : "empty";
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: `Lumina Concierge. Menu: ${menu.length} items. Cart: ${cartSummary}. Friendly tone.`,
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
        toolConfig: loc ? { retrievalConfig: { latLng: { latitude: loc.lat, longitude: loc.lng } } } : undefined
      }
    });
    const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      title: c.maps?.title || c.web?.title || 'Info',
      uri: c.maps?.uri || c.web?.uri
    })).filter((l: any) => l.uri) || [];
    return { text: response.text || "No signal received.", links };
  } catch (err) {
    console.error("[GeminiService] askAssistant Error:", err);
    return { text: "Uplink issue. Please try manual input.", links: [] };
  }
};
