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
  
  const protocolContent = exerciseConfig?.meta?.protocolContent;
  
  // Primary feedback focus from instruction content, with fallback
  let focusInstruction: string;
  if (exerciseConfig?.meta?.instructionContent) {
    focusInstruction = "Analysera studentens prestationer enligt de specifika instruktioner som din lärare har gett. Ge feedback som hjälper studenten utveckla enligt dessa riktlinjer.";
  } else {
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

  // Inject protocol content as SECONDARY reference material for evaluation criteria
  if (protocolContent) {
    prompt += `\n\nREFERENSMATERIAL FÖR BEDÖMNING (SEKUNDÄRT):\n${protocolContent}\n\nOVAN TEXT ÄR ENDAST REFERENSMATERIAL. Använd detta som kontext för din bedömning men basera INTE din primära feedback på detta protokoll såvida inte de primära instruktionerna explicit säger att du ska göra det.`;
  }
  
  return prompt;
}