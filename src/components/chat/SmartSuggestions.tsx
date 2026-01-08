import React from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Wand2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  suggestions,
  onSelect,
  isLoading = false,
  className,
}) => {
  if (suggestions.length === 0 || isLoading) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3 w-3" />
        <span>Suggested questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 text-xs text-left whitespace-normal max-w-[300px] hover:bg-primary/10 hover:border-primary/50 transition-all"
            onClick={() => onSelect(suggestion)}
          >
            <ArrowRight className="h-3 w-3 mr-2 flex-shrink-0" />
            <span className="line-clamp-2">{suggestion}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

// Generate contextual suggestions based on conversation history and agent type
export const generateSuggestions = (
  messages: { role: string; content: string }[],
  agentType?: string | null,
  agentRole?: string | null
): string[] => {
  // Initial suggestions when no conversation
  if (messages.length === 0) {
    if (agentRole) {
      return getAgentSpecificSuggestions(agentRole);
    }
    return [
      "What can you help me with?",
      "Explain your capabilities",
      "Help me get started",
      "What are some example questions I can ask?",
    ];
  }

  // Get last assistant message to generate follow-up suggestions
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  if (!lastAssistantMessage) {
    return [
      "Tell me more about this",
      "Can you provide examples?",
      "What are the key points?",
    ];
  }

  // Generate contextual follow-ups based on content
  return generateContextualFollowUps(lastAssistantMessage.content, lastUserMessage?.content || '');
};

const getAgentSpecificSuggestions = (role: string): string[] => {
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('analyst') || roleLower.includes('data')) {
    return [
      "Analyze the latest trends",
      "What insights can you provide?",
      "Help me understand the data",
      "Generate a summary report",
    ];
  }
  
  if (roleLower.includes('writer') || roleLower.includes('content')) {
    return [
      "Help me write a blog post",
      "Create an outline for my article",
      "Improve this text",
      "Generate creative ideas",
    ];
  }
  
  if (roleLower.includes('code') || roleLower.includes('developer')) {
    return [
      "Help me debug this code",
      "Explain this programming concept",
      "Review my code for improvements",
      "Suggest best practices",
    ];
  }
  
  if (roleLower.includes('research')) {
    return [
      "Research this topic for me",
      "Find relevant sources",
      "Summarize the key findings",
      "Compare different approaches",
    ];
  }

  return [
    "What can you help me with?",
    "Explain your expertise",
    "Help me solve a problem",
    "Give me some examples",
  ];
};

const generateContextualFollowUps = (assistantResponse: string, userQuery: string): string[] => {
  const suggestions: string[] = [];
  const responseLower = assistantResponse.toLowerCase();
  
  // If response mentions multiple items/points
  if (responseLower.includes('1.') || responseLower.includes('first') || responseLower.includes('several')) {
    suggestions.push("Can you elaborate on the first point?");
    suggestions.push("Which of these is most important?");
  }
  
  // If response mentions examples
  if (responseLower.includes('example') || responseLower.includes('for instance')) {
    suggestions.push("Can you give more examples?");
    suggestions.push("How would I apply this in practice?");
  }
  
  // If response discusses a process or steps
  if (responseLower.includes('step') || responseLower.includes('process') || responseLower.includes('first')) {
    suggestions.push("What's the next step?");
    suggestions.push("What should I watch out for?");
  }
  
  // If response is technical
  if (responseLower.includes('code') || responseLower.includes('function') || responseLower.includes('api')) {
    suggestions.push("Can you explain this in simpler terms?");
    suggestions.push("Show me a working example");
  }
  
  // If response discusses benefits or advantages
  if (responseLower.includes('benefit') || responseLower.includes('advantage') || responseLower.includes('improve')) {
    suggestions.push("What are the potential drawbacks?");
    suggestions.push("How do I measure success?");
  }

  // Add generic follow-ups if we don't have enough
  const genericFollowUps = [
    "Tell me more about this",
    "Can you summarize the key points?",
    "What's the next step I should take?",
    "Can you provide more detail?",
  ];

  while (suggestions.length < 4) {
    const generic = genericFollowUps[suggestions.length];
    if (generic && !suggestions.includes(generic)) {
      suggestions.push(generic);
    } else {
      break;
    }
  }

  return suggestions.slice(0, 4);
};
