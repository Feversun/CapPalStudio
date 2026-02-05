import express from "express";
import cors from "cors";
import {
  analyzeImage,
  generateStickerImage,
  generateSceneImage,
  generateMasterCharacter,
  generateCityEncyclopediaList,
  setForceLocalMode,
  setLocalApiStyle,
  setLocalBaseUrl,
  setLocalApiKey
} from "../services/gemini";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const HOST = process.env.CAPPAL_API_HOST || "0.0.0.0";
const PORT = parseInt(process.env.CAPPAL_API_PORT || "8787", 10);
const DEFAULT_PROVIDER = (process.env.CAPPAL_PROVIDER || "local").toLowerCase();
const DEFAULT_LOCAL_URL = process.env.CAPPAL_LOCAL_BASE_URL || "http://localhost:8080";
const DEFAULT_LOCAL_STYLE = (process.env.CAPPAL_LOCAL_STYLE || "anthropic").toLowerCase();
const DEFAULT_LOCAL_KEY = process.env.CAPPAL_LOCAL_KEY || "quotio-local-192E2655-C2D0-4594-ABD2-6B30F20451C4";

const applyProviderConfig = (req: express.Request) => {
  const provider = (req.header("X-CapPal-Provider") || DEFAULT_PROVIDER).toLowerCase();
  const localStyle = (req.header("X-CapPal-Local-Style") || DEFAULT_LOCAL_STYLE).toLowerCase() as
    | "gemini"
    | "anthropic";
  const localUrl = req.header("X-CapPal-Local-Url") || DEFAULT_LOCAL_URL;
  const localKey = req.header("X-CapPal-Local-Key") || DEFAULT_LOCAL_KEY;

  if (provider === "local") {
    setForceLocalMode(true);
    setLocalBaseUrl(localUrl);
    setLocalApiStyle(localStyle);
    setLocalApiKey(localKey);
  } else {
    setForceLocalMode(false);
  }

  return { provider, localStyle, localUrl };
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/v1/analyze", async (req, res) => {
  try {
    applyProviderConfig(req);
    const base64Image = req.body?.base64Image || req.body?.imageBase64;
    if (!base64Image) {
      return res.status(400).json({ error: "base64Image is required" });
    }
    const result = await analyzeImage(base64Image);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "analyze failed" });
  }
});

app.post("/v1/master", async (req, res) => {
  try {
    applyProviderConfig(req);
    const { sourceBase64, subjectDescription, stylePrompt, genConfig } = req.body || {};
    if (!sourceBase64 || !subjectDescription || !stylePrompt || !genConfig) {
      return res.status(400).json({ error: "sourceBase64, subjectDescription, stylePrompt, genConfig are required" });
    }
    const imageUrl = await generateMasterCharacter(sourceBase64, subjectDescription, stylePrompt, genConfig);
    res.json({ imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "master generation failed" });
  }
});

app.post("/v1/sticker", async (req, res) => {
  try {
    applyProviderConfig(req);
    const {
      sourceBase64,
      subjectDescription,
      emotionOrAction,
      stylePrompt,
      isSpriteSheet = false,
      spriteActions = [],
      sheetTemplate = "",
      rows = 2,
      cols = 2,
      moduleName = "Custom",
      technicalPrompt = "",
      negativePrompt = "",
      genConfig
    } = req.body || {};

    if (!sourceBase64 || !subjectDescription || !emotionOrAction || !stylePrompt || !genConfig) {
      return res.status(400).json({ error: "Missing required fields for sticker generation" });
    }

    const result = await generateStickerImage(
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
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "sticker generation failed" });
  }
});

app.post("/v1/scene", async (req, res) => {
  try {
    applyProviderConfig(req);
    const { prompt, aspectRatio = "1:1", config, referenceImages = [] } = req.body || {};
    if (!prompt || !config) {
      return res.status(400).json({ error: "prompt and config are required" });
    }
    const imageUrl = await generateSceneImage(prompt, aspectRatio, config, referenceImages);
    res.json({ imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "scene generation failed" });
  }
});

app.post("/v1/encyclopedia", async (req, res) => {
  try {
    applyProviderConfig(req);
    const { city } = req.body || {};
    if (!city) {
      return res.status(400).json({ error: "city is required" });
    }
    const items = await generateCityEncyclopediaList(city);
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "encyclopedia generation failed" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[CapPal API] listening on http://${HOST}:${PORT}`);
});
