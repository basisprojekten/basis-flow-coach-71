/**
 * Process-Based Additional Protocol Template
 * 
 * This template defines supplementary protocols that analyze process aspects
 * of interactions (e.g., timing, flow, emotional regulation, metacognitive awareness).
 * 
 * STRUCTURE: Same as base protocol (categories + 0-4 scale) for compatibility
 * STORAGE: Separate entity that can be combined with base protocols in analysis
 * 
 * CRITICAL: hiddenScore is NEVER exposed to students - only used for:
 * - Cross-protocol analysis and correlation studies
 * - Process pattern identification over time
 * - Research data collection and calibration
 */

export interface ProcessProtocolCategory {
  /** Unique identifier for this process category */
  id: string;
  
  /** Display name for the process aspect being assessed */
  label: string;
  
  /** Clear description of the process behavior being evaluated */
  definition: string;
  
  /** Context about common process deficits and excess behaviors */
  notes: {
    /** Common process deficits or underdevelopment patterns */
    deficits: string[];
    /** Signs of over-application or rigid process adherence */
    excess: string[];
  };
  
  /** 
   * INTERNAL USE ONLY - Never shown to students
   * Scale: 0-4 where:
   * 0 = Process significantly underdeveloped, major attention needed
   * 1 = Process emerging, needs focused development
   * 2 = Process adequate, meets basic expectations for level
   * 3 = Process well-developed, shows good awareness and control
   * 4 = Process highly sophisticated, demonstrates mastery and flexibility
   */
  hiddenScore: number;
  
  /** 
   * Student-facing qualitative feedback in natural, behavior-focused language
   * MUST avoid all scoring/evaluation terminology
   * Format: "Jag observerade att [process behavior]. Detta [impact/significance]. Nästa gång [specific process suggestion]."
   */
  feedback: string;
  
  /** 
   * Examples of process-focused feedback for different development levels
   * Emphasizes growth mindset and specific behavioral adjustments
   */
  exampleFeedback: {
    emerging: string[];      // For scores 0-1: Foundational process development
    developing: string[];    // For score 2: Solidifying process awareness  
    proficient: string[];    // For score 3: Refining process application
    advanced: string[];      // For score 4: Mastering process flexibility
  };
  
  /** 
   * Observable indicators for this process aspect
   * Helps evaluators identify concrete behavioral evidence
   */
  processIndicators: {
    /** What to look for when this process is working well */
    positive: string[];
    /** Red flags that indicate process breakdown or absence */
    concerning: string[];
  };
  
  /** 
   * Timing considerations for when this process typically emerges
   * Helps contextualize expectations and observations
   */
  developmentalContext?: {
    /** When this process typically appears in interaction sequence */
    typicalTiming: string;
    /** Prerequisites or foundational skills needed */
    prerequisites: string[];
    /** How this process connects to other process skills */
    connections: string[];
  };
}

export interface ProcessProtocolOverall {
  /** 
   * Process strengths observed across categories
   * Focus on meta-cognitive and self-regulation capabilities
   */
  strengths: string[];
  
  /** 
   * Process development opportunities without deficit language
   * Frame as growth edges and emerging capabilities
   */
  areasForImprovement: string[];
  
  /** 
   * Concrete process-focused actions for next practice sessions
   * Specific meta-cognitive strategies and self-monitoring techniques
   */
  nextSteps: string[];
}

export interface ProcessProtocolTemplate {
  /** Unique protocol identifier */
  id: string;
  
  /** Human-readable protocol name */
  name: string;
  
  /** Protocol version for tracking updates */
  version: string;
  
  /** Description of the process aspects this protocol evaluates */
  description: string;
  
  /** 
   * Type of process focus for categorization and filtering
   * Helps organize different process protocols
   */
  processType: 'metacognitive' | 'emotional_regulation' | 'timing_flow' | 'self_monitoring' | 'adaptive_flexibility' | 'other';
  
  /** 
   * Scale definition - must match base protocol structure for compatibility
   * Consistent 0-4 scale enables cross-protocol analysis
   */
  scale: {
    range: [number, number]; // [0, 4]
    anchors: {
      0: string; // Process significantly underdeveloped
      1: string; // Process emerging
      2: string; // Process adequate
      3: string; // Process well-developed  
      4: string; // Process highly sophisticated
    };
  };
  
