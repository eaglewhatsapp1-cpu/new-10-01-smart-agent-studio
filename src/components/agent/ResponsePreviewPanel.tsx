import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, ListOrdered, Quote, AlertTriangle } from 'lucide-react';

interface ResponseRules {
  step_by_step: boolean;
  cite_if_possible: boolean;
  refuse_if_uncertain: boolean;
}

interface ResponsePreviewPanelProps {
  responseRules: ResponseRules;
  agentName?: string;
}

export const ResponsePreviewPanel: React.FC<ResponsePreviewPanelProps> = ({
  responseRules,
  agentName = 'Agent',
}) => {
  const sampleQuestion = "What are the main benefits of renewable energy sources?";

  const previewResponse = useMemo(() => {
    const parts: string[] = [];

    // Opening
    parts.push(`Based on the available knowledge base, I can provide information about the benefits of renewable energy sources.`);

    // Step-by-step reasoning
    if (responseRules.step_by_step) {
      parts.push(`\n\n**Reasoning Process:**\n1. First, I'll identify the primary categories of benefits\n2. Then, I'll examine environmental impacts\n3. Finally, I'll consider economic factors`);
    }

    // Main content
    parts.push(`\n\n**Key Benefits:**\n- **Environmental**: Reduced carbon emissions and pollution\n- **Economic**: Long-term cost savings and job creation\n- **Sustainability**: Inexhaustible energy supply`);

    // Citations
    if (responseRules.cite_if_possible) {
      parts.push(`\n\n**Sources:**\n[1] Energy_Report_2024.pdf (p. 12-15)\n[2] Sustainability_Guidelines.docx (Section 3.2)`);
    }

    // Uncertainty disclaimer
    if (responseRules.refuse_if_uncertain) {
      parts.push(`\n\n*Note: This response is based on verified knowledge base content. For topics outside my knowledge scope, I will explicitly state my limitations.*`);
    }

    return parts.join('');
  }, [responseRules]);

  const activeRulesCount = Object.values(responseRules).filter(Boolean).length;

  return (
    <Card className="cyber-border">
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-primary" />
            RESPONSE PREVIEW
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {activeRulesCount}/3 rules active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Active Rules Indicators */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={responseRules.step_by_step ? "default" : "secondary"}
            className="flex items-center gap-1 text-xs"
          >
            <ListOrdered className="h-3 w-3" />
            Step-by-Step
          </Badge>
          <Badge 
            variant={responseRules.cite_if_possible ? "default" : "secondary"}
            className="flex items-center gap-1 text-xs"
          >
            <Quote className="h-3 w-3" />
            Citations
          </Badge>
          <Badge 
            variant={responseRules.refuse_if_uncertain ? "default" : "secondary"}
            className="flex items-center gap-1 text-xs"
          >
            <AlertTriangle className="h-3 w-3" />
            Uncertainty Check
          </Badge>
        </div>

        {/* Sample Question */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Sample Question</span>
          </div>
          <p className="text-sm text-foreground">{sampleQuestion}</p>
        </div>

        {/* Preview Response */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">AI</span>
            </div>
            <span className="text-xs text-muted-foreground">{agentName} Response</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed bg-transparent p-0 m-0 border-0">
              {previewResponse}
            </pre>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground text-center italic">
          This preview shows how responses will be structured based on your Response Rules settings.
        </p>
      </CardContent>
    </Card>
  );
};
