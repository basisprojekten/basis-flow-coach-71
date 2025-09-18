/**
 * BASIS Protocol Template - Structured representation for training protocols
 * 
 * This template defines how protocols should be structured for:
 * 1. AI parser validation and JSON schema compliance
 * 2. Teacher/Student UI rendering
 * 3. Internal analytics and research data collection
 * 
 * CRITICAL: hiddenScore is NEVER exposed to students - only used for:
 * - Internal validation and reliability analysis
 * - Research data collection
 * - AI agent calibration
 */

export interface ProtocolCategory {
  /** Unique identifier for this category */
  id: string;
  
  /** Display name for the category */
  label: string;
  
  /** Brief description of what this category measures */
  definition: string;
  
  /** Additional context about common deficits and excess behaviors */
  notes: {
    /** Common deficits or areas where students struggle */
    deficits: string[];
    /** Signs of excess or over-application */
    excess: string[];
  };
  
  /** 
   * INTERNAL USE ONLY - Never shown to students
   * Scale: 0-4 where:
   * 0 = Significant deficits, needs major development
   * 1 = Some deficits, needs focused improvement  
   * 2 = Adequate, meets basic expectations
   * 3 = Strong, above expectations
   * 4 = Exceptional, exemplary performance
   */
  hiddenScore: number;
  
  /** 
   * Student-facing qualitative feedback in natural language
   * MUST avoid scoring language (points, levels, scales)
   * Format: "You demonstrated [behavior] which [impact]. This shows [strength/area]."
   */
  feedback: string;
  
  /** 
   * Examples of formative feedback for different performance levels
   * Used as reference for AI agents and teacher training
   */
  exampleFeedback: {
    emerging: string[];    // For scores 0-1
    developing: string[];  // For score 2
    proficient: string[];  // For score 3
    advanced: string[];    // For score 4
  };
}

export interface ProtocolOverall {
  /** 
   * Positive observations about student performance
   * Focus on specific behaviors and their effectiveness
   */
  strengths: string[];
  
  /** 
   * Development opportunities without judgmental language
   * Frame as growth areas rather than deficits
   */
  areasForImprovement: string[];
  
  /** 
   * Concrete, actionable micro-behaviors for next practice
   * Specific phrases, techniques, or approaches to try
   */
  nextSteps: string[];
}

export interface BasisProtocolTemplate {
  /** Unique protocol identifier */
  id: string;
  
  /** Human-readable protocol name */
  name: string;
  
  /** Protocol version for tracking updates */
  version: string;
  
  /** Brief description of the protocol's purpose and focus */
  description: string;
  
  /** 
   * Scale definition for internal scoring
   * This metadata helps maintain consistency across evaluators
   */
  scale: {
    range: [number, number]; // [0, 4]
    anchors: {
      0: string; // "Significant deficits"
      1: string; // "Some deficits" 
      2: string; // "Adequate"
      3: string; // "Strong"
      4: string; // "Exceptional"
    };
  };
  
  /** Array of assessment categories */
  categories: ProtocolCategory[];
  
  /** Overall assessment structure */
  overall: ProtocolOverall;
  
  /** 
   * Validation rules for student-facing content
   * These constraints ensure appropriate language is used
   */
  validationRules: {
    /** Forbidden words/phrases in student feedback */
    forbiddenTerms: readonly string[];
    /** Required feedback structure patterns */
    requiredPatterns: readonly string[];
    /** Minimum/maximum feedback lengths */
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
    targetAudience: string; // e.g., "Pre-service teachers", "Experienced counselors"
    estimatedDuration: string; // e.g., "15-20 minutes"
  };
}

/** 
 * Default validation rules for all BASIS protocols
 * Ensures consistent, educational language in student feedback
 */
export const DEFAULT_VALIDATION_RULES = {
  forbiddenTerms: [
    "poäng", "points", "score", "betyg", "grade",
    "nivå", "level", "skala", "scale", "rang", "rank",
    "fel", "wrong", "rätt", "right", "felaktigt", "incorrect",
    "dåligt", "bad", "bra", "good", "perfekt", "perfect"
  ],
  requiredPatterns: [
    "Du visade", "Du demonstrerade", "Din användning av",
    "Detta visar", "Nästa gång", "Prova att", "Överväg att"
  ],
  feedbackLimits: {
    minLength: 50,
    maxLength: 300
  }
} as const;

