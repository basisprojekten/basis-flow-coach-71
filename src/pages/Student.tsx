import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import AgentCard from '@/components/AgentCard';
import { AgentResponseSet, ConversationMessage } from '@/types/basis';
import { 
  ArrowLeft,
  Send,
  MessageSquare,
  FileText,
  User,
  Bot,
  Play,
  Loader2
} from 'lucide-react';

const Student = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [sessionMode, setSessionMode] = useState<'exercise' | 'lesson' | 'transcript' | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  
  // Mock conversation history
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to your BASIS training session. You will be practicing conversation techniques with a concerned parent role. The Navigator agent will guide you before each response.',
      timestamp: new Date()
    }
  ]);

  // Agent responses state
  const [agentResponses, setAgentResponses] = useState<AgentResponseSet>({
    navigator: {
      type: 'feedforward',
      next_focus: 'Establish rapport and demonstrate active listening',
      micro_objective: 'Ask open-ended questions to understand the parent\'s concerns',
      guardrails: ['Maintain professional boundaries', 'Show empathy without making promises'],
      user_prompt: 'Focus on building trust through careful listening and thoughtful responses.'
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = () => {
    if (accessCode.startsWith('EX-')) {
      setSessionMode('exercise');
    } else if (accessCode.startsWith('LS-')) {
      setSessionMode('lesson');
    } else {
      // Mock validation - in real app would call API
      alert('Invalid access code. Use format EX-XXXXXX for exercises or LS-XXXXXX for lessons.');
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    setIsLoading(true);

    // Add user message to conversation
    const newMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, newMessage]);

    // Mock AI response
    const aiResponse: ConversationMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: 'I understand your concerns about your child\'s progress. Can you tell me more about the specific challenges you\'ve noticed at home?',
      timestamp: new Date()
    };

    setTimeout(() => {
      setConversation(prev => [...prev, aiResponse]);
      
      // Mock analyst feedback
      setAgentResponses(prev => ({
        ...prev,
        analyst: {
          type: 'iterative_feedback',
          segment_id: `seg_${Date.now()}`,
          rubric: [
            { field: 'Active Listening', score: 3 },
            { field: 'Empathy', score: 2 },
            { field: 'Professionalism', score: 3 }
          ],
          evidence_quotes: [currentMessage],
          past_only_feedback: 'Your response demonstrated good professional boundaries. The question was appropriately open-ended, though you could have acknowledged the parent\'s emotional state more directly.'
        }
      }));

      setIsLoading(false);
    }, 1500);

    setCurrentMessage('');
  };

  const handleTranscriptAnalysis = () => {
    if (!transcriptText.trim()) return;

    setIsLoading(true);

    // Mock reviewer response
    setTimeout(() => {
      setAgentResponses(prev => ({
        ...prev,
        reviewer: {
          type: 'holistic_feedback',
          rubric_summary: [
            { field: 'Active Listening', score: 3 },
            { field: 'Empathy', score: 2 },
            { field: 'Professionalism', score: 4 },
            { field: 'Problem Resolution', score: 3 }
          ],
          strengths: [
            'Maintained professional boundaries throughout',
            'Asked appropriate follow-up questions',
            'Demonstrated patience with emotional responses'
          ],
          growth_areas: [
            'Could improve emotional validation techniques',
            'Opportunity to summarize understanding more frequently'
          ],
          exemplar_quotes: [
            'I understand this must be very concerning for you as a parent.',
            'Can you help me understand what specific behaviors you\'ve observed?'
          ],
          summary: 'Overall strong performance with good professional boundaries and appropriate questioning techniques. Focus on enhancing emotional validation skills in future sessions.'
        }
      }));

      setIsLoading(false);
    }, 2000);
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
                    disabled={!accessCode}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
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
                  placeholder="Type your response..."
                  rows={2}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agent Feedback Panel */}
          <div className="space-y-6">
            {/* Navigator Card */}
            <AgentCard 
              agentType="navigator"
              response={agentResponses.navigator}
            />

            {/* Analyst Card */}
            <AgentCard 
              agentType="analyst"
              response={agentResponses.analyst}
              loading={isLoading && !agentResponses.analyst}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Student;