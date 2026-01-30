
import React, { useRef, useState, useEffect } from 'react';
import { StickerStyle, GenerationMode, SheetGridConfig, PromptVersion, SheetMode, SheetActionItem, ConsistencyMode, GenerationConfig } from '../types';
import { STYLES, PRESET_IMAGES, GET_MOTION_DESCRIPTION, WIDGET_SCENARIOS } from '../constants';
import SceneGeneratorInputs from './SceneGenerator';
import { setLocalBaseUrl } from '../services/gemini';

interface SidebarProps {
  sourceImage: string | null;
  masterImage: string | null;
  onImageSelect: (base64OrUrl: string) => void;
  onMasterImageUpdate: (base64: string | null) => void;
  onGenerateMaster: () => void;
  isGeneratingMaster: boolean;

  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;

  sheetMode: SheetMode;
  onSheetModeChange: (mode: SheetMode) => void;

  spriteActions: SheetActionItem[];
  onSpriteActionChange: (index: number, updates: Partial<SheetActionItem>) => void;

  gridConfig: SheetGridConfig;
  onGridConfigChange: (config: SheetGridConfig) => void;

  megaSheetMode: boolean;
  onMegaSheetModeChange: (enabled: boolean) => void;

  sheetPromptTemplate?: string;
  onSheetPromptTemplateChange?: (template: string) => void;

  styles: StickerStyle[];
  selectedStyleId: string;
  onStyleChange: (styleId: string) => void;
  onUpdateStyle: (id: string, updates: Partial<StickerStyle>) => void;
  onAddStyle: (style: StickerStyle) => void;
  onDeleteStyle: (id: string) => void;
  onResetStyle: (id: string) => void;

  isGenerating: boolean;
  onGenerate: () => void;
  progress: { current: number; total: number };
  buttonLabel?: string;

  consistencyMode: ConsistencyMode;
  onConsistencyModeChange: (mode: ConsistencyMode) => void;
  onSceneGenerate: (prompt: string, aspectRatio: string) => void;

  // Quota Props
  quotaUsage: number;
  quotaLimit: number;

  // API Toggle Props
  isLocalApi: boolean;
  onToggleApi: () => void;

  // Gen Config
  genConfig: GenerationConfig;
  onGenConfigChange: (config: GenerationConfig) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sourceImage, masterImage, onImageSelect, onMasterImageUpdate, onGenerateMaster, isGeneratingMaster,
  mode, onModeChange, sheetMode, onSheetModeChange, spriteActions, onSpriteActionChange,
  gridConfig, onGridConfigChange, megaSheetMode, onMegaSheetModeChange, sheetPromptTemplate, onSheetPromptTemplateChange,
  styles, selectedStyleId, onStyleChange, onUpdateStyle, onAddStyle, onDeleteStyle, onResetStyle,
  isGenerating, onGenerate, progress, buttonLabel = "Generate Stickers",
  consistencyMode, onConsistencyModeChange, onSceneGenerate,
  quotaUsage, quotaLimit, isLocalApi, onToggleApi,
  genConfig, onGenConfigChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedStyle = styles.find(s => s.id === selectedStyleId) || styles[0];

  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [sheetVersions, setSheetVersions] = useState<PromptVersion[]>([]);
  const [newSheetVersionName, setNewSheetVersionName] = useState('');
  const [isSavingSheetVersion, setIsSavingSheetVersion] = useState(false);
  const [viewPromptAsJson, setViewPromptAsJson] = useState(false);

  // Local URL State
  const [localTunnelUrl, setLocalTunnelUrl] = useState("https://summit-product-arrested-crew.trycloudflare.com");
  const [isUrlDirty, setIsUrlDirty] = useState(false);

  // Settings Overlay State
  const [showGenSettings, setShowGenSettings] = useState(false);

  useEffect(() => {
    try {
      const savedStyles = localStorage.getItem('stickerGen_promptVersions');
      if (savedStyles) setPromptVersions(JSON.parse(savedStyles));
      const savedSheets = localStorage.getItem('stickerGen_sheetPromptVersions');
      if (savedSheets) setSheetVersions(JSON.parse(savedSheets));

      const savedUrl = localStorage.getItem('stickerGen_localUrl');
      if (savedUrl) {
        setLocalTunnelUrl(savedUrl);
        setLocalBaseUrl(savedUrl);
      }
    } catch (e) { console.error('Failed to load versions', e); }
  }, []);

  useEffect(() => { localStorage.setItem('stickerGen_promptVersions', JSON.stringify(promptVersions)); }, [promptVersions]);
  useEffect(() => { localStorage.setItem('stickerGen_sheetPromptVersions', JSON.stringify(sheetVersions)); }, [sheetVersions]);

