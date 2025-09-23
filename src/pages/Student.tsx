import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AgentCard from '@/components/AgentCard';
import { AgentResponseSet, ConversationMessage } from '@/types/basis';
import { sessionApi, transcriptApi, BasisApiError } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  Send,
  MessageSquare,
  FileText,
  User,
  Bot,
  Play,
  Loader2,
  Download,
  CheckCircle
} from 'lucide-react';

const Student = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState('');
  const [sessionMode, setSessionMode] = useState<'exercise' | 'lesson' | 'transcript' | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  
  // Conversation history
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);

  // Agent responses state
  const [agentResponses, setAgentResponses] = useState<AgentResponseSet>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState<any>(null);
  const [exerciseTitle, setExerciseTitle] = useState<string>('');

  const handleStartSession = async () => {
    if (!accessCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an access code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let sessionRequest;
      if (accessCode.startsWith('EX-')) {
        sessionRequest = { exerciseCode: accessCode };
        setSessionMode('exercise');
      } else if (accessCode.startsWith('LS-')) {
        sessionRequest = { lessonCode: accessCode };
        setSessionMode('lesson');
      } else {
        toast({
          title: "Invalid Access Code",
          description: "Use format EX-XXXXXX for exercises or LS-XXXXXX for lessons",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await sessionApi.start(sessionRequest);
      setSessionId(response.session.id);
      
      // Initialize conversation with system message
      const systemMessage: ConversationMessage = {
        id: 'system_welcome',
        role: 'system',
        content: 'Welcome to your BASIS training session. You will be practicing conversation techniques with a concerned parent role.',
        timestamp: new Date()
      };
      setConversation([systemMessage]);
      
      // Set initial guidance if provided
      if (response.initialGuidance) {
        setAgentResponses(response.initialGuidance);
      }

      toast({
        title: "Session Started",
        description: `Training session ${response.session.id} has begun`,
      });

    } catch (error) {
      if (error instanceof BasisApiError) {
        toast({
          title: "Session Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to connect to training server",
          variant: "destructive",
        });
      }
      setSessionMode(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !sessionId) return;

    setIsLoading(true);

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setCurrentMessage('');

    try {
      const response = await sessionApi.sendInput(sessionId, {
        content: currentMessage,
        timestamp: new Date()
      });

      // Add AI response to conversation if provided
      if (response.aiResponse) {
        const aiMessage: ConversationMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: response.aiResponse,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, aiMessage]);
      }

      // Update agent feedback
      setAgentResponses(response.agentFeedback);

    } catch (error) {
      if (error instanceof BasisApiError) {
        if (error.errorCode === 'ANALYSIS_QUALITY_ERROR') {
          toast({
            title: "Feedback Generation Issue",
            description: "Feedback could not be generated due to protocol deviation. Please try rephrasing your response.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Session Error", 
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to send message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscriptAnalysis = async () => {
    if (!transcriptText.trim()) return;

    setIsLoading(true);

    try {
      const response = await transcriptApi.review({
        transcript: transcriptText,
        protocolIds: ['basis-v1'], // Default to BASIS protocol
        exerciseConfig: {
          focusHint: 'General conversation analysis',
          caseRole: 'Concerned Parent',
          caseBackground: 'Parent discussing child-related concerns'
        }
      });

      setAgentResponses({
        reviewer: response.analysis.reviewer
      });

      toast({
        title: "Analysis Complete",
        description: `Analyzed ${response.metadata.wordCount} words (≈${response.metadata.estimatedDuration} min conversation)`,
      });

    } catch (error) {
      if (error instanceof BasisApiError) {
        if (error.errorCode === 'TRANSCRIPT_TOO_LARGE') {
          toast({
            title: "Transcript Too Large",
            description: "Please use a shorter transcript (max 50,000 characters)",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Analysis Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Connection Error", 
          description: "Unable to analyze transcript. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      const result = await sessionApi.endSession(sessionId);
      
      setFinalFeedback(result.finalFeedback);
      setExerciseTitle(result.exerciseTitle || 'Träningssession');
      setIsReviewComplete(true);

      toast({
        title: "Session Avslutad",
        description: "Din slutgiltiga feedback är redo att granska",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Kunde inte avsluta sessionen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!conversation.length && !finalFeedback) return;

    // Format conversation history
    let transcriptContent = `# Samtalstranskription: ${exerciseTitle}\n\n`;
    
    // Add conversation history
    for (const message of conversation) {
      const timestamp = message.timestamp.toLocaleTimeString('sv-SE');
      
      if (message.role === 'system') {
        transcriptContent += `**System (${timestamp}):** ${message.content}\n\n`;
      } else if (message.role === 'user') {
        transcriptContent += `**Student (${timestamp}):** ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        transcriptContent += `**Rollperson (${timestamp}):** ${message.content}\n\n`;
      }
    }

    // Add agent feedback throughout the conversation
    if (Object.keys(agentResponses).length > 0) {
      transcriptContent += `---\n\n## Agent Feedback Under Sessionen\n\n`;
      
      if (agentResponses.navigator) {
        transcriptContent += `**Navigator:** ${agentResponses.navigator.guidance || agentResponses.navigator.user_prompt || 'Vägledning given'}\n\n`;
      }
      
      if (agentResponses.analyst) {
        transcriptContent += `**Analyst:** ${agentResponses.analyst.feedback || 'Feedback given'}\n\n`;
      }
    }

    // Add final feedback
    if (finalFeedback) {
      transcriptContent += `---\n\n## Slutgiltig Feedback\n\n`;
      transcriptContent += `**Reviewer:** ${finalFeedback.content}\n\n`;
    }

    // Create and download file
    const blob = new Blob([transcriptContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `transkription-${exerciseTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Transkription Nedladdad",
      description: "Fullständig samtalstranskription har sparats",
    });
  };

  if (!sessionMode) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">Student Portal</h1>
                <p className="text-sm text-muted-foreground">Access your training sessions</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Access Training Session</CardTitle>
                <CardDescription>
                  Enter your access code to begin training or analyze a transcript
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="access-code">Access Code</Label>
                  <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="EX-XXXXXXXX or LS-XXXXXXXX"
                    className="text-center font-mono text-lg"
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Use EX- for individual exercises or LS- for complete lessons
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Button 
                    size="lg" 
                    onClick={handleStartSession}
                    disabled={!accessCode || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? 'Starting...' : 'Start Session'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => setSessionMode('transcript')}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Analyze Transcript
                  </Button>
                </div>

                <Separator />

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">Demo codes for testing:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Badge variant="outline" className="font-mono">EX-DEMO001</Badge>
                    <Badge variant="outline" className="font-mono">LS-DEMO001</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (sessionMode === 'transcript') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSessionMode(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">Transcript Analysis</h1>
                <p className="text-sm text-muted-foreground">Upload transcript for holistic review</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Transcript Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Conversation Transcript
                </CardTitle>
                <CardDescription>
                  Paste your conversation transcript for comprehensive analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste your conversation transcript here..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={handleTranscriptAnalysis}
                  disabled={!transcriptText.trim() || isLoading}
                  variant="reviewer"
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Analyzing...' : 'Analyze Transcript'}
                </Button>
              </CardContent>
            </Card>

            {/* Reviewer Feedback */}
            <AgentCard 
              agentType="reviewer"
              response={agentResponses.reviewer}
              loading={isLoading && !agentResponses.reviewer}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSessionMode(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">Training Session</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionMode === 'exercise' ? 'Individual Exercise' : 'Lesson Sequence'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {accessCode}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conversation Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation
              </CardTitle>
              <CardDescription>
                Practice conversation with AI role-play partner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conversation History */}
              <div className="h-96 border rounded-lg p-4 overflow-y-auto space-y-4 bg-muted/20">
                {conversation.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`flex gap-3 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      <div className={`p-2 rounded-full ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.role === 'system'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-accent text-accent-foreground'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.role === 'system'
                          ? 'bg-muted/50 text-muted-foreground'
                          : 'bg-card border'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder={isReviewComplete ? "Sessionen är avslutad" : "Type your response..."}
                  rows={2}
                  className="flex-1"
                  disabled={isReviewComplete}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading || isReviewComplete}
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Session Control Buttons */}
              <div className="flex gap-2 justify-center">
                {!isReviewComplete ? (
                  <Button 
                    onClick={handleEndSession}
                    disabled={isLoading || conversation.length < 2}
                    variant="outline"
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Avsluta rollspel och begär feedback
                  </Button>
                ) : (
                  <Button 
                    onClick={downloadTranscript}
                    variant="outline"
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Ladda ner transkription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agent Feedback Panel */}
          <div className="space-y-6">
            {!isReviewComplete ? (
              <>
                <AgentCard 
                  agentType="navigator"
                  response={agentResponses.navigator}
                  loading={isLoading && !agentResponses.navigator}
                />
                <AgentCard 
                  agentType="analyst"
                  response={agentResponses.analyst}
                  loading={isLoading && !agentResponses.analyst}
                />
              </>
            ) : (
              <AgentCard 
                agentType="reviewer"
                response={finalFeedback}
                loading={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Student;