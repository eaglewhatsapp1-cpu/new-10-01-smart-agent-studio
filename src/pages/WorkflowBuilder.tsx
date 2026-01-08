import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  Workflow,
  ArrowRight
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedAgent {
  display_name: string;
  role_description: string;
  persona: string;
  intro_sentence: string;
  core_model: 'core_analyst' | 'core_reviewer' | 'core_synthesizer';
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  agents: GeneratedAgent[];
  connections: { from: number; to: number }[];
}

interface WorkflowResult {
  ready: boolean;
  workflow: GeneratedWorkflow;
}

export const WorkflowBuilder: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<WorkflowResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const parseWorkflowFromResponse = (content: string): WorkflowResult | null => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.ready && parsed.workflow) {
          return parsed as WorkflowResult;
        }
      } catch (e) {
        console.error('Failed to parse workflow JSON:', e);
      }
    }
    return null;
  };

  const streamChat = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Get user session for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to use the workflow builder',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-builder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('Usage limit reached. Please add credits.');
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Check if the response contains a workflow
      const workflow = parseWorkflowFromResponse(assistantContent);
      if (workflow) {
        setGeneratedWorkflow(workflow);
      }
    } catch (error) {
      console.error('Stream error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process your request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deployWorkflow = async () => {
    if (!generatedWorkflow || !currentWorkspace) return;

    setIsDeploying(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create agents first
      const createdAgentIds: string[] = [];
      for (const agent of generatedWorkflow.workflow.agents) {
        const { data: agentData, error: agentError } = await supabase
          .from('ai_profiles')
          .insert({
            display_name: agent.display_name,
            role_description: agent.role_description,
            persona: agent.persona,
            intro_sentence: agent.intro_sentence,
            core_model: agent.core_model,
            workspace_id: currentWorkspace.id,
            created_by: user.user.id,
            is_active: true,
          })
          .select()
          .single();

        if (agentError) throw agentError;
        createdAgentIds.push(agentData.id);
      }

      // Create canvas nodes
      const nodeSpacing = 250;
      const startY = 200;
      const agentNodes = generatedWorkflow.workflow.agents.map((agent, index) => ({
        id: `agent-${index}`,
        type: 'agent',
        position: { x: 100 + (index * nodeSpacing), y: startY },
        data: {
          label: agent.display_name,
          agentId: createdAgentIds[index],
          model: agent.core_model,
        },
      }));

      // Add start and end nodes
      const nodes = [
        {
          id: 'start',
          type: 'start',
          position: { x: 100, y: 50 },
          data: { label: 'Start' },
        },
        ...agentNodes,
        {
          id: 'end',
          type: 'end',
          position: { x: 100 + (agentNodes.length * nodeSpacing), y: 50 },
          data: { label: 'End' },
        },
      ];

      // Create edges from connections
      const edges = [
        // Start to first agent
        { id: 'e-start-0', source: 'start', target: 'agent-0' },
        // Agent to agent connections
        ...generatedWorkflow.workflow.connections.map((conn, index) => ({
          id: `e-${index}`,
          source: `agent-${conn.from}`,
          target: `agent-${conn.to}`,
        })),
        // Last agent to end
        { 
          id: 'e-last-end', 
          source: `agent-${agentNodes.length - 1}`, 
          target: 'end' 
        },
      ];

      // Create multi-agent config
      const { data: configData, error: configError } = await supabase
        .from('multi_agent_configs')
        .insert({
          name: generatedWorkflow.workflow.name,
          description: generatedWorkflow.workflow.description,
          workspace_id: currentWorkspace.id,
          created_by: user.user.id,
          canvas_data: { nodes, edges },
          agent_nodes: agentNodes.map((node, index) => ({
            nodeId: node.id,
            agentId: createdAgentIds[index],
            model: generatedWorkflow.workflow.agents[index].core_model,
          })),
          connections: generatedWorkflow.workflow.connections,
        })
        .select()
        .single();

      if (configError) throw configError;

      toast({
        title: 'Workflow Deployed!',
        description: `Created ${createdAgentIds.length} agents and workflow canvas`,
      });

      // Navigate to the canvas
      navigate(`/multi-agent-canvas/${configData.id}`);
    } catch (error) {
      console.error('Deploy error:', error);
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Failed to deploy workflow',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      streamChat(input);
    }
  };

  const getCleanContent = (content: string) => {
    // Remove JSON blocks for display
    return content.replace(/```json[\s\S]*?```/g, '').trim();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Workflow Builder</h1>
            <p className="text-sm text-muted-foreground">
              Describe your multi-agent idea and I'll help you build it
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <Card className="p-6 bg-muted/50">
              <div className="text-center space-y-4">
                <Workflow className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-lg font-medium">Welcome to the AI Workflow Builder</h2>
                <p className="text-muted-foreground">
                  Describe your multi-agent workflow idea and I'll help you design and deploy it. 
                  For example:
                </p>
                <div className="grid gap-2 text-sm text-left max-w-md mx-auto">
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => streamChat("I want to create a content creation pipeline with a researcher, writer, and editor agent")}
                  >
                    "Create a content pipeline with researcher, writer, and editor agents"
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => streamChat("Build a customer support workflow that analyzes queries, drafts responses, and reviews them")}
                  >
                    "Build a customer support workflow with query analysis and response drafting"
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => streamChat("I need a data analysis workflow that collects data, analyzes patterns, and generates reports")}
                  >
                    "Design a data analysis workflow with collection, analysis, and reporting"
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card
                className={`p-4 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">
                  {getCleanContent(message.content) || (isLoading && index === messages.length - 1 ? '...' : '')}
                </p>
              </Card>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {/* Workflow Ready Card */}
          {generatedWorkflow && (
            <Card className="p-6 border-primary bg-primary/5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Workflow Ready to Deploy!</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {generatedWorkflow.workflow.name}</p>
                  <p><strong>Description:</strong> {generatedWorkflow.workflow.description}</p>
                  <p><strong>Agents:</strong> {generatedWorkflow.workflow.agents.length}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {generatedWorkflow.workflow.agents.map((agent, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-secondary rounded text-xs"
                      >
                        {agent.display_name}
                      </span>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={deployWorkflow} 
                  disabled={isDeploying}
                  className="w-full"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      Deploy to Canvas
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-card">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your multi-agent workflow idea..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={() => streamChat(input)} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
