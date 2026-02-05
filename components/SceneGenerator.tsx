
import React, { useState, useEffect, useRef } from 'react';
import {
    SCENE_LOCATIONS, SCENE_ELEMENTS, SCENE_TIMES, SCENE_SEASONS,
    INTERIOR_SLOTS,
    VEHICLE_TYPES,
    OUTDOOR_ELEMENTS,
    MINIATURE_THEMES, DEFAULT_WORLD_CITIES,
    SCENE_ASPECT_RATIOS,
    ACNH_SCENE_CONTENT_TEMPLATE, ACNH_SCENE_STYLE_TEMPLATE,
    ACNH_SCENE_BARREN_CONTENT_TEMPLATE, ACNH_SCENE_BARREN_STYLE_TEMPLATE,
    ACNH_FURNITURE_CONTENT_TEMPLATE, ACNH_FURNITURE_STYLE_TEMPLATE,
    ACNH_VEHICLE_CONTENT_TEMPLATE, ACNH_VEHICLE_STYLE_TEMPLATE,
    ACNH_OUTDOOR_CONTENT_TEMPLATE, ACNH_OUTDOOR_STYLE_TEMPLATE,
    MINIATURE_DIORAMA_CONTENT_TEMPLATE, MINIATURE_DIORAMA_STYLE_TEMPLATE,
    MINIATURE_ENCYCLOPEDIA_CONTENT_TEMPLATE, MINIATURE_ENCYCLOPEDIA_STYLE_TEMPLATE,
    MINIATURE_ICON_CONTENT_TEMPLATE, MINIATURE_ICON_STYLE_TEMPLATE,
    ICON_THEMES, ICONS_RV_TRAVEL, ICONS_OUTDOOR_CAMPING,
    UNIFIED_ELEMENT_THEMES,
    RENDER_STYLES, DEFAULT_RENDER_STYLE, RenderStyleId,
    REFERENCE_GROUPS // Import new groups constant
} from '../constants';
import { PromptVersion } from '../types';
import { generateCityEncyclopediaList, CityEncyclopediaItem } from '../services/gemini';

type SceneMode = 'landscape' | 'element' | 'miniature';
type ElementSubMode = 'furniture' | 'vehicle' | 'outdoor';
type MiniatureSubMode = 'collection' | 'encyclopedia' | 'icons';
type LandscapeVariant = 'standard' | 'barren';

interface CustomOption {
    id: string;
    name: string;
    prompt: string;
}

interface SceneGeneratorProps {
    onGenerate: (prompt: string, aspectRatio: string, referenceImages?: string[]) => void;
    isGenerating: boolean;
    onPromptChange?: (prompt: string) => void;
}

interface WorldItem {
    id: string;
    text: string;
    enabled: boolean;
}