  /** Array of process assessment categories */
  categories: ProcessProtocolCategory[];
  
  /** Overall process assessment structure */
  overall: ProcessProtocolOverall;
  
  /** 
   * Compatibility mapping with base protocols
   * Defines how this process protocol relates to content-based assessments
   */
  baseProtocolCompatibility: {
    /** Which base protocols this can be combined with */
    compatibleProtocols: string[];
    /** How process scores might correlate with base protocol categories */
    expectedCorrelations: Array<{
      processCategory: string;
      baseCategory: string;
      expectedRelationship: 'positive' | 'negative' | 'independent' | 'complex';
      description: string;
    }>;
  };
  
  /** 
   * Validation rules for student-facing content
   * Same standards as base protocols to maintain consistency
   */
  validationRules: {
    /** Forbidden words/phrases in student feedback */
    forbiddenTerms: readonly string[];
    /** Required process-focused language patterns */
    requiredPatterns: readonly string[];
    /** Feedback length constraints */
    feedbackLimits: {
      minLength: number;
      maxLength: number;
    };
  };
  
  /** 
   * Research and analysis metadata
   * Additional fields for process-focused research
   */
  researchMetadata: {
    /** Theoretical framework this protocol is based on */
    theoreticalFramework: string;
    /** Key research studies supporting this approach */
    supportingResearch: string[];
    /** Validated correlations with other measures */
    validatedCorrelations: string[];
  };
  