  const handleUploadClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { onImageSelect(reader.result as string); onMasterImageUpdate(null); };
      reader.readAsDataURL(file);
    }
  };

  const currentStyleVersions = promptVersions.filter(v => v.id.startsWith(selectedStyleId));
  const handleSaveVersion = () => {
    if (!newVersionName.trim()) return;
    const newVersion: PromptVersion = { id: `${selectedStyleId}_${Date.now()}`, name: newVersionName, prompt: selectedStyle.prompt, timestamp: Date.now() };
    setPromptVersions(prev => [newVersion, ...prev]); setNewVersionName(''); setIsSavingVersion(false);
  };
  const handleLoadVersion = (v: PromptVersion) => { onUpdateStyle(selectedStyleId, { prompt: v.prompt }); };
  const handleDeleteVersion = (versionId: string, e: React.MouseEvent) => { e.stopPropagation(); setPromptVersions(prev => prev.filter(v => v.id !== versionId)); };

  const handleSaveSheetVersion = () => {
    if (!newSheetVersionName.trim() || !sheetPromptTemplate) return;
    const newVersion: PromptVersion = { id: `sheet_${Date.now()}`, name: newSheetVersionName, prompt: sheetPromptTemplate, timestamp: Date.now() };
    setSheetVersions(prev => [newVersion, ...prev]); setNewSheetVersionName(''); setIsSavingSheetVersion(false);
  };
  const handleLoadSheetVersion = (v: PromptVersion) => { if (onSheetPromptTemplateChange) onSheetPromptTemplateChange(v.prompt); };
  const handleDeleteSheetVersion = (versionId: string, e: React.MouseEvent) => { e.stopPropagation(); setSheetVersions(prev => prev.filter(v => v.id !== versionId)); };

  const handleDuplicate = () => {
    const newStyle: StickerStyle = { id: Math.random().toString(36).substr(2, 9), name: `${selectedStyle.name} (Copy)`, prompt: selectedStyle.prompt };
    onAddStyle(newStyle);
  };

  const isDefaultStyle = STYLES.some(s => s.id === selectedStyleId);
  const handlePresetSelect = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => { onImageSelect(reader.result as string); onMasterImageUpdate(null); };
      reader.readAsDataURL(blob);
    } catch (e) { console.error("Error loading preset", e); }
  };

  const renderDesignBrief = () => {
    const activeActions = spriteActions.filter(a => a.enabled !== false);
    const motionDesc = GET_MOTION_DESCRIPTION(sheetMode);
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="font-bold text-gray-800 uppercase tracking-wide">Design Brief</h3>
            <p className="text-gray-500 text-[10px]">Specification for AI Generation</p>
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">1. Layout Spec</h4>
          <div className="bg-white p-2 rounded border border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold rounded">{gridConfig.rows}x{gridConfig.cols}</div>
            <div>
              <div className="text-gray-800 font-bold">{gridConfig.rows * gridConfig.cols} Total Frames</div>
              <div className="text-gray-400 text-[10px]">Grid Layout • Isolated Background</div>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">2. Motion Logic</h4>
          <div className="bg-white p-2 rounded border border-gray-100">
            <div className="text-gray-800 font-bold mb-1 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] uppercase">{sheetMode}</span> Mode
            </div>
            <p className="text-gray-500 leading-relaxed text-[10px]">"{motionDesc}"</p>
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">3. Action Sequence</h4>
          <div className="bg-white p-2 rounded border border-gray-100 max-h-[150px] overflow-y-auto custom-scrollbar">
            <ul className="space-y-2">
              {activeActions.map((action, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gray-300 font-bold w-3">{i + 1}.</span>
                  <div><span className="text-gray-800 font-bold block">{action.label}</span><span className="text-gray-400">{action.description.substring(0, 50)}{action.description.length > 50 && '...'}</span></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">4. Art Direction</h4>
          <div className="bg-white p-2 rounded border border-gray-100"><span className="text-gray-800 font-bold">{selectedStyle.name}</span></div>
        </div>
      </div>
    );
  };

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  // Quota Visualization Logic
  const quotaPercent = Math.min((quotaUsage / quotaLimit) * 100, 100);
  const isQuotaHigh = quotaPercent > 80;

  return (
    <div className="w-full flex-shrink-0 flex flex-col bg-white h-full relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 md:pb-6">

        {/* Header with Quota/Config Widget */}
        <div className="flex-shrink-0 flex items-start justify-between relative z-40">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><span className="text-2xl">✨</span> StickerGen AI</h1>
            <p className="text-sm text-gray-500 mt-1">Character & Asset Generator</p>
          </div>

          {/* QUOTA / CONFIG WIDGET */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 w-32 flex flex-col gap-1 shadow-sm relative">
            <div className="flex justify-between items-center text-[9px] uppercase font-bold text-gray-400 tracking-wider">
              <span>{isLocalApi ? 'Local API' : 'Cloud API'}</span>
              <button
                onClick={() => setShowGenSettings(!showGenSettings)}
                className={`hover:text-indigo-600 transition-colors p-0.5 rounded ${showGenSettings ? 'text-indigo-600 bg-indigo-50' : ''}`}
                title="Configure API Parameters"
              >
                ⚙️
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isLocalApi ? 'bg-orange-500' : (isQuotaHigh ? 'bg-red-500' : 'bg-indigo-500')}`}
                style={{ width: `${quotaPercent}%` }}
              ></div>
            </div>

            {/* API Toggle Button */}
            <button
              onClick={onToggleApi}
              className={`w-full mt-1 text-[8px] font-bold py-1 rounded border transition-all flex items-center justify-center gap-1 ${isLocalApi ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
              title={isLocalApi ? "Switch to Cloud API" : "Switch to Local API"}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isLocalApi ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>
              {isLocalApi ? 'Local Mode' : 'Switch Local'}
            </button>

            {/* SETTINGS OVERLAY */}
            {showGenSettings && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 animate-fade-in origin-top-right">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">Generation Config</h4>

                <div className="space-y-3">
                  {/* Model Select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600">Model</label>
                    <select
                      value={genConfig.model}
                      onChange={(e) => onGenConfigChange({ ...genConfig, model: e.target.value })}
                      className="w-full text-[10px] p-1.5 border border-gray-200 rounded bg-gray-50 outline-none"
                    >
                      <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Best)</option>
                      <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                    </select>
                  </div>

                  {/* Image Size */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600">Resolution</label>
                    <div className="flex gap-1 bg-gray-50 p-1 rounded border border-gray-200">
                      {['1K', '2K', '4K'].map((size) => (
                        <button
                          key={size}
                          onClick={() => onGenConfigChange({ ...genConfig, imageSize: size as any })}
                          className={`flex-1 py-1 rounded text-[10px] font-bold ${genConfig.imageSize === size ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-gray-600">Creativity (Temp)</label>
                      <span className="text-[10px] text-gray-400">{genConfig.temperature}</span>
                    </div>
                    <input
                      type="range" min="0" max="2" step="0.1"
                      value={genConfig.temperature}
                      onChange={(e) => onGenConfigChange({ ...genConfig, temperature: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Seed */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600">Seed (Optional)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Random"
                        value={genConfig.seed !== undefined ? genConfig.seed : ''}
                        onChange={(e) => onGenConfigChange({ ...genConfig, seed: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="flex-1 text-[10px] p-1.5 border border-gray-200 rounded bg-gray-50 outline-none w-full"
                      />
                      <button
                        onClick={() => onGenConfigChange({ ...genConfig, seed: Math.floor(Math.random() * 999999) })}
                        className="px-2 bg-gray-100 rounded hover:bg-gray-200 text-[10px]"
                        title="Randomize"
                      >
                        🎲
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Local API Config URL Input */}
        {isLocalApi && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 animate-fade-in -mt-2">
            <label className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block mb-1">
              Local Tunnel URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localTunnelUrl}
                onChange={(e) => {
                  setLocalTunnelUrl(e.target.value);
                  setIsUrlDirty(true);
                }}
                className="flex-1 text-[10px] px-2 py-1.5 border border-orange-200 rounded text-gray-600 focus:border-orange-500 outline-none font-mono"
                placeholder="https://..."
              />
              <button
                onClick={() => {
                  setLocalBaseUrl(localTunnelUrl);
                  localStorage.setItem('stickerGen_localUrl', localTunnelUrl);
                  setIsUrlDirty(false);
                }}
                disabled={!isUrlDirty}
                className={`text-[10px] font-bold px-3 rounded transition-colors ${isUrlDirty ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600' : 'bg-orange-200 text-orange-400'}`}
              >
                {isUrlDirty ? 'SAVE' : 'OK'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-100 p-1 rounded-lg flex gap-1 flex-shrink-0">
          {['pack', 'sheet', 'widget', 'scene'].map(m => (
            <button key={m} onClick={() => onModeChange(m as GenerationMode)} className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all uppercase ${mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {m === 'pack' ? 'Pack' : m === 'sheet' ? 'Sprite' : m === 'widget' ? 'Widget' : 'Scene'}
            </button>
          ))}
        </div>

        {mode === 'scene' ? (
          <SceneGeneratorInputs onGenerate={onSceneGenerate} isGenerating={isGenerating} />
        ) : (
          <>
            <div className="space-y-3 flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject Source</label>
              <div className="flex flex-row gap-3 items-start">
                <div onClick={handleUploadClick} className={`relative w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-dashed transition-all cursor-pointer group bg-gray-50 ${sourceImage ? 'border-indigo-100' : 'border-gray-300 hover:border-indigo-400'}`}>
                  {sourceImage ? (
                    <>
                      <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-[10px] text-center p-1">Change</div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform"><svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                      <p className="text-[10px] font-medium text-gray-700">Upload</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {PRESET_IMAGES.map((preset) => (
                      <button key={preset.id} onClick={() => handlePresetSelect(preset.url)} className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-500 transition-all opacity-80 hover:opacity-100 relative group bg-gray-50">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Error'; // Fallback
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {sourceImage && (
              <div className="animate-fade-in space-y-3 pt-3 border-t border-gray-100">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consistency Strategy</label>
                  <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                    {['reference', 'first_result'].map(m => (
                      <button key={m} onClick={() => onConsistencyModeChange(m as ConsistencyMode)} className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all ${consistencyMode === m ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}>{m === 'reference' ? 'Mode A: Ref Image' : 'Mode B: First Result'}</button>
                    ))}
                  </div>
                </div>
                {consistencyMode === 'reference' && (
                  <div className="flex gap-3 items-center pt-2 animate-fade-in">
                    <div className="flex-1">
                      {!masterImage ? (
                        <button onClick={onGenerateMaster} disabled={isGeneratingMaster} className={`w-full py-3 border-2 border-indigo-100 bg-indigo-50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-indigo-100 transition-colors ${isGeneratingMaster ? 'opacity-50' : ''}`}>
                          {isGeneratingMaster ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl">✨</span>}
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">{isGeneratingMaster ? 'Refining...' : 'Create Master Ref'}</span>
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-[10px] text-green-700 flex items-start gap-2"><span className="text-sm">✅</span><div className="leading-tight"><strong>Master Active.</strong> <br />Using generated reference sheet.</div></div>
                          <button onClick={onGenerateMaster} className="text-[10px] text-indigo-600 font-bold underline">Regenerate Master</button>
                        </div>
                      )}
                    </div>
                    <div className={`w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 border-2 overflow-hidden ${masterImage ? 'border-green-400' : 'border-gray-200'}`}>
                      {masterImage ? <img src={masterImage} className="w-full h-full object-contain bg-white" alt="Master" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">?</div>}
                    </div>
                  </div>
                )}
                {consistencyMode === 'first_result' && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] text-blue-700 flex items-start gap-2 animate-fade-in"><span className="text-sm">ℹ️</span><div className="leading-tight"><strong>Daisy Chain Mode.</strong> <br />The first item becomes the reference for others.</div></div>}
              </div>
            )}

            {/* Specific UI for Widget Mode */}
            {mode === 'widget' && (
              <div className="animate-fade-in border-t border-b border-gray-100 py-4 flex-shrink-0 space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <h4 className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Widget Mode</h4>
                    <p className="text-[10px] text-orange-700 leading-relaxed mt-1">
                      Generates 8 high-impact, expressive illustrations designed for <strong>iOS Small (Square) Widgets</strong>.
                      <br /><strong>Style:</strong> Solid background, center composition, 20% safe padding.
                    </p>
                  </div>
                </div>

                {/* Scenario List */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Widget Scenarios</label>
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {WIDGET_SCENARIOS.map((scenario, idx) => (
                      <div key={idx} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{scenario.emoji}</span>
                          <span className="text-[10px] font-bold text-gray-800 uppercase">{scenario.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                          {scenario.prompt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mode === 'sheet' && (
              <div className="space-y-4 animate-fade-in border-t border-b border-gray-100 py-4 flex-shrink-0">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Animation Type</label>
                  <div className="grid grid-cols-4 gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    {['idle', 'emote', 'action', 'ui'].map(m => (
                      <button
                        key={m}
                        onClick={() => onSheetModeChange(m as SheetMode)}
                        className={`text-[9px] py-2 rounded-md font-medium transition-all capitalize ${sheetMode === m ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        {m === 'ui' ? 'UI States' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MEGA SHEET MODE TOGGLE */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sheet Mode</label>
                  <div className="bg-gray-50 p-1 rounded-lg flex gap-1 border border-gray-200">
                    <button
                      onClick={() => onMegaSheetModeChange(false)}
                      className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold transition-all ${!megaSheetMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Multi-Sheet
                      <span className="block text-[8px] font-normal opacity-70">1 sheet per action</span>
                    </button>
                    <button
                      onClick={() => onMegaSheetModeChange(true)}
                      className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold transition-all ${megaSheetMode ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      🎬 Mega Sheet
                      <span className="block text-[8px] font-normal opacity-70">All in 1 image (8×N)</span>
                    </button>
                  </div>
                  {megaSheetMode && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-[10px] text-orange-700 flex items-start gap-2 animate-fade-in">
                      <span>⚠️</span>
                      <span>Max 7 actions per sheet. Grid: 8 cols × N rows (1 row per action)</span>
                    </div>
                  )}
                </div>

                {!megaSheetMode && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grid Layout</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><span className="text-[10px] text-gray-400 font-medium">Rows</span><input type="number" min="1" max="6" value={gridConfig.rows} onChange={(e) => onGridConfigChange({ ...gridConfig, rows: parseInt(e.target.value) || 2 })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                      <div className="space-y-1"><span className="text-[10px] text-gray-400 font-medium">Cols</span><input type="number" min="1" max="6" value={gridConfig.cols} onChange={(e) => onGridConfigChange({ ...gridConfig, cols: parseInt(e.target.value) || 2 })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                    </div>
                  </div>
                )}
                <details className="text-xs text-gray-500 cursor-pointer" open>
                  <summary className="font-semibold uppercase hover:text-indigo-600">Edit Sheet Labels ({spriteActions.length})</summary>
                  <div className="grid grid-cols-1 gap-4 mt-3 pl-1">
                    {spriteActions.map((action, idx) => (
                      <div key={idx} className={`flex flex-col gap-1 border-l-2 pl-2 transition-all ${action.enabled !== false ? 'border-indigo-100' : 'border-gray-200 opacity-50'}`}>
                        <div className="flex items-center gap-2"><input type="checkbox" checked={action.enabled !== false} onChange={(e) => onSpriteActionChange(idx, { enabled: e.target.checked })} className="w-3 h-3 text-indigo-600 rounded" /><span className="text-[10px] font-bold text-gray-400 w-3">{idx + 1}</span><input type="text" value={action.label} disabled={action.enabled === false} onChange={(e) => onSpriteActionChange(idx, { label: e.target.value })} className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold" /></div>
                        <textarea value={action.description} disabled={action.enabled === false} onChange={(e) => onSpriteActionChange(idx, { description: e.target.value })} className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] h-14" />
                      </div>
                    ))}
                  </div>
                </details>
                {onSheetPromptTemplateChange && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{viewPromptAsJson ? "Prompt JSON" : "Strategy"}</label>
                      <button onClick={() => setViewPromptAsJson(!viewPromptAsJson)} className="text-[10px] text-gray-400 hover:text-indigo-600 font-medium bg-gray-100 px-2 py-1 rounded">{viewPromptAsJson ? "Show Brief" : "Edit JSON"}</button>
                    </div>
                    {!viewPromptAsJson ? renderDesignBrief() : <textarea value={sheetPromptTemplate} onChange={(e) => onSheetPromptTemplateChange(e.target.value)} className="w-full h-[300px] text-[10px] text-green-400 bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono" />}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 flex-shrink-0 pb-4">
              <div className="flex items-center justify-between"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Art Style</label><button onClick={handleDuplicate} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">New</button></div>
              <div className="flex flex-wrap gap-2">
                {styles.map(style => (<button key={style.id} onClick={() => onStyleChange(style.id)} disabled={isGenerating} className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${selectedStyleId === style.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{style.name}</button>))}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col gap-2">
                <textarea value={selectedStyle.prompt} onChange={(e) => onUpdateStyle(selectedStyle.id, { prompt: e.target.value })} className="w-full h-[200px] text-[10px] text-gray-600 bg-white border border-gray-200 rounded-lg p-2 font-mono leading-relaxed" disabled={isGenerating} />
              </div>
            </div>
          </>
        )}
      </div>

      {mode !== 'scene' && sourceImage && (
        <div className="fixed md:absolute bottom-16 md:bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white flex-shrink-0 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.1)]">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`
              w-full py-4 px-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 active:scale-95 relative overflow-hidden
              ${isGenerating ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}
            `}
          >
            {/* Progress Bar Background */}
            {isGenerating && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center gap-3">
              {isGenerating && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
              <span className="uppercase tracking-widest text-xs">
                {isGenerating ? `Processing (${progress.current}/${progress.total})...` : buttonLabel}
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
