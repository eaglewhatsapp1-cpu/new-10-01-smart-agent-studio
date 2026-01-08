import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Bot, 
  User, 
  Loader2,
  Trash2,
  Sparkles,
  Mic,
  StopCircle,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SmartSuggestions, generateSuggestions } from '@/components/chat/SmartSuggestions';
import { PromptRefinement, refinePrompt, usePromptRefinement } from '@/components/chat/PromptRefinement';
import { ChatMessage, ChatMessageData } from '@/components/chat/ChatMessage';
import { Citation } from '@/components/chat/CitationDisplay';

interface Message extends ChatMessageData {
  conversationId?: string;
}

interface Conversation {
  id: string;
  title: string;
  agent_id: string | null;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export const AIChat: React.FC = () => {
  const { t } = useApp();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const promptRefinement = usePromptRefinement();

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ['conversations', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!currentWorkspace,
  });

  // Fetch agents
  const { data: agents } = useQuery({
    queryKey: ['agents-for-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_profiles')
        .select('id, display_name, persona, role_description, intro_sentence, core_model')
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });

  // Generate smart suggestions based on conversation
  const suggestions = useMemo(() => {
    const selectedAgentData = agents?.find(a => a.id === selectedAgent);
    return generateSuggestions(
      messages.map(m => ({ role: m.role, content: m.content })),
      selectedAgentData?.core_model,
      selectedAgentData?.role_description
    );
  }, [messages, selectedAgent, agents]);

  // Fetch messages for selected conversation
  const { data: conversationMessages } = useQuery({
    queryKey: ['chat-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at');
      if (error) throw error;
      return data.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }));
    },
    enabled: !!selectedConversation,
  });

  useEffect(() => {
    if (conversationMessages) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace || !user) throw new Error('No workspace or user');
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          workspace_id: currentWorkspace.id,
          agent_id: selectedAgent,
          title: 'New Chat',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSelectedConversation(data.id);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Save message
  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role,
      content,
    });
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Stream chat
  const streamChat = async (userMessage: string) => {
    setIsLoading(true);
    setIsTyping(true);
    abortControllerRef.current = new AbortController();
    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);

    let conversationId = selectedConversation;
    
    // Create conversation if none selected
    if (!conversationId) {
      const { data } = await supabase
        .from('chat_conversations')
        .insert({
          workspace_id: currentWorkspace?.id,
          agent_id: selectedAgent,
          title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
          created_by: user?.id,
        })
        .select()
        .single();
      if (data) {
        conversationId = data.id;
        setSelectedConversation(data.id);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    }

    if (conversationId) {
      await saveMessage(conversationId, 'user', userMessage);
    }

    // Get agent config if selected
    const agentConfig = selectedAgent ? agents?.find(a => a.id === selectedAgent) : null;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          agentConfig,
        }),
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
          return [...prev, { role: 'assistant', content }];
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

      // Save assistant message
      if (conversationId && assistantContent) {
        await saveMessage(conversationId, 'assistant', assistantContent);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (promptOverride?: string) => {
    const messageToSend = promptOverride || input.trim();
    if (!messageToSend || isLoading) return;
    promptRefinement.reset();
    streamChat(messageToSend);
    setInput('');
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInput(suggestion);
    handleSend(suggestion);
  };

  const handleRefinePrompt = () => {
    if (!input.trim()) return;
    const selectedAgentData = agents?.find(a => a.id === selectedAgent);
    const refined = refinePrompt(input.trim(), selectedAgentData?.role_description);
    if (refined !== input.trim()) {
      promptRefinement.checkForRefinement(input.trim(), selectedAgentData?.role_description);
    }
  };

  const handleNewChat = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const selectedAgentData = agents?.find(a => a.id === selectedAgent);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar */}
      <Card className="w-72 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <Button size="sm" variant="ghost" onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Agent Selector */}
          <div className="px-4 pb-3 border-b border-border">
            <label className="text-xs text-muted-foreground mb-2 block">Select Agent</label>
            <select
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(e.target.value || null)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Default Assistant</option>
              {agents?.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.display_name}</option>
              ))}
            </select>
          </div>
          
          <ScrollArea className="flex-1 h-[calc(100%-80px)]">
            <div className="p-2 space-y-1">
              {conversations?.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedConversation === conv.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                </button>
              ))}
              {(!conversations || conversations.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No conversations yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {selectedAgentData?.display_name || 'AI Assistant'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedAgentData?.role_description || 'Ready to help'}
                </p>
              </div>
            </div>
            {selectedAgentData && (
              <Badge variant="secondary">{selectedAgentData.display_name}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Start a conversation</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mb-4">
                    Ask questions, get help with tasks, or explore your knowledge base.
                  </p>
                  <SmartSuggestions 
                    suggestions={suggestions}
                    onSelect={handleSuggestionSelect}
                    isLoading={isLoading}
                  />
                </div>
              )}
              
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id || index}
                    message={{
                      ...message,
                      conversationId: selectedConversation || undefined,
                    }}
                    showFeedback={!!message.id && !message.isStreaming}
                  />
                ))}
                
                {isTyping && messages[messages.length - 1]?.role === 'user' && !messages.some(m => m.isStreaming) && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t border-border space-y-3">
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
                agentContext={agents?.find(a => a.id === selectedAgent)?.role_description}
              />
            )}

            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isLoading}
                className="flex-1 min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              {input.trim() && !isLoading && (
                <Button 
                  variant="outline" 
                  onClick={handleRefinePrompt}
                  className="h-11"
                  title="Refine prompt"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
              {isLoading ? (
                <Button variant="destructive" onClick={handleStop} className="h-11">
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => handleSend()} disabled={!input.trim()} className="h-11">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              AI responses are generated using Lovable AI. Results may vary.
            </p>
          </div>
        </Card>
      </div>
    );
  };
