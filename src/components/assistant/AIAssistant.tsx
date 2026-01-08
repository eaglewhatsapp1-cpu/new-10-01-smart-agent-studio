import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User,
  Lightbulb,
  HelpCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ContextualHint {
  page: string;
  hints: string[];
  quickActions: { label: string; prompt: string }[];
}

const contextualHints: Record<string, ContextualHint> = {
  '/': {
    page: 'Dashboard',
    hints: [
      'View your recent activity and key metrics',
      'Quick access to workflows and agents',
      'Monitor system performance'
    ],
    quickActions: [
      { label: 'How do I create an agent?', prompt: 'How do I create a new AI agent?' },
      { label: 'Run a workflow', prompt: 'How do I run a workflow?' },
    ]
  },
  '/agents': {
    page: 'Agents',
    hints: [
      'Create and manage AI agents',
      'Configure agent personas and behaviors',
      'Test agents with the chat feature'
    ],
    quickActions: [
      { label: 'Create new agent', prompt: 'Help me create a new AI agent with a specific persona' },
      { label: 'Best practices', prompt: 'What are best practices for configuring AI agents?' },
    ]
  },
  '/multi-agent-canvas': {
    page: 'Multi-Agent Canvas',
    hints: [
      'Design multi-agent workflows visually',
      'Connect agents for complex tasks',
      'Configure handoff rules between agents'
    ],
    quickActions: [
      { label: 'Create workflow', prompt: 'How do I create a multi-agent workflow?' },
      { label: 'Connect agents', prompt: 'How do I connect multiple agents in a workflow?' },
    ]
  },
  '/knowledge-base': {
    page: 'Knowledge Base',
    hints: [
      'Upload and organize documents',
      'Create folders for better organization',
      'Documents are processed for AI context'
    ],
    quickActions: [
      { label: 'Upload documents', prompt: 'How do I upload documents to the knowledge base?' },
      { label: 'Organize content', prompt: 'How should I organize my knowledge base content?' },
    ]
  },
  '/workflow-runs': {
    page: 'Workflow Runs',
    hints: [
      'Monitor workflow executions',
      'View execution logs and outputs',
      'Track success and failure rates'
    ],
    quickActions: [
      { label: 'Debug failed run', prompt: 'How do I debug a failed workflow run?' },
      { label: 'Improve performance', prompt: 'How can I improve workflow performance?' },
    ]
  },
  '/analytics': {
    page: 'Analytics',
    hints: [
      'Track usage metrics and trends',
      'Monitor agent performance',
      'Analyze response times'
    ],
    quickActions: [
      { label: 'Understand metrics', prompt: 'What do the analytics metrics mean?' },
      { label: 'Optimize usage', prompt: 'How can I optimize my AI usage?' },
    ]
  },
  '/ai-chat': {
    page: 'AI Chat',
    hints: [
      'Chat with your configured agents',
      'Test agent responses',
      'Save conversations for reference'
    ],
    quickActions: [
      { label: 'Chat tips', prompt: 'What are some tips for getting better responses from AI agents?' },
      { label: 'Select agent', prompt: 'How do I select which agent to chat with?' },
    ]
  },
};

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const currentContext = contextualHints[location.pathname] || contextualHints['/'];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemContext = `You are an AI assistant helping users navigate and use the AI Agent Builder platform. 
The user is currently on the ${currentContext.page} page.
Available features on this page: ${currentContext.hints.join(', ')}.
Be helpful, concise, and provide actionable guidance. 
If the user asks about features, explain how to use them step by step.
Keep responses under 150 words unless more detail is needed.`;

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            { role: 'system', content: systemContext },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageText.trim() },
          ],
        },
      });

      if (response.error) throw response.error;

      // Handle streaming response
      const reader = response.data?.getReader?.();
      if (reader) {
        let assistantContent = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'assistant') {
                      return prev.map((m, i) => 
                        i === prev.length - 1 ? { ...m, content: assistantContent } : m
                      );
                    }
                    return [...prev, { role: 'assistant', content: assistantContent, timestamp: new Date() }];
                  });
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Assistant error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Card className={`shadow-2xl border-border/50 overflow-hidden transition-all duration-300 ${
          isMinimized ? 'w-80 h-14' : 'w-96 h-[500px]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary-foreground/10"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary-foreground/10"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <Bot className="h-12 w-12 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold mb-1">How can I help?</h3>
                      <p className="text-sm text-muted-foreground">
                        I can assist you with the {currentContext.page} features
                      </p>
                    </div>

                    {/* Contextual Hints */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="h-3 w-3" />
                        <span>Tips for this page</span>
                      </div>
                      {currentContext.hints.map((hint, i) => (
                        <div key={i} className="text-sm p-2 rounded bg-muted/50 text-muted-foreground">
                          {hint}
                        </div>
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HelpCircle className="h-3 w-3" />
                        <span>Quick questions</span>
                      </div>
                      {currentContext.quickActions.map((action, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleQuickAction(action.prompt)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
