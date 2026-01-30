
import { GoogleGenAI, Type } from "@google/genai";
import { SheetActionItem, GenerationConfig } from "../types";

// Configuration for Local Fallback API
const LOCAL_API_CONFIG = {
    apiKey: "quotio-local-192E2655-C2D0-4594-ABD2-6B30F20451C4",
    baseUrl: "https://summit-product-arrested-crew.trycloudflare.com"
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
 * Unified request handler that switches between SDK (Cloud) and Fetch (Local)
 */
const makeRequest = async (
    model: string, 
    contents: any, 
    config: any = {}
): Promise<any> => {
    // 1. LOCAL MODE
    if (useFallback) {
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
            text: rawResponse.candidates?.[0]?.content?.parts?.map((p:any) => p.text).join('') || undefined,
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

// --- HELPER to clean up image config based on model ---
const buildImageConfig = (model: string, aspectRatio: string, size: string) => {
    const config: any = { aspectRatio };
    // Only send imageSize for Pro Vision/Image models that support it
    if (model.includes('gemini-3-pro-image')) {
        config.imageSize = size;
    }
    return config;
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

export const generateCityEncyclopediaList = async (city: string): Promise<string[]> => {
  return retryWithBackoff(async () => {
      const response = await makeRequest(
        'gemini-2.5-flash',
        { 
            parts: [{ text: `Generate a list of exactly 24 distinct, iconic, and visual cultural items for: ${city}. Return ONLY a JSON array of strings.` }] 
        },
        {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      );

      if (response.text) return JSON.parse(response.text);
      return Array(24).fill(`Item from ${city}`);
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

      const response = await makeRequest(
          model,
          {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                { text: `Create a "Master Character Reference Sheet". Subject: ${subjectDescription}. Style: ${stylePrompt}. Strict Front View, Full Body, A-Pose, White Background.` }
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

      let prompt = "";
      if (isSpriteSheet) {
          prompt = sheetTemplate
            .replace('{{subject}}', subjectDescription)
            .replace('{{style}}', stylePrompt)
            .replace('{{module_name}}', moduleName.toUpperCase())
            .replace('{{motion_dynamics}}', "Standard movement")
            .replace('{{action_list}}', JSON.stringify(spriteActions.map(a => a.label)))
            .replace('{{technical_prompt}}', technicalPrompt)
            .replace('{{negative_prompt}}', negativePrompt)
            .replace('{{rows}}', rows.toString())
            .replace('{{cols}}', cols.toString())
            .replace('{{total_frames}}', (rows * cols).toString());
      } else {
           const isWidget = moduleName === 'WIDGET';
           if (isWidget) {
               prompt = `GENERATE iOS WIDGET. Subject: ${subjectDescription}. Concept: ${emotionOrAction}. Style: ${stylePrompt}. Square 1:1.`;
           } else {
               prompt = `Generate sticker. Subject: ${subjectDescription}. Emotion: ${emotionOrAction}. Style: ${stylePrompt}. White background.`;
           }
      }

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

export const generateSceneImage = async (
    prompt: string, 
    aspectRatio: string = "1:1",
    genConfig: GenerationConfig
): Promise<string> => {
  return retryWithBackoff(async () => {
      const model = genConfig.model || 'gemini-3-pro-image-preview';
      
      const imageConfig = buildImageConfig(model, aspectRatio, genConfig.imageSize);

      const response = await makeRequest(
          model,
          { parts: [{ text: prompt }] },
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
