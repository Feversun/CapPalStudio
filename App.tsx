
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StickerGrid from './components/StickerGrid';
import SceneResults from './components/SceneResults';
import { Sticker, GenerationStatus, StickerStyle, GenerationMode, SheetGridConfig, SheetMode, SheetActionItem, SceneHistoryItem, ConsistencyMode, GenerationConfig } from './types';
import {
  EMOTIONS, STYLES, DEFAULT_STYLE_ID,
  IDLE_DEFAULTS, EMOTE_DEFAULTS, ACTION_DEFAULTS, UI_UX_DEFAULTS,
  MASTER_SHEET_PROMPT_TEMPLATE, SHARED_TECHNICAL_PROMPT, SHARED_NEGATIVE_PROMPT,
  WIDGET_SCENARIOS
} from './constants';
import { analyzeImage, generateStickerImage, generateSceneImage, generateMasterCharacter, setForceLocalMode } from './services/gemini';
import { saveState, loadState } from './services/db';
import { saveToHistory, getHistory, getHistoryByMode, HistoryItem } from './services/historyDB';

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [masterImage, setMasterImage] = useState<string | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);

  const [mode, setMode] = useState<GenerationMode>('sheet');
  const [sheetMode, setSheetMode] = useState<SheetMode>('action');
  const [consistencyMode, setConsistencyMode] = useState<ConsistencyMode>('reference');

  const [gridConfig, setGridConfig] = useState<SheetGridConfig>({ rows: 4, cols: 4 });
  const [megaSheetMode, setMegaSheetMode] = useState<boolean>(false); // false = multi-sheet, true = mega-sheet (8×N)
  const [spriteActions, setSpriteActions] = useState<SheetActionItem[]>(ACTION_DEFAULTS);
  const [sheetPromptTemplate, setSheetPromptTemplate] = useState<string>(MASTER_SHEET_PROMPT_TEMPLATE);

  const [allStyles, setAllStyles] = useState<StickerStyle[]>(STYLES);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(DEFAULT_STYLE_ID);

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [analysisCache, setAnalysisCache] = useState<{ id: string, subject: string, style: string } | null>(null);

  const [sceneHistory, setSceneHistory] = useState<SceneHistoryItem[]>([]);
  const [currentSceneImage, setCurrentSceneImage] = useState<string | null>(null);
  const [sceneAspectRatio, setSceneAspectRatio] = useState<string>('1:1');

  const [activeTab, setActiveTab] = useState(0); // 0: Config/Inputs, 1: Results, 2: History

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // API Mode State - Default to LOCAL for this Antigravity version
  const [isLocalApi, setIsLocalApi] = useState(true);
  // Fake quota tracking for demo visual
  const [quotaUsage, setQuotaUsage] = useState(45);
  const quotaLimit = 100;

  // GLOBAL GENERATION CONFIG
  const [genConfig, setGenConfig] = useState<GenerationConfig>({
    temperature: 1,
    topP: 0.95,
    topK: 64,
    seed: undefined,
    imageSize: '2K', // Default to 2K as requested
    model: 'gemini-3-pro-image-preview' // Use Gemini 3 Pro for best quality
  });

  const completedCount = stickers.filter(s => s.status === 'completed' || s.status === 'failed').length;
  const totalCount = stickers.length;

  useEffect(() => {
    // Initialize Local Mode on startup
    setForceLocalMode(true);

    const initLoad = async () => {
      // AUTO-CLEAR CACHE: For Local Antigravity version, always start fresh
      // This ensures code changes take effect without manual cache clearing
      localStorage.removeItem('stickerGen_styles');
      localStorage.removeItem('stickerGen_selectedStyleId');
      localStorage.removeItem('stickerGen_genConfig');
      console.log('[Local Antigravity] Cleared all config caches for fresh start');

      try {
        const savedStyles = localStorage.getItem('stickerGen_styles');
        // Version check: If saved styles don't include new style IDs, clear cache
        if (savedStyles) {
          const parsed = JSON.parse(savedStyles);
          const hasNewStyles = parsed.some((s: any) => s.id === 'acnh_villager' || s.id === 'acnh_natural');
          if (hasNewStyles) {
            setAllStyles(parsed);
          } else {
            // Clear outdated cache, use fresh defaults
            localStorage.removeItem('stickerGen_styles');
            localStorage.removeItem('stickerGen_selectedStyleId');
            console.log('[App] Cleared outdated style cache, using fresh defaults');
          }
        }
        const savedStyleId = localStorage.getItem('stickerGen_selectedStyleId');
        if (savedStyleId) setSelectedStyleId(savedStyleId);
        const savedMode = localStorage.getItem('stickerGen_mode');
        if (savedMode) setMode(savedMode as GenerationMode);
        const savedConMode = localStorage.getItem('stickerGen_consistencyMode');
        if (savedConMode) setConsistencyMode(savedConMode as ConsistencyMode);
        const savedGenConfig = localStorage.getItem('stickerGen_genConfig');
        if (savedGenConfig) setGenConfig(JSON.parse(savedGenConfig));
      } catch (e) { console.error('Error loading prefs', e); }

      try {
        const savedSource = await loadState<string>('sourceImage');
        if (savedSource) setSourceImage(savedSource);
        const savedMaster = await loadState<string>('masterImage');
        if (savedMaster) setMasterImage(savedMaster);

        const savedStickers = await loadState<Sticker[]>('stickers');
        if (savedStickers) {
          // CLEANUP: If items were stuck in 'generating' or 'pending' state from a previous session (refresh),
          // mark them as failed so the UI doesn't spin forever.
          const cleanStickers = savedStickers.map(s => {
            if (s.status === 'generating' || s.status === 'pending') {
              return { ...s, status: 'failed', error: 'Interrupted' } as Sticker;
            }
            return s;
          });
          setStickers(cleanStickers);
        }

        // Load filtered history from IndexedDB (Unlimited & Independent)
        const allMixed = await getHistory(1000);
        const stickersOnly = allMixed.filter(h => h.mode !== 'scene').slice(0, 500);
        setHistoryItems(stickersOnly);
        console.log(`[History] Loaded ${stickersOnly.length} stickers from IndexedDB`);

        // Load Scenes specifically (Dedicated 500 limit)
        const sceneHistoryItems = await getHistoryByMode('scene', 500);

        // MIGRATION: Check for legacy scene history in old DB
        const legacySceneHistory = await loadState<SceneHistoryItem[]>('sceneHistory');

        if (sceneHistoryItems.length === 0 && legacySceneHistory && legacySceneHistory.length > 0) {
          console.log(`[History] Migrating ${legacySceneHistory.length} legacy scenes to unified DB`);
          // Migrate legacy items
          for (const legacy of legacySceneHistory) {
            const newHistoryItem: HistoryItem = {
              id: legacy.id,
              emotion: "Scene",
              emoji: "🎨",
              imageUrl: legacy.imageUrl,
              finalPrompt: legacy.prompt,
              mode: 'scene',
              style: 'Standard',
              timestamp: legacy.timestamp,
              imageSize: legacy.imageSize,
              seed: legacy.seed,
              model: legacy.model
            };
            await saveToHistory(newHistoryItem);
            // Push to front of sceneHistoryItems (since we are iterating legacy which is likely sorted new->old)
            // legacySceneHistory is likely [newest, ..., oldest]
            sceneHistoryItems.push(newHistoryItem as any);
          }
          // Clear legacy to avoid double migration next time
          await saveState('sceneHistory', []);
        }

        // Map HistoryItem back to SceneHistoryItem for state
        const mappedScenes: SceneHistoryItem[] = sceneHistoryItems.map(h => ({
          id: h.id,
          prompt: h.finalPrompt || '',
          imageUrl: h.imageUrl,
          timestamp: h.timestamp,
          imageSize: h.imageSize as any,
          seed: h.seed,
          model: h.model
        }));

        setSceneHistory(mappedScenes);
        if (mappedScenes.length > 0) setCurrentSceneImage(mappedScenes[0].imageUrl);

        const savedAnalysis = await loadState<{ id: string, subject: string, style: string }>('analysis');
        if (savedAnalysis) setAnalysisCache(savedAnalysis);
      } catch (e) { console.error("Failed to load from DB", e); }
    };
    initLoad();
  }, []);

  useEffect(() => {
    const saveToStorage = async () => {
      try {
        localStorage.setItem('stickerGen_styles', JSON.stringify(allStyles));
        localStorage.setItem('stickerGen_selectedStyleId', selectedStyleId);
        localStorage.setItem('stickerGen_mode', mode);
        localStorage.setItem('stickerGen_consistencyMode', consistencyMode);
        localStorage.setItem('stickerGen_genConfig', JSON.stringify(genConfig));
        if (sourceImage) await saveState('sourceImage', sourceImage);
        if (masterImage) await saveState('masterImage', masterImage);
        await saveState('stickers', stickers);
        // await saveState('sceneHistory', sceneHistory); // REMOVED: Managed by historyDB now
        if (analysisCache) await saveState('analysis', analysisCache);
      } catch (e) { console.error("Storage save failed", e); }
    }
    const timeoutId = setTimeout(saveToStorage, 1000);
    return () => clearTimeout(timeoutId);
  }, [sourceImage, masterImage, stickers, allStyles, selectedStyleId, mode, analysisCache, sceneHistory, consistencyMode, genConfig]);

  useEffect(() => {
    if (mode === 'sheet') {
      const assembled = MASTER_SHEET_PROMPT_TEMPLATE
        .replace('{{technical_prompt}}', SHARED_TECHNICAL_PROMPT)
        .replace('{{negative_prompt}}', SHARED_NEGATIVE_PROMPT);
      setSheetPromptTemplate(assembled);
    }
  }, [mode, sheetMode, spriteActions, gridConfig]);

  const handleImageSelect = (base64OrUrl: string) => {
    setSourceImage(base64OrUrl);
    setStickers([]);
    setMasterImage(null);
    setGenerationStatus(GenerationStatus.IDLE);
    setAnalysisCache(null);
  };

  const handleUpdateStyle = (id: string, updates: Partial<StickerStyle>) => {
    setAllStyles(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAddStyle = (newStyle: StickerStyle) => {
    setAllStyles(prev => [...prev, newStyle]);
    setSelectedStyleId(newStyle.id);
  };

  const handleDeleteStyle = (id: string) => {
    setAllStyles(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (selectedStyleId === id) setSelectedStyleId(DEFAULT_STYLE_ID);
      return filtered;
    });
  };

  const handleResetStyle = (id: string) => {
    const original = STYLES.find(s => s.id === id);
    if (original) handleUpdateStyle(id, { prompt: original.prompt, name: original.name });
  };

  const handleSpriteActionChange = (index: number, updates: Partial<SheetActionItem>) => {
    const newActions = [...spriteActions];
    newActions[index] = { ...newActions[index], ...updates };
    setSpriteActions(newActions);
  };

  const handleModeChange = (newMode: GenerationMode) => {
    setMode(newMode);
    if (newMode !== 'scene') {
      if (mode === 'scene') {
        // Keep stickers if switching back from scene
      } else {
        // Switching between sticker modes -> reset
        setStickers([]);
        setGenerationStatus(GenerationStatus.IDLE);
      }
    }
  };

  const handleSheetModeChange = (newSheetMode: SheetMode) => {
    setSheetMode(newSheetMode);
    if (newSheetMode === 'idle') {
      setGridConfig({ rows: 4, cols: 4 });
      setSpriteActions(IDLE_DEFAULTS);
    } else if (newSheetMode === 'emote') {
      setGridConfig({ rows: 4, cols: 4 });
      setSpriteActions(EMOTE_DEFAULTS);
    } else if (newSheetMode === 'ui') {
      setGridConfig({ rows: 4, cols: 4 });
      setSpriteActions(UI_UX_DEFAULTS);
    } else {
      setGridConfig({ rows: 4, cols: 4 });
      setSpriteActions(ACTION_DEFAULTS);
    }
  };

  // Toggle API Mode Handler
  const handleToggleApi = () => {
    const newValue = !isLocalApi;
    setIsLocalApi(newValue);
    setForceLocalMode(newValue);
    // Simulate resetting quota view when switching
    if (newValue) setQuotaUsage(10);
    else setQuotaUsage(95); // Simulate high usage on cloud
  };

  const ensureAnalysis = async (): Promise<string> => {
    if (!sourceImage) return "";
    if (analysisCache && analysisCache.id === sourceImage.substring(0, 50)) {
      return analysisCache.subject;
    }
    const analysis = await analyzeImage(sourceImage);
    setAnalysisCache({ id: sourceImage.substring(0, 50), subject: analysis.subjectDescription, style: analysis.styleDescription });
    return analysis.subjectDescription;
  };

  const handleGenerateMasterCharacter = async () => {
    if (!sourceImage) return;
    setGenerationStatus(GenerationStatus.ANALYZING);
    try {
      const subjectDesc = await ensureAnalysis();
      const selectedStyle = allStyles.find(s => s.id === selectedStyleId) || allStyles[0];
      setGenerationStatus(GenerationStatus.GENERATING);
      const masterUrl = await generateMasterCharacter(sourceImage, subjectDesc, selectedStyle.prompt, genConfig);
      setMasterImage(masterUrl);
      setGenerationStatus(GenerationStatus.IDLE);
      setQuotaUsage(prev => Math.min(prev + 5, 100)); // Increment fake quota
    } catch (error) {
      console.error("Failed to generate master", error);
      setGenerationStatus(GenerationStatus.FAILED);
    }
  };

  const handleRegenerateSingle = async (stickerToRegenerate: Sticker) => {
    if (!sourceImage) return;
    const index = stickers.findIndex(s => s.id === stickerToRegenerate.id);
    if (index === -1) return;
    setStickers(prev => prev.map((s, i) => i === index ? { ...s, status: 'generating', error: undefined } : s));
    try {
      const subjectDesc = await ensureAnalysis();
      const selectedStyle = allStyles.find(s => s.id === selectedStyleId) || allStyles[0];

      let imageSourceToUse = sourceImage;
      if (consistencyMode === 'reference') {
        imageSourceToUse = masterImage || sourceImage;
      } else if (consistencyMode === 'first_result') {
        if (index === 0) {
          imageSourceToUse = sourceImage;
        } else {
          const firstSticker = stickers[0];
          if (firstSticker && firstSticker.status === 'completed' && firstSticker.imageUrl) {
            imageSourceToUse = firstSticker.imageUrl;
          } else {
            imageSourceToUse = sourceImage;
          }
        }
      }

      let result;
      if (mode === 'sheet') {
        // For sheet mode, regenerating single item means regenerating the whole sheet usually, 
        // as the "sticker" IS the sheet in our data model for sheet mode.
        // We pass all enabled actions.
        const activeActions = spriteActions.filter(a => a.enabled !== false);
        result = await generateStickerImage(
          imageSourceToUse, subjectDesc, stickerToRegenerate.emotion, selectedStyle.prompt,
          true, activeActions, sheetPromptTemplate, gridConfig.rows, gridConfig.cols, sheetMode,
          SHARED_TECHNICAL_PROMPT, SHARED_NEGATIVE_PROMPT, runConfig
        );
      } else {
        // Pack or Widget
        const isWidget = mode === 'widget';
        const moduleName = isWidget ? "WIDGET" : "EMOTE";
        result = await generateStickerImage(
          imageSourceToUse, subjectDesc, stickerToRegenerate.emotion, selectedStyle.prompt,
          false, [], "", 1, 1, moduleName,
          "", "", runConfig
        );
      }

      setStickers(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: result.imageUrl, finalPrompt: result.prompt, status: 'completed', seed: seedToUse, model: genConfig.model } : s));
      setQuotaUsage(prev => Math.min(prev + 2, 100));

    } catch (error: any) {
      console.error('Regeneration failed', error);
      setStickers(prev => prev.map((s, i) => i === index ? { ...s, status: 'failed', error: error.message } : s));
    }
  };

  const handleGenerateStickers = async () => {
    if (!sourceImage) return;

    if (activeTab !== 1) setActiveTab(1); // Switch to results

    // 1. Setup Stubs
    let newStickers: Sticker[] = [];
    if (mode === 'sheet') {
      const activeActions = spriteActions.filter(a => a.enabled !== false);
      // Limit to max 7 actions for Mega Sheet mode
      const limitedActions = megaSheetMode ? activeActions.slice(0, 7) : activeActions;

      if (megaSheetMode) {
        // MEGA SHEET: Single stub for combined 8×N sheet
        newStickers = [{
          id: Date.now().toString(),
          emotion: `MEGA ${sheetMode.toUpperCase()} (${limitedActions.length} animations × 8 frames)`,
          emoji: '🎬',
          status: 'pending'
        }];
      } else {
        // MULTI-SHEET: One stub per action
        newStickers = limitedActions.map((action, idx) => ({
          id: `${Date.now()}-${idx}`,
          emotion: action.label,
          emoji: '📜',
          status: 'pending'
        }));
      }
    } else if (mode === 'widget') {
      newStickers = WIDGET_SCENARIOS.map((scenario, idx) => ({
        id: `${Date.now()}-${idx}`,
        emotion: scenario.name, // Pass name, we will look up prompt later or pass concept
        emoji: scenario.emoji,
        status: 'pending'
      }));
    } else {
      // Pack
      newStickers = EMOTIONS.slice(0, 8).map((emote, idx) => ({
        id: `${Date.now()}-${idx}`,
        emotion: emote.name,
        emoji: emote.emoji,
        status: 'pending'
      }));
    }
    setStickers(newStickers);
    setGenerationStatus(GenerationStatus.ANALYZING);

    try {
      const subjectDesc = await ensureAnalysis();
      const selectedStyle = allStyles.find(s => s.id === selectedStyleId) || allStyles[0];
      setGenerationStatus(GenerationStatus.GENERATING);

      // 2. Process
      if (mode === 'sheet') {
        const activeActions = spriteActions.filter(a => a.enabled !== false);
        const limitedActions = megaSheetMode ? activeActions.slice(0, 7) : activeActions;

        if (megaSheetMode) {
          // MEGA SHEET MODE: All actions in one 8×N image
          setStickers(prev => prev.map(s => ({ ...s, status: 'generating' })));

          const megaRows = limitedActions.length; // 1 row per action, max 7
          const megaCols = 8; // 8 frames per animation

          // Use provided seed or generate random one
          const seedToUse = genConfig.seed !== undefined ? genConfig.seed : Math.floor(Math.random() * 4294967295);
          const runConfig = { ...genConfig, seed: seedToUse };

          const result = await generateStickerImage(
            masterImage || sourceImage, subjectDesc, "Mega Sprite Sheet", selectedStyle.prompt,
            true, limitedActions, sheetPromptTemplate, megaRows, megaCols, sheetMode,
            SHARED_TECHNICAL_PROMPT, SHARED_NEGATIVE_PROMPT, runConfig
          );

          setStickers(prev => prev.map(s => ({
            ...s, imageUrl: result.imageUrl, finalPrompt: result.prompt, status: 'completed', seed: seedToUse, model: genConfig.model
          })));
          setQuotaUsage(prev => Math.min(prev + 5, 100));
        } else {
          // MULTI-SHEET MODE: Each action generates its own sprite sheet
          const itemsToProcess = [...newStickers];
          let currentReferenceImage = masterImage || sourceImage;

          for (let i = 0; i < itemsToProcess.length; i++) {
            const sticker = itemsToProcess[i];
            const action = limitedActions[i];

            if (!action) continue; // Safety check

            setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, status: 'generating' } : s));

            try {
              // Use provided seed or generate random one
              const seedToUse = genConfig.seed !== undefined ? genConfig.seed : Math.floor(Math.random() * 4294967295);
              const runConfig = { ...genConfig, seed: seedToUse };

              // Generate a single sprite sheet for THIS action only
              const result = await generateStickerImage(
                currentReferenceImage, subjectDesc, action.label, selectedStyle.prompt,
                true, [action], sheetPromptTemplate, gridConfig.rows, gridConfig.cols, sheetMode,
                SHARED_TECHNICAL_PROMPT, SHARED_NEGATIVE_PROMPT, runConfig
              );

              setStickers(prev => {
                const newStickers = [...prev];
                const index = newStickers.findIndex(s => s.id === sticker.id);
                if (index !== -1) {
                  newStickers[index] = {
                    ...newStickers[index],
                    imageUrl: result.imageUrl,
                    finalPrompt: result.prompt,
                    status: 'completed',
                    seed: seedToUse, // Save seed
                    model: genConfig.model
                  };
                }
                return newStickers;
              });
              setQuotaUsage(prev => Math.min(prev + 3, 100));

              // Use first result as reference for subsequent generations (consistency mode)
              if (consistencyMode === 'first_result' && i === 0) {
                currentReferenceImage = result.imageUrl;
              }
            } catch (err: any) {
              console.error(`Sheet generation failed for ${action.label}`, err);
              setStickers(prev => prev.map(s => s.id === sticker.id
                ? { ...s, status: 'failed', error: err.message }
                : s
              ));
            }
          }
        }
      } else {
        // Sequential Generation for Pack/Widget
        const itemsToProcess = [...newStickers];
        let processed = 0;

        // Daisy chain reference logic
        let currentReferenceImage = masterImage || sourceImage;

        for (let i = 0; i < itemsToProcess.length; i++) {
          const sticker = itemsToProcess[i];
          setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, status: 'generating' } : s));

          try {
            let concept = sticker.emotion;
            if (mode === 'widget') {
              // Find full prompt for widget scenario
              const scenario = WIDGET_SCENARIOS.find(w => w.name === sticker.emotion);
              if (scenario) concept = scenario.prompt;
            }

            const result = await generateStickerImage(
              currentReferenceImage, subjectDesc, concept, selectedStyle.prompt,
              false, [], "", 1, 1, mode === 'widget' ? "WIDGET" : "EMOTE",
              "", "", genConfig
            );

            setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, imageUrl: result.imageUrl, finalPrompt: result.prompt, status: 'completed' } : s));
            setQuotaUsage(prev => Math.min(prev + 2, 100));

            // Update reference for next iteration if Daisy Chain
            if (consistencyMode === 'first_result' && i === 0) {
              currentReferenceImage = result.imageUrl;
            }

          } catch (err: any) {
            console.error("Single generation failed", err);
            setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, status: 'failed', error: err.message } : s));
          }
          processed++;
        }
      }
      setGenerationStatus(GenerationStatus.COMPLETED);

      // Save completed stickers to history (IndexedDB)
      const historyStyle = allStyles.find(s => s.id === selectedStyleId) || allStyles[0];
      setStickers(prev => {
        prev.filter(s => s.status === 'completed' && s.imageUrl).forEach(async (sticker) => {
          const historyItem: HistoryItem = {
            id: `${sticker.id}-${Date.now()}`,
            emotion: sticker.emotion,
            emoji: sticker.emoji,
            imageUrl: sticker.imageUrl!,
            finalPrompt: sticker.finalPrompt,
            mode: mode,
            style: historyStyle.name,
            timestamp: Date.now()
          };
          await saveToHistory(historyItem);
        });
        return prev;
      });

      // Refresh history list
      const updatedHistory = await getHistory(500);
      setHistoryItems(updatedHistory);
      console.log(`[History] Saved ${stickers.filter(s => s.status === 'completed').length} items to IndexedDB`);

    } catch (error: any) {
      console.error("Generation Flow Failed", error);
      setGenerationStatus(GenerationStatus.FAILED);
      // Important: Mark all pending/generating stickers as failed so they don't spin forever
      setStickers(prev => prev.map(s =>
        (s.status === 'generating' || s.status === 'pending')
          ? { ...s, status: 'failed', error: error.message || 'Generation failed' }
          : s
      ));
    }
  };

  const handleSceneGenerate = async (prompt: string, aspectRatio: string, referenceImages: string[] = []) => {
    setGenerationStatus(GenerationStatus.GENERATING);
    setCurrentSceneImage(null); // Clear previous to show loading
    setSceneAspectRatio(aspectRatio);

    // Determine seed (use existing or generate new random one for tracking)
    // Fix: Clamp to Signed 32-bit integer range (max 2,147,483,647) to avoid Gemini API errors
    const seedToUse = genConfig.seed !== undefined ? genConfig.seed : Math.floor(Math.random() * 2147483647);
    const runConfig = { ...genConfig, seed: seedToUse };

    try {
      // Pass runConfig with explicit seed and reference images
      const imageUrl = await generateSceneImage(prompt, aspectRatio, runConfig, referenceImages);
      setCurrentSceneImage(imageUrl);

      const newItem: SceneHistoryItem = {
        id: Date.now().toString(),
        prompt: prompt,
        imageUrl: imageUrl,
        timestamp: Date.now(),
        imageSize: genConfig.imageSize,
        seed: seedToUse,
        model: genConfig.model
      };

      setSceneHistory(prev => [newItem, ...prev]);
      setGenerationStatus(GenerationStatus.IDLE);
      setQuotaUsage(prev => Math.min(prev + 5, 100));

      // Save to unified HistoryDB
      await saveToHistory({
        id: newItem.id,
        emotion: "Scene",
        emoji: "🎨",
        imageUrl: newItem.imageUrl,
        finalPrompt: newItem.prompt,
        mode: 'scene',
        style: 'Standard',
        timestamp: newItem.timestamp,
        imageSize: newItem.imageSize,
        seed: newItem.seed,
        model: newItem.model
      });

    } catch (error) {
      console.error("Scene generation failed", error);
      setGenerationStatus(GenerationStatus.FAILED);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F3F4F6] overflow-hidden">
      {/* Sidebar - Fixed width on Desktop, Full on Mobile (controlled via tab/css) */}
      <div className={`md:w-[400px] w-full flex-shrink-0 border-r border-gray-200 bg-white h-full transition-transform ${activeTab === 0 ? 'block' : 'hidden md:block'}`}>
        <Sidebar
          sourceImage={sourceImage}
          masterImage={masterImage}
          onImageSelect={handleImageSelect}
          onMasterImageUpdate={setMasterImage}
          onGenerateMaster={handleGenerateMasterCharacter}
          isGeneratingMaster={generationStatus === GenerationStatus.GENERATING && !stickers.some(s => s.status === 'generating')}

          mode={mode}
          onModeChange={handleModeChange}

          sheetMode={sheetMode}
          onSheetModeChange={handleSheetModeChange}

          spriteActions={spriteActions}
          onSpriteActionChange={handleSpriteActionChange}

          gridConfig={gridConfig}
          onGridConfigChange={setGridConfig}

          megaSheetMode={megaSheetMode}
          onMegaSheetModeChange={setMegaSheetMode}

          sheetPromptTemplate={sheetPromptTemplate}
          onSheetPromptTemplateChange={setSheetPromptTemplate}

          styles={allStyles}
          selectedStyleId={selectedStyleId}
          onStyleChange={setSelectedStyleId}
          onUpdateStyle={handleUpdateStyle}
          onAddStyle={handleAddStyle}
          onDeleteStyle={handleDeleteStyle}
          onResetStyle={handleResetStyle}

          isGenerating={generationStatus === GenerationStatus.GENERATING}
          onGenerate={handleGenerateStickers}
          progress={{ current: completedCount, total: totalCount }}
          buttonLabel={mode === 'sheet' ? 'Generate Sprite Sheet' : 'Generate Pack'}

          consistencyMode={consistencyMode}
          onConsistencyModeChange={setConsistencyMode}

          onSceneGenerate={handleSceneGenerate}

          quotaUsage={quotaUsage}
          quotaLimit={quotaLimit}

          isLocalApi={isLocalApi}
          onToggleApi={handleToggleApi}

          genConfig={genConfig}
          onGenConfigChange={setGenConfig}
        />
      </div>

      {/* Main Content Area (Results) */}
      <div className={`flex-1 h-full relative ${activeTab === 1 ? 'block' : 'hidden md:block'}`}>
        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex border-b border-gray-200 bg-white">
          <button onClick={() => setActiveTab(0)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${activeTab === 0 ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Configuration</button>
          <button onClick={() => setActiveTab(1)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${activeTab === 1 ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Results ({completedCount})</button>
        </div>

        {mode === 'scene' ? (
          <SceneResults
            currentImage={currentSceneImage}
            history={sceneHistory}
            isGenerating={generationStatus === GenerationStatus.GENERATING}
            onSelectHistory={(item) => setCurrentSceneImage(item.imageUrl)}
            aspectRatio={sceneAspectRatio}
          />
        ) : (
          <StickerGrid
            stickers={stickers}
            progress={{ current: completedCount, total: totalCount }}
            onRegenerate={handleRegenerateSingle}
            finalPrompt={stickers.find(s => s.id === stickers[0]?.id)?.finalPrompt} // Just showing first for now or selected
          />
        )}
      </div>
    </div>
  );
};

export default App;
