
import { StickerStyle, SheetActionItem } from './types';

export const EMOTIONS = [
  { name: 'Happy', emoji: '😄' },
  { name: 'LOL', emoji: '🤣' },
  { name: 'Rage', emoji: '🤬' },
  { name: 'Crying', emoji: '😭' },
  { name: 'Love', emoji: '🥰' },
  { name: 'Cool', emoji: '😎' },
  { name: 'Thinking', emoji: '🤔' },
  { name: 'Mind Blown', emoji: '🤯' },
  { name: 'Facepalm', emoji: '🤦' },
  { name: 'Clown', emoji: '🤡' },
  { name: 'Sick', emoji: '🤢' },
  { name: 'Sleeping', emoji: '💤' },
  { name: 'Money', emoji: '🤑' },
  { name: 'Devil', emoji: '😈' },
  { name: 'Angel', emoji: '😇' },
  { name: 'Suspicious', emoji: '🧐' },
];

// --- DUOLINGO STYLE WIDGET SCENARIOS ---
export const WIDGET_SCENARIOS = [
  {
    name: 'Streak Fire',
    emoji: '🔥',
    prompt: 'Concept: The Streak. The character is holding a magical, intense burning fire flame in their hand. Determined, motivated, powerful expression. High contrast lighting. Dynamic pose.'
  },
  {
    name: 'Melting',
    emoji: '🫠',
    prompt: 'Concept: Giving Up / Heatwave. The character is literally melting into a puddle on the floor. Distorted, liquid-like geometry. Eyes drooping, tongue hanging out. Comical exaggerated defeat.'
  },
  {
    name: 'Aged Skeleton',
    emoji: '💀',
    prompt: 'Concept: Missed Lesson / Decay. The character has turned into a dusty, cobweb-covered version of themselves, or a cute skeleton version. Implies they have been waiting for 84 years. Funny, tragic.'
  },
  {
    name: 'Begging',
    emoji: '🥺',
    prompt: 'Concept: Please Come Back. Extreme close-up of the face. Giant, watery, shimmering anime tearful eyes looking up at the camera. Paws/hands clasped together in prayer. Maximum guilt trip.'
  },
  {
    name: 'Nuclear Rage',
    emoji: '🌋',
    prompt: 'Concept: You Broke The Streak. Character is standing in front of a nuclear mushroom cloud or massive fire background. Eyes glowing red. Extreme anger, chaotic energy. Shadowy and menacing but cute.'
  },
  {
    name: 'Love Bomb',
    emoji: '😍',
    prompt: 'Concept: Appreciation. Character is pressed up against the screen "glass", kissing it. Squished face effect. Surrounded by floating 3D hearts. Overwhelming love and affection.'
  },
  {
    name: 'Coffee Deprived',
    emoji: '☕',
    prompt: 'Concept: Morning Grind. Character looks exhausted, messy fur/hair, bloodshot eyes, shaking visibly, holding a giant coffee mug that says "No Talk". Chaotic morning energy.'
  },
  {
    name: 'Fine (This is Fine)',
    emoji: '🙃',
    prompt: 'Concept: "This is Fine" meme reference. The character is sitting calmly at a table with a cup of tea, while the entire room around them is engulfed in flames. Smiling blankly.'
  }
];

// --- SHARED PROMPT ASSEMBLY PARTS ---

export const SHARED_TECHNICAL_PROMPT = `  "technical_constraints": {
    "format": "Sprite Sheet Atlas",
    "layout_enforcement": "STRICT GRID ALIGNMENT. Align sprites to the center of each grid cell.",
    "background": "Solid #FFFFFF (Pure White) - Isolated",
    "consistency": "Strict Model Integrity (Same Character, Same Scale, Same Position)",
    "framing": "Full Body, No Cropping, Center-aligned in each frame",
    "cleanliness": "NO artifacts, NO text, NO numbers, NO grid lines, NO borders around sprites, NO UI elements",
    "spacing": "Even padding between frames for easy slicing.",
    "count_limit": "MANDATORY: Fill the entire grid. Do not leave empty slots."
  },
  "animation_rules": {
    "frame_transitions": "Adjacent frames MUST have smooth interpolation. No frame skipping, no sudden pose jumps, no teleporting limbs.",
    "loop_friendly": "First and last frame should blend seamlessly for continuous loop playback.",
    "position_lock": "Character must remain centered and consistent across all frames. No drifting or zooming."
  }`;

export const SHARED_NEGATIVE_PROMPT = `["text", "watermark", "blur", "artifacts", "cropped_limbs", "extra_limbs", "dithering", "gradient_background", "shadow_clipping", "overlapping_frames", "touching_sprites", "crowded", "cluttered", "mixed_angles", "numbers", "numerals", "digits", "counting", "labels", "grid lines", "borders", "frames", "rectangles", "boxes", "ui elements", "annotations", "page numbers", "lines", "extra rows", "extra columns", "double grid", "frame skipping", "sudden jumps", "teleporting"]`;