/**
 * Example protocol template - Conversational Skills for Parent Meetings
 * This serves as a reference implementation
 */
export const EXAMPLE_PROTOCOL: BasisProtocolTemplate = {
  id: "conv-skills-parent-meetings-v1",
  name: "Conversational Skills for Parent Meetings",
  version: "1.0.0",
  description: "Assessment protocol for evaluating teacher communication skills during parent conferences and meetings.",
  
  scale: {
    range: [0, 4],
    anchors: {
      0: "Significant deficits - Major development needed",
      1: "Some deficits - Focused improvement required", 
      2: "Adequate - Meets basic professional standards",
      3: "Strong - Above expectations, confident application",
      4: "Exceptional - Exemplary, could mentor others"
    }
  },
  
  categories: [
    {
      id: "minimal-feedback",
      label: "Minimal Feedback",
      definition: "Ability to provide brief, acknowledging responses that encourage continued sharing",
      notes: {
        deficits: [
          "Over-explains or provides lengthy responses",
          "Interrupts parent sharing with immediate advice",
          "Remains completely silent during natural pauses"
        ],
        excess: [
          "So brief that parent feels unheard",
          "Repetitive use of same minimal responses",
          "Lacks genuine engagement or presence"
        ]
      },
      hiddenScore: 3,
      feedback: "Du visade god förmåga att ge korta, uppmuntrande svar som 'mm-hmm' och 'jag förstår' när föräldern delade sina tankar. Detta hjälpte samtalet att flyta naturligt utan avbrott.",
      exampleFeedback: {
        emerging: [
          "Du tenderade att svara för utförligt när föräldern delade, vilket ibland avbröt deras berättelse. Prova att använda korta bekräftelser som 'mm' eller 'jag hör dig' för att visa att du lyssnar.",
          "Dina pauser blev ibland så långa att föräldern verkade osäker på om du följde med. Minimal feedback som 'okej' eller 'ja' kan hjälpa samtalet att fortsätta flyta."
        ],
        developing: [
          "Du använde några bra minimala svar som 'mm-hmm' men kunde utveckla detta mer konsekvent. Nästa gång prova att variera mellan 'jag förstår', 'okej' och icke-verbala nickningar.",
          "Din lyssning var bra men du missade några tillfällen att ge stödjande minimal feedback. Överväg att använda korta bekräftelser oftare under förälderns berättelse."
        ],
        proficient: [
          "Du använde minimal feedback mycket effektivt med naturliga 'mm-hmm' och 'jag förstår' som höll samtalet igång utan att avbryta. Detta visade aktiv närvaro och uppmuntrade föräldern att dela mer.",
          "Dina korta bekräftelser kom vid perfekta tillfällen och hjälpte föräldern att känna sig hörd. Din användning av både verbala och icke-verbala signaler var mycket naturlig."
        ],
        advanced: [
          "Din användning av minimal feedback var mästerlig - du använde exakt rätt mängd stödjande ljud och korta fraser för att hålla föräldern engagerad utan att ta över samtalet. Detta skapade en trygg miljö för delning.",
          "Du demonstrerade exceptional känsla för timing med din minimala feedback, vilket fick föräldern att öppna sig mer än vanligt. Din subtila bekräftelse var både professionell och genuint värmande."
        ]
      }
    },
    {
      id: "paraphrasing",
      label: "Parafrasering", 
      definition: "Ability to restate parent concerns in your own words to confirm understanding",
      notes: {
        deficits: [
          "Repeats parent's exact words without interpretation",
          "Misses emotional content or underlying concerns",
          "Adds own interpretations or judgments to paraphrase"
        ],
        excess: [
          "Paraphrases every statement, disrupting flow",
          "Makes paraphrases longer than original statement",
          "Uses overly clinical or formal language"
        ]
      },
      hiddenScore: 2,
      feedback: "Du parafraserade förälderns oro på ett bra sätt när du sa 'Så som jag förstår det är du bekymrad för...' Detta visade att du lyssnade aktivt, men nästa gång prova att även fånga känslomässiga aspekter av det som delas.",
      exampleFeedback: {
        emerging: [
          "Du upprepade ofta förälderns exakta ord istället för att parafrasera med dina egna. Prova att omformulera deras bekymmer med fraser som 'Det låter som att du känner...' eller 'Så som jag förstår det...'",
          "När du parafraserade missade du ibland känsloaspekterna av det föräldern delade. Överväg att inkludera både innehåll och känslor i din omformulering."
        ],
        developing: [
          "Du visade god grundförmåga i parafrasering men kunde utveckla detta genom att fånga mer av förälderns känslomässiga upplevelse. Nästa gång prova att reflektera både tankar och känslor.",
          "Dina parafraser var korrekta men ibland lite för formella. Prova att använda ett mer naturligt språk som matchar förälderns egen kommunikationsstil."
        ],
        proficient: [
          "Du parafraserade på ett effektivt sätt som visade djup förståelse för både innehåll och känslor. Din användning av fraser som 'Det jag hör dig säga är...' hjälpte föräldern att känna sig förstådd.",
          "Dina parafraser var välbalanserade - tillräckligt ofta för att visa förståelse men inte så ofta att det störde samtalsflödet. Du fångade både fakta och känslor på ett naturligt sätt."
        ],
        advanced: [
          "Din parafrasering var exceptionell i hur den fångade både uttryckta och underförstådda bekymmer. Du hjälpte föräldern att få klarhet i sina egna tankar genom din skickliga omformulering.",
          "Du demonstrerade mästerlig timing och precision i din parafrasering, vilket inte bara bekräftade förståelse utan också hjälpte föräldern att utforska sina känslor djupare."
        ]
      }
    }
  ],
  
  overall: {
    strengths: [
      "Visade stark förmåga att skapa trygg samtalsmiljö",
      "Lyssnade aktivt och responsivt under hela samtalet",
      "Använde naturligt och professionellt språk"
    ],
    areasForImprovement: [
      "Utveckla känslighet för timing av parafraser", 
      "Öva på att fånga emotionella nyanser i förälderns delning",
      "Utforska fler varianter av minimal feedback"
    ],
    nextSteps: [
      "Prova att använda fraser som 'Jag hör att du känner...' när du parafraserar",
      "Öva på att ge minimal feedback med olika tonfall beroende på situationen",
      "Experimentera med korta reflektioner av känslor: 'Det låter frustrerande..'"
    ]
  },
  
  validationRules: DEFAULT_VALIDATION_RULES,
  
  metadata: {
    createdAt: "2024-01-15T10:00:00Z",
    lastModified: "2024-01-20T14:30:00Z", 
    createdBy: "BASIS Protocol Team",
    tags: ["parent-communication", "conversational-skills", "teacher-training"],
    targetAudience: "Pre-service and early-career teachers",
    estimatedDuration: "15-20 minutes"
  }
};

/**
 * Validation utility functions
 */
export class ProtocolValidator {
  /**
   * Validates that student-facing feedback follows protocol guidelines
   */
  static validateStudentFeedback(
    feedback: string, 
    rules: { 
      forbiddenTerms: readonly string[]; 
      requiredPatterns: readonly string[]; 
      feedbackLimits: { minLength: number; maxLength: number; }; 
    } = DEFAULT_VALIDATION_RULES
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
   * Validates complete protocol structure
   */
  static validateProtocol(protocol: BasisProtocolTemplate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate basic structure
    if (!protocol.id || !protocol.name || !protocol.version) {
      errors.push("Missing required protocol metadata");
    }
    
    // Validate categories
    if (!protocol.categories || protocol.categories.length === 0) {
      errors.push("Protocol must have at least one category");
    }
    
    // Validate each category's feedback
    for (const category of protocol.categories || []) {
      const feedbackValidation = this.validateStudentFeedback(category.feedback, protocol.validationRules);
      if (!feedbackValidation.isValid) {
        errors.push(`Category "${category.label}": ${feedbackValidation.violations.join(", ")}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}