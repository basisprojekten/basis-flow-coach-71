/**
 * Reviewer Agent Prompt Generation
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
 * Generate a system prompt for the Reviewer agent based on exercise configuration
 */
export function getReviewerPrompt(exerciseConfig?: ExerciseConfig): string {
  let prompt = '';
  
  // Inject instruction content at the top if available
  if (exerciseConfig?.meta?.instructionContent) {
    prompt += `ÖVERGRIPANDE INSTRUKTIONER:\n${exerciseConfig.meta.instructionContent}\n\n`;
  }
  
  const focus = exerciseConfig?.focus?.trim();
  
  let summaryFocus: string;
  
  if (focus) {
    // Focus on teacher-specified area
    summaryFocus = `Helhetsbedömning med särskilt fokus på ${focus}. Analysera hur studenten presterade inom detta område genom hela samtalet.`;
  } else {
    // Focus on entire base protocol
    summaryFocus = "Helhetsbedömning av studentens prestationer inom hela basprotokollet (aktivt lyssnande, minimal feedback, parafrasering, klargörande frågor, empati, struktur).";
  }
  
  prompt += `${summaryFocus}

ANALYSPROCESS:
- Gör intern 0-4 bedömning (hiddenScore) för varje område
- Presentera ENDAST kvalitativa resultat till studenten
- Analysera mönster och utveckling genom hela samtalet

OUTPUT-STRUKTUR (alltid dessa fyra delar):
1. Styrkor - punktlista över vad som fungerade bra
2. Utvecklingsområden - punktlista över förbättringsområden  
3. Nästa steg - konkreta mikrobeteenden studenten kan prova
4. Helhetskommentar - 1-2 meningar som binder ihop bedömningen

REGLER:
- Aldrig ord som "poäng", "nivå" eller "skala"
- Professionell men stödjande ton
- Fokusera på beteenden och deras effekter
- Ge konstruktiva och genomförbara rekommendationer`;
  
  return prompt;
}