// --- HELPER: Motion Dynamics Description (Mode-Specific Rules) ---
export const GET_MOTION_DESCRIPTION = (mode: string): string => {
  const m = mode.toLowerCase();
  if (m.includes('idle')) {
    return "Breathing motion (chest/belly rise and fall) + occasional blinking (2-3 blink frames). Minimal displacement, avoid completely static frames.";
  } else if (m.includes('emote')) {
    return "Exaggerated squash and stretch for expressive reactions. Anticipation → Peak → Follow-through arc. Stationary feet, active upper body.";
  } else if (m.includes('action')) {
    return "Dynamic silhouettes with clear line of action. Frame pacing: build-up (2-3 frames) → peak action (1-2 frames) → recovery (2-3 frames).";
  } else if (m.includes('ui')) {
    return "Character holding UI Props (Bell, Heart, Gift, Star). Maintain prop visibility throughout. Subtle breathing while holding. Direct eye contact with camera.";
  }
  return "Standard smooth animation movement.";
};

// --- MODULE 1: PASSIVE IDLE ---

export const IDLE_DEFAULTS: SheetActionItem[] = [
  { label: "Idle_LookAround", description: "", enabled: true },
  { label: "Idle_Neutral", description: "", enabled: true },
  { label: "Idle_Thinking", description: "", enabled: true },
  { label: "Idle_Sleepy", description: "", enabled: true },
  { label: "Idle_Shy", description: "", enabled: true }
];

// --- MODULE 2: EMOTE (LOUD IDLE) ---

export const EMOTE_DEFAULTS: SheetActionItem[] = [
  { label: "Emote_Laugh", description: "", enabled: true },
  { label: "Emote_Angry", description: "", enabled: true },
  { label: "Emote_Shock", description: "", enabled: true },
  { label: "Emote_Joy", description: "", enabled: true },
  { label: "Emote_Wave", description: "", enabled: true }
];

// --- MODULE 3: ACTION (LOCOMOTION) ---

export const ACTION_DEFAULTS: SheetActionItem[] = [
  { label: "Loco_Walk", description: "", enabled: true },
  { label: "Loco_Run", description: "", enabled: true },
  { label: "Loco_Jump", description: "", enabled: true },
  { label: "Loco_Dash", description: "", enabled: true },
  { label: "Loco_Crouch", description: "", enabled: true }
];

// --- MODULE 4: UI STATES (ONBOARDING & CONVERSION) ---

export const UI_UX_DEFAULTS: SheetActionItem[] = [
  {
    label: "UI_Notif_Bell",
    description: "For Notification Access. Character hugging a large Golden Bell. Eyes wide and pleading (puppy eyes). Cute and begging.",
    enabled: true
  },
  {
    label: "UI_Offer_Gift",
    description: "For Special Offers. Character holding a wrapped Gift Box forward. Shyly smiling, presenting the gift to the user.",
    enabled: true
  },
  {
    label: "UI_Sub_Heart",
    description: "For Premium/Paywall. Character holding a large Red Heart cushion. Rubbing cheek against it. Cozy, companionship vibe.",
    enabled: true
  },
  {
    label: "UI_Rate_Star",
    description: "For App Rating. Character holding a glowing Yellow Star high up above head. Proud and happy expression.",
    enabled: true
  },
  {
    label: "UI_Please_Beg",
    description: "For Soft Block/Permissions. Hands clasped together in prayer/begging motion. Looking up at camera. Maximum sympathy.",
    enabled: true
  }
];


// --- PROMPT TEMPLATE (JSON STRUCTURE) ---

export const MASTER_SHEET_PROMPT_TEMPLATE = `{
  "request": "GENERATE_SPRITE_SHEET",
  "bio_mechanical_reference": "Generate movements consistent with the detected anatomical type's (quadrupedal/bipedal/stylized) natural locomotion patterns, avoiding anatomical dissonance.",
  "subject_spec": {
    "description": "{{subject}}",
    "visual_style": "{{style}}"
  },
  "layout_spec": {
    "grid_pattern": "Strict {{rows}} rows x {{cols}} columns Grid",
    "item_count": "EXACTLY {{total_frames}} items.",
    "constraint": "Fill every single cell in the {{rows}}x{{cols}} grid. Cycle through the provided 'sequence_data' to fill all slots if necessary. Do not leave any blank spaces. Do not create extra rows.",
    "view_angle": "Front View (Facing Camera)",
    "padding": "Uniform spacing.",
    "background": "CLEAN PURE WHITE BACKGROUND, NO LINES, NO NUMBERS"
  },
  "animation_module": {
    "type": "{{module_name}}",
    "dynamics": "{{motion_dynamics}}"
  },
  "sequence_data": {{action_list}},
{{technical_prompt}},
  "negative_prompt": {{negative_prompt}}
}`;


export const DEFAULT_SHEET_SET = ACTION_DEFAULTS; // Fallback

