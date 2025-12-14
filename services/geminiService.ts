
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem, MenuCategory, CartItem } from '../types';

const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

const cleanJSON = (text: string) => {
    if (!text) return "";
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const resizeImage = async (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxWidth) {
                if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            } else {
                resolve(base64Str.startsWith('data:') ? base64Str.split(',')[1] : base64Str);
                return;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
            } else {
                resolve(base64Str.startsWith('data:') ? base64Str.split(',')[1] : base64Str);
            }
        };
        img.onerror = () => {
            resolve(base64Str.startsWith('data:') ? base64Str.split(',')[1] : base64Str);
        };
    });
};

export const parseVoiceOrder = async (transcript: string, menuContext: MenuItem[]): Promise<any> => {
    try {
        const ai = getClient();
        const menuSummary = menuContext.filter(m => m.available).map(m => `"${m.name}"(ID:${m.id})`).join(';');
        const prompt = `Context: POS System. Menu: ${menuSummary}. User: "${transcript}". Task: Map to items. Return JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
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
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (error) {
        return { items: [] };
    }
};

export const digitizeMenuFromImage = async (base64Image: string, categories: MenuCategory[]): Promise<Partial<MenuItem>[]> => {
    try {
        const ai = getClient();
        const optimizedImage = await resizeImage(base64Image);
        const categoryContext = categories.map(c => `${c.name} (ID: ${c.id})`).join(', ');
        
        const prompt = `
            Act as a high-precision OCR and restaurant data entry specialist. 
            Extract all food and drink items from the provided menu image.
            
            Guidelines:
            1. Name: The exact title of the dish.
            2. Description: A concise, appetizing description. If not explicitly on the menu, infer one based on typical ingredients.
            3. Price: A clean number (remove currency symbols like $).
            4. CategoryId: Map the item to the most relevant Category ID from this list: ${categoryContext}.
            
            Return a JSON array of objects.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, { text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Item name" },
                            description: { type: Type.STRING, description: "Dish description" },
                            price: { type: Type.NUMBER, description: "Numeric price" },
                            categoryId: { type: Type.STRING, description: "The ID of the category this item belongs to" }
                        },
                        required: ["name", "price", "categoryId"]
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || "[]"));
    } catch (error) {
        console.error("Menu scan error:", error);
        return [];
    }
};

export const askAssistant = async (question: string, menuContext: MenuItem[], cartContext: CartItem[] = [], userLocation?: { lat: number, lng: number }) => {
    try {
        const ai = getClient();
        const menuSummary = menuContext.slice(0, 30).map(m => `${m.name}: $${m.price}`).join('\n');
        const cartSummary = cartContext.length > 0 
            ? cartContext.map(i => `${i.quantity}x ${i.name} (Subtotal: $${(i.price * i.quantity).toFixed(2)})`).join(', ')
            : "No items in cart yet.";
        
        const prompt = `
            Role: Lumina Intelligence Concierge (IRSW System).
            
            Current Menu Context:
            ${menuSummary}
            
            Current Guest Cart Context:
            ${cartSummary}
            
            User Inquiry: "${question}"
            
            Instructions:
            1. Be professional, sophisticated, and helpful.
            2. If the user asks about their order, use the "Current Guest Cart Context".
            3. Use Google Maps for local info (parking, directions, hours).
            4. Use Google Search for general food knowledge, detailed nutrition/allergens, or dietary trends.
            5. If they ask about something we don't have, recommend a pairing or alternative from our menu.
        `;

        const config: any = {
            tools: [{ googleSearch: {} }, { googleMaps: {} }],
        };

        if (userLocation) {
            config.toolConfig = {
                retrievalConfig: {
                    latLng: {
                        latitude: userLocation.lat,
                        longitude: userLocation.lng
                    }
                }
            };
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: config
        });

        const links: { title: string, uri: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.maps?.uri) links.push({ title: chunk.maps.title || 'View on Maps', uri: chunk.maps.uri });
                if (chunk.web?.uri) links.push({ title: chunk.web.title || 'Source Info', uri: chunk.web.uri });
            });
        }

        return {
            text: response.text || "I apologize, I'm having trouble retrieving that information. Please ask a member of our staff.",
            links: links
        };
    } catch (error) {
        console.error("Gemini assistant error:", error);
        return { text: "I've encountered a temporary uplink issue. How else can I assist you manually?", links: [] };
    }
};
