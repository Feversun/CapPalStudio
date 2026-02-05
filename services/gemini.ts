
import { GoogleGenAI, Type } from "@google/genai";
import { SheetActionItem, GenerationConfig } from "../types";
import { buildImageConfig, buildMasterPrompt, buildStickerPrompt } from "../core/generation";

// Configuration for Local Fallback API
type LocalApiStyle = 'gemini' | 'anthropic';
const LOCAL_API_CONFIG = {
  apiKey: "quotio-local-192E2655-C2D0-4594-ABD2-6B30F20451C4",
  baseUrl: "http://localhost:8317",
  apiStyle: 'gemini' as LocalApiStyle
};

// Global Cloud Client Instance
let mainClient: GoogleGenAI | null = null;
let useFallback = false;

// Helper to get the cloud client
const getCloudClient = (): GoogleGenAI => {
  if (!mainClient) {
    mainClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return mainClient;
};

// Toggle Function
export const setForceLocalMode = (enable: boolean) => {
  useFallback = enable;
  console.log(`[Gemini Service] API Mode set to: ${enable ? 'LOCAL (Proxy)' : 'CLOUD (Google)'}`);
};

// Update Local URL Function
export const setLocalBaseUrl = (url: string) => {
  LOCAL_API_CONFIG.baseUrl = url.replace(/\/$/, "");
  console.log(`[Gemini Service] Local Base URL updated to: ${LOCAL_API_CONFIG.baseUrl}`);
};

// Update Local API Style Function
export const setLocalApiStyle = (style: LocalApiStyle) => {
  LOCAL_API_CONFIG.apiStyle = style;
  console.log(`[Gemini Service] Local API style set to: ${style}`);
};

export const setLocalApiKey = (apiKey: string) => {
  LOCAL_API_CONFIG.apiKey = apiKey;
  console.log(`[Gemini Service] Local API key updated`);
};

/**
 * Helper to map SDK camelCase config to REST API snake_case config
 */
const mapToRestGenerationConfig = (config: any) => {
  if (!config) return undefined;

  const newConfig: any = {};

  // Basic Parameters
  if (config.temperature !== undefined) newConfig.temperature = config.temperature;
  if (config.topP !== undefined) newConfig.top_p = config.topP;
  if (config.topK !== undefined) newConfig.top_k = config.topK;
  if (config.candidateCount !== undefined) newConfig.candidate_count = config.candidateCount;
  if (config.maxOutputTokens !== undefined) newConfig.max_output_tokens = config.maxOutputTokens;
  if (config.stopSequences !== undefined) newConfig.stop_sequences = config.stopSequences;
  if (config.seed !== undefined && config.seed !== null) newConfig.seed = config.seed;

  // Output Structure
  if (config.responseMimeType) newConfig.response_mime_type = config.responseMimeType;
  if (config.responseSchema) newConfig.response_schema = config.responseSchema;

  // Image Generation Config
  // SDK expects 'imageConfig', REST API expects 'image_config' (or flattened depending on version, but usually snake_case nested)
  if (config.imageConfig) {
    newConfig.image_config = {};
    if (config.imageConfig.aspectRatio) newConfig.image_config.aspect_ratio = config.imageConfig.aspectRatio;
    if (config.imageConfig.imageSize) newConfig.image_config.image_size = config.imageConfig.imageSize;
    if (config.imageConfig.numberOfImages) newConfig.image_config.number_of_images = config.imageConfig.numberOfImages;
  }

  return newConfig;
};

/**
 * CUSTOM LOCAL FETCH IMPLEMENTATION
 * Bypasses the SDK to ensure correct Headers (Authorization: Bearer) and URL structure for proxies.
 */
const localGeminiFetch = async (
  model: string,
  payload: any,
  isImageGen: boolean = false
): Promise<any> => {
  // Construct URL: Ensure we hit the endpoint expected by the proxy for Gemini-compatible requests.
  // Standard Gemini: POST /v1beta/models/{model}:generateContent
  const url = `${LOCAL_API_CONFIG.baseUrl}/v1beta/models/${model}:generateContent`;

  console.log(`%c[Local Fetch] POST ${url}`, "color: orange; font-weight: bold;");
  // console.log("[Local Fetch Payload]", JSON.stringify(payload, null, 2)); // Debug payload if needed

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Proxies usually expect Bearer token, SDK sends x-goog-api-key
        'Authorization': `Bearer ${LOCAL_API_CONFIG.apiKey}`,
        'x-goog-api-key': LOCAL_API_CONFIG.apiKey // Send both to be safe
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Local Fetch Error] ${response.status}:`, errText);
      throw new Error(`Proxy Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Local Fetch Failed:", error);
    throw error;
  }
};