// Updated Presets with reliable URLs (Using standard Unsplash IDs that are stable)
export const PRESET_IMAGES = [
  {
    id: 'preset_corgi_v2',
    name: 'Happy Corgi',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_cat_v2',
    name: 'Siamese Cat',
    url: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_bear_v2',
    name: 'Teddy Bear',
    url: 'https://images.unsplash.com/photo-1555445054-d103c149d5aa?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_rabbit_v2',
    name: 'White Bunny',
    url: 'https://images.unsplash.com/photo-1585110396000-c9285742770f?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_robot_v2',
    name: 'Robot Toy',
    url: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_doll_v2',
    name: 'Knitted Doll',
    url: 'https://images.unsplash.com/photo-1560963689-02e0d0741bf7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_pug_v2',
    name: 'Sad Pug',
    url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset_hamster_v2',
    name: 'Hamster',
    url: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=400&q=80'
  },
];

export const STYLES: StickerStyle[] = [
  {
    id: 'acnh_villager',
    name: 'AC Villager',
    prompt: 'A high-quality 3D render in the style of Animal Crossing: New Horizons. The character should look like a villager from the game. Bipedal anthropomorphic form, standing upright on two legs. Materials: Smooth matte finish for skin/plastic/wood parts; Soft fuzzy/flocked texture ONLY for clothing or plush elements. Rounded smooth geometry, cute chibi proportions. Bright, cheerful, soft natural lighting. Vibrant colors. Isolated on a pure white background with a thick white die-cut border.',
  },
  {
    id: 'acnh_natural',
    name: 'AC Natural',
    prompt: 'A high-quality 3D render with soft, rounded geometry and cute chibi proportions. IMPORTANT: Preserve the subject\'s natural anatomical form - if the subject is a quadrupedal animal (dog, cat, etc.), render it on four legs; if bipedal, render it standing. Do NOT anthropomorphize or force bipedal stance on naturally quadrupedal creatures. Materials: Smooth matte finish for skin/plastic/wood parts; Soft fuzzy/flocked texture for fur or plush elements. Bright, cheerful, soft natural lighting. Vibrant pastel colors. Rounded friendly silhouettes. Isolated on a pure white background with a thick white die-cut border.',
  },
  {
    id: 'default',
    name: '3D Sticker (Standard)',
    prompt: '3D Rendered Character, Die-cut Sticker. High quality blind box toy style. Pop Mart aesthetic. C4D, Octane Render. Clay or vinyl material, smooth matte finish. Studio lighting, soft shadows. White border around the subject.',
  },
  {
    id: 'clay',
    name: 'Clay / Stop Motion',
    prompt: 'Claymation style, stop-motion animation aesthetic. Made of plasticine clay. Visible fingerprints and imperfections. Hand-sculpted look. Soft, uneven lighting. Aardman style.',
  },
  {
    id: 'flat',
    name: 'Flat Vector',
    prompt: '2D Flat Vector Art. Clean lines, solid colors, no gradients. Minimalist icon design. Adobe Illustrator style. Bold shapes, simple geometry. White background.',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    prompt: 'Soft Watercolor Painting. Wet-on-wet technique. Visible paper texture. Gentle color bleeding. Artistic and dreamy. Light pastel tones. Hand-painted illustration.',
  },
  {
    id: 'pixel',
    name: 'Pixel Art',
    prompt: 'Pixel Art, 32-bit sprite style. Retro game asset. Clean pixel placement, limited color palette. Dithering details. SNES or GBA era aesthetic.',
  },
  {
    id: 'comic',
    name: 'Comic Book',
    prompt: 'American Comic Book style. Bold black outlines (inked). Halftone dot shading. Vibrant pop-art colors. Dynamic lighting. Ben-Day dots.',
  },
];

export const DEFAULT_STYLE_ID = 'acnh_villager';

// --- Scene Generator Constants ---

export const SCENE_LOCATIONS = [
  { id: 'island_garden', name: 'Cozy Island Garden', prompt: 'a cozy island garden' },
  { id: 'seaside_beach', name: 'Seaside / Beach', prompt: 'a sunny seaside beach with white sand' },
  { id: 'town_plaza', name: 'Town Plaza', prompt: 'a bustling town plaza with brick paving' },
  { id: 'campsite', name: 'Forest Campsite', prompt: 'a peaceful forest campsite with pine trees' },
  { id: 'orchard', name: 'Fruit Orchard', prompt: 'a bountiful fruit orchard' },
  { id: 'waterfall', name: 'Cliffside Waterfall', prompt: 'a scenic cliffside with a double waterfall' },
  { id: 'museum', name: 'Museum Entrance', prompt: 'the grand entrance to the island museum' },
  { id: 'bamboo', name: 'Bamboo Zen Garden', prompt: 'a zen garden with bamboo forest' },
];

