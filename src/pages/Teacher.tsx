import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Eye,
  Upload,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react';

const Teacher = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  // New Lesson Creator State
  const [newLessonForm, setNewLessonForm] = useState({
    title: ''
  });
  
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [lessonExercises, setLessonExercises] = useState<any[]>([]);
  
  const [newExerciseForm, setNewExerciseForm] = useState({
    title: '',
    focus_area: ''
  });
  
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

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

  // New Lesson Creator Functions
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
        setCurrentLesson(data.lesson);
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

  const handleAddExercise = async () => {
    if (!newExerciseForm.title.trim() || !newExerciseForm.focus_area.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both title and focus area",
        variant: "destructive"
      });
      return;
    }

    if (!currentLesson) {
      toast({
        title: "Error",
        description: "Please create a lesson first",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingExercise(true);
    try {
      const { data, error } = await supabase.functions.invoke('lesson-handler', {
        body: {
          type: 'exercise',
          title: newExerciseForm.title,
          focus_area: newExerciseForm.focus_area,
          lesson_id: currentLesson.id
        }
      });

      if (error) throw error;

      if (data.success) {
        const newExercise = { ...data.exercise, documents: [] };
        setLessonExercises(prev => [...prev, newExercise]);
        setNewExerciseForm({ title: '', focus_area: '' });
        toast({
          title: "Success",
          description: "Exercise added successfully!"
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

  const handleFileUpload = async (exerciseId: string, file: File, documentType: 'case' | 'protocol') => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Only .docx files are supported",
        variant: "destructive"
      });
      return;
    }

    const uploadKey = `${exerciseId}-${documentType}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('exercise_id', exerciseId);
      formData.append('document_type', documentType);

      const { data, error } = await supabase.functions.invoke('document-uploader', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        // Update the exercise's documents in state
        setLessonExercises(prev => prev.map(ex => 
          ex.id === exerciseId 
            ? { ...ex, documents: [...(ex.documents || []), data.document] }
            : ex
        ));
        
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

  const resetLessonCreator = () => {
    setCurrentLesson(null);
    setLessonExercises([]);
    setNewLessonForm({ title: '' });
    setNewExerciseForm({ title: '', focus_area: '' });
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
        <Tabs defaultValue="lesson-creator" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lesson-creator" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lesson Creator
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Exercises
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lessons
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Generated Codes
            </TabsTrigger>
          </TabsList>

          {/* New Lesson Creator */}
          <TabsContent value="lesson-creator" className="space-y-6">
            {!currentLesson ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Create New Lesson
                  </CardTitle>
                  <CardDescription>
                    Start by creating a lesson container, then add exercises and upload documents.
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
            ) : (
              <div className="space-y-6">
                {/* Current Lesson Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          {currentLesson.title}
                        </CardTitle>
                        <CardDescription>
                          Lesson ID: {currentLesson.id}
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={resetLessonCreator}>
                        <X className="h-4 w-4 mr-2" />
                        Start New Lesson
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Add Exercise */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Add Exercise
                    </CardTitle>
                    <CardDescription>
                      Add exercises to your lesson with title and focus area.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="exercise-title">Exercise Title</Label>
                        <Input
                          id="exercise-title"
                          value={newExerciseForm.title}
                          onChange={(e) => setNewExerciseForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Difficult Conversation Practice"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exercise-focus">Focus Area</Label>
                        <Input
                          id="exercise-focus"
                          value={newExerciseForm.focus_area}
                          onChange={(e) => setNewExerciseForm(prev => ({ ...prev, focus_area: e.target.value }))}
                          placeholder="e.g., Active listening and empathy"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddExercise}
                        disabled={isCreatingExercise || !newExerciseForm.title.trim() || !newExerciseForm.focus_area.trim()}
                      >
                        {isCreatingExercise ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add Exercise
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Exercises List */}
                {lessonExercises.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Lesson Exercises ({lessonExercises.length})</CardTitle>
                      <CardDescription>
                        Upload case and protocol documents for each exercise.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {lessonExercises.map((exercise, index) => (
                        <Card key={exercise.id} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{exercise.title}</h4>
                                <p className="text-sm text-muted-foreground">{exercise.focus_area}</p>
                              </div>
                              <Badge variant="outline">Exercise {index + 1}</Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Case Document Upload */}
                              <div className="space-y-2">
                                <Label>Case Document (.docx)</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept=".docx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(exercise.id, file, 'case');
                                    }}
                                    className="hidden"
                                    id={`case-${exercise.id}`}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`case-${exercise.id}`)?.click()}
                                    disabled={uploadingFiles[`${exercise.id}-case`]}
                                  >
                                    {uploadingFiles[`${exercise.id}-case`] ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Upload Case
                                  </Button>
                                  {exercise.documents?.some((d: any) => d.document_type === 'case') && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Uploaded
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Protocol Document Upload */}
                              <div className="space-y-2">
                                <Label>Protocol Document (.docx)</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept=".docx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(exercise.id, file, 'protocol');
                                    }}
                                    className="hidden"
                                    id={`protocol-${exercise.id}`}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`protocol-${exercise.id}`)?.click()}
                                    disabled={uploadingFiles[`${exercise.id}-protocol`]}
                                  >
                                    {uploadingFiles[`${exercise.id}-protocol`] ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Upload Protocol
                                  </Button>
                                  {exercise.documents?.some((d: any) => d.document_type === 'protocol') && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Uploaded
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Documents Summary */}
                            {exercise.documents && exercise.documents.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm">Uploaded Documents:</Label>
                                <div className="flex flex-wrap gap-2">
                                  {exercise.documents.map((doc: any) => (
                                    <Badge key={doc.id} variant="outline" className="text-xs">
                                      {doc.document_type}: {doc.file_name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Lesson Complete Status */}
                {lessonExercises.length > 0 && (
                  <Card className="border-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-primary">Lesson Status</h4>
                          <p className="text-sm text-muted-foreground">
                            {lessonExercises.length} exercise{lessonExercises.length !== 1 ? 's' : ''} created
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Exercise Creation */}
          <TabsContent value="exercises" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Create Exercise
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

                {/* Agent Toggles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Agent Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-navigator"></div>
                            Navigator (Feedforward)
                          </Label>
                          <p className="text-sm text-muted-foreground">Proactive guidance</p>
                        </div>
                        <Switch
                          checked={exerciseForm.toggles.feedforward}
                          onCheckedChange={(checked) => 
                            setExerciseForm(prev => ({ 
                              ...prev, 
                              toggles: { ...prev.toggles, feedforward: checked }
                            }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-analyst"></div>
                            Analyst (Iterative)
                          </Label>
                          <p className="text-sm text-muted-foreground">Real-time feedback</p>
                        </div>
                        <Switch
                          checked={exerciseForm.toggles.iterative}
                          onCheckedChange={(checked) => 
                            setExerciseForm(prev => ({ 
                              ...prev, 
                              toggles: { ...prev.toggles, iterative: checked }
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Training Mode</Label>
                        <div className="flex gap-2">
                          {(['text', 'voice', 'transcript'] as const).map((mode) => (
                            <Button
                              key={mode}
                              variant={exerciseForm.toggles.mode === mode ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setExerciseForm(prev => ({ 
                                ...prev, 
                                toggles: { ...prev.toggles, mode }
                              }))}
                              className="capitalize"
                            >
                              {mode}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="gradient-primary" onClick={handleCreateExercise}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Exercise
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lesson Creation */}
          <TabsContent value="lessons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Create Lesson
                </CardTitle>
                <CardDescription>
                  Organize multiple exercises into a structured learning sequence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson-title">Lesson Title</Label>
                    <Input
                      id="lesson-title"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Advanced Communication Techniques"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Learning Objectives</Label>
                  {lessonForm.objectives.map((objective, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={objective}
                        onChange={(e) => {
                          const newObjectives = [...lessonForm.objectives];
                          newObjectives[index] = e.target.value;
                          setLessonForm(prev => ({ ...prev, objectives: newObjectives }));
                        }}
                        placeholder={`Objective ${index + 1}`}
                      />
                      {lessonForm.objectives.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newObjectives = lessonForm.objectives.filter((_, i) => i !== index);
                            setLessonForm(prev => ({ ...prev, objectives: newObjectives }));
                          }}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLessonForm(prev => ({ 
                      ...prev, 
                      objectives: [...prev.objectives, ''] 
                    }))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Objective
                  </Button>
                </div>

                <div className="space-y-4">
                  <Label>Exercise Sequence</Label>
                  <Card className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Exercise selection and ordering will be available after creating exercises.
                    </p>
                  </Card>
                </div>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Lesson
                  </Button>
                  <Button variant="gradient-primary" onClick={handleCreateLesson}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Lesson
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
