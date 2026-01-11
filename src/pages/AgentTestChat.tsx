import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Send, Bot, Loader2, RefreshCw, Wand2, StopCircle, FlaskConical, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { SmartSuggestions, generateAgentTestSuggestions } from '@/components/chat/SmartSuggestions';
import { PromptRefinement, refinePrompt, usePromptRefinement } from '@/components/chat/PromptRefinement';
import { ChatMessage, ChatMessageData } from '@/components/chat/ChatMessage';

interface Message extends ChatMessageData {
  timestamp: Date;
  confidence?: number;
  validation?: {
    score: number;
    structure_score: number;
    rules_score: number;
    passed: boolean;
    issues: { type: string; severity: string; message: string }[];
    rework_attempts: number;
  };
}

const RAG_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-chat`;

export const AgentTestChat: React.FC = () => {
  const { t } = useApp();
  const { currentWorkspace } = useWorkspace();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastValidation, setLastValidation] = useState<Message['validation'] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const promptRefinement = usePromptRefinement();

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const selectedAgentData = agents?.find(a => a.id === selectedAgent);

  // Generate smart suggestions based on agent role
  const suggestions = useMemo(() => {
    if (messages.length === 0) {
      return generateAgentTestSuggestions(
        selectedAgentData?.role_description,
        selectedAgentData?.persona
      );
    }
    
    // Follow-up suggestions after conversation
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      return [
        "Can you elaborate on that?",
        "What sources did you use?",
        "Give me more details",
        "Summarize the key points",
      ];
    }
    
    return generateAgentTestSuggestions(
      selectedAgentData?.role_description,
      selectedAgentData?.persona
    );
  }, [messages, selectedAgentData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const messageToSend = promptOverride || input.trim();
    if (!messageToSend || !selectedAgent) return;

    // Get user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Please sign in to use the chat');
      return;
    }

    promptRefinement.reset();
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLastValidation(null);

    try {
      // Get response rules from agent
      const responseRules = selectedAgentData?.response_rules as any || {};
      
      const resp = await fetch(RAG_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          agentConfig: {
            persona: selectedAgentData?.persona,
            role_description: selectedAgentData?.role_description,
            intro_sentence: selectedAgentData?.intro_sentence,
            response_rules: {
              ...responseRules,
              include_confidence_scores: responseRules.include_confidence_scores ?? false,
              use_bullet_points: responseRules.use_bullet_points ?? false,
              summarize_at_end: responseRules.summarize_at_end ?? false,
              custom_response_template: responseRules.custom_response_template ?? null,
            },
          },
          folder_ids: selectedAgentData?.allowed_folders || [],
          workspace_id: currentWorkspace?.id,
          enable_agentic: true,
          enable_memory: false,
          enable_hallucination_check: true,
          enable_adaptive_strategy: true,
          rework_settings: {
            enabled: true,
            max_retries: 2,
            minimum_score_threshold: 70,
            auto_correct: true,
          },
          mode: 'agent', // Agent-only mode - no platform context
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const result = await resp.json();
      
      // Extract validation info from response
      const validation = result.validation ? {
        score: result.validation.score,
        structure_score: result.validation.structure_score,
        rules_score: result.validation.rules_score,
        passed: result.validation.passed,
        issues: result.validation.issues || [],
        rework_attempts: result.validation.rework_attempts || 0,
      } : undefined;

      setLastValidation(validation || null);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        citations: result.citations,
        confidence: result.confidence,
        validation,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled
      } else {
        console.error('Chat error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to send message');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setLastValidation(null);
    promptRefinement.reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInput(suggestion);
    handleSend(suggestion);
  };

  const handleRefinePrompt = () => {
    if (!input.trim()) return;
    const refined = refinePrompt(input.trim(), selectedAgentData?.role_description);
    if (refined !== input.trim()) {
      promptRefinement.checkForRefinement(input.trim(), selectedAgentData?.role_description);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Test Lab</h1>
            <p className="text-muted-foreground text-sm">Test agents with their configured personas</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleClearChat} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Clear Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-5rem)]">
        {/* Agent Selection & Info Panel */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Select Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent to test..." />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAgentData && (
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Model</p>
                  <Badge variant="secondary">
                    {selectedAgentData.core_model}
                  </Badge>
                </div>
                {selectedAgentData.persona && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Persona</p>
                    <p className="text-sm">{selectedAgentData.persona}</p>
                  </div>
                )}
                {selectedAgentData.role_description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Role</p>
                    <p className="text-sm">{selectedAgentData.role_description}</p>
                  </div>
                )}
                {selectedAgentData.allowed_folders && selectedAgentData.allowed_folders.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Knowledge Folders</p>
                    <Badge variant="outline" className="text-xs">
                      {selectedAgentData.allowed_folders.length} folder(s)
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Validation Results Panel */}
            {lastValidation && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Response Quality</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Overall</p>
                    <p className={`text-lg font-bold ${getScoreColor(lastValidation.score)}`}>
                      {lastValidation.score}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rules</p>
                    <p className={`text-lg font-bold ${getScoreColor(lastValidation.rules_score)}`}>
                      {lastValidation.rules_score}%
                    </p>
                  </div>
                </div>

                <Progress value={lastValidation.score} className="h-2" />

                <div className={`p-2 rounded-lg text-xs ${lastValidation.passed ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  <div className="flex items-center gap-1">
                    {lastValidation.passed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span>{lastValidation.passed ? 'Validation passed' : 'Needs improvement'}</span>
                  </div>
                </div>

                {lastValidation.rework_attempts > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Re-worked {lastValidation.rework_attempts} time(s)
                  </p>
                )}

                {lastValidation.issues.length > 0 && (
                  <div className="space-y-1">
                    {lastValidation.issues.slice(0, 3).map((issue, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        • {issue.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {selectedAgentData ? (
                <span>{selectedAgentData.display_name} - Test Chat</span>
              ) : (
                <span>Test Chat</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="text-center max-w-md">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2 text-foreground">
                      {selectedAgent ? 'Test Your Agent' : 'Select an Agent'}
                    </h3>
                    <p className="text-sm mb-4">
                      {selectedAgent 
                        ? `Test "${selectedAgentData?.display_name}" with prompts to see how it responds based on its configured persona and knowledge.`
                        : 'Choose an agent from the panel to start testing.'
                      }
                    </p>
                    {selectedAgent && (
                      <SmartSuggestions 
                        suggestions={suggestions}
                        onSelect={handleSuggestionSelect}
                        isLoading={isLoading}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      showFeedback={!!message.id}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 space-y-3">
              {/* Smart Suggestions - show after conversation */}
              {messages.length > 0 && !isLoading && (
                <SmartSuggestions 
                  suggestions={suggestions}
                  onSelect={handleSuggestionSelect}
                  isLoading={isLoading}
                />
              )}

              {/* Prompt Refinement */}
              {promptRefinement.showRefinement && (
                <PromptRefinement
                  originalPrompt={promptRefinement.pendingPrompt}
                  onAccept={(refined) => promptRefinement.acceptRefinement(refined, handleSend)}
                  onCancel={() => promptRefinement.cancelRefinement(handleSend)}
                  agentContext={selectedAgentData?.role_description}
                />
              )}

              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedAgent ? "Test your agent with a prompt..." : "Select an agent first..."}
                  disabled={!selectedAgent || isLoading}
                  className="min-h-[60px] resize-none"
                />
                {input.trim() && !isLoading && selectedAgent && (
                  <Button 
                    variant="outline" 
                    onClick={handleRefinePrompt}
                    className="h-[60px] w-[60px]"
                    title="Refine prompt"
                  >
                    <Wand2 className="h-5 w-5" />
                  </Button>
                )}
                {isLoading ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleStop}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    <StopCircle className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSend()}
                    disabled={!selectedAgent || !input.trim()}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