export const SCENE_ELEMENTS = [
  { id: 'apple_trees', name: 'Apple Trees' },
  { id: 'cherry_blossoms', name: 'Cherry Blossom Trees' },
  { id: 'cedar_trees', name: 'Cedar Trees' },
  { id: 'wooden_bridge', name: 'Wooden Bridge' },
  { id: 'stone_path', name: 'Stone Path' },
  { id: 'waterfall', name: 'Small Waterfall' },
  { id: 'fountain', name: 'Fountain' },
  { id: 'bench', name: 'Iron Garden Bench' },
  { id: 'street_lamp', name: 'Street Lamp' },
  { id: 'flowers', name: 'Hybrid Flowers' },
  { id: 'picnic', name: 'Picnic Set' },
  { id: 'campfire', name: 'Campfire' },
  { id: 'log_stake', name: 'Log Stakes' },
  { id: 'star_fragments', name: 'Star Fragments' },
  { id: 'fossil', name: 'Fossil Mark' },
  { id: 'balloon', name: 'Balloon Present' },
];

export const SCENE_TIMES = [
  { id: 'morning', name: 'Early Morning', emoji: '🌅', prompt: 'Early Morning Setting. Soft, pale morning light with low-angle shadows. Fresh, cool color temperature with pastel pink and blue hues in the sky. Gentle, waking-up atmosphere.' },
  { id: 'noon', name: 'Midday', emoji: '☀️', prompt: 'Midday Setting. Bright, high-contrast sunlight directly overhead. Vivid, saturated colors. Clear blue sky. Energetic and cheerful atmosphere.' },
  { id: 'evening', name: 'Evening', emoji: '🌤️', prompt: 'Evening Setting. Golden Hour lighting. Warm, rich orange and gold sunlight. Long, dramatic shadows. Cozy, nostalgic atmosphere.' },
  { id: 'dusk', name: 'Twilight', emoji: '🌆', prompt: 'Twilight Setting. Post-sunset dusk lighting. Deep blue and purple sky gradients. Soft, ambient lighting with no harsh shadows. Dreamy, magical evening atmosphere.' },
];

export const SCENE_SEASONS = [
  { id: 'spring', name: 'Spring', emoji: '🌱', prompt: 'Spring Season. Fresh bright green grass. Young leaves on trees. Vibrant flowers blooming. A feeling of new beginning and freshness.' },
  { id: 'summer', name: 'Summer', emoji: '🌻', prompt: 'Summer Season. Deep lush green grass. Cicada noises implied by the heat. Cumulonimbus clouds in the sky. Intense, vibrant greenery.' },
  { id: 'autumn', name: 'Autumn', emoji: '🍁', prompt: 'Autumn Season. Orange, red, and yellow leaves. Brownish-red grass. Mushrooms growing on the ground. Cozy, warm fall atmosphere.' },
  { id: 'winter', name: 'Winter', emoji: '❄️', prompt: 'Winter Season. The ground is covered in white snow. Snow on the trees. Cold, crisp atmosphere. Snowflakes gently falling.' },
  { id: 'sakura', name: 'Sakura', emoji: '🌸', prompt: 'Cherry Blossom Season. All hardwood trees are pink sakura trees. Petals floating in the air. Pink grass accents. Romantic, soft pink atmosphere.' },
  { id: 'rainy', name: 'Rainy', emoji: '☔', prompt: 'Rainy Season. Wet ground reflections. Hydrangeas blooming. Overcast soft lighting. Raindrops visible. Cozy rainy mood.' },
];

// --- UNIFIED ELEMENT THEMES ---
// Prompts refined to preserve the object's original design/functionality while subtly integrating thematic aesthetics.
export const UNIFIED_ELEMENT_THEMES = [
  {
    id: 'soft_bakery',
    name: 'Soft Bakery',
    prompt: 'Theme: "Soft Bakery". Design Philosophy: Infuse the object with the *warmth and softness* of fresh bread without literally turning it into food. Use rounded, "loaf-like" silhouettes, matte textures that feel like high-quality soft plastic or painted wood, and accents that *suggest* bakery elements (e.g., a roof rack resembling a cooling grid, hubcaps shaped like biscuits, or cream-colored detailing). Colors: Toasted browns, warm creams, and pastel icing pinks.'
  },
  {
    id: 'gorpcore',
    name: 'Gorpcore',
    prompt: 'Theme: "Gorpcore" (Outdoor Tech). Design Philosophy: Rugged functionality meets modern street style. Incorporate utilitarian details like visible bungee cords, carabiner clips, durable mesh textures, and speckled "recycled plastic" surfaces. Use a matte, earth-tone palette (moss green, clay orange, slate grey) with high-contrast safety orange or neon yellow accents.'
  },
  {
    id: 'lofi_vinyl',
    name: 'Lo-Fi Vinyl',
    prompt: 'Theme: "Lo-Fi Vinyl". Design Philosophy: Retro-futuristic 90s electronics aesthetic. Use "Atomic Purple" or "Glacier Blue" translucent plastic casings that reveal vague internal mechanics. Add geometric printed labels, cassette-tape style stripes, and chunky, tactile buttons. The finish should be semi-glossy plastic.'
  },
  {
    id: 'tennis',
    name: 'Tennis',
    prompt: 'Theme: "Tennis Club". Design Philosophy: Preppy, athletic luxury. Use perforated textures (like tennis grips or breathable fabric), clean matte white surfaces, and bold varsity stripes. Accents in "Tennis Ball Neon Green" and "Clay Court Rust". The object should feel aerodynamic, clean, and expensive.'
  }
];

