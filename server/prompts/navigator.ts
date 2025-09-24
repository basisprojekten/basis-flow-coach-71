/**
 * Navigator Agent Prompt Generation
 */

interface ExerciseConfig {
  focus?: string;
  caseRole?: string;
  caseBackground?: string;
  meta?: {
    instructionContent?: string;
  };
  [key: string]: any;
}

/**
 * Generate a system prompt for the Navigator agent based on exercise configuration
 */
export function getNavigatorPrompt(exerciseConfig?: ExerciseConfig): string {
  let prompt = '';
  
  // Inject instruction content at the top if available
  if (exerciseConfig?.meta?.instructionContent) {
    prompt += `ÖVERGRIPANDE INSTRUKTIONER:\n${exerciseConfig.meta.instructionContent}\n\n`;
  }
  
  const protocolContent = exerciseConfig?.meta?.protocolContent;
  
  // Primary briefing from instruction content, with fallback
  let briefing: string;
  if (exerciseConfig?.meta?.instructionContent) {
    briefing = "I den här övningen tränar du enligt de specifika instruktioner som din lärare har gett. Fokusera på att följa dessa riktlinjer noggrant.";
  } else {
    briefing = "I den här övningen tränar du grundläggande aktivt lyssnande (minimal feedback, parafrasering, klargörande frågor, empati, struktur).";
  }
  
  prompt += `${briefing} Som din coach kommer jag att guida dig framåt utan att ge facit. Fokusera på att lyssna aktivt och svara naturligt utifrån situationen. Kom ihåg att det handlar om att utveckla din samtalsförmåga genom praktisk träning.`;
  
  // Inject protocol content as SECONDARY reference material if available
  if (protocolContent) {
    prompt += `\n\nREFERENSMATERIAL (SEKUNDÄRT):\n${protocolContent}\n\nOVAN TEXT ÄR ENDAST BAKGRUNDSMATERIAL. Använd detta som kontext men basera INTE din primära coaching på detta protokoll såvida inte de primära instruktionerna explicit säger att du ska göra det. Fokusera främst på att följa de övergripande instruktionerna.`;
  }
  
  return prompt;
}