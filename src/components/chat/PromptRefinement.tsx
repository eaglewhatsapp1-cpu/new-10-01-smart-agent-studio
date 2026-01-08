import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wand2, Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptRefinementProps {
  originalPrompt: string;
  onAccept: (refinedPrompt: string) => void;
  onCancel: () => void;
  agentContext?: string | null;
}

export const PromptRefinement: React.FC<PromptRefinementProps> = ({
  originalPrompt,
  onAccept,
  onCancel,
  agentContext,
}) => {
  const refinedPrompt = refinePrompt(originalPrompt, agentContext);
  const hasChanges = refinedPrompt !== originalPrompt;

  if (!hasChanges) {
    return null;
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Wand2 className="h-4 w-4" />
        <span>Refined prompt suggestion</span>
      </div>
      <p className="text-sm text-muted-foreground bg-background/50 rounded p-2">
        {refinedPrompt}
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onAccept(refinedPrompt)} className="gap-1">
          <Check className="h-3 w-3" />
          Use refined prompt
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1">
          <X className="h-3 w-3" />
          Keep original
        </Button>
      </div>
    </div>
  );
};

// Refine the prompt to be more specific and actionable
export const refinePrompt = (prompt: string, agentContext?: string | null): string => {
  let refined = prompt.trim();
  
  // Skip if too short or already well-formed
  if (refined.length < 5 || refined.length > 500) {
    return refined;
  }

  // Add context awareness for specific agents
  if (agentContext) {
    const contextLower = agentContext.toLowerCase();
    if (contextLower.includes('analyst') && !refined.toLowerCase().includes('analyze')) {
      // Suggest analysis framing
      if (refined.match(/^(what|how|why)/i)) {
        refined = refined.replace(/\?*$/, '') + " - please provide a detailed analysis.";
      }
    }
    if (contextLower.includes('code') || contextLower.includes('developer')) {
      if (!refined.toLowerCase().includes('code') && !refined.toLowerCase().includes('example')) {
        refined = refined.replace(/\?*$/, '') + " Please include code examples if applicable.";
      }
    }
  }

  // Improve vague questions
  const vaguePatterns = [
    { pattern: /^tell me about (.+)$/i, replacement: 'Can you provide a comprehensive overview of $1, including key aspects and practical applications?' },
    { pattern: /^what is (.+)$/i, replacement: 'Can you explain what $1 is, including its purpose, key features, and common use cases?' },
    { pattern: /^how do i (.+)$/i, replacement: 'Can you guide me step-by-step on how to $1, including best practices and potential pitfalls to avoid?' },
    { pattern: /^explain (.+)$/i, replacement: 'Can you provide a clear explanation of $1, with examples to illustrate the key concepts?' },
    { pattern: /^help me (.+)$/i, replacement: 'I need assistance with $1. Can you provide a structured approach with actionable steps?' },
  ];

  for (const { pattern, replacement } of vaguePatterns) {
    if (pattern.test(refined)) {
      return refined.replace(pattern, replacement);
    }
  }

  // Add specificity prompts for short queries
  if (refined.split(' ').length < 5 && !refined.includes('?')) {
    refined = refined + '. Please provide detailed information and examples.';
  }

  return refined;
};

// Hook to manage prompt refinement state
export const usePromptRefinement = () => {
  const [showRefinement, setShowRefinement] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');

  const checkForRefinement = (prompt: string, agentContext?: string | null): boolean => {
    const refined = refinePrompt(prompt, agentContext);
    if (refined !== prompt) {
      setPendingPrompt(prompt);
      setShowRefinement(true);
      return true;
    }
    return false;
  };

  const acceptRefinement = (refinedPrompt: string, callback: (prompt: string) => void) => {
    callback(refinedPrompt);
    setShowRefinement(false);
    setPendingPrompt('');
  };

  const cancelRefinement = (callback: (prompt: string) => void) => {
    callback(pendingPrompt);
    setShowRefinement(false);
    setPendingPrompt('');
  };

  return {
    showRefinement,
    pendingPrompt,
    checkForRefinement,
    acceptRefinement,
    cancelRefinement,
    reset: () => {
      setShowRefinement(false);
      setPendingPrompt('');
    },
  };
};
