import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  BarChart3, 
  FileText,
  Clock,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { AgentType, NavigatorResponse, AnalystResponse, ReviewerResponse, RubricScore } from '@/types/basis';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agentType: AgentType;
  response?: NavigatorResponse | AnalystResponse | ReviewerResponse | AgentErrorResponse;
  loading?: boolean;
  className?: string;
}

interface AgentErrorResponse {
  error?: string;
  raw?: string;
  type?: string;
}

const agentConfig = {
  navigator: {
    icon: Target,
    color: 'navigator',
    title: 'Navigator Agent',
    badge: 'Feedforward',
    description: 'Proactive guidance and focus direction'
  },
  analyst: {
    icon: BarChart3,
    color: 'analyst',
    title: 'Analyst Agent',
    badge: 'Iterative', 
    description: 'Real-time analysis and feedback'
  },
  reviewer: {
    icon: FileText,
    color: 'reviewer',
    title: 'Reviewer Agent',
    badge: 'Holistic',
    description: 'Comprehensive conversation review'
  }
};

const RubricDisplay: React.FC<{ scores: RubricScore[] | Record<string, number> }> = ({ scores }) => {
  // Convert Record to RubricScore array if needed
  const rubricScores: RubricScore[] = Array.isArray(scores) 
    ? scores 
    : Object.entries(scores).map(([field, score]) => ({ field, score, maxScore: 4 }));

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Performance Rubric</h4>
      <div className="space-y-2">
        {rubricScores.map((score, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span>{score.field}</span>
              <Badge variant={score.score >= 3 ? 'default' : 'secondary'}>
                {score.score}/{score.maxScore || 4}
              </Badge>
            </div>
            <Progress 
              value={(score.score / (score.maxScore || 4)) * 100} 
              className="h-2"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const NavigatorContent: React.FC<{ response: NavigatorResponse }> = ({ response }) => (
  <div className="space-y-4">
    {/* Handle guidance field (more common structure) */}
    {response.guidance && (
      <div className="bg-navigator-light p-3 rounded-lg">
        <h4 className="font-semibold mb-2">Guidance</h4>
        <p className="text-sm">
          {response.guidance}
        </p>
      </div>
    )}

    {/* Handle next_focus if present */}
    {response.next_focus && (
      <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="h-4 w-4" />
          Next Focus
        </h4>
        <p className="text-sm text-muted-foreground">
          {response.next_focus}
        </p>
      </div>
    )}
    
    {/* Handle micro_objective if present */}
    {response.micro_objective && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Micro Objective
          </h4>
          <p className="text-sm text-muted-foreground">
            {response.micro_objective}
          </p>
        </div>
      </>
    )}

    {/* Handle nextSteps */}
    {response.nextSteps && response.nextSteps.length > 0 && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Next Steps</h4>
          <ul className="space-y-1">
            {response.nextSteps.map((step, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-navigator font-semibold mt-1">→</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </>
    )}

    {/* Handle guardrails */}
    {response.guardrails && response.guardrails.length > 0 && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Guardrails</h4>
          <ul className="space-y-1">
            {response.guardrails.map((guardrail, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground mt-1">•</span>
                {guardrail}
              </li>
            ))}
          </ul>
        </div>
      </>
    )}
    
    {/* Handle user_prompt if present */}
    {response.user_prompt && !response.guidance && (
      <div className="bg-navigator-light p-3 rounded-lg">
        <h4 className="font-semibold mb-2">Guidance</h4>
        <p className="text-sm">
          {response.user_prompt}
        </p>
      </div>
    )}
  </div>
);

const AnalystContent: React.FC<{ response: AnalystResponse }> = ({ response }) => (
  <div className="space-y-4">
    {/* Handle rubric display - both array and object formats */}
    {response.rubric && (Array.isArray(response.rubric) ? response.rubric.length > 0 : Object.keys(response.rubric).length > 0) && (
      <>
        <RubricDisplay scores={response.rubric} />
        <Separator />
      </>
    )}
    
    {/* Handle feedback text - prefer 'feedback' over 'past_only_feedback' */}
    {(response.feedback || response.past_only_feedback) && (
      <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Analysis
        </h4>
        <div className="bg-analyst-light p-3 rounded-lg">
          <p className="text-sm">
            {response.feedback || response.past_only_feedback}
          </p>
        </div>
      </div>
    )}

    {/* Handle suggestions */}
    {response.suggestions && response.suggestions.length > 0 && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Suggestions</h4>
          <ul className="space-y-1">
            {response.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-analyst font-semibold mt-1">→</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </>
    )}

    {/* Handle evidence quotes */}
    {response.evidence_quotes && response.evidence_quotes.length > 0 && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Evidence</h4>
          <div className="space-y-2">
            {response.evidence_quotes.map((quote, index) => (
              <blockquote key={index} className="text-sm italic border-l-2 border-muted pl-3">
                "{quote}"
              </blockquote>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
);

const ReviewerContent: React.FC<{ response: ReviewerResponse }> = ({ response }) => (
  <div className="space-y-4">
    {response.rubric_summary.length > 0 && (
      <>
        <RubricDisplay scores={response.rubric_summary} />
        <Separator />
      </>
    )}

    {response.strengths.length > 0 && (
      <div>
        <h4 className="font-semibold mb-2 text-success">Strengths</h4>
        <ul className="space-y-1">
          {response.strengths.map((strength, index) => (
            <li key={index} className="text-sm flex items-start gap-2">
              <span className="text-success mt-1">✓</span>
              {strength}
            </li>
          ))}
        </ul>
      </div>
    )}

    {response.growth_areas.length > 0 && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2 text-warning">Growth Areas</h4>
          <ul className="space-y-1">
            {response.growth_areas.map((area, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-warning mt-1">→</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </>
    )}

    {response.exemplar_quotes.length > 0 && (
      <>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Exemplar Quotes</h4>
          <div className="space-y-2">
            {response.exemplar_quotes.map((quote, index) => (
              <blockquote key={index} className="text-sm italic border-l-2 border-success pl-3">
                "{quote}"
              </blockquote>
            ))}
          </div>
        </div>
      </>
    )}

    {response.summary && (
      <>
        <Separator />
        <div className="bg-reviewer-light p-3 rounded-lg">
          <h4 className="font-semibold mb-2">Overall Assessment</h4>
          <p className="text-sm">
            {response.summary}
          </p>
        </div>
      </>
    )}
  </div>
);

const LoadingContent: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="h-4 bg-muted rounded w-1/2"></div>
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded w-full"></div>
      <div className="h-3 bg-muted rounded w-5/6"></div>
    </div>
  </div>
);

const ErrorContent: React.FC<{ response: AgentErrorResponse; agentType: AgentType }> = ({ response, agentType }) => (
  <div className="space-y-4">
    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
      <h4 className="font-semibold mb-2 text-destructive">Error</h4>
      <p className="text-sm text-destructive">
        {response.error || 'Unknown error occurred'}
      </p>
    </div>
    
    {/* Show raw response in development mode */}
    {process.env.NODE_ENV !== 'production' && response.raw && (
      <>
        <Separator />
        <div className="bg-muted/20 border p-3 rounded-lg">
          <h4 className="font-semibold mb-2 text-sm">Raw Response (Dev Mode)</h4>
          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
            {response.raw}
          </pre>
        </div>
      </>
    )}
  </div>
);

const EmptyContent: React.FC<{ agentType: AgentType }> = ({ agentType }) => {
  const config = agentConfig[agentType];
  const Icon = config.icon;
  
  const emptyMessages = {
    navigator: 'Waiting to provide guidance for your next response',
    analyst: 'Send a message to receive performance feedback',
    reviewer: 'Upload a transcript to receive comprehensive analysis'
  };

  return (
    <div className="text-center py-8 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-3 opacity-50" />
      <p className="text-sm">
        {emptyMessages[agentType]}
      </p>
    </div>
  );
};

export const AgentCard: React.FC<AgentCardProps> = ({ 
  agentType, 
  response, 
  loading = false,
  className 
}) => {
  const config = agentConfig[agentType];
  const Icon = config.icon;

  return (
    <Card className={cn(
      `border-${config.color}/20 transition-all duration-300`,
      response && `shadow-${config.color}`,
      className
    )}>
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-${config.color}`} />
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`w-3 h-3 rounded-full bg-${config.color}`}></div>
          {config.title}
          <Badge 
            variant="outline" 
            className={`border-${config.color} text-${config.color} ml-auto`}
          >
            {config.badge}
          </Badge>
        </CardTitle>
        <CardDescription className="text-sm">
          {config.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <LoadingContent />
        ) : response ? (
          <>
            {/* Handle error responses */}
            {(response as AgentErrorResponse).error ? (
              <ErrorContent response={response as AgentErrorResponse} agentType={agentType} />
            ) : (
              <>
                {/* Handle valid agent responses */}
                {response.type === 'feedforward' && (
                  <NavigatorContent response={response as NavigatorResponse} />
                )}
                {response.type === 'iterative_feedback' && (
                  <AnalystContent response={response as AnalystResponse} />
                )}
                {response.type === 'holistic_feedback' && (
                  <ReviewerContent response={response as ReviewerResponse} />
                )}
                {/* Fallback for responses without proper type but with content */}
                {!response.type && (response as any).guidance && (
                  <NavigatorContent response={response as NavigatorResponse} />
                )}
                {!response.type && (response as any).feedback && (
                  <AnalystContent response={response as AnalystResponse} />
                )}
              </>
            )}
          </>
        ) : (
          <EmptyContent agentType={agentType} />
        )}
      </CardContent>
    </Card>
  );
};

export default AgentCard;