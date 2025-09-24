/**
 * Navigator Agent Prompt Generation
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
 * Generate a system prompt for the Navigator agent based on exercise configuration
 */
export function getNavigatorPrompt(exerciseConfig?: ExerciseConfig): string {
  const meta = exerciseConfig?.meta ?? {};
  const instructionContent = meta.instructionContent?.trim();

  const defaultPrimaryInstruction =
    'Inga specifika lärarinstruktioner angavs. Anta standarduppdraget: ge framåtriktad coaching som hjälper studenten att utveckla aktivt lyssnande (minimal feedback, parafrasering, klargörande frågor, empati, struktur) och guida alltid mot nästa steg utan att avslöja facit.';

  const promptSections: string[] = [];
  const primaryInstruction = instructionContent && instructionContent.length > 0
    ? instructionContent
    : defaultPrimaryInstruction;

  promptSections.push(`PRIMÄR INSTRUKTION (STYRANDE):\n${primaryInstruction}`);

  const backgroundSections: string[] = [];

  backgroundSections.push(
    [
      'STANDARDSTÖD FÖR NAVIGATORN:',
      '- Var coachande och framåtblickande utan att ge facit.',
      '- Hjälp studenten rikta sin nästa handling mot övningens mål.',
      '- Uppmuntra trygghet, egen reflektion och fortsatt utforskande.'
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
      `PROTOKOLLREFERENS (SEKUNDÄR):\n${meta.protocolContent}\n\nDenna text är bakgrundsmaterial. Använd den endast som stöd för att tolka den primära instruktionen.`
    );
  }

  if (backgroundSections.length > 0) {
    promptSections.push(
      `SEKUNDÄR KONTEXT OCH REFERENSMATERIAL:\n${backgroundSections.join('\n\n')}\n\nUtgå alltid från den primära instruktionen och konsultera bakgrundsmaterialet enbart som stöd.`
    );
  }

  return promptSections.join('\n\n').trim();
}