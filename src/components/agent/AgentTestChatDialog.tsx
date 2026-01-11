import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Send, 
  Square, 
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  FileJson,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Loader2,
  Bot,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateResponse, generateCorrectionPrompt, checkConfigurationCompatibility, exportAsJSON } from '@/lib/responseValidation';
import type { ResponseRules, ValidationScore, ReworkSettings } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  validation?: ValidationScore;
  reworkAttempts?: number;
}

interface AgentTestChatDialogProps {
  formData: {
    display_name: string;
    persona: string;
    role_description: string;
    intro_sentence: string;
    core_model: string;
    allowed_folders: string[];
    rag_policy: any;
    response_rules: ResponseRules;
  };
  reworkSettings: ReworkSettings;
  workspaceId: string | null;
  isCompatible: boolean;
}

const SAMPLE_PROMPTS = [
  "What can you help me with?",
  "Explain the main concepts in my knowledge base",
  "Analyze the latest documents and provide insights",
  "Compare the key findings from different sources",
  "Give me a step-by-step guide on getting started"
];

export const AgentTestChatDialog: React.FC<AgentTestChatDialogProps> = ({
  formData,
  reworkSettings,
  workspaceId,
  isCompatible
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentReworkAttempt, setCurrentReworkAttempt] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const compatibility = useMemo(() => {
    return checkConfigurationCompatibility(
      formData.response_rules, 
      formData.response_rules.custom_response_template
    );
  }, [formData.response_rules]);

  const handleSend = async (promptOverride?: string) => {
    const messageContent = promptOverride || input.trim();
    if (!messageContent) return;

    setInput('');
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentReworkAttempt(0);

    abortControllerRef.current = new AbortController();

    try {
      // Build messages for API
      const apiMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: messageContent }
      ];

      let response = '';
      let reworkAttempts = 0;
      let finalValidation: ValidationScore | undefined;

      // Initial request
      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: {
          messages: apiMessages,
          agentConfig: {
            persona: formData.persona,
            role_description: formData.role_description,
            intro_sentence: formData.intro_sentence,
            response_rules: formData.response_rules,
            custom_response_template: formData.response_rules.custom_response_template
          },
          folder_ids: formData.allowed_folders,
          workspace_id: workspaceId,
          enable_agentic: true,
          enable_memory: false,
          enable_hallucination_check: true,
          enable_adaptive_strategy: true,
          rework_settings: reworkSettings
        }
      });

      if (error) throw error;
      
      response = data?.response || 'No response generated';
      
      // Validate response
      let validation = validateResponse(
        response, 
        formData.response_rules, 
        formData.response_rules.custom_response_template
      );

      // Re-work loop if enabled and score is below threshold
      if (reworkSettings.enabled && 
          validation.overall_score < reworkSettings.minimum_score_threshold &&
          reworkAttempts < reworkSettings.max_retries) {
        
        while (reworkAttempts < reworkSettings.max_retries && 
               validation.overall_score < reworkSettings.minimum_score_threshold) {
          reworkAttempts++;
          setCurrentReworkAttempt(reworkAttempts);

          const correctionPrompt = generateCorrectionPrompt(
            response,
            validation,
            formData.response_rules,
            formData.response_rules.custom_response_template
          );

          const { data: reworkData, error: reworkError } = await supabase.functions.invoke('rag-chat', {
            body: {
              messages: [
                ...apiMessages,
                { role: 'assistant', content: response },
                { role: 'user', content: correctionPrompt }
              ],
              agentConfig: {
                persona: formData.persona,
                role_description: formData.role_description,
                intro_sentence: formData.intro_sentence,
                response_rules: formData.response_rules,
                custom_response_template: formData.response_rules.custom_response_template
              },
              folder_ids: formData.allowed_folders,
              workspace_id: workspaceId,
              enable_agentic: false,
              enable_memory: false
            }
          });

          if (reworkError) break;

          response = reworkData?.response || response;
          validation = validateResponse(
            response,
            formData.response_rules,
            formData.response_rules.custom_response_template
          );
        }
      }

      finalValidation = validation;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        validation: finalValidation,
        reworkAttempts
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: error.message || 'Failed to get response',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
      setCurrentReworkAttempt(0);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  const exportTestResults = () => {
    const results = {
      agent_config: {
        display_name: formData.display_name,
        core_model: formData.core_model,
        response_rules: formData.response_rules,
        rework_settings: reworkSettings
      },
      compatibility_check: compatibility,
      conversation: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
        validation: m.validation,
        rework_attempts: m.reworkAttempts
      })),
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_test_results_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'Test results exported successfully' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={!isCompatible}
          title={!isCompatible ? 'Fix configuration compatibility issues first' : 'Test agent with current settings'}
        >
          <Play className="h-4 w-4" />
          Test Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Test Agent: {formData.display_name || 'Unnamed Agent'}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formData.core_model}
              </Badge>
              <Badge 
                variant={compatibility.is_compatible ? "default" : "secondary"}
                className={`text-xs ${compatibility.is_compatible ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}
              >
                Compatibility: {compatibility.score}%
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {/* Chat Panel */}
          <div className="col-span-2 flex flex-col border rounded-lg">
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </span>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">
                    Start testing by sending a message or try a sample prompt
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SAMPLE_PROMPTS.slice(0, 3).map((prompt, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSend(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted/50 border'
                        }`}>
                          <pre className="whitespace-pre-wrap text-sm font-sans">
                            {message.content}
                          </pre>
                        </div>
                        {message.validation && (
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className={getScoreColor(message.validation.overall_score)}>
                              Score: {message.validation.overall_score}%
                            </span>
                            {message.reworkAttempts !== undefined && message.reworkAttempts > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {message.reworkAttempts} rework{message.reworkAttempts > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {message.validation.passed ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div className="bg-muted/50 border rounded-lg p-3">
                        <span className="text-sm text-muted-foreground">
                          {currentReworkAttempt > 0 
                            ? `Re-working response (attempt ${currentReworkAttempt}/${reworkSettings.max_retries})...`
                            : 'Generating response...'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message to test the agent..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                {isLoading ? (
                  <Button variant="destructive" size="icon" onClick={handleStop}>
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="icon" onClick={() => handleSend()}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Validation Panel */}
          <div className="flex flex-col border rounded-lg">
            <Tabs defaultValue="validation" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 m-2 mb-0">
                <TabsTrigger value="validation" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Validation
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="validation" className="flex-1 p-3 space-y-3">
                {/* Latest Response Validation */}
                {messages.filter(m => m.role === 'assistant').length > 0 ? (
                  <>
                    {(() => {
                      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                      if (!lastAssistant?.validation) return null;
                      const v = lastAssistant.validation;
                      return (
                        <div className="space-y-3">
                          <div className="text-xs uppercase text-muted-foreground">Latest Response</div>
                          
                          <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Overall Score</span>
                              <span className={`text-xl font-bold ${getScoreColor(v.overall_score)}`}>
                                {v.overall_score}%
                              </span>
                            </div>
                            <Progress value={v.overall_score} className="h-2" />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded bg-muted/30">
                              <p className="text-xs text-muted-foreground">Structure</p>
                              <p className={`font-bold ${getScoreColor(v.structure_score)}`}>{v.structure_score}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/30">
                              <p className="text-xs text-muted-foreground">Rules</p>
                              <p className={`font-bold ${getScoreColor(v.rules_score)}`}>{v.rules_score}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/30">
                              <p className="text-xs text-muted-foreground">Quality</p>
                              <p className={`font-bold ${getScoreColor(v.quality_score)}`}>{v.quality_score}</p>
                            </div>
                          </div>

                          {v.issues.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Issues ({v.issues.length})</p>
                              {v.issues.slice(0, 3).map((issue, idx) => (
                                <div key={idx} className="text-xs p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                                  {issue.message}
                                </div>
                              ))}
                            </div>
                          )}

                          {lastAssistant.reworkAttempts !== undefined && lastAssistant.reworkAttempts > 0 && (
                            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                              <div className="flex items-center gap-2 text-xs">
                                <RefreshCw className="h-3 w-3 text-blue-500" />
                                <span>Auto-corrected in {lastAssistant.reworkAttempts} attempt(s)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Send a message to see validation results</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="flex-1 p-3 space-y-3">
                <div className="text-xs uppercase text-muted-foreground">Current Settings</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Re-work Enabled</span>
                    <span>{reworkSettings.enabled ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Retries</span>
                    <span>{reworkSettings.max_retries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Score Threshold</span>
                    <span>{reworkSettings.minimum_score_threshold}%</span>
                  </div>
                </div>

                <div className="text-xs uppercase text-muted-foreground pt-2">Active Rules</div>
                <div className="flex flex-wrap gap-1">
                  {formData.response_rules.step_by_step && <Badge variant="outline" className="text-xs">Steps</Badge>}
                  {formData.response_rules.cite_if_possible && <Badge variant="outline" className="text-xs">Citations</Badge>}
                  {formData.response_rules.refuse_if_uncertain && <Badge variant="outline" className="text-xs">Uncertainty</Badge>}
                  {formData.response_rules.include_confidence_scores && <Badge variant="outline" className="text-xs">Confidence</Badge>}
                  {formData.response_rules.use_bullet_points && <Badge variant="outline" className="text-xs">Bullets</Badge>}
                  {formData.response_rules.summarize_at_end && <Badge variant="outline" className="text-xs">Summary</Badge>}
                </div>
              </TabsContent>
            </Tabs>

            {/* Export Button */}
            <div className="p-3 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-1 text-xs"
                onClick={exportTestResults}
                disabled={messages.length === 0}
              >
                <Download className="h-3 w-3" />
                Export Test Results
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