export const FURNITURE_PIECES = [
  { id: 'bed', name: 'Bed' },
  { id: 'sofa', name: 'Sofa' },
  { id: 'table', name: 'Table' },
  { id: 'chair', name: 'Chair' },
  { id: 'lamp', name: 'Floor Lamp' },
  { id: 'wardrobe', name: 'Wardrobe/Closet' },
  { id: 'shelf', name: 'Shelf' },
  { id: 'rug', name: 'Rug' },
  { id: 'plant', name: 'House Plant' },
  { id: 'kitchen', name: 'Kitchen Counter' },
  { id: 'desk', name: 'Desk' },
];

export const OUTDOOR_ELEMENTS = [
  // Structures
  { id: 'gazebo', name: 'Gazebo (Structure)' },
  { id: 'pergola', name: 'Pergola (Structure)' },
  { id: 'shed', name: 'Garden Shed (Structure)' },
  { id: 'bus_stop', name: 'Bus Stop (Structure)' },
  { id: 'stall', name: 'Market Stall' },
  { id: 'well', name: 'Stone Well' },
  // Furniture / Installations
  { id: 'fountain', name: 'Fountain' },
  { id: 'swing', name: 'Swing Bench' },
  { id: 'hammock', name: 'Hammock' },
  { id: 'bench', name: 'Park Bench' },
  { id: 'street_lamp', name: 'Street Lamp' },
  { id: 'vending', name: 'Vending Machine' },
  { id: 'slide', name: 'Elephant Slide' },
  { id: 'sandbox', name: 'Sandbox' },
  { id: 'statue', name: 'Stone Statue' },
  { id: 'sign', name: 'Wooden Signpost' },
];

export const VEHICLE_TYPES = [
  { id: 'compact_van', name: 'Compact Van' },
  { id: 'minibus', name: 'Mini Bus' },
  { id: 'pickup_camper', name: 'Pickup Truck Camper' },
  { id: 'trailer', name: 'Travel Trailer' },
  { id: 'shuttle', name: 'Airport Shuttle' },
  { id: 'postal', name: 'Postal Van' },
  { id: 'icecream', name: 'Ice Cream Truck' },
  { id: 'doubledecker', name: 'Mini Double Decker' },
];


// --- Miniature / Icon Mode Constants ---
export const MINIATURE_THEMES = [
  { id: 'chiang_mai', name: 'Chiang Mai (Thai)', prompt: 'Chiang Mai vibe. Keywords: Temples, Elephants, Tropical, Lanterns.' },
  { id: 'sicily', name: 'Sicily (Italy)', prompt: 'Sicily / Amalfi vibe. Keywords: Lemons, Coast, Blue Tiles, Scooters.' },
  { id: 'hawaii', name: 'Hawaii (USA)', prompt: 'Hawaii vibe. Keywords: Volcano, Surf, Tiki, Hibiscus.' },
  { id: 'tokyo', name: 'Tokyo (Japan)', prompt: 'Tokyo vibe. Keywords: Neon, Vending Machines, Cherry Blossoms, Cyber-pop.' },
  { id: 'paris', name: 'Paris (France)', prompt: 'Paris vibe. Keywords: Cafe, Eiffel, Wrought Iron, Bakery.' },
  { id: 'nyc', name: 'New York (USA)', prompt: 'NYC vibe. Keywords: Taxis, Brownstones, Urban, Brick.' },
  { id: 'london', name: 'London (UK)', prompt: 'London vibe. Keywords: Big Ben, Red Bus, Phone Booth, Rainy.' },
  { id: 'kyoto', name: 'Kyoto (Japan)', prompt: 'Kyoto vibe. Keywords: Shrines, Bamboo, Torii Gates, Traditional.' },
  { id: 'santorini', name: 'Santorini (Greece)', prompt: 'Santorini vibe. Keywords: Blue Domes, White Walls, Sea, Bougainvillea.' },
];

export const DEFAULT_WORLD_CITIES = [
  'Chiang Mai, Thailand (Temples & Elephants)',
  'Sicily, Italy (Lemons & Coast)',
  'Hawaii, USA (Volcano & Surf)',
  'Tokyo, Japan (Neon & Cherry Blossoms)',
  'Paris, France (Eiffel & Cafes)',
  'New York City, USA (Taxis & Brownstones)',
  'London, UK (Big Ben & Red Buses)',
  'Kyoto, Japan (Shrines & Bamboo)',
  'Santorini, Greece (Blue Domes & Sea)',
  'Cairo, Egypt (Pyramids & Desert)',
  'Rio de Janeiro, Brazil (Christ & Beach)',
  'Amsterdam, Netherlands (Canals & Tulips)'
];

export const ICON_THEMES = [
  { id: 'rv_travel', name: 'RV Travel' },
  { id: 'camping', name: 'Outdoor Camping' }
];

export const ICONS_RV_TRAVEL = [
  { id: 'car_keys', text: 'RV Car Keys' },
  { id: 'gps', text: 'GPS Navigation Device' },
  { id: 'steering_wheel', text: 'Steering Wheel' },
  { id: 'gas_can', text: 'Gasoline Canister' },
  { id: 'sunglasses', text: 'Sunglasses' },
  { id: 'mini_van', text: 'Miniature Van Model' },
  { id: 'coffee_cup', text: 'Travel Coffee Cup' },
  { id: 'camera', text: 'Instant Camera' },
];

export const ICONS_OUTDOOR_CAMPING = [
  { id: 'tent', text: 'Camping Tent' },
  { id: 'bonfire', text: 'Bonfire' },
  { id: 'lantern', text: 'Camping Lantern' },
  { id: 'backpack', text: 'Hiking Backpack' },
  { id: 'swiss_knife', text: 'Multi-tool Knife' },
  { id: 'marshmallow', text: 'Marshmallow on Stick' },
  { id: 'sleeping_bag', text: 'Rolled Sleeping Bag' },
  { id: 'compass', text: 'Compass' },
];

export const SCENE_ASPECT_RATIOS = [
  { id: '1:1', name: 'Square (1:1)', icon: '▢' },
  { id: '9:16', name: 'Mobile (9:16)', icon: '▯' },
  { id: '16:9', name: 'Landscape (16:9)', icon: '▭' },
];

// --- SPLIT SCENE PROMPTS INTO CONTENT & STYLE ---

// 1. Landscape
export const ACNH_SCENE_CONTENT_TEMPLATE = `Create a full-screen, immersive environmental landscape in the art style of Animal Crossing: New Horizons.
Location: {{location}}.
Key Elements: {{elements}}.`;

export const ACNH_SCENE_STYLE_TEMPLATE = `Visual Style & Atmosphere:
- A fully realized world environment, NOT a miniature diorama or a toy set on a table.
- The scene should extend to the edges of the frame (full bleed).
- {{lighting}}
- Signature style: Soft rounded geometry. Use smooth matte finishes for hard surfaces (ground, paving, buildings) and soft, slightly fuzzy textures for vegetation (grass, leaves).
- Perspective: Eye-level or slightly elevated scenic view, showing depth (foreground to background).

Requirements:
- ABSOLUTELY NO CHARACTERS, NO PEOPLE, NO ANIMALS.
- NO white borders, NO studio backgrounds.

Negative Prompt: characters, people, animals, villagers, white background, studio background, simple background, product shot, miniature diorama, toy model, table surface, isometric box.`;

// 2. Landscape (Barren)
export const ACNH_SCENE_BARREN_CONTENT_TEMPLATE = `Create a full-screen, immersive environmental landscape background in the art style of Animal Crossing: New Horizons.
Location Context: {{location}}.
Ground Layout & Features: {{elements}}.`;

export const ACNH_SCENE_BARREN_STYLE_TEMPLATE = `**LAYOUT REQUIREMENT: OPEN EMPTY BACKGROUND.**
- This image is intended as a background layer for a game.
- **REMOVE ALL FOREGROUND VEGETATION.**
- **NO TREES, NO BUSHES, NO FLOWERS in the foreground or mid-ground.**
- Keep the ground open, clear, and flat (unless the location implies a cliff).
- Focus on the ground texture (grass, sand, paving) and the horizon/sky.

Visual Style & Atmosphere:
- A fully realized world environment.
- The scene should extend to the edges of the frame (full bleed).
- {{lighting}}
- Signature style: Soft rounded geometry. Smooth matte textures for the ground and distant elements.
- Perspective: Eye-level or slightly elevated scenic view.

Negative Prompt: characters, people, animals, villagers, white background, studio background, miniature, toy model, trees, plants, flowers, bushes, leaves, grass blades, vegetation, trunk, branch, foreground objects, clutter, mountains, rock formations, steep hills.`;

// 3. Furniture
export const ACNH_FURNITURE_CONTENT_TEMPLATE = `**[Asset Definition & Layout]**
A game asset sprite sheet containing isolated furniture elements. Items are arranged in a neat grid (Knolling style), completely separated with no overlaps.
**Background:** Solid pure white background.

**[The List of Items to Generate]**
The set includes the following items, designed in a {{location}} theme suitable for Animal Crossing aesthetics:

{{elements}}`;

