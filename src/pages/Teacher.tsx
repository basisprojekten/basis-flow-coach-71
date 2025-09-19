import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { exerciseApi, lessonApi, codeApi } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  Plus,
  Save,
  Settings,
  BookOpen,
  Target,
  Users,
  FileText,
  Code,
  Upload,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react';

const Teacher = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Original exercise form for the old exercises tab
  const [exerciseForm, setExerciseForm] = useState({
    title: '',
    focusHint: '',
    protocolStack: ['BASIS'],
    toggles: {
      feedforward: true,
      iterative: true,
      mode: 'text' as 'text' | 'voice' | 'transcript',
      skipRoleplayForGlobalFeedback: false
    },
    case: {
      role: '',
      background: '',
      goals: ''
    }
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    objectives: [''],
    exerciseOrder: []
  });

  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);

  // Standalone Exercise Creator State
  const [standaloneExerciseForm, setStandaloneExerciseForm] = useState({
    title: '',
    focus_area: ''
  });
  
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [protocolDocuments, setProtocolDocuments] = useState<any[]>([]);
  const [caseDocument, setCaseDocument] = useState<any>(null);
  
  // Optional Lesson Creator State
  const [newLessonForm, setNewLessonForm] = useState({
    title: ''
  });
  
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});

  const handleCreateExercise = async () => {
    try {
      // Validate required fields
      if (!exerciseForm.title || !exerciseForm.focusHint || !exerciseForm.case.role || !exerciseForm.case.background || !exerciseForm.case.goals) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Create exercise via API
      const result = await exerciseApi.create({
        title: exerciseForm.title,
        focusHint: exerciseForm.focusHint,
        case: exerciseForm.case,
        toggles: exerciseForm.toggles,
        protocolStack: exerciseForm.protocolStack
      });

      // Refresh codes list
      await fetchCodes();
      
      // Show success message
      toast({
        title: "Success",
        description: `Exercise created successfully! Code: ${result.code}`
      });
      
      console.log('Exercise created:', result);
    } catch (error) {
      console.error('Failed to create exercise:', error);
      toast({
        title: "Error",
        description: "Failed to create exercise. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateLesson = async () => {
    try {
      // Validate required fields
      if (!lessonForm.title || lessonForm.objectives.filter(obj => obj.trim()).length === 0) {
        toast({
          title: "Validation Error",
          description: "Please provide a title and at least one learning objective",
          variant: "destructive"
        });
        return;
      }

      // Create lesson via API
      const result = await lessonApi.create({
        title: lessonForm.title,
        objectives: lessonForm.objectives.filter(obj => obj.trim()),
        exerciseOrder: lessonForm.exerciseOrder
      });

      // Refresh codes list
      await fetchCodes();
      
      // Show success message
      toast({
        title: "Success",
        description: `Lesson created successfully! Code: ${result.code}`
      });
      
      console.log('Lesson created:', result);
    } catch (error) {
      console.error('Failed to create lesson:', error);
      toast({
        title: "Error",
        description: "Failed to create lesson. Please try again.",
        variant: "destructive"
      });
    }
  };

  const fetchCodes = async () => {
    try {
      const codes = await codeApi.list();
      setGeneratedCodes(codes);
    } catch (error) {
      console.error('Failed to fetch codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch generated codes",
        variant: "destructive"
      });
    }
  };

  // Standalone Exercise Creator Functions
  const handleCreateStandaloneExercise = async () => {
    if (!standaloneExerciseForm.title.trim() || !standaloneExerciseForm.focus_area.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both title and focus area",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingExercise(true);
    try {
      const { data, error } = await supabase.functions.invoke('lesson-handler', {
        body: {
          type: 'exercise',
          title: standaloneExerciseForm.title,
          focus_area: standaloneExerciseForm.focus_area,
          lesson_id: null // Standalone exercise
        }
      });

      if (error) throw error;

      if (data.success) {
        setCurrentExercise(data.exercise);
        toast({
          title: "Success",
          description: "Standalone exercise created successfully!"
        });
      }
    } catch (error) {
      console.error('Failed to create exercise:', error);
      toast({
        title: "Error",
        description: "Failed to create exercise. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingExercise(false);
    }
  };

  // Optional Lesson Creator Functions
  const handleCreateNewLesson = async () => {
    if (!newLessonForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a lesson title",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingLesson(true);
    try {
      const { data, error } = await supabase.functions.invoke('lesson-handler', {
        body: {
          type: 'lesson',
          title: newLessonForm.title
        }
      });

      if (error) throw error;

      if (data.success) {
        setNewLessonForm({ title: '' });
        toast({
          title: "Success",
          description: "Lesson created successfully!"
        });
      }
    } catch (error) {
      console.error('Failed to create lesson:', error);
      toast({
        title: "Error",
        description: "Failed to create lesson. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: 'case' | 'protocol') => {
    if (!currentExercise) {
      toast({
        title: "Error",
        description: "Please create an exercise first",
        variant: "destructive"
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Only .docx files are supported",
        variant: "destructive"
      });
      return;
    }

    const uploadKey = `${currentExercise.id}-${documentType}-${Date.now()}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('exercise_id', currentExercise.id);
      formData.append('document_type', documentType);

      const { data, error } = await supabase.functions.invoke('document-uploader', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        if (documentType === 'case') {
          setCaseDocument(data.document);
        } else {
          setProtocolDocuments(prev => [...prev, data.document]);
        }
        
        toast({
          title: "Success",
          description: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} document uploaded successfully!`
        });
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const resetExerciseCreator = () => {
    setCurrentExercise(null);
    setProtocolDocuments([]);
    setCaseDocument(null);
    setStandaloneExerciseForm({ title: '', focus_area: '' });
  };

  // Fetch codes on component mount
  React.useEffect(() => {
    fetchCodes();
  }, []);

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
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
                <p className="text-sm text-muted-foreground">Create and manage training content</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              <Settings className="h-3 w-3 mr-1" />
              Admin Mode
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="exercise-creator" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exercise-creator" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Exercise Creator
            </TabsTrigger>
            <TabsTrigger value="lesson-creator" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lesson Creator
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Old Exercises
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Generated Codes
            </TabsTrigger>
          </TabsList>

          {/* Standalone Exercise Creator */}
          <TabsContent value="exercise-creator" className="space-y-6">
            {!currentExercise ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Create Standalone Exercise
                  </CardTitle>
                  <CardDescription>
                    Create a complete exercise with documents. No lesson required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="standalone-exercise-title">Exercise Title</Label>
                      <Input
                        id="standalone-exercise-title"
                        value={standaloneExerciseForm.title}
                        onChange={(e) => setStandaloneExerciseForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Difficult Conversation Practice"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="standalone-exercise-focus">Focus Area</Label>
                      <Input
                        id="standalone-exercise-focus"
                        value={standaloneExerciseForm.focus_area}
                        onChange={(e) => setStandaloneExerciseForm(prev => ({ ...prev, focus_area: e.target.value }))}
                        placeholder="e.g., Active listening and empathy"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleCreateStandaloneExercise}
                      disabled={isCreatingExercise || !standaloneExerciseForm.title.trim() || !standaloneExerciseForm.focus_area.trim()}
                    >
                      {isCreatingExercise ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Exercise
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Current Exercise Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          {currentExercise.title}
                        </CardTitle>
                        <CardDescription>
                          Focus: {currentExercise.focus_area} | ID: {currentExercise.id}
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={resetExerciseCreator}>
                        <X className="h-4 w-4 mr-2" />
                        Create New Exercise
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Document Upload Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Case Document Upload */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Case Document
                      </CardTitle>
                      <CardDescription>
                        Upload the case document (.docx file)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!caseDocument ? (
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'case');
                            }}
                            className="cursor-pointer"
                          />
                          <p className="text-sm text-muted-foreground">
                            Select a .docx file for the case document
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">{caseDocument.file_name}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Protocol Documents Upload */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Protocol Documents
                      </CardTitle>
                      <CardDescription>
                        Upload multiple protocol documents (.docx files)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.docx';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleFileUpload(file, 'protocol');
                            };
                            input.click();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Protocol
                        </Button>
                      </div>
                      
                      {protocolDocuments.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Uploaded Protocols ({protocolDocuments.length})</Label>
                          <div className="space-y-2">
                            {protocolDocuments.map((doc, index) => (
                              <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{doc.file_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Optional Lesson Creator */}
          <TabsContent value="lesson-creator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Create New Lesson
                </CardTitle>
                <CardDescription>
                  Create a lesson container (exercises can be linked later).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-lesson-title">Lesson Title</Label>
                  <Input
                    id="new-lesson-title"
                    value={newLessonForm.title}
                    onChange={(e) => setNewLessonForm({ title: e.target.value })}
                    placeholder="e.g., Advanced Communication Skills Training"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleCreateNewLesson}
                    disabled={isCreatingLesson || !newLessonForm.title.trim()}
                  >
                    {isCreatingLesson ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create Lesson
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Old Exercise Creation (original functionality) */}
          <TabsContent value="exercises" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Create Exercise (Legacy)
                </CardTitle>
                <CardDescription>
                  Define a training exercise with protocols, case studies, and agent configurations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exercise-title">Exercise Title</Label>
                    <Input
                      id="exercise-title"
                      value={exerciseForm.title}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Confidentiality Discussion Training"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="focus-hint">Focus Hint</Label>
                    <Input
                      id="focus-hint"
                      value={exerciseForm.focusHint}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, focusHint: e.target.value }))}
                      placeholder="Main learning objective"
                    />
                  </div>
                </div>

                {/* Case Study */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Case Study Configuration</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="case-role">Case Role</Label>
                      <Input
                        id="case-role"
                        value={exerciseForm.case.role}
                        onChange={(e) => setExerciseForm(prev => ({ 
                          ...prev, 
                          case: { ...prev.case, role: e.target.value }
                        }))}
                        placeholder="e.g., Concerned Parent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="case-background">Background</Label>
                      <Textarea
                        id="case-background"
                        value={exerciseForm.case.background}
                        onChange={(e) => setExerciseForm(prev => ({ 
                          ...prev, 
                          case: { ...prev.case, background: e.target.value }
                        }))}
                        placeholder="Provide context and scenario details..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="case-goals">Goals</Label>
                      <Textarea
                        id="case-goals"
                        value={exerciseForm.case.goals}
                        onChange={(e) => setExerciseForm(prev => ({ 
                          ...prev, 
                          case: { ...prev.case, goals: e.target.value }
                        }))}
                        placeholder="What should the student achieve in this conversation?"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button variant="gradient-primary" onClick={handleCreateExercise}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Exercise
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generated Codes */}
          <TabsContent value="codes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Generated Codes
                </CardTitle>
                <CardDescription>
                  Access codes for created exercises and lessons. Share with students.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedCodes.length > 0 ? (
                  <div className="space-y-4">
                    {generatedCodes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {code.type === 'exercise' ? (
                              <Target className="h-4 w-4 text-primary" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-semibold">{code.title}</span>
                            <Badge variant={code.type === 'exercise' ? 'default' : 'secondary'}>
                              {code.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(code.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-primary">
                            {code.id}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Share this code
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No codes generated yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create exercises or lessons to generate access codes for students.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Instructions for Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">How students use codes:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Go to the student portal</li>
                      <li>Enter the provided code</li>
                      <li>Complete the training exercise or lesson</li>
                      <li>Receive feedback and progress tracking</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Teacher;