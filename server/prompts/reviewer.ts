/**
 * Reviewer Agent Prompt Generation
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
 * Generate a system prompt for the Reviewer agent based on exercise configuration
 */
export function getReviewerPrompt(exerciseConfig?: ExerciseConfig): string {
  const meta = exerciseConfig?.meta ?? {};
  const instructionContent = meta.instructionContent?.trim();

  const defaultPrimaryInstruction =
    'Inga specifika lärarinstruktioner angavs. Anta standarduppdraget: leverera en helhetsbedömning av studentens prestation i hela samtalet och belys styrkor, utvecklingsområden och nästa steg.';

  const promptSections: string[] = [];
  const primaryInstruction = instructionContent && instructionContent.length > 0
    ? instructionContent
    : defaultPrimaryInstruction;

  promptSections.push(`PRIMÄR INSTRUKTION (STYRANDE):\n${primaryInstruction}`);

  const backgroundSections: string[] = [];

  backgroundSections.push(
    [
      'STANDARDREFERENS FÖR REVIEWERN:',
      '- Leverera en sammanhängande helhetsbedömning av hela samtalet.',
      '- Sammanfatta kvalitativa observationer utan att avslöja interna bedömningar.',
      '- Använd ett professionellt men stödjande tonläge.'
    ].join('\n')
  );

  backgroundSections.push(
    [
      'ANALYSPROCESS (referens):',
      '- Gör intern 0-4 bedömning (hiddenScore) för varje område men dela inte siffror med studenten.',
      '- Identifiera mönster och utveckling genom hela samtalet.',
      '- Knyt alltid observationer till konkreta beteenden.'
    ].join('\n')
  );

  backgroundSections.push(
    [
      'OUTPUT-STRUKTUR (referens):',
      '1. Styrkor – punktlista över vad som fungerade bra',
      '2. Utvecklingsområden – punktlista över förbättringsområden',
      '3. Nästa steg – konkreta mikrobeteenden studenten kan prova',
      '4. Helhetskommentar – 1-2 meningar som binder ihop bedömningen'
    ].join('\n')
  );

  backgroundSections.push(
    [
      'REGLER (referens):',
      '- Undvik ord som "poäng", "nivå" eller "skala".',
      '- Fokusera på beteenden och deras effekter.',
      '- Ge konstruktiva och genomförbara rekommendationer.'
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
      `PROTOKOLLREFERENS (SEKUNDÄR):\n${meta.protocolContent}\n\nDenna text är bakgrundsmaterial. Utgå alltid från den primära instruktionen och använd protokollet som stöd.`
    );
  }

  if (backgroundSections.length > 0) {
    promptSections.push(
      `SEKUNDÄR KONTEXT OCH REFERENSMATERIAL:\n${backgroundSections.join('\n\n')}\n\nLåt den primära instruktionen styra din helhetsbedömning och använd bakgrundsmaterialet som referens.`
    );
  }

  return promptSections.join('\n\n').trim();
}
