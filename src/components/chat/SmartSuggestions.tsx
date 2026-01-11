import React from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight } from 'lucide-react';
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

// Page-specific suggestions for AI Assistant (platform help)
export const generatePageContextSuggestions = (currentPath: string): string[] => {
  const path = currentPath.toLowerCase();
  
  if (path.includes('knowledge-base') || path.includes('knowledge')) {
    return [
      "How do I upload documents to the knowledge base?",
      "What file formats are supported?",
      "How do I organize documents into folders?",
      "How do I assign knowledge folders to an agent?",
    ];
  }
  
  if (path.includes('agents') || path.includes('agent-configuration')) {
    return [
      "How do I create a new agent?",
      "What is the difference between Analyst, Reviewer, and Synthesizer?",
      "How do I configure response rules for an agent?",
      "How do I assign knowledge folders to an agent?",
    ];
  }
  
  if (path.includes('multi-agent') || path.includes('workflow-canvas')) {
    return [
      "How do I create a multi-agent workflow?",
      "How do I connect agents together?",
      "How do I run a workflow?",
      "How do I publish a workflow to the marketplace?",
    ];
  }
  
  if (path.includes('marketplace')) {
    return [
      "How do I import a configuration from the marketplace?",
      "How do I publish my agent to the marketplace?",
      "How do I search for specific configurations?",
      "What happens when I import a configuration?",
    ];
  }
  
  if (path.includes('team')) {
    return [
      "How do I invite team members?",
      "What are the different roles (Admin, Editor, Viewer)?",
      "How do I change a team member's role?",
      "How do I remove a team member?",
    ];
  }
  
  if (path.includes('settings')) {
    return [
      "How do I change the theme?",
      "How do I switch the language?",
      "How do I manage API keys?",
      "How do I configure notifications?",
    ];
  }
  
  if (path.includes('analytics')) {
    return [
      "How do I view usage statistics?",
      "What metrics are tracked?",
      "How do I export analytics data?",
      "How do I interpret the charts?",
    ];
  }
  
  if (path.includes('workflow-runs') || path.includes('monitor')) {
    return [
      "How do I view workflow run history?",
      "What do the different run statuses mean?",
      "How do I debug a failed workflow?",
      "How do I re-run a failed workflow?",
    ];
  }
  
  if (path.includes('dashboard') || path === '/') {
    return [
      "How do I get started with Smart Agents Generator?",
      "What can I build with this platform?",
      "How do I create my first agent?",
      "What are the key features?",
    ];
  }
  
  // Default suggestions
  return [
    "How do I create an agent?",
    "How do I upload documents?",
    "How do I create a workflow?",
    "Help me get started",
  ];
};

// Agent-specific suggestions for Agent Test Lab
export const generateAgentTestSuggestions = (agentRole?: string | null, persona?: string | null): string[] => {
  if (!agentRole && !persona) {
    return [
      "What are your capabilities?",
      "How can you help me?",
      "What topics can you discuss?",
      "Give me an example of what you can do",
    ];
  }
  
  const roleContext = (agentRole || persona || '').toLowerCase();
  
  if (roleContext.includes('analyst') || roleContext.includes('data') || roleContext.includes('analysis')) {
    return [
      "Analyze the latest documents and provide insights",
      "What patterns do you see in the data?",
      "Summarize the key findings from my documents",
      "Compare different topics in the knowledge base",
    ];
  }
  
  if (roleContext.includes('writer') || roleContext.includes('content') || roleContext.includes('creative')) {
    return [
      "Help me write a summary of this topic",
      "Create an outline based on the documents",
      "Improve the clarity of this text",
      "Generate ideas for content",
    ];
  }
  
  if (roleContext.includes('code') || roleContext.includes('developer') || roleContext.includes('technical')) {
    return [
      "Explain this technical concept",
      "Review the documentation for best practices",
      "How should I approach this problem?",
      "What are the key technical considerations?",
    ];
  }
  
  if (roleContext.includes('research') || roleContext.includes('study')) {
    return [
      "Research this topic using the knowledge base",
      "Find relevant information about...",
      "Summarize the research findings",
      "What are the main conclusions?",
    ];
  }
  
  if (roleContext.includes('review') || roleContext.includes('validate') || roleContext.includes('check')) {
    return [
      "Review this document for accuracy",
      "Validate the information against the knowledge base",
      "Check for inconsistencies",
      "What improvements would you suggest?",
    ];
  }
  
  if (roleContext.includes('summar') || roleContext.includes('synthesis')) {
    return [
      "Summarize the key documents",
      "Synthesize information from multiple sources",
      "Create an executive summary",
      "What are the main takeaways?",
    ];
  }
  
  // Generic agent suggestions
  return [
    "Based on my documents, what can you tell me about...",
    "Analyze the information in the knowledge base",
    "What insights can you provide from the documents?",
    "Help me understand the key concepts",
  ];
};

// Generate contextual suggestions based on conversation history and agent type
export const generateSuggestions = (
  messages: { role: string; content: string }[],
  agentType?: string | null,
  agentRole?: string | null,
  mode: 'assistant' | 'agent' = 'assistant',
  currentPath?: string
): string[] => {
  // Initial suggestions when no conversation
  if (messages.length === 0) {
    if (mode === 'assistant' && currentPath) {
      return generatePageContextSuggestions(currentPath);
    }
    if (mode === 'agent') {
      return generateAgentTestSuggestions(agentRole);
    }
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
