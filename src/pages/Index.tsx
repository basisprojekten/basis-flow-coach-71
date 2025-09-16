import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  FileText, 
  Target, 
  ArrowRight,
  BookOpen,
  MessageSquare,
  BarChart3
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">
              BASIS Training Platform
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Advanced conversation technique training with AI-powered agents for 
              feedforward guidance, iterative analysis, and comprehensive review.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/teacher')}
                className="text-lg px-8"
              >
                <GraduationCap className="mr-2 h-5 w-5" />
                Teacher Dashboard
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/student')}
                className="text-lg px-8 border-white/20 text-white hover:bg-white/10"
              >
                <Users className="mr-2 h-5 w-5" />
                Student Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Agent Overview */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Three Specialized AI Agents</h2>
            <p className="text-lg text-muted-foreground">
              Each agent serves a distinct temporal role in the learning process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Navigator Agent */}
            <Card className="relative overflow-hidden group hover:shadow-navigator transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-navigator" />
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-navigator-light">
                    <Target className="h-6 w-6 text-navigator" />
                  </div>
                  <Badge variant="outline" className="border-navigator text-navigator">
                    Feedforward
                  </Badge>
                </div>
                <CardTitle className="text-xl">Navigator Agent</CardTitle>
                <CardDescription>
                  Proactive guidance and focus direction before and during conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Pre-conversation briefing</li>
                  <li>• Real-time focus direction</li>
                  <li>• Forward-looking objectives</li>
                  <li>• Strategic guidance</li>
                </ul>
              </CardContent>
            </Card>

            {/* Analyst Agent */}
            <Card className="relative overflow-hidden group hover:shadow-analyst transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-analyst" />
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-analyst-light">
                    <BarChart3 className="h-6 w-6 text-analyst" />
                  </div>
                  <Badge variant="outline" className="border-analyst text-analyst">
                    Iterative
                  </Badge>
                </div>
                <CardTitle className="text-xl">Analyst Agent</CardTitle>
                <CardDescription>
                  Real-time analysis and feedback after each student response
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Immediate response analysis</li>
                  <li>• Rubric-based scoring</li>
                  <li>• Evidence-backed feedback</li>
                  <li>• Retrospective insights</li>
                </ul>
              </CardContent>
            </Card>

            {/* Reviewer Agent */}
            <Card className="relative overflow-hidden group hover:shadow-reviewer transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-reviewer" />
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-reviewer-light">
                    <FileText className="h-6 w-6 text-reviewer" />
                  </div>
                  <Badge variant="outline" className="border-reviewer text-reviewer">
                    Holistic
                  </Badge>
                </div>
                <CardTitle className="text-xl">Reviewer Agent</CardTitle>
                <CardDescription>
                  Comprehensive analysis of complete conversation transcripts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Complete conversation review</li>
                  <li>• Overall performance summary</li>
                  <li>• Pattern identification</li>
                  <li>• Development recommendations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Comprehensive Training System</h2>
            <p className="text-lg text-muted-foreground">
              Built for educators and students with advanced conversation technique protocols
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Protocol-Based Learning</h3>
                  <p className="text-muted-foreground">
                    Structured rubrics ensure consistent evaluation across all training sessions.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Interactive Conversations</h3>
                  <p className="text-muted-foreground">
                    Practice real-world scenarios with AI-powered conversation partners.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Multi-Modal Feedback</h3>
                  <p className="text-muted-foreground">
                    Receive guidance before, during, and after training sessions.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/10">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Ready to Start?</h3>
                  <p className="text-muted-foreground mb-6">
                    Choose your role to begin your BASIS training experience.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => navigate('/teacher')}
                    >
                      Create Training Content
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="lg"
                      onClick={() => navigate('/student')}
                    >
                      Start Learning Session
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/20 py-12">
        <div className="container mx-auto px-6">
          <Separator className="mb-8" />
          <div className="text-center text-muted-foreground">
            <p>BASIS Training Platform - Advanced Conversation Technique Training</p>
            <p className="mt-2 text-sm">Powered by OpenAI Agents SDK</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;