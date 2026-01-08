import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  ArrowRight,
  Bot,
  Zap
} from 'lucide-react';

interface AIInsight {
  type: 'suggestion' | 'warning' | 'trend' | 'tip';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AIInsightsProps {
  insights: AIInsight[];
  title?: string;
}

const insightIcons = {
  suggestion: Sparkles,
  warning: AlertTriangle,
  trend: TrendingUp,
  tip: Lightbulb,
};

const insightColors = {
  suggestion: 'bg-primary/10 text-primary',
  warning: 'bg-yellow-500/10 text-yellow-500',
  trend: 'bg-green-500/10 text-green-500',
  tip: 'bg-blue-500/10 text-blue-500',
};

export const AIInsights: React.FC<AIInsightsProps> = ({ 
  insights, 
  title = 'AI Insights' 
}) => {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = insightIcons[insight.type];
          const colorClass = insightColors[insight.type];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                {insight.action && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-2 text-primary"
                    onClick={insight.action.onClick}
                  >
                    {insight.action.label}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// Hook to generate contextual insights
export function useAIInsights(context: {
  agentCount?: number;
  workflowCount?: number;
  recentErrors?: number;
  documentCount?: number;
}) {
  const insights: AIInsight[] = [];

  if (context.agentCount === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Create Your First Agent',
      description: 'Start by creating an AI agent to power your workflows and conversations.',
    });
  }

  if (context.workflowCount === 0 && (context.agentCount || 0) >= 2) {
    insights.push({
      type: 'tip',
      title: 'Try Multi-Agent Workflows',
      description: 'You have multiple agents. Consider creating a workflow to chain them together.',
    });
  }

  if ((context.recentErrors || 0) > 3) {
    insights.push({
      type: 'warning',
      title: 'High Error Rate Detected',
      description: 'Several recent workflow executions have failed. Review your agent configurations.',
    });
  }

  if ((context.documentCount || 0) === 0) {
    insights.push({
      type: 'tip',
      title: 'Enhance with Knowledge Base',
      description: 'Upload documents to give your agents access to custom knowledge.',
    });
  }

  if ((context.agentCount || 0) >= 5) {
    insights.push({
      type: 'trend',
      title: 'Growing Agent Library',
      description: 'Great progress! Consider organizing agents by use case or domain.',
    });
  }

  return insights;
}

// Smart suggestions component for forms
interface SmartFieldSuggestionProps {
  field: string;
  value: string;
  onSuggestionApply: (suggestion: string) => void;
  suggestions?: string[];
}

export const SmartFieldSuggestion: React.FC<SmartFieldSuggestionProps> = ({
  field,
  value,
  onSuggestionApply,
  suggestions = [],
}) => {
  if (suggestions.length === 0 || value.length > 10) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Zap className="h-3 w-3" />
        <span>AI Suggestions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 3).map((suggestion, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSuggestionApply(suggestion)}
          >
            <Bot className="h-3 w-3 mr-1" />
            {suggestion}
          </Button>
        ))}
      </div>
    </motion.div>
  );
};
