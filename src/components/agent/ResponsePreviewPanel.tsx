import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  CheckCircle2, 
  BookOpen, 
  AlertTriangle, 
  ListOrdered,
  Copy,
  Download,
  FileJson,
  FileText,
  Edit3,
  BarChart3,
  Target,
  List,
  FileCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  generateSampleTemplate, 
  validateResponse, 
  exportAsMarkdown, 
  exportAsJSON 
} from '@/lib/responseValidation';
import type { ResponseRules, ValidationScore } from '@/types';

interface ResponsePreviewPanelProps {
  responseRules: ResponseRules;
  onTemplateChange: (template: string) => void;
}

const TEMPLATE_VARIABLES = [
  { name: '{ANALYSIS}', description: 'Main analysis content' },
  { name: '{STEPS}', description: 'Step-by-step breakdown' },
  { name: '{SOURCES}', description: 'Citation section' },
  { name: '{CONFIDENCE}', description: 'Confidence score' },
  { name: '{SUMMARY}', description: 'Summary section' },
  { name: '{BULLETS}', description: 'Bulleted key points' },
  { name: '{UNCERTAINTY_NOTE}', description: 'Uncertainty disclaimer' },
];

export const ResponsePreviewPanel: React.FC<ResponsePreviewPanelProps> = ({ 
  responseRules,
  onTemplateChange 
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState('');

  // Generate or use custom template
  const currentTemplate = useMemo(() => {
    return responseRules.custom_response_template || generateSampleTemplate(responseRules);
  }, [responseRules]);

  // Validate the current template as a sample response
  const validationScore = useMemo<ValidationScore>(() => {
    return validateResponse(currentTemplate, responseRules, responseRules.custom_response_template);
  }, [currentTemplate, responseRules]);

  // Count active rules
  const activeRulesCount = useMemo(() => {
    return [
      responseRules.step_by_step,
      responseRules.cite_if_possible,
      responseRules.refuse_if_uncertain,
      responseRules.include_confidence_scores,
      responseRules.use_bullet_points,
      responseRules.summarize_at_end
    ].filter(Boolean).length;
  }, [responseRules]);

  const handleStartEdit = () => {
    setEditedTemplate(currentTemplate);
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    onTemplateChange(editedTemplate);
    setIsEditing(false);
    toast({
      title: 'Template saved',
      description: 'Your custom response template has been saved'
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTemplate('');
  };

  const handleResetToDefault = () => {
    const defaultTemplate = generateSampleTemplate(responseRules);
    onTemplateChange(defaultTemplate);
    setEditedTemplate(defaultTemplate);
    toast({
      title: 'Template reset',
      description: 'Template has been reset to auto-generated version'
    });
  };

  const copyToClipboard = useCallback((format: 'markdown' | 'json' | 'plain') => {
    let content = '';
    switch (format) {
      case 'markdown':
        content = exportAsMarkdown(currentTemplate, responseRules);
        break;
      case 'json':
        content = exportAsJSON(currentTemplate, responseRules);
        break;
      case 'plain':
        content = currentTemplate;
        break;
    }
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: `Template copied as ${format.toUpperCase()}`
    });
  }, [currentTemplate, responseRules, toast]);

  const downloadTemplate = useCallback(() => {
    const json = exportAsJSON(currentTemplate, responseRules);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'response_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded',
      description: 'Template exported as JSON file'
    });
  }, [currentTemplate, responseRules, toast]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-glow lg:col-span-2">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            RESPONSE PREVIEW
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activeRulesCount}/6 Rules Active
            </Badge>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit} className="gap-1">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview" className="text-xs gap-1">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="validation" className="text-xs gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="variables" className="text-xs gap-1">
              <FileCheck className="h-3.5 w-3.5" />
              Variables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            {/* Active Rules Summary */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={responseRules.step_by_step ? "default" : "outline"} 
                className={`text-xs gap-1 ${responseRules.step_by_step ? 'bg-primary' : 'opacity-50'}`}
              >
                <ListOrdered className="h-3 w-3" />
                Step-by-Step
              </Badge>
              <Badge 
                variant={responseRules.cite_if_possible ? "default" : "outline"} 
                className={`text-xs gap-1 ${responseRules.cite_if_possible ? 'bg-primary' : 'opacity-50'}`}
              >
                <BookOpen className="h-3 w-3" />
                Citations
              </Badge>
              <Badge 
                variant={responseRules.refuse_if_uncertain ? "default" : "outline"} 
                className={`text-xs gap-1 ${responseRules.refuse_if_uncertain ? 'bg-primary' : 'opacity-50'}`}
              >
                <AlertTriangle className="h-3 w-3" />
                Uncertainty
              </Badge>
              <Badge 
                variant={responseRules.include_confidence_scores ? "default" : "outline"} 
                className={`text-xs gap-1 ${responseRules.include_confidence_scores ? 'bg-primary' : 'opacity-50'}`}
              >
                <Target className="h-3 w-3" />
                Confidence
              </Badge>
              <Badge 
                variant={responseRules.use_bullet_points ? "default" : "outline"} 
                className={`text-xs gap-1 ${responseRules.use_bullet_points ? 'bg-primary' : 'opacity-50'}`}
              >
                <List className="h-3 w-3" />
                Bullets
              </Badge>
              <Badge 
                variant={responseRules.summarize_at_end ? "default" : "outline"} 
                className={`text-xs gap-1 ${responseRules.summarize_at_end ? 'bg-primary' : 'opacity-50'}`}
              >
                <FileText className="h-3 w-3" />
                Summary
              </Badge>
            </div>

            {/* Template Content */}
            <div className="rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Sample Agent Response
                  </span>
                </div>
                {responseRules.custom_response_template && (
                  <Badge variant="outline" className="text-xs">Custom</Badge>
                )}
              </div>
              
              {isEditing ? (
                <div className="p-4 space-y-3">
                  <Textarea
                    value={editedTemplate}
                    onChange={(e) => setEditedTemplate(e.target.value)}
                    className="min-h-[300px] font-mono text-sm bg-background/50"
                    placeholder="Enter your custom response template..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTemplate}>
                      Save Template
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleResetToDefault}>
                      Reset to Default
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">
                    {currentTemplate}
                  </pre>
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard('markdown')}
                className="gap-1 text-xs"
              >
                <Copy className="h-3 w-3" />
                Copy as Markdown
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard('json')}
                className="gap-1 text-xs"
              >
                <FileJson className="h-3 w-3" />
                Copy as JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard('plain')}
                className="gap-1 text-xs"
              >
                <FileText className="h-3 w-3" />
                Copy as Text
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadTemplate}
                className="gap-1 text-xs"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {/* Validation Score Display */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Overall</p>
                <p className={`text-2xl font-bold ${getScoreColor(validationScore.overall_score)}`}>
                  {validationScore.overall_score}
                </p>
                <Progress value={validationScore.overall_score} className="h-1" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Structure</p>
                <p className={`text-2xl font-bold ${getScoreColor(validationScore.structure_score)}`}>
                  {validationScore.structure_score}
                </p>
                <Progress value={validationScore.structure_score} className="h-1" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Rules</p>
                <p className={`text-2xl font-bold ${getScoreColor(validationScore.rules_score)}`}>
                  {validationScore.rules_score}
                </p>
                <Progress value={validationScore.rules_score} className="h-1" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Quality</p>
                <p className={`text-2xl font-bold ${getScoreColor(validationScore.quality_score)}`}>
                  {validationScore.quality_score}
                </p>
                <Progress value={validationScore.quality_score} className="h-1" />
              </div>
            </div>

            {/* Validation Status */}
            <div className={`p-3 rounded-lg ${validationScore.passed ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
              <div className="flex items-center gap-2">
                {validationScore.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className={`text-sm font-medium ${validationScore.passed ? 'text-green-500' : 'text-yellow-500'}`}>
                  {validationScore.passed ? 'Template passes validation' : 'Template needs improvements'}
                </span>
              </div>
            </div>

            {/* Issues List */}
            {validationScore.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Issues ({validationScore.issues.length})</p>
                {validationScore.issues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 rounded border text-sm ${
                      issue.severity === 'error' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : issue.severity === 'warning'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <p className="font-medium">{issue.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use these template variables in your custom template. They will be replaced with actual content during response generation.
            </p>
            <div className="grid gap-2">
              {TEMPLATE_VARIABLES.map((variable) => (
                <div 
                  key={variable.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-xs bg-primary/20 px-2 py-1 rounded font-mono text-primary">
                      {variable.name}
                    </code>
                    <span className="text-sm text-muted-foreground">{variable.description}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(variable.name);
                      toast({ title: 'Copied', description: `${variable.name} copied to clipboard` });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