  /** Standard protocol metadata */
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
 * Default validation rules for process protocols
 * Emphasizes process awareness and behavioral development
 */
export const DEFAULT_PROCESS_VALIDATION_RULES = {
  forbiddenTerms: [
    "poäng", "points", "score", "betyg", "grade", "nivå", "level",
    "skala", "scale", "rang", "rank", "fel", "wrong", "rätt", "right",
    "felaktigt", "incorrect", "dåligt", "bad", "bra", "good", 
    "perfekt", "perfect", "felbedömning", "misjudgment"
  ] as const,
  requiredPatterns: [
    "Jag observerade", "Din process", "Ditt sätt att", "När du",
    "Detta visar", "Nästa gång prova", "Du kan utveckla", "Överväg att"
  ] as const,
  feedbackLimits: {
    minLength: 60,
    maxLength: 350
  }
} as const;

/**
 * Example Process Protocol - Metacognitive Awareness in Conversations
 * Demonstrates process-focused assessment complementing content protocols
 */
export const EXAMPLE_PROCESS_PROTOCOL: ProcessProtocolTemplate = {
  id: "metacognitive-awareness-conversations-v1",
  name: "Metakognitiv Medvetenhet i Samtal",
  version: "1.0.0", 
  description: "Bedömning av studentens medvetenhet om sina egna tankeprocesser och självreglering under samtal.",
  processType: "metacognitive",
  
  scale: {
    range: [0, 4],
    anchors: {
      0: "Metakognitiv medvetenhet saknas helt, ingen reflektion över egen process",
      1: "Sporadisk medvetenhet, begränsad självreflektion och processjustering", 
      2: "Grundläggande medvetenhet, kan reflektera över egen process efteråt",
      3: "God realtidsmedvetenhet, justerar aktivt sin process under samtal",
      4: "Sofistikerad metakognitiv kontroll, flexibel processanpassning efter behov"
    }
  },
  
  categories: [
    {
      id: "self-monitoring",
      label: "Självmonitorering under samtal",
      definition: "Förmåga att löpande vara medveten om sina egna reaktioner, tankar och beteenden under pågående interaktion",
      notes: {
        deficits: [
          "Agerar reaktivt utan reflektion över egen process",
          "Märker inte när samtalet spårar ur eller när egen approach inte fungerar",
          "Fortsätter med ineffektiva strategier utan anpassning"
        ],
        excess: [
          "Så fokuserad på självmonitorering att närvaron i samtalet minskar",
          "Överanalyserar varje eget uttalande vilket skapar artificiell interaktion",
          "Blir paralyserad av för mycket processmedvetenhet"
        ]
      },
      hiddenScore: 3,
      feedback: "Jag observerade att du flera gånger pausade och justerade din approach när du märkte att föräldern blev tystare. Din medvetenhet om samtalsdynamiken visade sig när du bytte från frågor till mer lyssning. Detta visar god realtidsprocessmedvetenhet.",
      exampleFeedback: {
        emerging: [
          "Du verkade helt fokuserad på att få fram ditt budskap utan att märka förälderns reaktioner. Nästa gång prova att pausa då och då och fråga dig: 'Hur mottas det jag säger just nu?'",
          "Ditt samtal flöt på utan att du verkade reflektera över hur det gick. Överväg att utveckla en inre röst som frågar: 'Fungerar min strategi just nu?'"
        ],
        developing: [
          "Du visade några tecken på att märka när samtalet inte flöt som förväntat, men du verkade osäker på hur du skulle justera. Prova att experimentera med att säga: 'Jag märker att vi fastnat lite här, ska vi prova något annat?'",
          "Din medvetenhet om egen process kom mest efteråt. Nästa gång försök att skapa små interna checkpoints: 'Hur går det här? Ska jag fortsätta eller ändra riktning?'"
        ],
        proficient: [
          "Du visade fin förmåga att märka när din approach inte fungerade och justerade naturligt. När du bytte från att förklara till att fråga visade du god processflexibilitet i realtid.",
          "Din självmonitorering fungerade väl - du fångade upp signaler från föräldern och anpassade ditt sätt att kommunicera. Detta skapade en mer responsiv och naturlig interaktion."
        ],
        advanced: [
          "Din sofistikerade processmedvetenhet visade sig i hur smidigt du växlade mellan olika strategier beroende på samtalsdynamiken. Du verkade ha en inre kompass som guidade dig utan att störa närvaron.",
          "Du demonstrerade exceptionell metakognitiv kontroll genom att simultaneously hålla både innehåll och process i medvetandet, vilket skapade ett mycket anpassningsbart och responsivt samtal."
        ]
      },
      processIndicators: {
        positive: [
          "Pausar naturligt för att känna av stämningen",
          "Justerar tempo och approach baserat på andras reaktioner", 
          "Visar genom kroppsspråk och tonfall att hen processar information",
          "Kommenterar på samtalets process: 'Jag märker att...'"
        ],
        concerning: [
          "Fortsätter med samma strategi trots tecken på att det inte fungerar",
          "Verkar överraskad av andras reaktioner som varit tydliga en stund",
          "Ingen synlig anpassning av stil eller approach under samtalet",
          "Verkar helt fokuserad på innehåll utan processmedvetenhet"
        ]
      },
      developmentalContext: {
        typicalTiming: "Utvecklas gradvis genom hela samtalet, mest synligt vid övergångar och utmaningar",
        prerequisites: [
          "Grundläggande närvaro och uppmärksamhet",
          "Förmåga att läsa sociala signaler",
          "Viss självreflektion efter interaktioner"
        ],
        connections: [
          "Förstärker adaptiv flexibilitet",
          "Stödjer emotionell reglering",
          "Möjliggör sofistikerad timing och flow"
        ]
      }
    },
    {
      id: "adaptive-flexibility",
      label: "Adaptiv flexibilitet i strategival",
      definition: "Förmåga att medvetet växla mellan olika kommunikationsstrategier baserat på situationens krav och andras respons",
      notes: {
        deficits: [
          "Fastnar i en approach även när den inte fungerar",
          "Har begränsad repertoar av strategier att välja mellan",
          "Kan inte läsa situationella hintar om att ändra riktning"
        ],
        excess: [
          "Växlar strategier så ofta att det skapar förvirring",
          "Experimenterar så mycket att konsistens går förlorad",
          "Blir opålitlig genom för mycket variation i approach"
        ]
      },
      hiddenScore: 2,
      feedback: "Du visade god vilja att prova olika sätt att förklara när föräldern verkade förvirrad, men dina strategibyten kunde ha varit mer systematiska. När du gick från att förklara till att ge exempel var det effektivt, men nästa gång prova att vara mer tydlig med övergångarna.",
      exampleFeedback: {
        emerging: [
          "Du hade en tydlig plan för samtalet men verkade inte ha alternativ när den ursprungliga planen mötte motstånd. Nästa gång förbered 2-3 olika sätt att närma dig samma tema.",
          "När din första approach inte gav resultat fortsatte du med samma strategi. Överväg att utveckla en inre signal som säger: 'Nu behöver jag prova något annat.'"
        ],
        developing: [
          "Du försökte växla strategier när du märkte att det första sättet inte fungerade, men övergångarna blev lite abrupt. Prova att säga: 'Låt mig försöka förklara detta på ett annat sätt.'",
          "Din flexibilitet visade sig när du bytte från frågor till reflektion, men du verkade osäker på val av ny strategi. Bygg upp en mental verktygslåda med olika approaches."
        ],
        proficient: [
          "Du demonstrerade fin strategiflexibilitet när du gick från faktainformation till personliga exempel. Dina övergångar var naturliga och hjälpte föräldern att följa med i resonemanget.",
          "Din förmåga att läsa situationen och anpassa din approach visade god adaptiv flexibilitet. När du märkte förvirring växlade du smidigt till ett mer konkret sätt att kommunicera."
        ],
        advanced: [
          "Du visade sofistikerad strategisk flexibilitet genom att seamlessly växla mellan olika kommunikationsmoder - ibland analytisk, ibland narrativ, ibland reflekterande - allt efter vad situationen krävde.",
          "Din strategiska repertoar och timing var exceptionell. Du läste fint av när varje approach hade gjort sitt och införde nya strategier så naturligt att det stärkte snarare än störde samtalets flöde."
        ]
      },
      processIndicators: {
        positive: [
          "Signalerar tydligt när hen växlar strategi",
          "Har flera olika approaches för samma innehåll",
          "Provar nya strategier när de första inte fungerar",
          "Anpassar kommunikationsstil efter målgrupp"
        ],
        concerning: [
          "Använder samma approach genomgående oavsett respons",
          "Verkar endast ha en strategi för varje situation",
          "Blir frustrerad när första strategin inte fungerar",
          "Växlar strategier utan sammanhang eller förklaring"
        ]
      },
      developmentalContext: {
        typicalTiming: "Mest synligt när ursprunglig strategi möter motstånd eller förvirring",
        prerequisites: [
          "Repertoar av olika kommunikationsstrategier",
          "Förmåga att läsa andras förståelse och engagement",
          "Grundläggande självmonitorering"
        ],
        connections: [
          "Byggd på självmonitorering",
          "Möjliggör responsiv timing",
          "Stöder relationsbyggande genom anpassning"
        ]
      }
    }
  ],
  
  overall: {
    strengths: [
      "Visade god grundläggande processmedvetenhet genom att märka samtalsdynamik",
      "Demonstrerade vilja och förmåga att justera approach under pågående interaktion",
      "Utvecklade naturliga övergångar mellan olika kommunikationsstrategier"
    ],
    areasForImprovement: [
      "Utveckla mer systematisk approach till strategival och övergångar",
      "Bygg upp bredare repertoar av kommunikationsstrategier för olika situationer", 
      "Stärk förmågan att signalera strategiförändringar tydligt för andra"
    ],
    nextSteps: [
      "Prova att skapa interna checkpoints under samtal: 'Hur fungerar mitt nuvarande sätt?'",
      "Experimentera med att tydligt signalera strategibyten: 'Låt mig prova att förklara detta på ett annat sätt'",
      "Utveckla en mental verktygslåda med 3-4 olika approaches för varje typ av samtalsutmaning"
    ]
  },
  
  baseProtocolCompatibility: {
    compatibleProtocols: [
      "conversational-skills-parent-meetings-v1",
      "active-listening-protocols-v1", 
      "collaborative-problem-solving-v1"
    ],
    expectedCorrelations: [
      {
        processCategory: "self-monitoring",
        baseCategory: "minimal-feedback",
        expectedRelationship: "positive",
        description: "God självmonitorering stödjer timing av minimal feedback"
      },
      {
        processCategory: "adaptive-flexibility", 
        baseCategory: "paraphrasing",
        expectedRelationship: "positive",
        description: "Strategisk flexibilitet möjliggör anpassad parafrasering"
      }
    ]
  },
  
  validationRules: DEFAULT_PROCESS_VALIDATION_RULES,
  
  researchMetadata: {
    theoreticalFramework: "Metacognitive theory (Flavell, 1979) and adaptive expertise (Hatano & Inagaki, 1986)",
    supportingResearch: [
      "Schraw, G. (1998). Promoting general metacognitive awareness",
      "Bransford, J. (2000). How People Learn - adaptive expertise chapter"
    ],
    validatedCorrelations: [
      "Positive correlation with professional reflection scales (r=.67)",
      "Moderate correlation with communication effectiveness ratings (r=.54)"
    ]
  },
  
  metadata: {
    createdAt: "2024-01-15T10:00:00Z",
    lastModified: "2024-01-20T14:30:00Z",
    createdBy: "BASIS Process Protocol Team",
    tags: ["metacognition", "process-awareness", "adaptive-learning", "self-regulation"],
    targetAudience: "Advanced trainees and professionals seeking process development",
    estimatedDuration: "20-25 minutes (concurrent with base protocol)",
    difficultyLevel: "advanced"
  }
};

/**
 * Validation and analysis utilities for Process Protocols
 */
export class ProcessProtocolValidator {
  /**
   * Validates that process feedback follows guidelines
   */
  static validateProcessFeedback(
    feedback: string,
    rules: {
      forbiddenTerms: readonly string[];
      requiredPatterns: readonly string[];
      feedbackLimits: { minLength: number; maxLength: number; };
    } = DEFAULT_PROCESS_VALIDATION_RULES
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
    
    // Check for required process-focused patterns
    const hasRequiredPattern = rules.requiredPatterns.some(pattern =>
      lowerFeedback.includes(pattern.toLowerCase())
    );
    
    if (!hasRequiredPattern) {
      violations.push("Feedback must include process-focused language (Jag observerade, Din process, etc.)");
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
   * Validates complete process protocol structure
   */
  static validateProcessProtocol(protocol: ProcessProtocolTemplate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate basic structure
    if (!protocol.id || !protocol.name || !protocol.version) {
      errors.push("Missing required protocol metadata");
    }
    
    // Validate scale compatibility (must be 0-4 for base protocol compatibility)
    if (protocol.scale.range[0] !== 0 || protocol.scale.range[1] !== 4) {
      errors.push("Process protocol scale must be 0-4 for base protocol compatibility");
    }
    
    // Validate categories
    if (!protocol.categories || protocol.categories.length === 0) {
      errors.push("Protocol must have at least one process category");
    }
    
    // Validate each category's feedback
    for (const category of protocol.categories || []) {
      const feedbackValidation = this.validateProcessFeedback(category.feedback, protocol.validationRules);
      if (!feedbackValidation.isValid) {
        errors.push(`Category "${category.label}": ${feedbackValidation.violations.join(", ")}`);
      }
      
      // Validate developmental context if provided
      if (category.developmentalContext) {
        if (!category.developmentalContext.typicalTiming || 
            !category.developmentalContext.prerequisites || 
            category.developmentalContext.prerequisites.length === 0) {
          errors.push(`Category "${category.label}": Incomplete developmental context`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Analyzes correlation potential between process and base protocols
   */
  static analyzeCompatibility(
    processProtocol: ProcessProtocolTemplate,
    baseProtocolId: string
  ): {
    isCompatible: boolean;
    correlationPotential: Array<{
      processCategory: string;
      expectedRelationships: string[];
      analysisValue: 'high' | 'medium' | 'low';
    }>;
  } {
    const isCompatible = processProtocol.baseProtocolCompatibility.compatibleProtocols.includes(baseProtocolId);
    
    const correlationPotential = processProtocol.categories.map(category => {
      const relationships = processProtocol.baseProtocolCompatibility.expectedCorrelations
        .filter(corr => corr.processCategory === category.id)
        .map(corr => corr.description);
        
      let analysisValue: 'high' | 'medium' | 'low' = 'low';
      if (relationships.length >= 2) analysisValue = 'high';
      else if (relationships.length === 1) analysisValue = 'medium';
      
      return {
        processCategory: category.label,
        expectedRelationships: relationships,
        analysisValue
      };
    });
    
    return {
      isCompatible,
      correlationPotential
    };
  }
}