/**
 * Convert Gemini-style contents to Anthropic Messages API format.
 */
const toAnthropicMessages = (contents: any): any[] => {
  const normalized = Array.isArray(contents) ? contents : [contents];

  return normalized.map((item: any) => {
    if (typeof item === 'string') {
      return { role: 'user', content: item };
    }

    const role = item?.role === 'model' ? 'assistant' : (item?.role || 'user');
    const parts = Array.isArray(item?.parts) ? item.parts : [];
    const content = parts.map((p: any) => {
      if (p?.text !== undefined) {
        return { type: 'text', text: String(p.text) };
      }
      if (p?.inlineData) {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: p.inlineData.mimeType || 'image/png',
            data: p.inlineData.data
          }
        };
      }
      if (p?.fileData?.fileUri) {
        return {
          type: 'image',
          source: {
            type: 'url',
            media_type: p.fileData.mimeType || 'image/png',
            url: p.fileData.fileUri
          }
        };
      }
      return null;
    }).filter(Boolean);

    if (content.length === 0) {
      return { role, content: '.' };
    }

    return { role, content };
  });
};

/**
 * Convert Anthropic response to a Gemini-like response for compatibility.
 */
const toGeminiLikeResponse = (anthropicResponse: any) => {
  const parts: any[] = [];
  const content = Array.isArray(anthropicResponse?.content) ? anthropicResponse.content : [];

  for (const block of content) {
    if (block?.type === 'text') {
      parts.push({ text: block.text });
    } else if (block?.type === 'image' && block?.source?.type === 'base64') {
      parts.push({
        inlineData: {
          mimeType: block.source.media_type || 'image/png',
          data: block.source.data
        }
      });
    }
  }

  return {
    text: parts.map(p => p.text).filter(Boolean).join('') || undefined,
    candidates: [{ content: { parts } }]
  };
};

/**
 * LOCAL ANTHROPIC FETCH (Antigravity Claude Proxy Image Mode)
 */
const localAnthropicFetch = async (
  model: string,
  contents: any,
  config: any = {}
): Promise<any> => {
  const url = `${LOCAL_API_CONFIG.baseUrl}/v1/messages`;
  let localModel = model;

  // Map unsupported Gemini 2.5 models to proxy-supported Gemini 3 equivalents
  const lower = model.toLowerCase();
  if (lower.includes('gemini-2.5-flash-image')) {
    localModel = 'gemini-3-flash-image-preview';
  } else if (lower.includes('gemini-2.5-flash-lite')) {
    localModel = 'gemini-3-flash';
  } else if (lower.includes('gemini-2.5-flash')) {
    localModel = 'gemini-3-flash';
  } else if (lower.includes('gemini-2.5-pro')) {
    localModel = 'gemini-3-pro-high';
  }

  if (localModel !== model) {
    console.log(`[Local Anthropic] Model mapped: ${model} -> ${localModel}`);
  }

  const messages = toAnthropicMessages(contents);
  const isImage = localModel.includes('image');

  const payload: any = {
    model: localModel,
    messages,
    stream: false,
    mode: isImage ? 'image' : 'text'
  };

  if (config.maxOutputTokens !== undefined) payload.max_tokens = config.maxOutputTokens;
  if (config.temperature !== undefined) payload.temperature = config.temperature;
  if (config.topP !== undefined) payload.top_p = config.topP;
  if (config.topK !== undefined) payload.top_k = config.topK;

  console.log(`%c[Local Anthropic] POST ${url}`, "color: orange; font-weight: bold;");

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOCAL_API_CONFIG.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Local Anthropic Error] ${response.status}:`, errText);
    throw new Error(`Proxy Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return toGeminiLikeResponse(data);
};

/**
 * Unified request handler that switches between SDK (Cloud) and Fetch (Local)
 */
