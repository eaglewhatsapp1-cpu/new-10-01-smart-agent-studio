import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, X, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
  timestamp: Date;
}

interface AgentNode {
  id: string;
  label: string;
  model: string;
  agentId: string;
}

interface AgentChatPanelProps {
  agents: AgentNode[];
  isOpen: boolean;
  onClose: () => void;
  workflowId?: string;
  workspaceId?: string;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  agents,
  isOpen,
  onClose,
  workflowId,
  workspaceId,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || agents.length === 0) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call the run-workflow edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workflowId,
            workspaceId,
            triggerType: 'chat',
            inputData: { prompt: currentInput },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const result = await response.json();

      // Process response from each agent
      if (result.outputData) {
        for (const agent of agents) {
          const agentOutput = result.outputData[agent.agentId];
          if (agentOutput) {
            const agentResponse: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: agentOutput.response || 'No response generated',
              agentName: agentOutput.agent || agent.label,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentResponse]);
          }
        }
      }

      // If no output, show logs summary
      if (!result.outputData || Object.keys(result.outputData).length === 0) {
        const logs = result.executionLogs || [];
        const summary = logs.map((log: any) => `[${log.type}] ${log.agent || ''}: ${log.message}`).join('\n');
        
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: summary || 'Workflow completed but no output was generated.',
            agentName: 'System',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute workflow',
        variant: 'destructive',
      });
      
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to execute workflow'}`,
          agentName: 'System',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <Card
      className={`fixed z-50 shadow-2xl transition-all duration-300 ${
        isExpanded
          ? 'inset-4 lg:inset-8'
          : 'bottom-4 right-4 w-96 h-[500px] lg:w-[450px]'
      }`}
    >
      <CardHeader className="border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">
            Test Workflow ({agents.length} agent{agents.length !== 1 ? 's' : ''})
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col p-0 h-[calc(100%-60px)]">
        {/* Agent Pills */}
        <div className="flex flex-wrap gap-1 p-3 border-b bg-muted/30">
          {agents.map((agent, i) => (
            <Badge key={agent.id} variant="outline" className="text-xs">
              {i + 1}. {agent.label}
            </Badge>
          ))}
          {agents.length === 0 && (
            <span className="text-xs text-muted-foreground">No agents in workflow</span>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Start testing your workflow</p>
                <p className="text-xs mt-1 opacity-70">Your message will be processed by all agents</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-2.5 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.agentName && (
                      <Badge variant="secondary" className="text-[10px] mb-1">
                        {message.agentName}
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-[10px] opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg p-2.5">
                    <p className="text-sm text-muted-foreground">Processing with AI agents...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                agents.length > 0
                  ? 'Type your message...'
                  : 'Add agents to the workflow first...'
              }
              disabled={agents.length === 0 || isLoading}
              className="min-h-[50px] max-h-[100px] resize-none text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={agents.length === 0 || !input.trim() || isLoading}
              size="icon"
              className="h-[50px] w-[50px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
