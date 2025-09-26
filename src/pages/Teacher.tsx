import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
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
  Loader2,
  Library,
  Eye,
  Trash2,
  LogOut
} from 'lucide-react';

const Teacher = () => {
  const navigate = useNavigate();
  const session = useSession();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Utloggad",
        description: "Du har loggats ut från lärarvyn",
      });
    } catch (error) {
      toast({
        title: "Fel vid utloggning",
        description: "Ett fel uppstod när du försökte logga ut",
        variant: "destructive",
      });
    }
  };
  
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
    title: ''
  });
  
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [currentAccessCode, setCurrentAccessCode] = useState<any>(null);
  const [selectedProtocols, setSelectedProtocols] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [selectedInstructionDocument, setSelectedInstructionDocument] = useState<any>(null);
  
  // My Exercises State
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  
  // Document Library State
  const [documentLibrary, setDocumentLibrary] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploadingToLibrary, setUploadingToLibrary] = useState(false);
  
  // Optional Lesson Creator State
  const [newLessonForm, setNewLessonForm] = useState({
    title: ''
  });
  
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({
    instruction: false
  });

  // Model configuration state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelConfigurations, setModelConfigurations] = useState<any[]>([]);
  const [modelConfigLoading, setModelConfigLoading] = useState(false);

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

  // Fetch all exercises
  const fetchAllExercises = async () => {
    setLoadingExercises(true);
    try {
      const { data: exercises, error: exerciseError } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (exerciseError) throw exerciseError;

      // Fetch corresponding codes for each exercise
      const { data: codes, error: codeError } = await supabase
        .from('codes')
        .select('*')
        .eq('type', 'exercise');

      if (codeError) throw codeError;

      // Combine exercises with their codes
      const exercisesWithCodes = exercises.map(exercise => {
        const code = codes.find(c => c.target_id === exercise.id);
        return { ...exercise, access_code: code?.id || 'N/A' };
      });

      setAllExercises(exercisesWithCodes);
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
      toast({
        title: "Error",
        description: "Failed to fetch exercises",
        variant: "destructive"
      });
    } finally {
      setLoadingExercises(false);
    }
  };

  // Fetch document library
  const fetchDocumentLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentLibrary(data || []);
    } catch (error) {
      console.error('Failed to fetch document library:', error);
      toast({
        title: "Error",
        description: "Failed to fetch document library",
        variant: "destructive"
      });
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Upload instruction document directly to exercise
  const handleInstructionDocumentUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Only .docx files are supported",
        variant: "destructive"
      });
      return;
    }

    setUploadingFiles(prev => ({ ...prev, instruction: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'instruction_document');
      // Don't set exercise_id - upload to library for now

      const { data, error } = await supabase.functions.invoke('document-uploader', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        setSelectedInstructionDocument(data.document);
        toast({
          title: "Success",
          description: "Instruction document uploaded successfully!"
        });
      }
    } catch (error) {
      console.error('Failed to upload instruction document:', error);
      toast({
        title: "Error",
        description: "Failed to upload instruction document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, instruction: false }));
    }
  };

  // Upload document to library
  const handleLibraryUpload = async (file: File, documentType: 'case' | 'protocol' | 'instruction_document') => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Only .docx files are supported",
        variant: "destructive"
      });
      return;
    }

    setUploadingToLibrary(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      // Don't set exercise_id for library uploads

      const { data, error } = await supabase.functions.invoke('document-uploader', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        await fetchDocumentLibrary(); // Refresh library
        toast({
          title: "Success",
          description: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} document uploaded to library!`
        });
      }
    } catch (error) {
      console.error('Failed to upload document to library:', error);
      toast({
        title: "Error",
        description: "Failed to upload document to library. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingToLibrary(false);
    }
  };

  // Standalone Exercise Creator Functions
  const handleCreateStandaloneExercise = async () => {
    if (!standaloneExerciseForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a title",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingExercise(true);
    try {
      const { data, error } = await supabase.functions.invoke('exercises', {
        body: {
          action: 'create',
          title: standaloneExerciseForm.title,
          instructionDocumentId: selectedInstructionDocument?.id
        }
      });

      if (error) throw error;

      if (data.id) {
        setCurrentExercise(data.exercise);
        setCurrentAccessCode({ id: data.code });
        
        // If documents are selected, link them to the exercise
        await linkDocumentsToExercise(data.id);
        
        // Refresh exercises list
        await fetchAllExercises();
        
        toast({
          title: "Success",
          description: `Exercise created successfully! Access code: ${data.code}`
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

  // Link selected documents to exercise
  const linkDocumentsToExercise = async (exerciseId: string) => {
    const documentsToLink = [];
    
    if (selectedCase) {
      documentsToLink.push({
        exercise_id: exerciseId,
        document_id: selectedCase.id
      });
    }
    
    selectedProtocols.forEach(protocol => {
      documentsToLink.push({
        exercise_id: exerciseId,
        document_id: protocol.id
      });
    });

    if (documentsToLink.length > 0) {
      const { error } = await supabase
        .from('exercise_documents')
        .insert(documentsToLink);

      if (error) {
        console.error('Failed to link documents to exercise:', error);
        toast({
          title: "Warning",
          description: "Exercise created but failed to link some documents",
          variant: "destructive"
        });
      }
    }

    // Update exercise with instruction document if selected
    if (selectedInstructionDocument) {
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ instruction_document_id: selectedInstructionDocument.id })
        .eq('id', exerciseId);

      if (updateError) {
        console.error('Failed to link instruction document to exercise:', updateError);
        toast({
          title: "Warning",
          description: "Exercise created but failed to link instruction document",
          variant: "destructive"
        });
      }
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

  const resetExerciseCreator = () => {
    setCurrentExercise(null);
    setCurrentAccessCode(null);
    setSelectedProtocols([]);
    setSelectedCase(null);
    setSelectedInstructionDocument(null);
    setStandaloneExerciseForm({ title: '' });
  };

  // Model configuration functions
  const fetchAvailableModels = async () => {
    try {
      setModelConfigLoading(true);
      const response = await supabase.functions.invoke('models');
      if (response.error) throw response.error;
      setAvailableModels(response.data.models || []);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta tillgängliga modeller",
        variant: "destructive",
      });
    } finally {
      setModelConfigLoading(false);
    }
  };

  const fetchModelConfigurations = async () => {
    try {
      const response = await supabase.functions.invoke('model-config');
      if (response.error) throw response.error;
      setModelConfigurations(response.data.configurations || []);
    } catch (error) {
      console.error('Error fetching model configurations:', error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta modellkonfigurationer",
        variant: "destructive",
      });
    }
  };

  const updateModelConfiguration = async (tier: string, modelName: string) => {
    try {
      const response = await supabase.functions.invoke('model-config', {
        body: { tier, model_name: modelName }
      });
      
      if (response.error) throw response.error;
      
      toast({
        title: "Framgång",
        description: "Modellkonfiguration uppdaterad",
      });
      
      // Refresh configurations
      fetchModelConfigurations();
    } catch (error) {
      console.error('Error updating model configuration:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera modellkonfiguration",
        variant: "destructive",
      });
    }
  };

  const handleSaveModelChanges = async () => {
    try {
      for (const config of modelConfigurations) {
        if (config.hasChanged) {
          await updateModelConfiguration(config.tier, config.model_name);
        }
      }
      
      toast({
        title: "Framgång",
        description: "Alla modellkonfigurationer sparade",
      });
    } catch (error) {
      console.error('Error saving model changes:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara alla ändringar",
        variant: "destructive",
      });
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchCodes();
    fetchAllExercises();
    fetchDocumentLibrary();
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
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-primary border-primary">
                <Settings className="h-3 w-3 mr-1" />
                Inloggad som {session?.user?.email}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="exercise-creator" className="space-y-8">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="exercise-creator" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Övningar
            </TabsTrigger>
            <TabsTrigger value="my-exercises" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Mina Övningar
            </TabsTrigger>
            <TabsTrigger value="document-library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Dokumentbibliotek
            </TabsTrigger>
            <TabsTrigger value="lesson-creator" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lektionshantering
            </TabsTrigger>
            <TabsTrigger value="model-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Modellinställningar
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Gamla Övningar
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Genererade Koder
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
                   <div className="grid grid-cols-1 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="standalone-exercise-title">Exercise Title</Label>
                       <Input
                         id="standalone-exercise-title"
                         value={standaloneExerciseForm.title}
                         onChange={(e) => setStandaloneExerciseForm(prev => ({ ...prev, title: e.target.value }))}
                         placeholder="e.g., Difficult Conversation Practice"
                       />
                     </div>
                   </div>

                   {/* Document Selection */}
                   <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Select Documents from Library</h3>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Case Document Selection */}
                      <div className="space-y-2">
                        <Label>Case Document</Label>
                        <Select onValueChange={(value) => {
                          const doc = documentLibrary.find(d => d.id === value);
                          setSelectedCase(doc);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a case document" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentLibrary.filter(doc => doc.document_type === 'case').map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.file_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedCase && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{selectedCase.file_name}</span>
                          </div>
                        )}
                      </div>

                       {/* Protocol Documents Selection */}
                       <div className="space-y-2">
                         <Label>Protocol Documents</Label>
                         <Select onValueChange={(value) => {
                           const doc = documentLibrary.find(d => d.id === value);
                           if (doc && !selectedProtocols.find(p => p.id === doc.id)) {
                             setSelectedProtocols(prev => [...prev, doc]);
                           }
                         }}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select protocol documents" />
                           </SelectTrigger>
                           <SelectContent>
                             {documentLibrary.filter(doc => doc.document_type === 'protocol').map((doc) => (
                               <SelectItem key={doc.id} value={doc.id}>
                                 {doc.file_name}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         {selectedProtocols.length > 0 && (
                           <div className="space-y-2">
                             <Label className="text-sm">Selected Protocols ({selectedProtocols.length})</Label>
                             {selectedProtocols.map((protocol) => (
                               <div key={protocol.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                 <div className="flex items-center gap-2">
                                   <CheckCircle className="h-4 w-4 text-green-500" />
                                   <span className="text-sm">{protocol.file_name}</span>
                                 </div>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => setSelectedProtocols(prev => prev.filter(p => p.id !== protocol.id))}
                                 >
                                   <X className="h-4 w-4" />
                                 </Button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>

                        {/* Instruction Document Upload */}
                        <div className="space-y-2">
                          <Label>Instruktionsdokument (valfritt)</Label>
                          <Card>
                            <CardContent className="pt-4">
                              <Input
                                type="file"
                                accept=".docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleInstructionDocumentUpload(file);
                                }}
                                className="cursor-pointer"
                                disabled={uploadingFiles.instruction}
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Ladda upp ett .docx-dokument med specifika instruktioner för denna övning
                              </p>
                            </CardContent>
                          </Card>
                          {selectedInstructionDocument && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{selectedInstructionDocument.file_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedInstructionDocument(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleCreateStandaloneExercise}
                      disabled={isCreatingExercise || !standaloneExerciseForm.title.trim()}
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
                          ID: {currentExercise.id}
                          {currentAccessCode && (
                            <Badge variant="secondary" className="ml-2">
                              Access Code: {currentAccessCode.id}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={resetExerciseCreator}>
                        <X className="h-4 w-4 mr-2" />
                        Create New Exercise
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Exercise Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Exercise Created Successfully
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Selected Case Document</Label>
                        {selectedCase ? (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg mt-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{selectedCase.file_name}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No case document selected</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Selected Protocol Documents</Label>
                        {selectedProtocols.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {selectedProtocols.map((protocol) => (
                              <div key={protocol.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{protocol.file_name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No protocol documents selected</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* My Exercises */}
          <TabsContent value="my-exercises" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  My Exercises
                </CardTitle>
                <CardDescription>
                  View all created exercises and their access codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingExercises ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading exercises...</span>
                  </div>
                ) : allExercises.length > 0 ? (
                  <div className="space-y-4">
                    {allExercises.map((exercise) => (
                      <div key={exercise.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{exercise.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(exercise.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-primary">
                            {exercise.access_code}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Access Code
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No exercises created yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first exercise to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Document Library */}
          <TabsContent value="document-library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5 text-primary" />
                  Document Library
                </CardTitle>
                <CardDescription>
                  Upload and manage documents that can be reused across exercises
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 {/* Upload Section */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-base">Upload Case Document</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <Input
                         type="file"
                         accept=".docx"
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) handleLibraryUpload(file, 'case');
                         }}
                         className="cursor-pointer"
                         disabled={uploadingToLibrary}
                       />
                     </CardContent>
                   </Card>

                   <Card>
                     <CardHeader>
                       <CardTitle className="text-base">Upload Protocol Document</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <Input
                         type="file"
                         accept=".docx"
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) handleLibraryUpload(file, 'protocol');
                         }}
                         className="cursor-pointer"
                         disabled={uploadingToLibrary}
                       />
                     </CardContent>
                   </Card>

                   <Card>
                     <CardHeader>
                       <CardTitle className="text-base">Upload Instruction Document</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <Input
                         type="file"
                         accept=".docx"
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) handleLibraryUpload(file, 'instruction_document');
                         }}
                         className="cursor-pointer"
                         disabled={uploadingToLibrary}
                       />
                     </CardContent>
                   </Card>
                 </div>

                {uploadingToLibrary && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Uploading document...</span>
                  </div>
                )}

                <Separator />

                {/* Document List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>
                  {loadingLibrary ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading documents...</span>
                    </div>
                   ) : documentLibrary.length > 0 ? (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Case Documents */}
                      <div>
                        <h4 className="font-medium mb-2">Case Documents</h4>
                        <div className="space-y-2">
                          {documentLibrary.filter(doc => doc.document_type === 'case').map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{doc.file_name}</span>
                              </div>
                              <Badge variant="secondary">Case</Badge>
                            </div>
                          ))}
                          {documentLibrary.filter(doc => doc.document_type === 'case').length === 0 && (
                            <p className="text-sm text-muted-foreground">No case documents uploaded</p>
                          )}
                        </div>
                      </div>

                       {/* Protocol Documents */}
                       <div>
                         <h4 className="font-medium mb-2">Protocol Documents</h4>
                         <div className="space-y-2">
                           {documentLibrary.filter(doc => doc.document_type === 'protocol').map((doc) => (
                             <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                               <div className="flex items-center gap-2">
                                 <FileText className="h-4 w-4 text-primary" />
                                 <span className="text-sm font-medium">{doc.file_name}</span>
                               </div>
                               <Badge variant="secondary">Protocol</Badge>
                             </div>
                           ))}
                           {documentLibrary.filter(doc => doc.document_type === 'protocol').length === 0 && (
                             <p className="text-sm text-muted-foreground">No protocol documents uploaded</p>
                           )}
                         </div>
                       </div>

                       {/* Instruction Documents */}
                       <div>
                         <h4 className="font-medium mb-2">Instruction Documents</h4>
                         <div className="space-y-2">
                           {documentLibrary.filter(doc => doc.document_type === 'instruction_document').map((doc) => (
                             <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                               <div className="flex items-center gap-2">
                                 <FileText className="h-4 w-4 text-primary" />
                                 <span className="text-sm font-medium">{doc.file_name}</span>
                               </div>
                               <Badge variant="secondary">Instruktion</Badge>
                             </div>
                           ))}
                           {documentLibrary.filter(doc => doc.document_type === 'instruction_document').length === 0 && (
                             <p className="text-sm text-muted-foreground">No instruction documents uploaded</p>
                           )}
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No documents uploaded yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload case and protocol documents to build your reusable library.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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

          {/* Model Configuration */}
          <TabsContent value="model-settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  AI-modellkonfiguration
                </CardTitle>
                <CardDescription>
                  Hantera vilka AI-modeller som används för olika typer av interaktioner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        fetchAvailableModels();
                        fetchModelConfigurations();
                      }}
                      disabled={modelConfigLoading}
                    >
                      {modelConfigLoading ? "Laddar..." : "Hämta modeller"}
                    </Button>
                  </div>

                  {modelConfigurations.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Modellkonfigurationer</h3>
                      
                      {modelConfigurations.map((config) => (
                        <div key={config.tier} className="border rounded-lg p-4 space-y-2">
                          <Label htmlFor={`model-${config.tier}`}>
                            {config.label} ({config.tier})
                          </Label>
                          <Select
                            value={config.model_name}
                            onValueChange={(value) => {
                              setModelConfigurations(prev =>
                                prev.map(c =>
                                  c.tier === config.tier
                                    ? { ...c, model_name: value, hasChanged: true }
                                    : c
                                )
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Välj modell" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}

                      <Button
                        onClick={handleSaveModelChanges}
                        disabled={!modelConfigurations.some(c => c.hasChanged)}
                        className="w-full"
                      >
                        Spara ändringar
                      </Button>
                    </div>
                  )}

                  {availableModels.length === 0 && !modelConfigLoading && (
                    <p className="text-muted-foreground">
                      Klicka på "Hämta modeller" för att ladda tillgängliga modeller från OpenAI.
                    </p>
                  )}
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