const makeRequest = async (
  model: string,
  contents: any,
  config: any = {}
): Promise<any> => {
  // 1. LOCAL MODE
  if (useFallback) {
    if (LOCAL_API_CONFIG.apiStyle === 'anthropic') {
      return await localAnthropicFetch(model, contents, config);
    }

    let localModel = model;

    // MAP TO USER-SPECIFIED MODEL ID for Image Generation
    if (model.includes('image')) {
      // Note: If the user provides a custom model via GenConfig, it should be passed in 'model' arg already.
      // But we ensure we are pointing to the image capable endpoint if implied.
      if (!model.includes('gemini-3-pro-image') && !model.includes('imagen')) {
        localModel = 'gemini-3-pro-image-preview'; // Default fallback
      }
      console.log(`%c[Local Mode] Target Model: '${localModel}'`, "color: cyan;");
    }

    // Sanitize 'contents': REST API requires an Array of objects, not a single object.
    let sanitizedContents = contents;
    if (!Array.isArray(contents)) {
      // If SDK passed a single object (e.g. { parts: [...] }), wrap it.
      if (contents && typeof contents === 'object') {
        sanitizedContents = [contents];
      } else {
        // Fallback (unlikely)
        sanitizedContents = [{ parts: [{ text: String(contents) }] }];
      }
    }

    // Sanitize 'config': Map camelCase to snake_case
    const sanitizedConfig = mapToRestGenerationConfig(config);

    const payload = {
      contents: sanitizedContents,
      generationConfig: sanitizedConfig
    };

    const rawResponse = await localGeminiFetch(localModel, payload);

    // Mock SDK Response structure for compatibility
    return {
      text: rawResponse.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || undefined,
      candidates: rawResponse.candidates
    };
  }

  // 2. CLOUD MODE (SDK)
  const client = getCloudClient();
  return await client.models.generateContent({
    model,
    contents,
    config
  });
};

/**
 * Helper function to retry API calls with exponential backoff.
 */
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const msg = error.toString().toLowerCase();

      // Don't retry 403 (Permission) or 400 (Bad Request)
      if (msg.includes('403') || msg.includes('permission') || msg.includes('400')) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[API] Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// --- EXPORTED FUNCTIONS ---

export const analyzeImage = async (base64Image: string): Promise<{ subjectDescription: string; styleDescription: string }> => {
  return retryWithBackoff(async () => {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await makeRequest(
      'gemini-2.5-flash',
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Describe the main character (pet or doll) in this image in detail. Focus on breed/type, color, texture (fluffy, smooth), eye color, and distinctive markings. Also describe the art style of the image. Return JSON." }
        ]
      },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjectDescription: { type: Type.STRING },
            styleDescription: { type: Type.STRING },
          }
        }
      }
    );

    if (response.text) {
      return JSON.parse(response.text);
    }
    return { subjectDescription: "A cute character", styleDescription: "Standard" };
  });
};

export interface CityEncyclopediaItem {
  name: string;
  description: string;
}

export const generateCityEncyclopediaList = async (city: string): Promise<CityEncyclopediaItem[]> => {
  return retryWithBackoff(async () => {
    const response = await makeRequest(
      'gemini-2.5-flash',
      {
        parts: [{
          text: `Generate a list of exactly 24 distinct, iconic cultural items for: ${city}.

For each item, provide:
- name: A short, evocative name (3-6 words, e.g., "Eiffel Tower Keychain", "Parisian Croissant")
- description: A fascinating "Fun Fact" or "Micro Story" (1-2 sentences) about this item's cultural significance, history, or usage. make it engaging and educational for a curious traveler. DO NOT describe what it looks like (e.g. "red box"), focus on the STORY.

Return ONLY a JSON array of objects with "name" and "description" fields.` }]
      },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "description"]
          }
        }
      }
    );

    if (response.text) return JSON.parse(response.text);
    return Array(24).fill(null).map((_, i) => ({
      name: `Item ${i + 1} from ${city}`,
      description: `A typical cultural item from ${city}.`
    }));
  });
};

