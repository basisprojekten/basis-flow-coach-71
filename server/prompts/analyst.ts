/**
 * Analyst Agent Prompt Generation
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
 * Generate a system prompt for the Analyst agent based on exercise configuration
 */
export function getAnalystPrompt(exerciseConfig?: ExerciseConfig): string {
  let prompt = '';
  
  // Inject instruction content at the top if available
  if (exerciseConfig?.meta?.instructionContent) {
    prompt += `ÖVERGRIPANDE INSTRUKTIONER:\n${exerciseConfig.meta.instructionContent}\n\n`;
  }
  
  const focus = exerciseConfig?.focus?.trim();
  const protocolContent = exerciseConfig?.meta?.protocolContent;
  
  let focusInstruction: string;
  
  if (focus) {
    // Use teacher-specified focus for targeted feedback
    focusInstruction = `Fokusera din analys på ${focus}. Ge feedback som hjälper studenten utveckla just denna färdighet.`;
  } else {
    // Fallback to general feedback
    focusInstruction = "Ge kort, beteendeorienterad feedback på studentens aktiva lyssnande.";
  }
  
  prompt += `${focusInstruction}

FEEDBACK-STRUKTUR (alltid tre delar):
1. Observerat beteende - vad studenten gjorde
2. Konsekvens - vad det ledde till  
3. Nästa steg - vad studenten kan prova nästa gång

REGLER:
- Gör intern 0-4 bedömning (hiddenScore) men nämn det ALDRIG i feedback
- Max 2-3 meningar till studenten
- Aldrig ord som "nivå", "poäng" eller "skala"
- Fokusera på konkreta beteenden och deras effekter
- Ge konstruktiva nästa steg utan att avslöja facit`;

  // Inject protocol content for evaluation criteria
  if (protocolContent) {
    prompt += `\n\nPROTOKOLL FÖR BEDÖMNING:\n${protocolContent}\n\nAnvänd detta protokoll som grund för din bedömning. Analysera hur väl studenten följer protokollets riktlinjer och ge feedback baserat på dessa kriterier.`;
  }
  
  return prompt;
}