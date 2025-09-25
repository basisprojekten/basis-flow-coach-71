/**
 * Reviewer Agent for End Session Analysis
 */

interface ExerciseConfig {
  focus?: string;
  focusHint?: string;
  title?: string;
  caseRole?: string;
  caseBackground?: string;
  meta?: {
    protocolContent?: string;
  };
  [key: string]: any;
}

interface ReviewerResponse {
  type: 'holistic_feedback';
  content: string;
  rubric_summary: any[];
  strengths: string[];
  growth_areas: string[];
  exemplar_quotes: any[];
  summary: string;
}

export class ReviewerAgent {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
  }

  async analyzeTranscript(
    protocols: string[],
    transcript: string,
    exerciseConfig?: ExerciseConfig
  ): Promise<ReviewerResponse> {
    const focus = exerciseConfig?.focusHint || exerciseConfig?.focus;
    const protocolContent = exerciseConfig?.meta?.protocolContent;
    
    let summaryFocus: string;
    
    if (focus) {
      summaryFocus = `Helhetsbedömning med särskilt fokus på ${focus}. Analysera hur studenten presterade inom detta område genom hela samtalet.`;
    } else {
      summaryFocus = "Helhetsbedömning av studentens prestationer inom hela basprotokollet (aktivt lyssnande, minimal feedback, parafrasering, klargörande frågor, empati, struktur).";
    }
    
    let systemPrompt = `${summaryFocus}

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

    if (protocolContent) {
      systemPrompt += `\n\nPROTOKOLL FÖR BEDÖMNING:\n${protocolContent}\n\nAnvänd detta protokoll som grund för din bedömning. Analysera hur väl studenten följer protokollets riktlinjer och ge feedback baserat på dessa kriterier.`;
    }

    const userPrompt = `Analysera följande träningssamtal:

${transcript}

Ge en helhetsbedömning enligt strukturen ovan.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse the structured response
      const sections = this.parseReviewerResponse(content);

      return {
        type: 'holistic_feedback',
        content: content,
        rubric_summary: [],  // Empty array to prevent length errors
        strengths: sections.strengths,
        growth_areas: sections.developmentAreas,  // Correct field name
        exemplar_quotes: [],  // Empty array to prevent length errors
        summary: sections.overallComment
      };

    } catch (error) {
      console.error('Error generating reviewer response:', error);
      throw new Error(`Failed to generate final feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseReviewerResponse(content: string): {
    strengths: string[];
    developmentAreas: string[];
    nextSteps: string[];
    overallComment: string;
  } {
    const sections = {
      strengths: [] as string[],
      developmentAreas: [] as string[],
      nextSteps: [] as string[],
      overallComment: ''
    };

    // Simple parsing - look for numbered or bulleted lists
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    let currentSection = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('styrkor') || lowerLine.includes('strengths')) {
        currentSection = 'strengths';
        continue;
      } else if (lowerLine.includes('utvecklingsområden') || lowerLine.includes('development')) {
        currentSection = 'developmentAreas';
        continue;
      } else if (lowerLine.includes('nästa steg') || lowerLine.includes('next steps')) {
        currentSection = 'nextSteps';
        continue;
      } else if (lowerLine.includes('helhetskommentar') || lowerLine.includes('overall')) {
        currentSection = 'overallComment';
        continue;
      }

      // Extract bullet points or numbered items
      if (line.match(/^[-•*]\s+/) || line.match(/^\d+\.\s+/)) {
        const cleanedLine = line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '');
        if (currentSection === 'strengths') {
          sections.strengths.push(cleanedLine);
        } else if (currentSection === 'developmentAreas') {
          sections.developmentAreas.push(cleanedLine);
        } else if (currentSection === 'nextSteps') {
          sections.nextSteps.push(cleanedLine);
        }
      } else if (currentSection === 'overallComment' && line.length > 10) {
        sections.overallComment = line;
      }
    }

    // Fallback if parsing failed
    if (sections.strengths.length === 0 && sections.developmentAreas.length === 0) {
      sections.overallComment = content;
    }

    return sections;
  }
}