export const generateMasterCharacter = async (
  sourceBase64: string,
  subjectDescription: string,
  stylePrompt: string,
  genConfig: GenerationConfig
): Promise<string> => {
  return retryWithBackoff(async () => {
    const model = genConfig.model || 'gemini-3-pro-image-preview';
    const cleanBase64 = sourceBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const imageConfig = buildImageConfig(model, "1:1", genConfig.imageSize);

    // Determine if bio-accurate mode based on style prompt content
    const isBioAccurate = stylePrompt.toLowerCase().includes('preserve') &&
      stylePrompt.toLowerCase().includes('natural anatomical');

    const masterPrompt = buildMasterPrompt(subjectDescription, stylePrompt, isBioAccurate);

    const response = await makeRequest(
      model,
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: masterPrompt }
        ]
      },
      {
        temperature: genConfig.temperature,
        topP: genConfig.topP,
        topK: genConfig.topK,
        seed: genConfig.seed,
        imageConfig: imageConfig
      }
    );

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p: any) => p.inlineData);

    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
    }
    throw new Error("No image data in response");
  });
};

export const generateStickerImage = async (
  sourceBase64: string,
  subjectDescription: string,
  emotionOrAction: string,
  stylePrompt: string,
  isSpriteSheet: boolean = false,
  spriteActions: SheetActionItem[] = [],
  sheetTemplate: string = "",
  rows: number = 2,
  cols: number = 2,
  moduleName: string = "Custom",
  technicalPrompt: string = "",
  negativePrompt: string = "",
  genConfig: GenerationConfig
): Promise<{ imageUrl: string; prompt: string }> => {
  return retryWithBackoff(async () => {
    const model = genConfig.model || 'gemini-3-pro-image-preview';
    const cleanBase64 = sourceBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = buildStickerPrompt(
      subjectDescription,
      emotionOrAction,
      stylePrompt,
      isSpriteSheet,
      spriteActions,
      sheetTemplate,
      rows,
      cols,
      moduleName,
      technicalPrompt,
      negativePrompt
    );

    const imageConfig = buildImageConfig(model, "1:1", genConfig.imageSize);

    const response = await makeRequest(
      model,
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      {
        temperature: genConfig.temperature,
        topP: genConfig.topP,
        topK: genConfig.topK,
        seed: genConfig.seed,
        imageConfig: imageConfig
      }
    );

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p: any) => p.inlineData);

    if (imagePart?.inlineData) {
      return {
        imageUrl: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        prompt
      };
    }
    throw new Error("No image data in response");
  });
};

// Placeholder for functions/constants not provided in the original snippet
// You should replace these with actual implementations if they exist elsewhere in your project.
const getForceLocalMode = () => false; // Assume false for now
const generateImageLocal = async (prompt: string, aspectRatio: string) => {
  console.warn("generateImageLocal not implemented, returning dummy data.");
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
};
const DEFAULT_MODEL = 'gemini-3-pro-image-preview'; // Default model for scene generation

export const generateSceneImage = async (
  prompt: string,
  aspectRatio: string = '1:1',
  config: GenerationConfig,
  referenceImages: string[] = [] // Optional Array of Base64 strings
): Promise<string> => {
  if (getForceLocalMode()) {
    return await generateImageLocal(prompt, aspectRatio);
  }

  try {
    return await retryWithBackoff(async () => {
      const model = config.model || DEFAULT_MODEL;
      const imageConfig = buildImageConfig(model, aspectRatio, config.imageSize);

      // Build parts array
      const parts: any[] = [{ text: prompt }];

      // Add reference images if provided
      if (referenceImages && referenceImages.length > 0) {
        console.log(`[Gemini] Adding ${referenceImages.length} reference images for style`);
        referenceImages.forEach(base64Data => {
          // Strip data:image/png;base64, prefix if present
          const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
          parts.unshift({
            inlineData: {
              mimeType: "image/png", // Assuming PNG for now, or detect if needed
              data: cleanBase64
            }
          });
        });
      }

      const response = await makeRequest(
        model,
        { parts: parts },
        {
          temperature: config.temperature,
          topP: config.topP,
          topK: config.topK,
          seed: config.seed, // Seed is passed here
          imageConfig: imageConfig
        }
      );

      const responseParts = response.candidates?.[0]?.content?.parts;
      const imagePart = responseParts?.find((p: any) => p.inlineData);

      if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
      }
      throw new Error("No image data in response");
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
