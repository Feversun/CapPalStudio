import { GenerationConfig, SheetActionItem } from "../types";

type ProviderMode = "local" | "cloud";
type LocalApiStyle = "gemini" | "anthropic";

let apiBaseUrl =
  (import.meta as any).env?.VITE_CAPPAL_API_URL || "http://localhost:8787";
let providerMode: ProviderMode = "local";
let localApiStyle: LocalApiStyle = "anthropic";

const setApiBaseUrl = (url: string) => {
  apiBaseUrl = url.replace(/\/$/, "");
};

export const setForceLocalMode = (enable: boolean) => {
  providerMode = enable ? "local" : "cloud";
  console.log(
    `[CapPal API] Provider mode set to: ${providerMode.toUpperCase()}`
  );
};

export const setLocalBaseUrl = (url: string) => {
  setApiBaseUrl(url);
  console.log(`[CapPal API] Base URL updated to: ${apiBaseUrl}`);
};

export const setLocalApiStyle = (style: LocalApiStyle) => {
  localApiStyle = style;
  console.log(`[CapPal API] Local API style set to: ${style}`);
};

const apiPost = async <T>(path: string, body: any): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CapPal-Provider": providerMode,
      "X-CapPal-Local-Style": localApiStyle
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error ${response.status}: ${errText}`);
  }
  return (await response.json()) as T;
};

export const analyzeImage = async (
  base64Image: string
): Promise<{ subjectDescription: string; styleDescription: string }> => {
  return await apiPost("/v1/analyze", { base64Image });
};

export interface CityEncyclopediaItem {
  name: string;
  description: string;
}

export const generateCityEncyclopediaList = async (
  city: string
): Promise<CityEncyclopediaItem[]> => {
  const result = await apiPost<{ items: CityEncyclopediaItem[] }>(
    "/v1/encyclopedia",
    { city }
  );
  return result.items;
};

export const generateMasterCharacter = async (
  sourceBase64: string,
  subjectDescription: string,
  stylePrompt: string,
  genConfig: GenerationConfig
): Promise<string> => {
  const result = await apiPost<{ imageUrl: string }>("/v1/master", {
    sourceBase64,
    subjectDescription,
    stylePrompt,
    genConfig
  });
  return result.imageUrl;
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
  return await apiPost("/v1/sticker", {
    sourceBase64,
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
    negativePrompt,
    genConfig
  });
};

export const generateSceneImage = async (
  prompt: string,
  aspectRatio: string = "1:1",
  config: GenerationConfig,
  referenceImages: string[] = []
): Promise<string> => {
  const result = await apiPost<{ imageUrl: string }>("/v1/scene", {
    prompt,
    aspectRatio,
    config,
    referenceImages
  });
  return result.imageUrl;
};

