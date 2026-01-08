import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Bot, Settings2, Trash2, Brain, FileText, Sparkles, Zap } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type CoreModel = 'core_analyst' | 'core_reviewer' | 'core_synthesizer';

export const Agents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: agents, isLoading } = useQuery({
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('ai_profiles').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Success', description: 'Agent deleted successfully' });
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getModelInfo = (model: CoreModel) => {
    switch (model) {
      case 'core_analyst':
        return { icon: <Brain className="h-4 w-4" />, label: 'ANALYST', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'core_reviewer':
        return { icon: <FileText className="h-4 w-4" />, label: 'REVIEWER', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'core_synthesizer':
        return { icon: <Sparkles className="h-4 w-4" />, label: 'SYNTHESIZER', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      default:
        return { icon: <Bot className="h-4 w-4" />, label: model, color: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">AGENT MATRIX</h1>
          <p className="text-muted-foreground mt-1">Neural Infrastructure Matrix - Control Center</p>
        </div>
        <Button 
          className="gap-2 gradient-cyber text-primary-foreground" 
          onClick={() => navigate('/agents/new')}
        >
          <Plus className="h-4 w-4" />
          DEPLOY NEW AGENT
        </Button>
      </div>

      {/* Agent Hubs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cyber-border bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:from-blue-500/15 hover:to-blue-600/10 transition-all cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Brain className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">ANALYST HUB</h3>
                <p className="text-sm text-muted-foreground">Data Analysis Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-border bg-gradient-to-br from-green-500/10 to-green-600/5 hover:from-green-500/15 hover:to-green-600/10 transition-all cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/20">
                <FileText className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">REVIEW LAB</h3>
                <p className="text-sm text-muted-foreground">Document Review Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-border bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:from-purple-500/15 hover:to-purple-600/10 transition-all cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">SYNTHESIS SUITE</h3>
                <p className="text-sm text-muted-foreground">Content Synthesis Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card className="cyber-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Active Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => {
                const modelInfo = getModelInfo(agent.core_model as CoreModel);
                return (
                  <Card 
                    key={agent.id} 
                    className="group relative hover:shadow-lg transition-all cursor-pointer border-border/50 hover:border-primary/30"
                    onClick={() => navigate(`/agents/${agent.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Bot className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{agent.display_name}</h3>
                            {agent.user_defined_name && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {agent.user_defined_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/agents/${agent.id}`);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(agent.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="outline" className={`gap-1 ${modelInfo.color}`}>
                          {modelInfo.icon}
                          {modelInfo.label}
                        </Badge>
                      </div>

                      {agent.role_description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {agent.role_description}
                        </p>
                      )}

                      {agent.intro_sentence && (
                        <p className="text-xs italic text-muted-foreground/70 mt-2 line-clamp-1">
                          "{agent.intro_sentence}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No agents deployed yet. Click "DEPLOY NEW AGENT" to get started.
              </p>
              <Button onClick={() => navigate('/agents/new')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Deploy First Agent
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
