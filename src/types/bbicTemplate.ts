/**
 * BBIC Protocol Template - Behavior-Based Interaction Checklist
 * 
 * This template defines content-based additional protocols that use 
 * mandatory checklists for structured interaction analysis.
 * 
 * CRITICAL: hiddenScore and status are NEVER exposed to students
 * - Used only for internal analysis, progress tracking, and research
 * - Student feedback is always qualitative and action-oriented
 */

export interface BBICBox {
  /** Unique identifier for this checklist item (e.g., "R1", "A2", "C3") */
  id: string;
  
  /** Display name for this interaction moment */
  label: string;
  
  /** Category type for grouping and UI organization */
  type: 'frame' | 'content' | 'avslut';
  
  /** 
   * INTERNAL USE ONLY - Never shown to students
   * Tracks completion status for analytics and progress monitoring
   */
  status: 'covered' | 'not_covered' | 'partial';
  
  /** 
   * INTERNAL USE ONLY - Optional analytical value
   * Used for research data and calibration, never displayed to students
   * Scale can be defined per protocol (e.g., 0-2, 0-4, or custom)
   */
  hiddenScore?: number;
  
  /** 
   * Student-facing qualitative feedback in natural language
   * MUST avoid scoring language and focus on observed behaviors
   * Format: "När du [behavior] blev effekten [consequence]. Nästa gång prova att [action]."
   */
  feedback: string;
  
  /** 
   * Concrete micro-behavior or sample phrase for next practice
   * Specific, actionable guidance the student can immediately use
   */
  exampleScript: string;
  
  /** 
   * Optional context about when/how this moment typically occurs
   * Helps students understand the timing and purpose
   */
  context?: string;
  
  /** 
   * Optional indicators of successful completion
   * Used for self-assessment and recognition of good performance
   */
  successIndicators?: string[];
}

export interface FeedbackRules {
  /** 
   * Core principles that guide all feedback in this protocol
   * Should emphasize behavior-focus and actionable guidance
   */
  principles: string[];
  
  /** 
   * Structured feedback templates for consistency
   * Provides frameworks for different types of observations
   */
  templates: {
    /** Template for observed behavior and its impact */
    observedConsequence: string;
    /** Template for future action suggestions */
    nextTimeAction: string;
    /** Template for follow-up or reinforcement */
    followUp: string;
    /** Template for positive reinforcement */
    affirmation: string;
  };
  
  /** 
   * Example phrases for different feedback scenarios
   * Helps maintain consistent, supportive language
   */
  phraseBank: {
    /** Opening phrases for feedback */
    openers: string[];
    /** Transition phrases to suggestions */
    transitions: string[];
    /** Closing phrases for encouragement */
    closers: string[];
  };
}

export interface BBICProtocolTemplate {
  /** Unique protocol identifier */
  id: string;
  
  /** Human-readable protocol name */
  name: string;
  
  /** Protocol version for tracking updates */
  version: string;
  
  /** Brief description of the protocol's purpose and focus */
  description: string;
  
  /** 
   * Checklist structure organized by phases/categories
   * Maintains order and grouping for systematic assessment
   */
  checklist: {
    /** Opening/framing interactions (R-series) */
    frame: BBICBox[];
    /** Main content interactions (A, B, C series) */
    content: BBICBox[];
    /** Closing/summary interactions (Avslut) */
    avslut: BBICBox[];
  };
  
  /** 
   * Feedback generation rules and templates
   * Ensures consistent, behavior-focused language
   */
  feedbackRules: FeedbackRules;
  
  /** 
   * Completion criteria for the overall protocol
   * Defines what constitutes adequate coverage
   */
  completionCriteria: {
    /** Minimum boxes that must be covered */
    requiredBoxes: string[];
    /** Optional boxes that enhance but aren't mandatory */
    optionalBoxes: string[];
    /** Minimum percentage of total boxes for completion */
    minimumCoverage: number; // 0-1 (e.g., 0.8 = 80%)
  };
  
  /** 
   * Validation rules for student-facing content
   * Prevents exposure of internal scoring/status
   */
  validationRules: {
    /** Forbidden words/phrases in student feedback */
    forbiddenTerms: readonly string[];
    /** Required feedback structure patterns */
    requiredPatterns: readonly string[];
    /** Feedback length constraints */
    feedbackLimits: {
      minLength: number;
      maxLength: number;
    };
  };
  