interface EncyclopediaItem {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

interface IconItem {
    id: string;
    text: string;
    enabled: boolean;
}

const GENERIC_ENCYCLOPEDIA_DEFAULTS: { name: string; description: string }[] = [
    { name: "Famous Local Dish", description: "A signature culinary creation deeply rooted in the city's gastronomic heritage." },
    { name: "Traditional Drink", description: "A beloved beverage that captures the essence of local drinking culture." },
    { name: "Iconic Landmark Model", description: "A miniature replica of the city's most recognizable architectural symbol." },
    { name: "Public Transport Vehicle", description: "A charming representation of the city's distinctive transit system." },
    { name: "Traditional Hat/Clothing", description: "Traditional attire that reflects the city's cultural identity and craftsmanship." },
    { name: "Historic Architecture", description: "A piece showcasing the city's unique architectural heritage and design." },
    { name: "Native Flower/Plant", description: "A botanical symbol that represents the region's natural beauty." },
    { name: "Street Lamp/Sign", description: "An iconic urban element that defines the city's streetscape character." },
    { name: "Cultural Festival Item", description: "An artifact from a celebrated local festival or tradition." },
    { name: "Local Musical Instrument", description: "A traditional instrument that carries the city's musical heritage." },
    { name: "Handicraft/Pottery", description: "Artisanal craftsmanship passed down through generations." },
    { name: "Market Stall", description: "A vibrant representation of local commerce and community gathering." },
    { name: "Cute Local Animal", description: "An adorable creature symbolic of the region's wildlife." },
    { name: "Postbox/Phone Booth", description: "A nostalgic piece of urban infrastructure with historical charm." },
    { name: "Flag/Emblem", description: "Official symbols representing the city's identity and pride." },
    { name: "Cafe Set", description: "Charming tableware reflecting local café culture." },
    { name: "Bridge/Archway", description: "An architectural connection that has become a city landmark." },
    { name: "Religious/Spiritual Symbol", description: "A sacred item representing local spiritual traditions." },
    { name: "Local Dessert", description: "A sweet treat that embodies the city's confectionery traditions." },
    { name: "Vintage Map", description: "A historical cartographic treasure showing the city's evolution." },
    { name: "Travel Suitcase", description: "A classic travel companion evoking wanderlust and adventure." },
    { name: "Camera/Binoculars", description: "Essential tools for capturing and exploring the city's beauty." },
    { name: "Ticket/Passport", description: "Travel documents symbolizing journey and discovery." },
    { name: "Souvenir Magnet", description: "A collectible keepsake capturing memorable city moments." }
];

const SceneGeneratorInputs: React.FC<SceneGeneratorProps> = ({ onGenerate, isGenerating, onPromptChange }) => {
    const [mode, setMode] = useState<SceneMode>('landscape');

    // Element Sub-Mode State
    const [elementSubMode, setElementSubMode] = useState<ElementSubMode>('furniture');
    const [selectedElementThemeId, setSelectedElementThemeId] = useState(UNIFIED_ELEMENT_THEMES[0].id);

    // Landscape State
    const [selectedLocationId, setSelectedLocationId] = useState(SCENE_LOCATIONS[0].id);
    const [customLocations, setCustomLocations] = useState<CustomOption[]>([]);
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [customElement, setCustomElement] = useState('');
    const [landscapeVariant, setLandscapeVariant] = useState<LandscapeVariant>('standard');
    const [selectedTimeId, setSelectedTimeId] = useState(SCENE_TIMES[1].id);
    const [selectedSeasonId, setSelectedSeasonId] = useState(SCENE_SEASONS[0].id);

    // Render Style State (global)
    const [renderStyle, setRenderStyle] = useState<RenderStyleId>(DEFAULT_RENDER_STYLE);
    // Reference Group State
    const [selectedRefGroupId, setSelectedRefGroupId] = useState(REFERENCE_GROUPS[0].id);

    // Miniature Specific State
    const [miniatureMode, setMiniatureMode] = useState<MiniatureSubMode>('collection');

    // Icon Theme State
    const [selectedIconThemeId, setSelectedIconThemeId] = useState(ICON_THEMES[0].id);

    // Interior Slots State (for furniture mode)
    const [slotSelections, setSlotSelections] = useState<Record<string, string>>(
        Object.fromEntries(INTERIOR_SLOTS.map(slot => [slot.id, slot.options[0].id]))
    );

    // Initialize with GENERIC DEFAULTS immediately
    const [encyclopediaItems, setEncyclopediaItems] = useState<EncyclopediaItem[]>(
        GENERIC_ENCYCLOPEDIA_DEFAULTS.map((item, idx) => ({
            id: idx.toString(),
            name: item.name,
            description: item.description,
            enabled: true
        }))
    );

    const [iconItems, setIconItems] = useState<IconItem[]>(
        ICONS_RV_TRAVEL.map((item) => ({
            id: item.id,
            text: item.text,
            enabled: true
        }))
    );

    const [isGeneratingItems, setIsGeneratingItems] = useState(false);
    const [worldItems, setWorldItems] = useState<WorldItem[]>(
        DEFAULT_WORLD_CITIES.map((city, idx) => ({ id: idx.toString(), text: city, enabled: true }))
    );

    // Shared
    const [contentPrompt, setContentPrompt] = useState('');
    const [stylePrompt, setStylePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);
    const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
    const [newVersionName, setNewVersionName] = useState('');
    const [isSavingVersion, setIsSavingVersion] = useState(false);

    // Refs for tracking changes
    const lastGeneratedCityRef = useRef<string | null>(null);

    // Logic to determine available elements based on mode
    let AVAILABLE_LOCATIONS = SCENE_LOCATIONS; // Only used for Landscape/Miniature now
    if (mode === 'miniature') AVAILABLE_LOCATIONS = MINIATURE_THEMES;

    let AVAILABLE_ELEMENTS = SCENE_ELEMENTS;
    if (mode === 'element') {
        // Furniture mode now uses INTERIOR_SLOTS (handled separately)
        if (elementSubMode === 'vehicle') AVAILABLE_ELEMENTS = VEHICLE_TYPES;
        else if (elementSubMode === 'outdoor') AVAILABLE_ELEMENTS = OUTDOOR_ELEMENTS;
        else AVAILABLE_ELEMENTS = []; // furniture uses slot-based UI
    } else if (mode === 'miniature') {
        AVAILABLE_ELEMENTS = [];
    }

    const ALL_LOCATIONS = [...AVAILABLE_LOCATIONS, ...customLocations];

    const handleModeChange = (newMode: SceneMode) => {
        setMode(newMode);
        setCustomLocations([]);
        // Reset selections
        if (newMode === 'element' || newMode === 'miniature') {
            setAspectRatio('16:9'); // Default to Landscape for these modes
        } else {
            setAspectRatio('1:1'); // Default to square for landscape
        }

        if (newMode === 'element') {
            setRenderStyle('flocked');
        } else if (newMode === 'landscape') {
            setRenderStyle('standard'); // Revert to standard for landscape usually
        }

        if (newMode === 'landscape') setSelectedLocationId(SCENE_LOCATIONS[0].id);
        else if (newMode === 'miniature') setSelectedLocationId(MINIATURE_THEMES[0].id);
        else if (newMode === 'element') {
            setSelectedElementThemeId(UNIFIED_ELEMENT_THEMES[0].id);
        }

        setSelectedElementIds([]);
        setIsManuallyEdited(false);
    };

    const handleElementSubModeChange = (newSubMode: ElementSubMode) => {
        setElementSubMode(newSubMode);
        setSelectedElementIds([]);
        setIsManuallyEdited(false);
    };

    useEffect(() => {
        try {
            const savedVersions = localStorage.getItem('stickerGen_scenePromptVersions');
            if (savedVersions) setPromptVersions(JSON.parse(savedVersions));
        } catch (e) { }
    }, []);

    useEffect(() => {
        try { localStorage.setItem('stickerGen_scenePromptVersions', JSON.stringify(promptVersions)); } catch (e) { }
    }, [promptVersions]);

    // Update Icon Items when theme changes
    useEffect(() => {
        if (mode === 'miniature' && miniatureMode === 'icons') {
            const items = selectedIconThemeId === 'rv_travel' ? ICONS_RV_TRAVEL : ICONS_OUTDOOR_CAMPING;
            setIconItems(items.map(item => ({
                id: item.id,
                text: item.text,
                enabled: true
            })));
            setIsManuallyEdited(false);
        }
    }, [selectedIconThemeId, mode, miniatureMode]);

    // RESET items to defaults instantly when city changes (No waiting)
    useEffect(() => {
        if (mode === 'miniature' && miniatureMode === 'encyclopedia') {
            setEncyclopediaItems(GENERIC_ENCYCLOPEDIA_DEFAULTS.map((text, idx) => ({
                id: idx.toString(),
                text: text,
                enabled: true
            })));
        }
    }, [selectedLocationId, mode, miniatureMode]);

    // Prompt Construction Logic
    useEffect(() => {
        if (isManuallyEdited) return;

        let newContentPrompt = "";
        let newStylePrompt = "";

        if (mode === 'miniature') {
            const locationObj = ALL_LOCATIONS.find(l => l.id === selectedLocationId);
            if (miniatureMode === 'collection') {
                const enabledItems = worldItems.filter(i => i.enabled);
                const count = enabledItems.length;
                const itemListStr = enabledItems.map((item, i) => `${i + 1}. ${item.text}`).join('\n');

                newContentPrompt = MINIATURE_DIORAMA_CONTENT_TEMPLATE
                    .replace(/{{count}}/g, count.toString())
                    .replace('{{city_list}}', itemListStr || "[No cities selected]");
                newStylePrompt = MINIATURE_DIORAMA_STYLE_TEMPLATE;

            } else if (miniatureMode === 'encyclopedia') {
                const enabledItems = encyclopediaItems.filter(i => i.enabled);
                const count = enabledItems.length;
                const itemListStr = enabledItems.length > 0
                    ? enabledItems.map((item, i) => `${i + 1}. ${item.name}`).join('\n')
                    : "[Item list is empty]";

                newContentPrompt = MINIATURE_ENCYCLOPEDIA_CONTENT_TEMPLATE
                    .replace('{{city_name}}', locationObj?.name || 'City')
                    .replace('{{item_list}}', itemListStr)
                    .replace(/{{count}}/g, count.toString());
                newStylePrompt = MINIATURE_ENCYCLOPEDIA_STYLE_TEMPLATE;

            } else if (miniatureMode === 'icons') {
                const enabledItems = iconItems.filter(i => i.enabled);
                const count = enabledItems.length;
                const itemListStr = enabledItems.length > 0
                    ? enabledItems.map((item, i) => `${i + 1}. ${item.text}`).join('\n')
                    : "[Item list is empty]";

                const themeName = ICON_THEMES.find(t => t.id === selectedIconThemeId)?.name || "UI";

                newContentPrompt = MINIATURE_ICON_CONTENT_TEMPLATE
                    .replace(/{{count}}/g, count.toString())
                    .replace('{{theme_name}}', themeName)
                    .replace('{{item_list}}', itemListStr);
                newStylePrompt = MINIATURE_ICON_STYLE_TEMPLATE;
            }
        } else if (mode === 'element') {
            // UNIFIED ELEMENT LOGIC
            const themeObj = UNIFIED_ELEMENT_THEMES.find(t => t.id === selectedElementThemeId);
            const themePrompt = themeObj ? themeObj.prompt : "Standard Style";

            let elementsString = "";

            if (elementSubMode === 'furniture') {
                // Build numbered list from slot selections
                const slotItems = INTERIOR_SLOTS.map((slot, idx) => {
                    const selectedOptionId = slotSelections[slot.id];
                    const option = slot.options.find(o => o.id === selectedOptionId);
                    const itemName = option?.name || slot.options[0].name;
                    // Append category-level camera instruction if it exists
                    const instruction = slot.cameraInstruction ? ` ${slot.cameraInstruction}` : "";
                    return `${idx + 1}. ${itemName}${instruction}`;
                });
                elementsString = slotItems.join('\n');
            } else {
                const elements = selectedElementIds.map(id => AVAILABLE_ELEMENTS.find(e => e.id === id)?.name).filter(Boolean);
                if (customElement.trim()) elements.push(customElement.trim());

                if (elements.length > 0) {
                    if (elementSubMode === 'vehicle') elementsString = elements.map((e, i) => `${i + 1}. ${e}`).join('\n');
                    else elementsString = elements.join(", ");
                } else {
                    if (elementSubMode === 'vehicle') elementsString = "A variety of 4 distinct vehicles";
                    else if (elementSubMode === 'outdoor') elementsString = "A mix of outdoor structures and furniture";
                }
            }

            if (elementSubMode === 'furniture') {
                newContentPrompt = ACNH_FURNITURE_CONTENT_TEMPLATE;
                newStylePrompt = ACNH_FURNITURE_STYLE_TEMPLATE;
            } else if (elementSubMode === 'vehicle') {
                newContentPrompt = ACNH_VEHICLE_CONTENT_TEMPLATE;
                newStylePrompt = ACNH_VEHICLE_STYLE_TEMPLATE;
            } else if (elementSubMode === 'outdoor') {
                newContentPrompt = ACNH_OUTDOOR_CONTENT_TEMPLATE;
                newStylePrompt = ACNH_OUTDOOR_STYLE_TEMPLATE;
            }

            // Replace placeholders with Unified Theme info
            newContentPrompt = newContentPrompt.replace('{{location}}', themePrompt).replace('{{theme}}', themePrompt);
            newContentPrompt = newContentPrompt.replace('{{elements}}', elementsString);

        } else {
            // Landscape Mode
            const locationObj = ALL_LOCATIONS.find(l => l.id === selectedLocationId);
            const elements = selectedElementIds.map(id => AVAILABLE_ELEMENTS.find(e => e.id === id)?.name).filter(Boolean);
            if (customElement.trim()) elements.push(customElement.trim());

            let elementsString = elements.length > 0 ? elements.join(", ") : "minimal decoration";

            newContentPrompt = landscapeVariant === 'barren' ? ACNH_SCENE_BARREN_CONTENT_TEMPLATE : ACNH_SCENE_CONTENT_TEMPLATE;
            newStylePrompt = landscapeVariant === 'barren' ? ACNH_SCENE_BARREN_STYLE_TEMPLATE : ACNH_SCENE_STYLE_TEMPLATE;

            newContentPrompt = newContentPrompt.replace('{{location}}', locationObj?.prompt || locationObj?.name || 'standard style');
            newContentPrompt = newContentPrompt.replace('{{elements}}', elementsString);

            const timeObj = SCENE_TIMES.find(t => t.id === selectedTimeId);
            const seasonObj = SCENE_SEASONS.find(s => s.id === selectedSeasonId);
            let atmosphereParts = [];
            if (timeObj) atmosphereParts.push(timeObj.prompt);
            if (seasonObj) atmosphereParts.push(seasonObj.prompt);
            const lightingPrompt = atmosphereParts.length > 0 ? atmosphereParts.join(" ") : "Beautiful, atmospheric lighting.";
            newStylePrompt = newStylePrompt.replace('{{lighting}}', lightingPrompt);
        }

        // Get render style material prompt
        const renderStyleObj = RENDER_STYLES.find(s => s.id === renderStyle);
        const materialPrompt = renderStyleObj?.materialPrompt || '';

        // UI Update: Update content prompt regardless of style
        setContentPrompt(newContentPrompt);

        // UI Update: Append material style to the displayed style prompt
        // If Image Ref is selected, we REPLACE the style prompt with the specific instructions to avoid conflict
        if (renderStyle === 'image_ref') {
            setStylePrompt(materialPrompt);
            const fullPrompt = `${newContentPrompt}\n\n${materialPrompt}`;
            if (onPromptChange) onPromptChange(fullPrompt);
        } else {
            setStylePrompt(`${newStylePrompt}\n\n${materialPrompt}`);
            const fullPrompt = `${newContentPrompt}\n\n${newStylePrompt}\n\n${materialPrompt}`;
            if (onPromptChange) onPromptChange(fullPrompt);
        }

    }, [mode, elementSubMode, selectedElementThemeId, selectedLocationId, selectedElementIds, customElement, isManuallyEdited, customLocations, landscapeVariant, selectedTimeId, selectedSeasonId, miniatureMode, encyclopediaItems, worldItems, iconItems, selectedIconThemeId, slotSelections, renderStyle]);

    const toggleElement = (id: string) => {
        if (mode === 'element' && elementSubMode === 'vehicle' && selectedElementIds.length >= 6 && !selectedElementIds.includes(id)) return;
        setSelectedElementIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
        setIsManuallyEdited(false);
    };

    const handleGenerateClick = async () => {
        if (mode === 'miniature' && miniatureMode === 'encyclopedia' && encyclopediaItems.filter(i => i.enabled).length === 0) {
            alert("Please check at least one item!");
            return;
        }

        if (!contentPrompt || !stylePrompt) return;

        const fullPrompt = `
${contentPrompt}

${stylePrompt}
`.trim();

        // Image Ref Logic
        let refImages: string[] = [];
        if (renderStyle === 'image_ref') {
            const targetGroup = REFERENCE_GROUPS.find(g => g.id === selectedRefGroupId) || REFERENCE_GROUPS[0];
            console.log(`Image Ref Style: Using group '${targetGroup.name}'`);
            try {
                const imagePromises = targetGroup.images.map(async (path) => {
                    const response = await fetch(path);
                    const blob = await response.blob();
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                });
                refImages = await Promise.all(imagePromises);
                console.log(`Fetched ${refImages.length} reference images.`);
            } catch (error) {
                console.error("Failed to fetch reference images", error);
            }
        }

        onGenerate(fullPrompt, aspectRatio, refImages);
    };

    const handleGenerateEncyclopediaItems = async (cityNameOverride?: string) => {
        const locationObj = ALL_LOCATIONS.find(l => l.id === selectedLocationId);
        const cityToUse = cityNameOverride || locationObj?.name;

        if (!cityToUse) return;

        setIsGeneratingItems(true);

        try {
            const items = await generateCityEncyclopediaList(cityToUse);
            const formattedItems = items.map((item, idx) => ({
                id: idx.toString(),
                name: item.name,
                description: item.description,
                enabled: true
            }));
            setEncyclopediaItems(formattedItems);
            lastGeneratedCityRef.current = cityToUse;
            setIsManuallyEdited(false);
        } catch (error) {
            console.error("Failed to generate items", error);
        } finally {
            setIsGeneratingItems(false);
        }
    };

    const handleEncyclopediaItemChange = (index: number, field: 'name' | 'description', newValue: string) => {
        const newItems = [...encyclopediaItems];
        newItems[index] = { ...newItems[index], [field]: newValue };
        setEncyclopediaItems(newItems);
        setIsManuallyEdited(false);
    };

    const toggleEncyclopediaItem = (index: number) => {
        const newItems = [...encyclopediaItems];
        newItems[index] = { ...newItems[index], enabled: !newItems[index].enabled };
        setEncyclopediaItems(newItems);
        setIsManuallyEdited(false);
    };

    const toggleAllEncyclopediaItems = (enable: boolean) => {
        const newItems = encyclopediaItems.map(item => ({ ...item, enabled: enable }));
        setEncyclopediaItems(newItems);
        setIsManuallyEdited(false);
    };

    // Download Encyclopedia as Markdown
    const handleDownloadMarkdown = () => {
        const locationObj = ALL_LOCATIONS.find(l => l.id === selectedLocationId);
        const cityName = locationObj?.name || 'Encyclopedia';
        const enabledItems = encyclopediaItems.filter(i => i.enabled);

        let markdown = `# ${cityName} Encyclopedia\n\n`;
        markdown += `> Generated on ${new Date().toLocaleDateString()}\n\n`;
        markdown += `---\n\n`;

        enabledItems.forEach((item, idx) => {
            markdown += `## ${idx + 1}. ${item.name}\n\n`;
            markdown += `${item.description}\n\n`;
        });

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${cityName.toLowerCase().replace(/\s+/g, '-')}-encyclopedia.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Icon Items Handlers
    const handleIconItemChange = (index: number, newValue: string) => {
        const newItems = [...iconItems];
        newItems[index] = { ...newItems[index], text: newValue };
        setIconItems(newItems);
        setIsManuallyEdited(false);
    };

    const toggleIconItem = (index: number) => {
        const newItems = [...iconItems];
        newItems[index] = { ...newItems[index], enabled: !newItems[index].enabled };
        setIconItems(newItems);
        setIsManuallyEdited(false);
    };

    const toggleAllIconItems = (enable: boolean) => {
        const newItems = iconItems.map(item => ({ ...item, enabled: enable }));
        setIconItems(newItems);
        setIsManuallyEdited(false);
    };

    const toggleWorldItem = (idx: number) => {
        const newItems = [...worldItems];
        newItems[idx].enabled = !newItems[idx].enabled;
        setWorldItems(newItems);
        setIsManuallyEdited(false);
    };

    const updateWorldItemText = (idx: number, text: string) => {
        const newItems = [...worldItems];
        newItems[idx].text = text;
        setWorldItems(newItems);
        setIsManuallyEdited(false);
    };

    const toggleAllWorldItems = (enable: boolean) => {
        const newItems = worldItems.map(item => ({ ...item, enabled: enable }));
        setWorldItems(newItems);
        setIsManuallyEdited(false);
    }

    const handleSaveVersion = () => {
        if (!newVersionName.trim()) return;
        const fullPrompt = `${contentPrompt}\n\n${stylePrompt}`;
        setPromptVersions(prev => [{ id: `scene_${Date.now()}`, name: newVersionName, prompt: fullPrompt, timestamp: Date.now() }, ...prev]);
        setNewVersionName(''); setIsSavingVersion(false);
    };

    const handleLoadVersion = (v: PromptVersion) => {
        const parts = v.prompt.split('\n\n**[Visual Style Definition]**');
        if (parts.length === 2) {
            setContentPrompt(parts[0]);
            setStylePrompt('**[Visual Style Definition]**' + parts[1]);
        } else {
            setContentPrompt(v.prompt);
            setStylePrompt('');
        }
        setIsManuallyEdited(true);
    };

    return (
        <div className="space-y-6">
            {/* Configuration Controls */}
            <div className="space-y-6">

                {/* Title & Mode Switcher */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">
                            {mode === 'landscape' ? '🏝️' : (mode === 'element' ? '🧩' : '🏛️')}
                        </span>
                        Scene & Assets
                    </h2>

                    {/* MAIN TABS */}
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                        {['landscape', 'element', 'miniature'].map(m => (
                            <button
                                key={m}
                                onClick={() => handleModeChange(m as SceneMode)}
                                className={`flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wide px-1 ${mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                title={m}
                            >
                                {m === 'element' ? 'Elements' : (m === 'miniature' ? 'Miniature' : m)}
                            </button>
                        ))}
                    </div>

                    {/* RENDER STYLE TOGGLE - Global */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Render Style</label>
                        <div className="flex gap-2">
                            {RENDER_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => { setRenderStyle(style.id); setIsManuallyEdited(false); }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all border ${renderStyle === style.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    {style.emoji} {style.name}
                                </button>
                            ))}
                        </div>

                        {/* Reference Image Preview (Image Ref Mode Only) */}
                        {renderStyle === 'image_ref' && (
                            <div className="mt-2 animate-fade-in bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                                <label className="text-[9px] font-bold text-indigo-500 uppercase flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1">
                                        <span>Reference Group</span>
                                        <span className="text-[8px] bg-indigo-200 px-1 rounded text-indigo-700">AUTO-FETCH</span>
                                    </div>
                                    {/* Group Switcher */}
                                    <select
                                        value={selectedRefGroupId}
                                        onChange={(e) => setSelectedRefGroupId(e.target.value)}
                                        className="text-[10px] border border-indigo-200 rounded px-1 py-0.5 bg-white text-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        {REFERENCE_GROUPS.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </label>

                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {(REFERENCE_GROUPS.find(g => g.id === selectedRefGroupId)?.images || []).map((img, idx) => (
                                        <div key={idx} className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border border-indigo-200 shadow-sm group">
                                            <img src={img} alt="Ref" className="w-full h-full object-cover" />
                                            {/* Hover Zoom */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MINIATURE MODE UI --- */}
                {mode === 'miniature' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Sub-Mode Switcher */}
                        <div className="flex gap-4 border-b border-gray-200 pb-2">
                            <button
                                onClick={() => { setMiniatureMode('collection'); setIsManuallyEdited(false); }}
                                className={`text-xs font-bold uppercase tracking-wide pb-2 border-b-2 transition-colors ${miniatureMode === 'collection' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                🌍 World Collection
                            </button>
                            <button
                                onClick={() => { setMiniatureMode('encyclopedia'); setIsManuallyEdited(false); }}
                                className={`text-xs font-bold uppercase tracking-wide pb-2 border-b-2 transition-colors ${miniatureMode === 'encyclopedia' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                📖 City Encyclopedia
                            </button>
                            <button
                                onClick={() => { setMiniatureMode('icons'); setIsManuallyEdited(false); }}
                                className={`text-xs font-bold uppercase tracking-wide pb-2 border-b-2 transition-colors ${miniatureMode === 'icons' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                💎 UI Icons
                            </button>
                        </div>

                        {miniatureMode === 'collection' && (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-2">
                                    <span className="text-2xl">🏙️</span>
                                    <div>
                                        <h3 className="text-sm font-bold text-indigo-900">Configurable City Vignettes</h3>
                                        <p className="text-xs text-indigo-700">Toggle items to generate a custom set (e.g., 3, 9, or 12). Edit text to change cities.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => toggleAllWorldItems(true)} className="text-[10px] text-indigo-600 font-bold hover:underline">Select All</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={() => toggleAllWorldItems(false)} className="text-[10px] text-gray-500 font-bold hover:underline">Clear</button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {worldItems.map((item, idx) => (
                                        <div key={item.id} className={`flex items-center gap-2 p-2 rounded-md border transition-all ${item.enabled ? 'bg-white border-indigo-100 shadow-sm' : 'bg-transparent border-transparent opacity-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={item.enabled}
                                                onChange={() => toggleWorldItem(idx)}
                                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                            />
                                            <span className="text-[10px] font-bold text-gray-400 w-4 text-center">{idx + 1}</span>
                                            <input
                                                type="text"
                                                value={item.text}
                                                onChange={(e) => updateWorldItemText(idx, e.target.value)}
                                                disabled={!item.enabled}
                                                className="flex-1 bg-transparent text-[11px] font-medium text-gray-700 outline-none border-b border-transparent focus:border-indigo-300 placeholder-gray-300"
                                                placeholder="Enter city or theme..."
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[10px] text-right text-gray-500 font-bold">
                                    Total Selected: <span className="text-indigo-600">{worldItems.filter(i => i.enabled).length}</span>
                                </div>
                            </div>
                        )}

                        {miniatureMode === 'encyclopedia' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Select City</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ALL_LOCATIONS.map(loc => (
                                            <button key={loc.id} onClick={() => { setSelectedLocationId(loc.id); setIsManuallyEdited(false); }} className={`p-2 text-left rounded-lg border transition-all text-[10px] font-medium truncate ${selectedLocationId === loc.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-700'}`}>{loc.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                                            {isGeneratingItems ? 'Generating Item List...' : 'Review & Edit Items'}
                                        </label>
                                        <div className="flex gap-3">
                                            <div className="flex gap-2 items-center">
                                                <button onClick={() => toggleAllEncyclopediaItems(true)} className="text-[10px] text-gray-400 hover:text-indigo-600 font-bold">All</button>
                                                <span className="text-gray-300 text-[10px]">|</span>
                                                <button onClick={() => toggleAllEncyclopediaItems(false)} className="text-[10px] text-gray-400 hover:text-indigo-600 font-bold">None</button>
                                            </div>
                                            <button
                                                onClick={() => handleGenerateEncyclopediaItems()}
                                                disabled={isGeneratingItems}
                                                className="text-[10px] text-indigo-600 font-bold underline disabled:opacity-50"
                                            >
                                                {isGeneratingItems ? 'Loading...' : '✨ Generate Tailored List (AI)'}
                                            </button>
                                        </div>
                                    </div>

                                    {isGeneratingItems && encyclopediaItems.length === 0 ? (
                                        <div className="p-8 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
                                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                                            <span className="text-[10px] text-gray-500 font-medium">Drafting 24 Items with Descriptions...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {encyclopediaItems.map((item, idx) => (
                                                    <div key={idx} className={`p-2 rounded-lg border transition-colors ${item.enabled ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-100 opacity-50'}`}>
                                                        <div className="flex gap-2 items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.enabled}
                                                                onChange={() => toggleEncyclopediaItem(idx)}
                                                                className="w-3 h-3 text-indigo-600 rounded cursor-pointer"
                                                            />
                                                            <span className="text-[9px] font-bold text-gray-400 w-4 text-right">{idx + 1}.</span>
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                disabled={!item.enabled}
                                                                onChange={(e) => handleEncyclopediaItemChange(idx, 'name', e.target.value)}
                                                                className="flex-1 bg-transparent border-none font-medium px-1 py-0.5 text-[11px] text-gray-800 focus:bg-indigo-50 rounded outline-none disabled:bg-transparent"
                                                                placeholder="Item name"
                                                            />
                                                        </div>
                                                        <div className="ml-8 mt-1">
                                                            <textarea
                                                                value={item.description}
                                                                disabled={!item.enabled}
                                                                onChange={(e) => handleEncyclopediaItemChange(idx, 'description', e.target.value)}
                                                                className="w-full bg-transparent border border-dashed border-gray-200 rounded px-2 py-1 text-[10px] text-gray-500 focus:border-indigo-300 focus:bg-indigo-50 outline-none resize-none disabled:bg-transparent disabled:border-transparent"
                                                                placeholder="Fun factual story (Markdown only)"
                                                                rows={2}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                {encyclopediaItems.length === 0 && !isGeneratingItems && (
                                                    <div className="text-center py-4 text-[10px] text-gray-400">
                                                        No items available.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="text-[10px] text-gray-500 font-bold">
                                                    Total Selected: <span className="text-indigo-600">{encyclopediaItems.filter(i => i.enabled).length}</span>
                                                </div>
                                                <button
                                                    onClick={handleDownloadMarkdown}
                                                    disabled={encyclopediaItems.filter(i => i.enabled).length === 0}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    Download .md
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {miniatureMode === 'icons' && (
                            <div className="space-y-4">
                                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex gap-2">
                                    <span className="text-2xl">💎</span>
                                    <div>
                                        <h3 className="text-sm font-bold text-orange-900">UI Icons & Game Assets</h3>
                                        <p className="text-xs text-orange-700">Generate isolated, high-quality 3D icons. Perfect for game UI, inventory, or rewards.</p>
                                    </div>
                                </div>

                                {/* Icon Theme Switcher */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Icon Theme</label>
                                    <div className="flex gap-2">
                                        {ICON_THEMES.map(theme => (
                                            <button
                                                key={theme.id}
                                                onClick={() => setSelectedIconThemeId(theme.id)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold border transition-all ${selectedIconThemeId === theme.id ? 'bg-orange-100 border-orange-500 text-orange-800' : 'bg-white border-gray-200 text-gray-600'}`}
                                            >
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                                            Configurable Icon List
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => toggleAllIconItems(true)} className="text-[10px] text-gray-400 hover:text-indigo-600 font-bold">All</button>
                                            <span className="text-gray-300 text-[10px]">|</span>
                                            <button onClick={() => toggleAllIconItems(false)} className="text-[10px] text-gray-400 hover:text-indigo-600 font-bold">None</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {iconItems.map((item, idx) => (
                                            <div key={idx} className={`flex gap-2 items-center p-1 rounded transition-colors ${item.enabled ? 'opacity-100' : 'opacity-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={item.enabled}
                                                    onChange={() => toggleIconItem(idx)}
                                                    className="w-3 h-3 text-orange-500 rounded cursor-pointer"
                                                />
                                                <span className="text-[9px] font-bold text-gray-400 w-4 text-right">{idx + 1}.</span>
                                                <input
                                                    type="text"
                                                    value={item.text}
                                                    disabled={!item.enabled}
                                                    onChange={(e) => handleIconItemChange(idx, e.target.value)}
                                                    className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-[10px] text-gray-700 focus:border-orange-500 outline-none disabled:bg-transparent disabled:border-transparent"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-right text-gray-500 font-bold">
                                        Total Selected: <span className="text-orange-600">{iconItems.filter(i => i.enabled).length}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ELEMENT MODE UI --- */}
                {mode === 'element' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Sub-Tabs for Element Type */}
                        <div className="flex gap-4 border-b border-gray-200 pb-2">
                            {['furniture', 'vehicle', 'outdoor'].map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => handleElementSubModeChange(sub as ElementSubMode)}
                                    className={`text-xs font-bold uppercase tracking-wide pb-2 border-b-2 transition-colors capitalize ${elementSubMode === sub ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>

                        {/* Unified Theme Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">1. Visual Theme</label>
                            <div className="flex flex-col gap-2">
                                {UNIFIED_ELEMENT_THEMES.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => { setSelectedElementThemeId(theme.id); setIsManuallyEdited(false); }}
                                        className={`text-left p-3 rounded-lg border transition-all ${selectedElementThemeId === theme.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-bold uppercase ${selectedElementThemeId === theme.id ? 'text-indigo-700' : 'text-gray-700'}`}>{theme.name}</span>
                                            {selectedElementThemeId === theme.id && <span className="text-indigo-600">●</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-tight">{theme.prompt.split('.')[0]}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Element Picker - Slot-based for Furniture, Tag-based for others */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">
                                2. {elementSubMode === 'furniture' ? 'Interior Elements (7 Slots)' : 'Select Items to Generate'}
                            </label>

                            {elementSubMode === 'furniture' ? (
                                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    {INTERIOR_SLOTS.map(slot => (
                                        <div key={slot.id} className="flex items-center gap-2">
                                            <span className="text-lg w-6">{slot.icon}</span>
                                            <span className="text-[10px] font-medium text-gray-600 w-20 truncate">{slot.name}</span>
                                            <select
                                                value={slotSelections[slot.id]}
                                                onChange={(e) => {
                                                    setSlotSelections(prev => ({ ...prev, [slot.id]: e.target.value }));
                                                    setIsManuallyEdited(false);
                                                }}
                                                className="flex-1 text-[11px] border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                {slot.options.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                    {AVAILABLE_ELEMENTS.map(el => (
                                        <button key={el.id} onClick={() => toggleElement(el.id)} className={`px-2 py-1 rounded-full text-[9px] font-bold transition-all border ${selectedElementIds.includes(el.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>{el.name}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- LANDSCAPE MODE UI --- */}
                {mode === 'landscape' && (
                    <div className="space-y-4">
                        {/* Landscape Variant Toggle */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Layout Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setLandscapeVariant('standard'); setIsManuallyEdited(false); }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all border ${landscapeVariant === 'standard' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    🌳 Standard
                                </button>
                                <button
                                    onClick={() => { setLandscapeVariant('barren'); setIsManuallyEdited(false); }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all border ${landscapeVariant === 'barren' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    🏜️ Barren (BG Only)
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">1. Theme / Location</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_LOCATIONS.map(loc => (
                                    <button key={loc.id} onClick={() => { setSelectedLocationId(loc.id); setIsManuallyEdited(false); }} className={`p-2 text-left rounded-lg border transition-all text-[10px] font-medium truncate ${selectedLocationId === loc.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-700'}`}>{loc.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">2. Elements</label>
                            <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_ELEMENTS.map(el => (
                                    <button key={el.id} onClick={() => toggleElement(el.id)} className={`px-2 py-1 rounded-full text-[9px] font-bold transition-all border ${selectedElementIds.includes(el.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>{el.name}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Atmosphere & Season (Only Landscape) */}
                {mode === 'landscape' && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">3. Atmosphere & Season</label>

                        {/* Time of Day */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {SCENE_TIMES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { setSelectedTimeId(t.id); setIsManuallyEdited(false); }}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedTimeId === t.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    <span>{t.emoji}</span> {t.name}
                                </button>
                            ))}
                        </div>

                        {/* Season */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {SCENE_SEASONS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setSelectedSeasonId(s.id); setIsManuallyEdited(false); }}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedSeasonId === s.id ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    <span>{s.emoji}</span> {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-400 uppercase">Aspect Ratio</label></div>
                    <div className="flex gap-2">
                        {SCENE_ASPECT_RATIOS.map(ratio => (
                            <button key={ratio.id} onClick={() => setAspectRatio(ratio.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition-all ${aspectRatio === ratio.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>{ratio.icon} {ratio.name.split(' ')[0]}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Prompt Configuration</label>
                        <button onClick={() => setIsSavingVersion(!isSavingVersion)} className="text-[10px] text-indigo-600 font-bold">{isSavingVersion ? 'Cancel' : 'Save Version'}</button>
                    </div>

                    {isSavingVersion && (
                        <div className="flex gap-1 animate-fade-in mb-2">
                            <input
                                type="text"
                                placeholder="Name"
                                value={newVersionName}
                                onChange={e => setNewVersionName(e.target.value)}
                                className="text-xs p-1 border border-gray-300 rounded flex-1 outline-none"
                            />
                            <button onClick={handleSaveVersion} className="bg-indigo-600 text-white px-2 rounded text-xs">Save</button>
                        </div>
                    )}

                    {promptVersions.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {promptVersions.map(v => (
                                <button key={v.id} onClick={() => handleLoadVersion(v)} className="text-[10px] bg-gray-50 border border-gray-200 px-2 py-1 rounded hover:border-indigo-500 text-gray-600 whitespace-nowrap">
                                    {v.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Content / Layout Definition</label>
                            <textarea
                                value={contentPrompt}
                                onChange={(e) => { setContentPrompt(e.target.value); setIsManuallyEdited(true); }}
                                className="w-full h-[300px] text-[10px] text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-y leading-relaxed"
                                placeholder="Define what objects appear in the scene..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Art Style / Aesthetics</label>
                            <textarea
                                value={stylePrompt}
                                onChange={(e) => { setStylePrompt(e.target.value); setIsManuallyEdited(true); }}
                                className="w-full h-[300px] text-[10px] text-purple-700 bg-purple-50 border border-purple-100 rounded-lg p-3 font-mono focus:ring-2 focus:ring-purple-500 outline-none resize-y leading-relaxed"
                                placeholder="Define the visual style, lighting, and negative prompts..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inline Generate Button */}
            <div className="pt-2 pb-6">
                <button onClick={handleGenerateClick} disabled={isGenerating} className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${isGenerating ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {isGenerating ? 'GENERATING...' : 'GENERATE ASSETS'}
                </button>
            </div>
        </div>
    );
};

export default SceneGeneratorInputs;
