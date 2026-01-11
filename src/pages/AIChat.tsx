import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Bot, 
  Loader2,
  Sparkles,
  StopCircle,
  RefreshCw,
  Wand2,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SmartSuggestions, generatePageContextSuggestions } from '@/components/chat/SmartSuggestions';
import { PromptRefinement, refinePrompt, usePromptRefinement } from '@/components/chat/PromptRefinement';
import { ChatMessage, ChatMessageData } from '@/components/chat/ChatMessage';

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
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [lastVisitedPath, setLastVisitedPath] = useState<string>('/dashboard');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const promptRefinement = usePromptRefinement();

  // Track last visited path (before coming to AI Chat)
  useEffect(() => {
    const referrer = sessionStorage.getItem('lastVisitedPage');
    if (referrer && referrer !== '/ai-chat') {
      setLastVisitedPath(referrer);
    }
  }, []);

  // Save current path when leaving
  useEffect(() => {
    sessionStorage.setItem('lastVisitedPage', location.pathname);
  }, [location.pathname]);

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

  // Generate smart suggestions based on last visited page
  const suggestions = useMemo(() => {
    if (messages.length === 0) {
      return generatePageContextSuggestions(lastVisitedPath);
    }
    
    // Generate follow-up suggestions based on conversation
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      return generateContextualFollowUps(lastAssistantMessage.content);
    }
    
    return generatePageContextSuggestions(lastVisitedPath);
  }, [messages, lastVisitedPath]);

  // Helper function for contextual follow-ups
  const generateContextualFollowUps = (response: string): string[] => {
    const followUps: string[] = [];
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('step') || responseLower.includes('1.')) {
      followUps.push("Can you elaborate on the first step?");
    }
    if (responseLower.includes('agent')) {
      followUps.push("How do I configure the agent further?");
    }
    if (responseLower.includes('knowledge') || responseLower.includes('document')) {
      followUps.push("What file formats are supported?");
    }
    if (responseLower.includes('workflow')) {
      followUps.push("How do I run this workflow?");
    }
    
    // Add generic follow-ups
    while (followUps.length < 4) {
      const generics = [
        "Tell me more about this",
        "Can you give me an example?",
        "What's the next step?",
        "Are there any best practices?"
      ];
      const next = generics[followUps.length];
      if (next && !followUps.includes(next)) {
        followUps.push(next);
      } else {
        break;
      }
    }
    
    return followUps.slice(0, 4);
  };

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

    // Get user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Please sign in to use the chat');
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          mode: 'assistant', // Platform assistant mode
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
    const refined = refinePrompt(input.trim());
    if (refined !== input.trim()) {
      promptRefinement.checkForRefinement(input.trim());
    }
  };

  const handleNewChat = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  // Get friendly name for last visited page
  const getPageName = (path: string): string => {
    if (path.includes('knowledge')) return 'Knowledge Base';
    if (path.includes('agents')) return 'Agents';
    if (path.includes('multi-agent') || path.includes('workflow-canvas')) return 'Workflows';
    if (path.includes('marketplace')) return 'Marketplace';
    if (path.includes('team')) return 'Team';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('analytics')) return 'Analytics';
    return 'Dashboard';
  };

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
          <ScrollArea className="flex-1 h-full">
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
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Assistant</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Platform help & guidance • Context: {getPageName(lastVisitedPath)}
                </p>
              </div>
            </div>
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
                  <h3 className="font-semibold text-lg mb-1">How can I help you?</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mb-4">
                    I can guide you through any feature of the platform. Ask me about agents, workflows, knowledge bases, and more!
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
              placeholder="Ask me how to use any feature... (Shift+Enter for new line)"
              disabled={isLoading}
              className="min-h-[60px] resize-none"
            />
            <div className="flex flex-col gap-2">
              {input.trim() && !isLoading && (
                <Button 
                  variant="outline" 
                  onClick={handleRefinePrompt}
                  size="icon"
                  className="h-[28px] w-[60px]"
                  title="Refine prompt"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
              {isLoading ? (
                <Button 
                  variant="destructive" 
                  onClick={handleStop}
                  size="icon"
                  className="h-[28px] w-[60px]"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  size="icon"
                  className="h-[28px] w-[60px]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
