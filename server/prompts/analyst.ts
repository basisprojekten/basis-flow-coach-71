/**
 * Analyst Agent Prompt Generation
 */

interface ExerciseConfig {
  focus?: string;
  caseRole?: string;
  caseBackground?: string;
  meta?: {
    instructionContent?: string;
    protocolContent?: string;
    caseContent?: string;
  };
  [key: string]: any;
}

/**
 * Generate a system prompt for the Analyst agent based on exercise configuration
 */
export function getAnalystPrompt(exerciseConfig?: ExerciseConfig): string {
  const meta = exerciseConfig?.meta ?? {};
  const instructionContent = meta.instructionContent?.trim();

  const defaultPrimaryInstruction =
    'Inga specifika lärarinstruktioner angavs. Anta standarduppdraget: analysera studentens senaste svar och ge kort, beteendeorienterad retrospektiv feedback som stärker aktivt lyssnande.';

  const promptSections: string[] = [];
  const primaryInstruction = instructionContent && instructionContent.length > 0
    ? instructionContent
    : defaultPrimaryInstruction;

  promptSections.push(`PRIMÄR INSTRUKTION (STYRANDE):\n${primaryInstruction}`);

  const backgroundSections: string[] = [];

  backgroundSections.push(
    [
      'STANDARDREFERENS FÖR ANALYTIKERN:',
      '- Ge retrospektiv feedback på det senaste studentuttalandet.',
      '- Koppla alltid feedbacken till observerbara beteenden.',
      '- Håll formatet kort (max 2-3 meningar) och avslöja aldrig interna bedömningar.'
    ].join('\n')
  );

  backgroundSections.push(
    [
      'FEEDBACK-STRUKTUR (referens):',
      '1. Observerat beteende - vad studenten gjorde',
      '2. Konsekvens - vad det ledde till',
      '3. Nästa steg - vad studenten kan prova nästa gång'
    ].join('\n')
  );

  backgroundSections.push(
    [
      'REGLER (referens):',
      '- Gör intern 0-4 bedömning (hiddenScore) men nämn det aldrig.',
      '- Använd inte orden "nivå", "poäng" eller "skala" i feedbacken.',
      '- Fokusera på konkreta beteenden och deras effekter.',
      '- Ge konstruktiva nästa steg utan att avslöja facit.'
    ].join('\n')
  );

  if (exerciseConfig?.focus) {
    backgroundSections.push(`ANGIVET TRÄNINGSFOKUS:\n${exerciseConfig.focus}`);
  }

  const caseDetails: string[] = [];
  if (exerciseConfig?.caseRole) {
    caseDetails.push(`Roll: ${exerciseConfig.caseRole}`);
  }
  if (exerciseConfig?.caseBackground) {
    caseDetails.push(`Scenario: ${exerciseConfig.caseBackground}`);
  }
  if (meta.caseContent) {
    caseDetails.push(`Karaktärs-/caseinformation:\n${meta.caseContent}`);
  }
  if (caseDetails.length > 0) {
    backgroundSections.push(`CASEKONTEKST:\n${caseDetails.join('\n')}`);
  }

  if (meta.protocolContent) {
    backgroundSections.push(
      `PROTOKOLLREFERENS FÖR BEDÖMNING (SEKUNDÄR):\n${meta.protocolContent}\n\nDenna text är bakgrundsmaterial. Använd den som stöd men låt den primära instruktionen styra din feedback.`
    );
  }

  if (backgroundSections.length > 0) {
    promptSections.push(
      `SEKUNDÄR KONTEXT OCH REFERENSMATERIAL:\n${backgroundSections.join('\n\n')}\n\nFölj alltid den primära instruktionen och nyttja bakgrundsmaterialet som referens.`
    );
  }

  return promptSections.join('\n\n').trim();
}
