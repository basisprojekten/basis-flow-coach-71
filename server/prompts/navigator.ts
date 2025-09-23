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
  
  const focus = exerciseConfig?.focus?.trim();
  const protocolContent = exerciseConfig?.meta?.protocolContent;
  
  let briefing: string;
  
  if (focus) {
    // Use teacher-specified focus
    briefing = `I den här övningen kommer du särskilt träna på ${focus}.`;
  } else {
    // Fallback to general focus
    briefing = "I den här övningen tränar du grundläggande aktivt lyssnande (minimal feedback, parafrasering, klargörande frågor, empati, struktur).";
  }
  
  prompt += `${briefing} Som din coach kommer jag att guida dig framåt utan att ge facit. Fokusera på att lyssna aktivt och svara naturligt utifrån situationen. Kom ihåg att det handlar om att utveckla din samtalsförmåga genom praktisk träning.`;
  
  // Inject protocol content if available
  if (protocolContent) {
    prompt += `\n\nPROTOKOLL FÖR DENNA ÖVNING:\n${protocolContent}\n\nAnvänd detta protokoll för att guida studenten mot rätt tekniker och förhållningssätt. Ge ledtrådar som hjälper dem följa protokollets riktlinjer utan att avslöja specifika svar.`;
  }
  
  return prompt;
}