  /** Metadata for protocol management */
  metadata: {
    createdAt: string;
    lastModified: string;
    createdBy: string;
    tags: string[];
    targetAudience: string;
    estimatedDuration: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

/** 
 * Default feedback rules for BBIC protocols
 * Emphasizes behavior-focused, actionable guidance
 */
export const DEFAULT_BBIC_FEEDBACK_RULES: FeedbackRules = {
  principles: [
    "All feedback focuses on observable behaviors, not personality traits",
    "Suggestions are concrete and immediately actionable",
    "Language is supportive and growth-oriented",
    "Connections between actions and consequences are explicit"
  ],
  
  templates: {
    observedConsequence: "När du [specific behavior], blev effekten [observable result].",
    nextTimeAction: "Nästa gång prova att [concrete micro-behavior].",
    followUp: "Du kan förstärka detta genom att [additional action].",
    affirmation: "Din användning av [behavior] visade [positive quality]."
  },
  
  phraseBank: {
    openers: [
      "Jag observerade att när du",
      "Din användning av",
      "Under denna del av samtalet",
      "När situationen uppstod"
    ],
    transitions: [
      "vilket ledde till att",
      "detta resulterade i",
      "effekten blev att",
      "därför kunde du"
    ],
    closers: [
      "Nästa gång överväg att",
      "Ett alternativ att prova är",
      "Du kan utveckla detta genom att",
      "För att förstärka detta, prova"
    ]
  }
};

/** 
 * Default validation rules for BBIC protocols
 * Prevents scoring language and ensures action-orientation
 */
export const DEFAULT_BBIC_VALIDATION_RULES = {
  forbiddenTerms: [
    "poäng", "points", "score", "betyg", "grade", "nivå", "level",
    "skala", "scale", "rang", "rank", "checklist", "checklista",
    "kryssat", "checked", "avklarad", "completed", "status",
    "rätt", "fel", "right", "wrong", "bra", "dåligt", "good", "bad"
  ] as const,
  requiredPatterns: [
    "När du", "Din användning av", "Nästa gång", "Prova att",
    "Överväg att", "Du kan", "Detta visade", "Effekten blev"
  ] as const,
  feedbackLimits: {
    minLength: 40,
    maxLength: 250
  }
} as const;

/**
 * Example BBIC protocol - Parent Meeting Structure
 * Demonstrates systematic interaction checklist
 */
export const EXAMPLE_BBIC_PROTOCOL: BBICProtocolTemplate = {
  id: "parent-meeting-structure-v1",
  name: "Strukturerat Föräldrasamtal - BBIC",
  version: "1.0.0",
  description: "Beteendebaserad checklista för systematisk analys av föräldrasamtalens struktur och innehåll.",
  
  checklist: {
    frame: [
      {
        id: "R1",
        label: "Inledande hälsning och kontakt",
        type: "frame",
        status: "covered",
        hiddenScore: 2,
        feedback: "När du inledde med 'Tack för att ni kom' och etablerade ögonkontakt blev atmosfären genast mer välkomnande. Din varma ton satte en positiv grundstämning för hela samtalet.",
        exampleScript: "Tack för att ni kom idag. Jag ser fram emot vårt samtal om [barnets namn].",
        context: "Första 30 sekunderna - avgörande för samtalets ton",
        successIndicators: [
          "Etablerar ögonkontakt med alla närvarande",
          "Använder välkomnande tonfall",
          "Nämner barnets namn positivt"
        ]
      },
      {
        id: "R2", 
        label: "Tydliggörande av syfte och struktur",
        type: "frame",
        status: "partial",
        hiddenScore: 1,
        feedback: "Du nämnde syftet med samtalet men kunde ha varit tydligare med strukturen. Nästa gång prova att säga 'Vi kommer att titta på tre områden idag: [lista områden]' för att ge föräldrarna en klar bild av vad som komma ska.",
        exampleScript: "Idag tänkte jag att vi går igenom [barnets namn]s utveckling inom tre områden: läsning, matematik och socialt samspel. Hur känns det för er?",
        context: "Ger trygghet genom förutsägbarhet",
        successIndicators: [
          "Förklarar konkret vad som ska tas upp",
          "Anger ungefärlig tidsram",
          "Inviterar föräldrarnas perspektiv"
        ]
      }
    ],
    
    content: [
      {
        id: "A1",
        label: "Positiv inramning av barnets styrkor",
        type: "content", 
        status: "covered",
        hiddenScore: 3,
        feedback: "Din användning av konkreta exempel på [barnets namn]s framsteg inom läsning visade tydligt barnets utveckling. När du sa 'Jag märker att hen nu läser mer flyt' kunde föräldrarna se den positiva utvecklingen.",
        exampleScript: "Jag vill börja med att berätta vad jag ser fungerar bra för [barnets namn]. Inom läsning har jag märkt att...",
        context: "Skapar positiv grund innan utmaningar diskuteras",
        successIndicators: [
          "Använder specifika, observerbara exempel",
          "Fokuserar på framsteg och tillväxt", 
          "Kopplar styrkor till barnets unika kvaliteter"
        ]
      },
      {
        id: "A2",
        label: "Gemensam problemidentifiering",
        type: "content",
        status: "not_covered", 
        feedback: "Du presenterade dina observationer men gav inte tillräckligt utrymme för föräldrarnas perspektiv. Nästa gång prova att fråga 'Vad ser ni hemma inom detta område?' innan du delar dina egna observationer.",
        exampleScript: "Jag har några observationer om matematiken. Hur ser ni det hemma? Vilka tankar har ni om [specifikt område]?",
        context: "Skapar delaktighet och gemensam förståelse",
        successIndicators: [
          "Frågar om föräldrarnas observationer först",
          "Lyssnar aktivt på deras perspektiv",
          "Bygger vidare på det de delar"
        ]
      }
    ],
    
    avslut: [
      {
        id: "AVS1",
        label: "Sammanfattning av huvudpunkter",
        type: "avslut",
        status: "covered",
        hiddenScore: 2,
        feedback: "Din sammanfattning fångade de viktigaste punkterna från samtalet. När du sa 'Så vi är överens om att fokusera på...' hjälpte det att skapa klarhet kring nästa steg.",
        exampleScript: "Låt mig sammanfatta vad vi kommit fram till idag. Vi såg att [styrkor] och vi vill arbeta vidare med [utvecklingsområden].",
        context: "Säkerställer gemensam förståelse inför avslut",
        successIndicators: [
          "Repeterar både styrkor och utvecklingsområden",
          "Bekräftar gemensam förståelse",
          "Kopplar till konkreta nästa steg"
        ]
      }
    ]
  },
  
  feedbackRules: DEFAULT_BBIC_FEEDBACK_RULES,
  
  completionCriteria: {
    requiredBoxes: ["R1", "R2", "A1", "AVS1"],
    optionalBoxes: ["A2", "A3", "B1", "C1"],
    minimumCoverage: 0.7
  },
  
  validationRules: DEFAULT_BBIC_VALIDATION_RULES,
  
  metadata: {
    createdAt: "2024-01-15T10:00:00Z",
    lastModified: "2024-01-20T14:30:00Z",
    createdBy: "BASIS BBIC Team", 
    tags: ["parent-meetings", "structured-conversation", "behavioral-checklist"],
    targetAudience: "Teachers conducting parent conferences",
    estimatedDuration: "20-25 minutes",
    difficultyLevel: "intermediate"
  }
};

/**
 * Validation and utility functions for BBIC protocols
 */
export class BBICValidator {
  /**
   * Validates that feedback follows BBIC guidelines
   */
  static validateBBICFeedback(
    feedback: string, 
    rules: { 
      forbiddenTerms: readonly string[]; 
      requiredPatterns: readonly string[]; 
      feedbackLimits: { minLength: number; maxLength: number; }; 
    } = DEFAULT_BBIC_VALIDATION_RULES
  ): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    
    // Check for forbidden terms
    const lowerFeedback = feedback.toLowerCase();
    for (const term of rules.forbiddenTerms) {
      if (lowerFeedback.includes(term.toLowerCase())) {
        violations.push(`Forbidden term detected: "${term}"`);
      }
    }
    
    // Check for required action-oriented patterns
    const hasRequiredPattern = rules.requiredPatterns.some(pattern => 
      lowerFeedback.includes(pattern.toLowerCase())
    );
    
    if (!hasRequiredPattern) {
      violations.push("Feedback must include action-oriented language (När du, Nästa gång, etc.)");
    }
    
    // Check length limits
    if (feedback.length < rules.feedbackLimits.minLength) {
      violations.push(`Feedback too short: ${feedback.length} < ${rules.feedbackLimits.minLength}`);
    }
    if (feedback.length > rules.feedbackLimits.maxLength) {
      violations.push(`Feedback too long: ${feedback.length} > ${rules.feedbackLimits.maxLength}`);
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }
  
  /**
   * Validates complete BBIC protocol structure
   */
  static validateBBICProtocol(protocol: BBICProtocolTemplate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate basic structure
    if (!protocol.id || !protocol.name || !protocol.version) {
      errors.push("Missing required protocol metadata");
    }
    
    // Validate checklist structure
    const allBoxes = [
      ...protocol.checklist.frame,
      ...protocol.checklist.content, 
      ...protocol.checklist.avslut
    ];
    
    if (allBoxes.length === 0) {
      errors.push("Protocol must have at least one checklist box");
    }
    
    // Validate each box's feedback
    for (const box of allBoxes) {
      const feedbackValidation = this.validateBBICFeedback(box.feedback, protocol.validationRules);
      if (!feedbackValidation.isValid) {
        errors.push(`Box "${box.id}": ${feedbackValidation.violations.join(", ")}`);
      }
      
      // Validate example script
      if (!box.exampleScript || box.exampleScript.length < 10) {
        errors.push(`Box "${box.id}": Example script too short or missing`);
      }
    }
    
    // Validate completion criteria
    const allBoxIds = allBoxes.map(box => box.id);
    const invalidRequired = protocol.completionCriteria.requiredBoxes.filter(
      id => !allBoxIds.includes(id)
    );
    
    if (invalidRequired.length > 0) {
      errors.push(`Invalid required boxes: ${invalidRequired.join(", ")}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Calculates completion percentage for a protocol instance
   */
  static calculateCompletion(boxes: BBICBox[]): {
    totalBoxes: number;
    coveredBoxes: number;
    partialBoxes: number;
    completionPercentage: number;
  } {
    const totalBoxes = boxes.length;
    const coveredBoxes = boxes.filter(box => box.status === 'covered').length;
    const partialBoxes = boxes.filter(box => box.status === 'partial').length;
    
    // Partial boxes count as 0.5 for completion percentage
    const effectiveCompletion = coveredBoxes + (partialBoxes * 0.5);
    const completionPercentage = totalBoxes > 0 ? (effectiveCompletion / totalBoxes) : 0;
    
    return {
      totalBoxes,
      coveredBoxes,
      partialBoxes,
      completionPercentage: Math.round(completionPercentage * 100) / 100
    };
  }
  
  /**
   * Generates summary feedback based on checklist completion
   */
  static generateSummaryFeedback(
    protocol: BBICProtocolTemplate,
    completionStats: ReturnType<typeof BBICValidator.calculateCompletion>
  ): {
    overallFeedback: string;
    strengthAreas: string[];
    developmentAreas: string[];
    nextSteps: string[];
  } {
    const { completionPercentage } = completionStats;
    
    let overallFeedback = "";
    if (completionPercentage >= 0.8) {
      overallFeedback = "Du visade stark strukturell medvetenhet i samtalet och täckte de flesta viktiga momenten systematiskt.";
    } else if (completionPercentage >= 0.6) {
      overallFeedback = "Du genomförde flera viktiga delar av samtalets struktur och kan utveckla detta genom att fokusera på några specifika områden.";
    } else {
      overallFeedback = "Du hade bra intentioner med samtalet och kan utveckla den strukturella medvetenheten genom att fokusera på systematisk genomgång av viktiga moment.";
    }
    
    // Generate areas based on protocol structure
    const strengthAreas = protocol.checklist.frame
      .filter(box => box.status === 'covered')
      .map(box => `Stark ${box.label.toLowerCase()}`);
      
    const developmentAreas = [
      ...protocol.checklist.frame,
      ...protocol.checklist.content,
      ...protocol.checklist.avslut
    ]
      .filter(box => box.status === 'not_covered')
      .map(box => `Utveckla ${box.label.toLowerCase()}`);
      
    const nextSteps = protocol.completionCriteria.requiredBoxes
      .filter(id => {
        const box = [...protocol.checklist.frame, ...protocol.checklist.content, ...protocol.checklist.avslut]
          .find(b => b.id === id);
        return box && box.status !== 'covered';
      })
      .map(id => {
        const box = [...protocol.checklist.frame, ...protocol.checklist.content, ...protocol.checklist.avslut]
          .find(b => b.id === id);
        return box?.exampleScript || `Fokusera på moment ${id}`;
      });
    
    return {
      overallFeedback,
      strengthAreas: strengthAreas.slice(0, 3),
      developmentAreas: developmentAreas.slice(0, 3),
      nextSteps: nextSteps.slice(0, 3)
    };
  }
}