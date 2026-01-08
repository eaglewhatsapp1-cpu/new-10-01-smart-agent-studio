import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Upload, FileText, X, CheckCircle, Loader2, Image, FileAudio, FileVideo, File } from 'lucide-react';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Supported file types with their categories
const FILE_CATEGORIES = {
  documents: ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf', '.odt', '.pptx', '.ppt', '.xlsx', '.xls', '.ods', '.odp'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg', '.ico'],
  code: ['.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.sql', '.java', '.c', '.cpp', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.sh', '.bat'],
  data: ['.csv', '.log', '.ini', '.conf'],
  audio: ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma'],
  video: ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
};

const ALL_EXTENSIONS = Object.values(FILE_CATEGORIES).flat();

const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (FILE_CATEGORIES.images.includes(ext)) return <Image className="h-8 w-8 text-primary" />;
  if (FILE_CATEGORIES.audio.includes(ext)) return <FileAudio className="h-8 w-8 text-primary" />;
  if (FILE_CATEGORIES.video.includes(ext)) return <FileVideo className="h-8 w-8 text-primary" />;
  if (FILE_CATEGORIES.documents.includes(ext) || FILE_CATEGORIES.code.includes(ext)) return <FileText className="h-8 w-8 text-primary" />;
  return <File className="h-8 w-8 text-primary" />;
};

const getFileCategory = (fileName: string): string => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(ext)) return category;
  }
  return 'other';
};

export const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folders } = useQuery({
    queryKey: ['folders-for-upload'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_folders')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 20MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setUploadComplete(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractTextFromFile = async (file: File): Promise<string | null> => {
    // For text-based files, read content directly
    const textTypes = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.log', '.ini', '.conf', '.sh', '.bat', '.sql', '.r', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (textTypes.includes(ext) || file.type.startsWith('text/')) {
      return await file.text();
    }
    
    // For binary files, return null - let the edge function handle extraction
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ 
        title: 'Error', 
        description: 'Please select a file', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    setProgress(5);
    setStatusMessage('Preparing upload...');

    try {
      const category = getFileCategory(selectedFile.name);
      const needsOCR = ['documents', 'images'].includes(category) && 
        !selectedFile.type.startsWith('text/');

      // Step 1: Upload file to storage
      // Sanitize filename: keep only alphanumeric, dots, underscores, hyphens
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';
      const fileName = `${Date.now()}_${sanitizedBaseName}${fileExtension}`;
      
      setProgress(10);
      setStatusMessage('Uploading file to storage...');
      
      const { error: uploadError } = await supabase.storage
        .from('kb-assets')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;
      setProgress(30);

      // Step 2: Prepare content for processing
      setProcessing(true);
      setStatusMessage('Extracting content...');
      
      let textContent: string | null = null;
      let base64Content: string | null = null;

      // Try to extract text directly for text-based files
      textContent = await extractTextFromFile(selectedFile);
      
      // For files that need OCR/AI processing, get base64
      if (!textContent && needsOCR) {
        setStatusMessage('Preparing for AI analysis...');
        setProgress(40);
        base64Content = await fileToBase64(selectedFile);
      }

      setProgress(50);
      setStatusMessage(needsOCR ? 'Running AI extraction (OCR)...' : 'Processing document...');

      // Step 3: Process document into chunks via edge function
      const { data, error: processError } = await supabase.functions.invoke('process-document', {
        body: {
          fileName: selectedFile.name,
          folderId: folderId || null,
          content: textContent,
          base64Content: base64Content,
          mimeType: selectedFile.type || 'application/octet-stream',
        },
      });

      if (processError) throw processError;
      setProgress(85);
      setStatusMessage('Saving to knowledge base...');

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activity_feed').insert({
          action_type: 'created',
          entity_type: 'document',
          entity_name: selectedFile.name,
          description: `Uploaded ${category} file, processed into ${data?.chunksCreated || 0} chunks (${data?.contentLength || 0} chars)`,
          user_id: user.id,
          user_email: user.email,
        });
      }

      setProgress(100);
      setStatusMessage('Complete!');
      setUploadComplete(true);

      toast({ 
        title: 'Success', 
        description: `Document processed: ${data?.chunksCreated || 0} chunks created`
      });
      
      setTimeout(() => {
        setSelectedFile(null);
        setFolderId('');
        setProgress(0);
        setStatusMessage('');
        setUploadComplete(false);
        setProcessing(false);
        onSuccess();
        onOpenChange(false);
      }, 1500);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to process document', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadComplete(false);
    setProgress(0);
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Upload Document to Knowledge Base</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select File *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                uploadComplete 
                  ? 'border-emerald-500 bg-emerald-500/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {uploadComplete ? (
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  ) : processing ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  ) : (
                    getFileIcon(selectedFile.name)
                  )}
                  <div className="text-start">
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {getFileCategory(selectedFile.name)}
                      {processing && ` • ${statusMessage}`}
                      {uploadComplete && ' • Complete!'}
                    </p>
                  </div>
                  {!loading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select or drag and drop
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Documents:</strong> PDF (with OCR), Word, Excel, PowerPoint</p>
                    <p><strong>Images:</strong> JPG, PNG, GIF, WebP (with AI vision)</p>
                    <p><strong>Code & Data:</strong> JSON, CSV, XML, Python, JS, SQL</p>
                    <p><strong>Media:</strong> Audio, Video (metadata stored)</p>
                    <p className="text-primary/70">Max 20MB • AI-powered extraction</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ALL_EXTENSIONS.join(',')}
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          {loading && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {statusMessage || 'Processing...'}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Target Folder (optional)</Label>
            <Select 
              value={folderId} 
              onValueChange={(val) => setFolderId(val === 'none' ? '' : val)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="No folder - General" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder - General</SelectItem>
                {folders?.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedFile}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {statusMessage || 'Processing...'}
                </>
              ) : (
                'Upload & Process'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};