export const ACNH_FURNITURE_STYLE_TEMPLATE = `**[Visual Style Definition]**
Style is 3D game asset render.

* **Geometry:** Soft, chunky, highly rounded geometry with distinct, friendly silhouettes. No sharp edges. Objects have visible thickness and volume despite the frontal view.
* **Lighting:** Soft, high-quality studio lighting. Gentle self-shadowing (ambient occlusion) to show that the objects are 3D, but no harsh cast shadows on the white background.
* **Perspective:** **Strict front-facing view (dead-on elevation) for all items.** Objects are rendered straight-on, not iso/3D angle.

**Negative Prompt:** characters, people, animals, villagers, touching edges, overlapping, flat 2D vector, lineless art, harsh outlines, realistic high-detail texture, noise, complex background, perspective distortion, isometric view, cast shadow, drop shadow, contact shadow.`;

// 4. Outdoor
export const ACNH_OUTDOOR_CONTENT_TEMPLATE = `**[Asset Definition & Layout]**
A game asset sprite sheet containing isolated OUTDOOR structures and furniture. Items are arranged in a neat grid (Knolling style), completely separated with no overlaps.
**Background:** Solid pure white background.

**[The List of Items to Generate]**
The set includes the following outdoor elements, designed in a {{location}} theme suitable for Animal Crossing aesthetics:

{{elements}}`;

export const ACNH_OUTDOOR_STYLE_TEMPLATE = `**[Visual Style Definition]**
Style is 3D game asset render.

* **Geometry:** Soft, chunky, highly rounded geometry with distinct, friendly silhouettes. No sharp edges. Even large structures should have this "toy-like" rounded quality.
* **Lighting:** Soft, high-quality studio lighting. Gentle self-shadowing (ambient occlusion) to show that the objects are 3D, but no harsh cast shadows on the white background.
* **Perspective:** **Strict front-facing view (dead-on elevation) for all items.** Objects are rendered straight-on, not iso/3D angle.

**Negative Prompt:** characters, people, animals, villagers, touching edges, overlapping, flat 2D vector, lineless art, harsh outlines, realistic high-detail texture, noise, complex background, perspective distortion, isometric view, cast shadow, drop shadow, contact shadow.`;

// 5. Vehicle
export const ACNH_VEHICLE_CONTENT_TEMPLATE = `**[Asset Definition & Layout]**
A game asset sprite sheet containing isolated vehicle elements for long-distance travel.
Layout: Items are arranged in a neat grid (Knolling style), completely separated with no overlaps.
**Background:** Solid pure white background.

**[The List of Vehicles]**
Generate a set of vehicles based on the following types and theme:
**Theme:** {{theme}}
**Vehicle Types:**
{{elements}}`;

export const ACNH_VEHICLE_STYLE_TEMPLATE = `**[Visual Style Definition]**
Style is 3D game asset render, mimicking the distinct aesthetics of *Animal Crossing: New Horizons*.
**CRITICAL: Use a strict SIDE VIEW (Profile / Elevation) for all vehicles.**

* **Visual Signature:** Soft rounded geometry, cozy textures, and vibrant pastel colors.
* **Geometry:** Soft, chunky, highly rounded geometry with distinct, friendly silhouettes. No sharp edges. Objects have visible thickness and volume despite the side view.
* **Texture:** **Toy-like Smoothness.** Vehicles should look like die-cast toys or high-quality plastic/wood. **Do NOT make the cars look like they are made of fur or felt.** Keep them smooth and matte.
* **Color:** Vibrant pastel color palette, cheerful, inviting, and warm tones.
* **Lighting:** Soft, high-quality studio lighting. Gentle self-shadowing (ambient occlusion) to show that the objects are 3D, but no harsh cast shadows on the white background.
* **Perspective:** **Strict 90-degree Side View (Profile).** Objects are rendered straight-on, not iso/3D angle.

**Negative Prompt:** isometric, front view, 3/4 view, perspective distortion, realistic car proportions, gritty, dirty, rusty, human characters, animals driving, background scenery, complex background, furry cars, flocked cars.`;

// 6. Miniature Diorama
export const MINIATURE_DIORAMA_CONTENT_TEMPLATE = `**[Asset Definition & Layout]**
A game asset sprite sheet containing **{{count}} Isolated Spherical/Circular World Vignettes**.
Layout: Grid arrangement fitting {{count}} items (e.g., 3x4 or 3x3).
**Background:** Solid pure white background.

**[Content Requirement]**
Generate exactly {{count}} distinct **"Artistic Souvenir Globes"** or "Spherical Vignettes" representing specific cities:
{{city_list}}`;

export const MINIATURE_DIORAMA_STYLE_TEMPLATE = `**[Visual Style Definition]**
Style is 3D game asset render.
* **Composition:** **SPHERICAL / ROUNDED / ORGANIC.** NOT ISOMETRIC SQUARES.
* **Geometry:** Soft, chunky, highly rounded geometry with distinct, friendly silhouettes. No sharp edges.
* **Lighting:** Soft, high-quality studio lighting. Gentle self-shadowing (ambient occlusion) to show that the objects are 3D, but no harsh cast shadows on the white background.
* **Perspective:** **Frontal or Slightly High Angle.** Focus on the artistic arrangement.

**Negative Prompt:** isometric, square base, grid, map tile, technical drawing, sharp edges, cold lighting, realistic, low poly, glass reflection blocking view, text, labels, cast shadow, drop shadow.`;

// 7. Miniature Encyclopedia
export const MINIATURE_ENCYCLOPEDIA_CONTENT_TEMPLATE = `**[Asset Definition & Layout]**
A game asset sprite sheet containing **{{count}} Isolated Cute Items** for the city of **{{city_name}}**.
Layout: Grid alignment fitting {{count}} items.
**Background:** Solid pure white background.

**[Item List]**
Generate exactly these {{count}} items:
{{item_list}}`;

export const MINIATURE_ENCYCLOPEDIA_STYLE_TEMPLATE = `**[Visual Style Definition]**
Style is 3D game asset render.
* **Concept:** Cute, chunky, soft furniture or cultural artifacts.
* **Geometry:** Soft, chunky, highly rounded geometry with distinct, friendly silhouettes. No sharp edges. Objects have visible thickness and volume despite the frontal view.
* **Lighting:** Soft, high-quality studio lighting. Gentle self-shadowing (ambient occlusion) to show that the objects are 3D, but no harsh cast shadows on the white background.
* **Perspective:** **Strict front-facing view (dead-on elevation) for all items.** Objects are rendered straight-on, not iso/3D angle.

**Negative Prompt:** characters, people, animals, villagers, touching edges, overlapping, flat 2D vector, lineless art, harsh outlines, text, labels, watermark, realistic food, photorealistic, sharp edges, isometric, cast shadow, drop shadow, contact shadow.`;

// 8. Miniature Icon
export const MINIATURE_ICON_CONTENT_TEMPLATE = `**[Asset Definition & Layout]**
A game asset sprite sheet containing **{{count}} Isolated UI Icons** for **{{theme_name}}**.
Layout: Grid alignment fitting {{count}} items.
**Background:** Solid pure white background.

**[Item List]**
Generate exactly these {{count}} items:
{{item_list}}`;

export const MINIATURE_ICON_STYLE_TEMPLATE = `**[Visual Style Definition]**
Style is 3D game asset render.
* **Concept:** High-quality, chunky, tactile 3D icons for a user interface.
* **Geometry:** Soft, chunky, highly rounded geometry with distinct, friendly silhouettes. No sharp edges. Objects have visible thickness and volume despite the frontal view.
* **Lighting:** Soft, high-quality studio lighting. Gentle self-shadowing (ambient occlusion) to show that the objects are 3D, but no harsh cast shadows on the white background.
* **Perspective:** **Strict front-facing view (dead-on elevation) for all items.** Objects are rendered straight-on, not iso/3D angle.

**Negative Prompt:** flat 2D, vector, outline, sketch, realistic, dirty, gritty, noise, pixelated, text, numbers, watermark, cropped, low resolution, complex background, cast shadow, drop shadow, contact shadow, isometric.`;

// --- DEPRECATED FULL TEMPLATES (Kept for type safety if needed, but unused) ---
export const ACNH_SCENE_PROMPT_TEMPLATE = ACNH_SCENE_CONTENT_TEMPLATE + "\n\n" + ACNH_SCENE_STYLE_TEMPLATE;
export const ACNH_SCENE_BARREN_PROMPT_TEMPLATE = ACNH_SCENE_BARREN_CONTENT_TEMPLATE + "\n\n" + ACNH_SCENE_BARREN_STYLE_TEMPLATE;
export const ACNH_FURNITURE_PROMPT_TEMPLATE = ACNH_FURNITURE_CONTENT_TEMPLATE + "\n\n" + ACNH_FURNITURE_STYLE_TEMPLATE;
export const ACNH_VEHICLE_PROMPT_TEMPLATE = ACNH_VEHICLE_CONTENT_TEMPLATE + "\n\n" + ACNH_VEHICLE_STYLE_TEMPLATE;
export const ACNH_OUTDOOR_PROMPT_TEMPLATE = ACNH_OUTDOOR_CONTENT_TEMPLATE + "\n\n" + ACNH_OUTDOOR_STYLE_TEMPLATE;
export const MINIATURE_DIORAMA_PROMPT_TEMPLATE = MINIATURE_DIORAMA_CONTENT_TEMPLATE + "\n\n" + MINIATURE_DIORAMA_STYLE_TEMPLATE;
export const MINIATURE_ENCYCLOPEDIA_PROMPT_TEMPLATE = MINIATURE_ENCYCLOPEDIA_CONTENT_TEMPLATE + "\n\n" + MINIATURE_ENCYCLOPEDIA_STYLE_TEMPLATE;
export const MINIATURE_ICON_PROMPT_TEMPLATE = MINIATURE_ICON_CONTENT_TEMPLATE + "\n\n" + MINIATURE_ICON_STYLE_TEMPLATE;
