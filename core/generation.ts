import { SheetActionItem } from "../types";

export const buildImageConfig = (model: string, aspectRatio: string, size: string) => {
  const config: any = { aspectRatio };
  if (model.includes("gemini-3-pro-image")) {
    config.imageSize = size;
  }
  return config;
};

export const buildMasterPrompt = (
  subjectDescription: string,
  stylePrompt: string,
  isBioAccurate: boolean
) => {
  const bioMechanicalRule = isBioAccurate
    ? `ANATOMY RULE: Preserve the subject's natural anatomical form. If the subject is a quadrupedal animal (dog, cat, etc.), render it on FOUR LEGS in a natural standing pose. Do NOT anthropomorphize or force bipedal stance.`
    : `ANATOMY RULE: Transform the subject into an anthropomorphic bipedal character standing upright on two legs.`;

  return `Create a CLEAN Master Character Reference Image.

Subject: ${subjectDescription}
Style: ${stylePrompt}

${bioMechanicalRule}

COMPOSITION REQUIREMENTS:
- Strict Front View, facing camera directly
- Full Body visible, no cropping
- Neutral standing pose (A-Pose or natural idle)
- Centered in frame with even padding

CRITICAL CONSTRAINTS:
- PURE WHITE BACKGROUND (#FFFFFF), absolutely clean
- NO borders, NO frames, NO outlines around the character
- NO text, NO labels, NO watermarks, NO annotations
- NO symbols, NO icons, NO UI elements
- NO grid lines, NO reference markers
- ONLY the character subject, nothing else

OUTPUT: A single, clean, isolated character render suitable as a reference for subsequent generations.`;
};

export const buildStickerPrompt = (
  subjectDescription: string,
  emotionOrAction: string,
  stylePrompt: string,
  isSpriteSheet: boolean,
  spriteActions: SheetActionItem[],
  sheetTemplate: string,
  rows: number,
  cols: number,
  moduleName: string,
  technicalPrompt: string,
  negativePrompt: string
) => {
  if (isSpriteSheet) {
    return sheetTemplate
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
  }

  const isWidget = moduleName === 'WIDGET';
  if (isWidget) {
    return `GENERATE iOS WIDGET. Subject: ${subjectDescription}. Concept: ${emotionOrAction}. Style: ${stylePrompt}. Square 1:1.`;
  }
  return `Generate sticker. Subject: ${subjectDescription}. Emotion: ${emotionOrAction}. Style: ${stylePrompt}. White background.`;
};

