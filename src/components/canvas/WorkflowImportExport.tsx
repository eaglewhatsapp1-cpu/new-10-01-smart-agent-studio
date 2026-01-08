import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Upload, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowImportExportProps {
  configName: string;
  nodes: any[];
  edges: any[];
  onImport: (data: any) => void;
}

export const WorkflowImportExport: React.FC<WorkflowImportExportProps> = ({
  configName,
  nodes,
  edges,
  onImport,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<any>(null);
  const [importError, setImportError] = React.useState<string | null>(null);

  const handleExport = () => {
    const agentNodes = nodes.filter((n) => n.type === 'agent');
    if (agentNodes.length === 0) {
      toast({
        title: 'No Agents',
        description: 'Add at least one agent to export',
        variant: 'destructive',
      });
      return;
    }

    const exportData = {
      version: '1.0',
      name: configName,
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
      agents: agentNodes.map((n) => n.data),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configName.replace(/\s+/g, '_')}_workflow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Workflow Exported',
      description: 'Your workflow configuration has been saved as a JSON file.',
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate the structure
        if (!data.nodes || !data.edges) {
          setImportError('Invalid workflow file: missing nodes or edges');
          setImportPreview(null);
          setImportDialogOpen(true);
          return;
        }

        setImportPreview(data);
        setImportError(null);
        setImportDialogOpen(true);
      } catch (error) {
        setImportError('Failed to parse JSON file');
        setImportPreview(null);
        setImportDialogOpen(true);
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const confirmImport = () => {
    if (importPreview) {
      onImport(importPreview);
      setImportDialogOpen(false);
      setImportPreview(null);
      toast({
        title: 'Workflow Imported',
        description: `Successfully imported "${importPreview.name || 'workflow'}"`,
      });
    }
  };

  const agentCount = importPreview?.agents?.length || importPreview?.nodes?.filter((n: any) => n.type === 'agent').length || 0;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-1.5"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="gap-1.5"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Import</span>
      </Button>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Import Workflow
            </DialogTitle>
            <DialogDescription>
              Review the workflow configuration before importing.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {importError ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Import Error</p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {importError}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : importPreview ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <div>
                        <p className="font-medium">{importPreview.name || 'Untitled Workflow'}</p>
                        <p className="text-xs text-muted-foreground">
                          {importPreview.exportedAt
                            ? `Exported: ${new Date(importPreview.exportedAt).toLocaleDateString()}`
                            : 'Export date unknown'}
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
                        <span>{importPreview.edges?.length || 0} connection{(importPreview.edges?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={confirmImport}>Import Workflow</Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};