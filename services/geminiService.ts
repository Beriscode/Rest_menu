
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem, MenuCategory, CartItem } from '../types';

/**
 * Initializes a new GenAI client instance.
 * Always uses the environment variable process.env.API_KEY.
 */
const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

/**
 * Robust JSON extraction from model responses.
 * Handles cases where the model might wrap content in markdown blocks.
 */
const safeParseJSON = (text: string | undefined, fallback: any = {}) => {
    if (!text) return fallback;
    try {
        // Remove potential markdown code blocks
        const cleaned = text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Gemini JSON Parse Error:", e, "Raw text:", text);
        return fallback;
    }
};

/**
 * Simplifies and optimizes image resizing for the Vision model.
 */
const resizeImage = async (base64Str: string, maxSize = 1024): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Str.includes(',') ? base64Str.split(',')[1] : base64Str);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            // Export as medium-quality JPEG to stay within token limits
            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
        };
        img.onerror = () => {
            resolve(base64Str.includes(',') ? base64Str.split(',')[1] : base64Str);
        };
    });
};

export const parseVoiceOrder = async (transcript: string, menuContext: MenuItem[]): Promise<any> => {
    try {
        const ai = getClient();
        const menuSummary = menuContext
            .filter(m => m.available)
            .map(m => `${m.name} (ID: ${m.id})`)
            .join('; ');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context: POS Voice Order. Menu: ${menuSummary}. User said: "${transcript}". Extract items and quantities.`,
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
    } catch (error) {
        console.error("parseVoiceOrder failure:", error);
        return { items: [] };
    }
};

export const digitizeMenuFromImage = async (base64Image: string, categories: MenuCategory[]): Promise<Partial<MenuItem>[]> => {
    try {
        const ai = getClient();
        const optimizedImage = await resizeImage(base64Image);
        const categoryContext = categories.map(c => `${c.name}:${c.id}`).join(', ');
        
        const prompt = `Digitize this menu image. Map items to categories: ${categoryContext}. Return a JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [
                { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, 
                { text: prompt }
            ] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            price: { type: Type.NUMBER },
                            categoryId: { type: Type.STRING }
                        },
                        required: ["name", "price", "categoryId"]
                    }
                }
            }
        });
        return safeParseJSON(response.text, []);
    } catch (error) {
        console.error("digitizeMenuFromImage failure:", error);
        return [];
    }
};

export const askAssistant = async (question: string, menuContext: MenuItem[], cartContext: CartItem[] = [], userLocation?: { lat: number, lng: number }) => {
    try {
        const ai = getClient();
        const cartText = cartContext.length > 0 
            ? cartContext.map(i => `${i.quantity}x ${i.name}`).join(', ') 
            : "Empty";
        
        const systemPrompt = `Professional Lumina Dining Concierge. Menu: ${menuContext.length} items. Cart: ${cartText}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: question,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ googleSearch: {} }, { googleMaps: {} }],
                toolConfig: userLocation ? {
                    retrievalConfig: {
                        latLng: { latitude: userLocation.lat, longitude: userLocation.lng }
                    }
                } : undefined
            }
        });

        const links: { title: string, uri: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.maps?.uri) links.push({ title: chunk.maps.title || 'Location', uri: chunk.maps.uri });
                if (chunk.web?.uri) links.push({ title: chunk.web.title || 'Reference', uri: chunk.web.uri });
            });
        }

        return {
            text: response.text || "I'm having trouble retrieving that right now.",
            links
        };
    } catch (error) {
        console.error("askAssistant failure:", error);
        return { text: "I encountered an uplink issue. How can I help manually?", links: [] };
    }
};
