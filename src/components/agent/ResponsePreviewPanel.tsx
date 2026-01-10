import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle2, BookOpen, AlertTriangle, ListOrdered } from 'lucide-react';

interface ResponseRules {
  step_by_step: boolean;
  cite_if_possible: boolean;
  refuse_if_uncertain: boolean;
}

interface ResponsePreviewPanelProps {
  responseRules: ResponseRules;
}

export const ResponsePreviewPanel: React.FC<ResponsePreviewPanelProps> = ({ responseRules }) => {
  const sampleResponse = useMemo(() => {
    const parts: string[] = [];
    
    // Opening
    parts.push("Based on my analysis of the available information:");
    
    // Step-by-step section
    if (responseRules.step_by_step) {
      parts.push("");
      parts.push("**Step 1: Initial Assessment**");
      parts.push("First, I reviewed the relevant documents and identified key factors...");
      parts.push("");
      parts.push("**Step 2: Analysis**");
      parts.push("Then, I cross-referenced the findings with established criteria...");
      parts.push("");
      parts.push("**Step 3: Conclusion**");
      parts.push("Finally, I synthesized the results to form a comprehensive answer.");
    } else {
      parts.push("");
      parts.push("The analysis indicates that the primary factors affecting this outcome are directly related to the documented specifications and established protocols.");
    }
    
    // Citation section
    if (responseRules.cite_if_possible) {
      parts.push("");
      parts.push("**Sources:**");
      parts.push("- [1] Technical Documentation v2.3, Section 4.2");
      parts.push("- [2] Internal Guidelines, Page 15");
      parts.push("- [3] Research Report Q4-2024");
    }
    
    // Uncertainty handling
    if (responseRules.refuse_if_uncertain) {
      parts.push("");
      parts.push("*Note: This response is based on verified information from the knowledge base. Any claims outside the available documentation have been omitted to ensure accuracy.*");
    }
    
    return parts.join("\n");
  }, [responseRules]);

  const activeRulesCount = [
    responseRules.step_by_step,
    responseRules.cite_if_possible,
    responseRules.refuse_if_uncertain
  ].filter(Boolean).length;

  return (
    <Card className="cyber-border">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            RESPONSE PREVIEW
          </div>
          <Badge variant="secondary" className="text-xs">
            {activeRulesCount}/3 Rules Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
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
            Uncertainty Check
          </Badge>
        </div>

        {/* Preview Content */}
        <div className="rounded-lg bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Sample Agent Response
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed bg-transparent p-0 m-0 border-0">
              {sampleResponse}
            </pre>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          This preview demonstrates how the agent will structure responses based on your selected rules.
        </p>
      </CardContent>
    </Card>
  );
};
