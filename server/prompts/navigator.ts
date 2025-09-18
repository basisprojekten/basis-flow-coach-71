/**
 * Navigator Agent Prompt Generation
 */

interface ExerciseConfig {
  focus?: string;
  caseRole?: string;
  caseBackground?: string;
  [key: string]: any;
}

/**
 * Generate a system prompt for the Navigator agent based on exercise configuration
 */
export function getNavigatorPrompt(exerciseConfig?: ExerciseConfig): string {
  const focus = exerciseConfig?.focus?.trim();
  
  let briefing: string;
  
  if (focus) {
    // Use teacher-specified focus
    briefing = `I den här övningen kommer du särskilt träna på ${focus}.`;
  } else {
    // Fallback to general focus
    briefing = "I den här övningen tränar du grundläggande aktivt lyssnande (minimal feedback, parafrasering, klargörande frågor, empati, struktur).";
  }
  
  const prompt = `${briefing} Som din coach kommer jag att guida dig framåt utan att ge facit. Fokusera på att lyssna aktivt och svara naturligt utifrån situationen. Kom ihåg att det handlar om att utveckla din samtalsförmåga genom praktisk träning.`;
  
  return prompt;
}