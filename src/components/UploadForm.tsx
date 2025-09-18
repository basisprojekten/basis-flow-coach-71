import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview: string;
}

const UploadForm = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'case' | 'protocol'>('case');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Form states
  const [caseForm, setCaseForm] = useState({
    title: ''
  });

  const [protocolForm, setProtocolForm] = useState({
    name: '',
    version: '',
    type: '' as 'base' | 'content' | 'process' | ''
  });

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      toast({
        title: "Invalid File Type",
        description: "Only .docx files are allowed",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return;

    setUploadedFile({
      file,
      preview: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    });
    setUploadSuccess(null);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return interval;
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a .docx file to upload",
        variant: "destructive"
      });
      return;
    }

    // Validate form based on active tab
    if (activeTab === 'case') {
      if (!caseForm.title.trim()) {
        toast({
          title: "Missing Title",
          description: "Please enter a title for the case",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (!protocolForm.name.trim()) {
        toast({
          title: "Missing Name",
          description: "Please enter a name for the protocol",
          variant: "destructive"
        });
        return;
      }
      if (!protocolForm.type) {
        toast({
          title: "Missing Type",
          description: "Please select a protocol type",
          variant: "destructive"
        });
        return;
      }
    }

    setIsUploading(true);
    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      if (activeTab === 'case') {
        formData.append('title', caseForm.title);
        
        const response = await fetch('/api/upload/case', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();
        
        toast({
          title: "Upload Successful",
          description: `Case "${result.title}" has been uploaded successfully`,
        });

        setUploadSuccess(result.rawText.substring(0, 300) + (result.rawText.length > 300 ? '...' : ''));
        
        // Reset form
        setCaseForm({ title: '' });
        
      } else {
        formData.append('name', protocolForm.name);
        formData.append('type', protocolForm.type);
        if (protocolForm.version) {
          formData.append('version', protocolForm.version);
        }
        
        const response = await fetch('/api/upload/protocol', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();
        
        toast({
          title: "Upload Successful",
          description: `Protocol "${result.name}" has been uploaded successfully`,
        });

        setUploadSuccess(result.rawText.substring(0, 300) + (result.rawText.length > 300 ? '...' : ''));
        
        // Reset form
        setProtocolForm({ name: '', version: '', type: '' as '' });
      }

      setUploadedFile(null);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadSuccess(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'case' | 'protocol')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="case">Upload Case</TabsTrigger>
            <TabsTrigger value="protocol">Upload Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="case" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="case-title">Case Title *</Label>
                <Input
                  id="case-title"
                  value={caseForm.title}
                  onChange={(e) => setCaseForm({ title: e.target.value })}
                  placeholder="Enter a title for this case"
                  required
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="protocol" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="protocol-name">Protocol Name *</Label>
                <Input
                  id="protocol-name"
                  value={protocolForm.name}
                  onChange={(e) => setProtocolForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter protocol name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protocol-version">Version (Optional)</Label>
                <Input
                  id="protocol-version"
                  value={protocolForm.version}
                  onChange={(e) => setProtocolForm(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="e.g., 1.0, v2.1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="protocol-type">Protocol Type *</Label>
              <Select
                value={protocolForm.type}
                onValueChange={(value: 'base' | 'content' | 'process') =>
                  setProtocolForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol type" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="base">Base Protocol</SelectItem>
                  <SelectItem value="content">Content Protocol</SelectItem>
                  <SelectItem value="process">Process Protocol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {/* File Upload Area */}
        <div
          className={cn(
            "mt-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            uploadedFile ? "bg-muted/50" : ""
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploadedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileText className="h-8 w-8" />
                <div className="text-left">
                  <p className="font-medium">{uploadedFile.file.name}</p>
                  <p className="text-sm text-muted-foreground">{uploadedFile.preview}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="ml-auto text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Drop your .docx file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Select File
              </Button>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Uploading document...</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Success Preview */}
        {uploadSuccess && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-green-800">Document processed successfully!</p>
                <div className="text-sm text-green-700">
                  <p className="font-medium">Raw text preview:</p>
                  <p className="mt-1 p-2 bg-white border rounded text-gray-700 font-mono text-xs">
                    {uploadSuccess}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!uploadedFile || isUploading}
            className="min-w-32"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadForm;