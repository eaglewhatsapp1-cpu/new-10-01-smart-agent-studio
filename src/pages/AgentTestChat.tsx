import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bot, User, Loader2, RefreshCw, Wand2, StopCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SmartSuggestions, generateSuggestions } from '@/components/chat/SmartSuggestions';
import { PromptRefinement, refinePrompt, usePromptRefinement } from '@/components/chat/PromptRefinement';
import { ChatMessage, ChatMessageData } from '@/components/chat/ChatMessage';

interface Message extends ChatMessageData {
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export const AgentTestChat: React.FC = () => {
  const { t } = useApp();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Generate smart suggestions
  const suggestions = useMemo(() => {
    return generateSuggestions(
      messages.map(m => ({ role: m.role, content: m.content })),
      selectedAgentData?.core_model,
      selectedAgentData?.role_description
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

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          agentConfig: selectedAgentData,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';

      const updateAssistant = (content: string) => {
        assistantContent = content;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { id: crypto.randomUUID(), role: 'assistant', content, timestamp: new Date() }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              updateAssistant(assistantContent + content);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
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

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agent Test Lab</h1>
          <p className="text-muted-foreground mt-1">Test individual agents with prompts</p>
        </div>
        <Button variant="outline" onClick={handleClearChat} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Clear Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-5rem)]">
        {/* Agent Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent..." />
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
                  <p className="text-sm font-medium text-muted-foreground">Model</p>
                  <Badge variant="secondary" className="mt-1">
                    {selectedAgentData.core_model}
                  </Badge>
                </div>
                {selectedAgentData.role_description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-sm mt-1">{selectedAgentData.role_description}</p>
                  </div>
                )}
                {selectedAgentData.persona && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Persona</p>
                    <p className="text-sm mt-1">{selectedAgentData.persona}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {selectedAgentData ? selectedAgentData.display_name : 'Chat Interface'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">Select an agent and start chatting</p>
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
                  placeholder={selectedAgent ? "Type your message..." : "Select an agent first..."}
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
