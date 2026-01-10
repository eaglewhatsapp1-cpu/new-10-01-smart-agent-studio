import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  Bot, 
  Brain, 
  Sparkles,
  Database,
  FileText,
  Download,
  Scale,
  Key,
  Settings
} from 'lucide-react';

import { AgentLifecycleSettings } from '@/components/scheduling/AgentLifecycleSettings';
import { ResponsePreviewPanel } from '@/components/agent/ResponsePreviewPanel';

type CoreModel = 'core_analyst' | 'core_reviewer' | 'core_synthesizer';
type CreativityLevel = 'none' | 'very_low' | 'low' | 'medium' | 'high';

interface AgentFormData {
  display_name: string;
  user_defined_name: string;
  role_description: string;
  persona: string;
  intro_sentence: string;
  core_model: CoreModel;
  api_key_id: string;
  allowed_folders: string[];
  is_active: boolean;
  active_from: string | null;
  active_until: string | null;
  active_days: number[];
  rag_policy: {
    knowledge_base_ratio: number;
    web_verification_ratio: number;
    hallucination_tolerance: string;
    creativity_level: CreativityLevel;
  };
  response_rules: {
    step_by_step: boolean;
    cite_if_possible: boolean;
    refuse_if_uncertain: boolean;
  };
}

const defaultFormData: AgentFormData = {
  display_name: '',
  user_defined_name: '',
  role_description: '',
  persona: '',
  intro_sentence: '',
  core_model: 'core_analyst',
  api_key_id: '',
  allowed_folders: [],
  is_active: true,
  active_from: null,
  active_until: null,
  active_days: [0, 1, 2, 3, 4, 5, 6],
  rag_policy: {
    knowledge_base_ratio: 0.7,
    web_verification_ratio: 0.3,
    hallucination_tolerance: 'very_low',
    creativity_level: 'very_low',
  },
  response_rules: {
    step_by_step: true,
    cite_if_possible: true,
    refuse_if_uncertain: true,
  },
};

export const AgentConfiguration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [activePreset, setActivePreset] = useState<'balanced' | 'knowledge' | 'creative'>('balanced');

  const isNew = id === 'new';

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('ai_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Fetch workspace API keys
  const { data: workspaceApiKeys } = useQuery({
    queryKey: ['workspace-api-keys', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_api_keys')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });


  useEffect(() => {
    if (agent) {
      const ragPolicy = agent.rag_policy as any || {};
      const responseRules = agent.response_rules as any || {};
      setFormData({
        display_name: agent.display_name || '',
        user_defined_name: agent.user_defined_name || '',
        role_description: agent.role_description || '',
        persona: agent.persona || '',
        intro_sentence: agent.intro_sentence || '',
        core_model: agent.core_model || 'core_analyst',
        api_key_id: agent.api_key_id || '',
        allowed_folders: agent.allowed_folders || [],
        is_active: agent.is_active ?? true,
        active_from: agent.active_from || null,
        active_until: agent.active_until || null,
        active_days: agent.active_days || [0, 1, 2, 3, 4, 5, 6],
        rag_policy: {
          knowledge_base_ratio: ragPolicy.knowledge_base_ratio ?? 0.7,
          web_verification_ratio: ragPolicy.web_verification_ratio ?? 0.3,
          hallucination_tolerance: ragPolicy.hallucination_tolerance || 'very_low',
          creativity_level: ragPolicy.creativity_level || 'very_low',
        },
        response_rules: {
          step_by_step: responseRules.step_by_step ?? true,
          cite_if_possible: responseRules.cite_if_possible ?? true,
          refuse_if_uncertain: responseRules.refuse_if_uncertain ?? true,
        },
      });
    }
  }, [agent]);

  const applyPreset = (preset: 'balanced' | 'knowledge' | 'creative') => {
    setActivePreset(preset);
    switch (preset) {
      case 'balanced':
        setFormData(prev => ({
          ...prev,
          rag_policy: {
            knowledge_base_ratio: 0.7,
            web_verification_ratio: 0.3,
            hallucination_tolerance: 'low',
            creativity_level: 'low',
          },
        }));
        break;
      case 'knowledge':
        setFormData(prev => ({
          ...prev,
          rag_policy: {
            knowledge_base_ratio: 0.9,
            web_verification_ratio: 0.1,
            hallucination_tolerance: 'very_low',
            creativity_level: 'none',
          },
        }));
        break;
      case 'creative':
        setFormData(prev => ({
          ...prev,
          rag_policy: {
            knowledge_base_ratio: 0.5,
            web_verification_ratio: 0.5,
            hallucination_tolerance: 'medium',
            creativity_level: 'medium',
          },
        }));
        break;
    }
  };

  const handleSubmit = async () => {
    if (!formData.display_name.trim()) {
      toast({ title: 'Error', description: 'Display name is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({ title: 'Error', description: 'You must be logged in to save an agent', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const payload = {
        display_name: formData.display_name,
        user_defined_name: formData.user_defined_name || formData.display_name,
        role_description: formData.role_description || null,
        persona: formData.persona || null,
        intro_sentence: formData.intro_sentence || null,
        core_model: formData.core_model,
        api_key_id: formData.api_key_id || null,
        allowed_folders: formData.allowed_folders,
        is_active: formData.is_active,
        active_from: formData.active_from,
        active_until: formData.active_until,
        active_days: formData.active_days,
        rag_policy: formData.rag_policy,
        response_rules: formData.response_rules,
      };

      if (isNew) {
        const insertPayload = {
          ...payload,
          created_by: userData.user.id,
          workspace_id: currentWorkspace?.id || null,
        };
        const { error } = await supabase.from('ai_profiles').insert(insertPayload);
        if (error) throw error;
        toast({ title: 'Success', description: 'Agent created successfully' });
      } else {
        const { error } = await supabase.from('ai_profiles').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Agent updated successfully' });
      }

      queryClient.invalidateQueries({ queryKey: ['agents'] });
      navigate('/agents');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      display_name: formData.display_name,
      user_defined_name: formData.user_defined_name,
      role_description: formData.role_description,
      persona: formData.persona,
      intro_sentence: formData.intro_sentence,
      core_model: formData.core_model,
      allowed_folders: formData.allowed_folders,
      rag_policy: formData.rag_policy,
      response_rules: formData.response_rules,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(formData.display_name || 'agent').replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Agent configuration exported successfully',
    });
  };

  const modelIcons: Record<CoreModel, { icon: React.ReactNode; label: string; category: string }> = {
    core_analyst: { icon: <Brain className="h-5 w-5" />, label: 'CORE_ANALYST', category: 'Analysis' },
    core_reviewer: { icon: <FileText className="h-5 w-5" />, label: 'CORE_REVIEWER', category: 'Review' },
    core_synthesizer: { icon: <Sparkles className="h-5 w-5" />, label: 'CORE_SYNTHESIZER', category: 'Synthesis' },
  };


  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">CONFIGURATION MATRIX</h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? 'Deploy New Agent' : `Editing: ${agent?.display_name || 'Agent'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2 gradient-cyber text-primary-foreground">
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'SAVE CHANGES'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Identity Section */}
        <Card className="cyber-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              AGENT IDENTITY
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Display Name (System)
                </Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="CORE_ANALYST"
                  className="bg-secondary/50 border-border/50 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  User Defined Name
                </Label>
                <Input
                  value={formData.user_defined_name}
                  onChange={(e) => setFormData({ ...formData, user_defined_name: e.target.value })}
                  placeholder="AGENT_2748"
                  className="bg-secondary/50 border-border/50 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Intro Sentence
              </Label>
              <Input
                value={formData.intro_sentence}
                onChange={(e) => setFormData({ ...formData, intro_sentence: e.target.value })}
                placeholder="I am ready to assist you..."
                className="bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  API Key
                </Label>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Keys
                </Button>
              </div>
              <Select 
                value={formData.api_key_id || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, api_key_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select API Key (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span>Use Workspace Default</span>
                    </div>
                  </SelectItem>
                  {workspaceApiKeys?.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        <span className="capitalize">{key.provider}</span>
                        {key.display_name && (
                          <span className="text-xs text-muted-foreground">({key.display_name})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!workspaceApiKeys || workspaceApiKeys.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  No API keys configured. <button onClick={() => navigate('/settings')} className="text-primary underline">Add one in Settings</button>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Persona Directive
              </Label>
              <Input
                value={formData.persona}
                onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                placeholder="EAGLE1-ANALYTICAL"
                className="bg-secondary/50 border-border/50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Role Description
              </Label>
              <Textarea
                value={formData.role_description}
                onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
                placeholder="Explain agent identity and specialization..."
                rows={3}
                className="bg-secondary/50 border-border/50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Core Model Binding Section */}
        <Card className="cyber-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              CORE MODEL BINDING
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Selected Neural Core
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(modelIcons) as CoreModel[]).map((model) => (
                  <button
                    key={model}
                    onClick={() => setFormData({ ...formData, core_model: model })}
                    className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      formData.core_model === model
                        ? 'border-primary bg-primary/10 cyber-glow'
                        : 'border-border/50 hover:border-primary/50 bg-secondary/30'
                    }`}
                  >
                    <div className={formData.core_model === model ? 'text-primary' : 'text-muted-foreground'}>
                      {modelIcons[model].icon}
                    </div>
                    <span className="text-xs font-mono">{modelIcons[model].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-border">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Knowledge Base Access</span>
              </div>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Folder access is configured per-workflow in the <span className="font-medium text-foreground">Multi-Agent Canvas</span>. 
                This allows different workflows to use different knowledge sources with the same agent, 
                providing flexibility for various use cases.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RAG Governance Policy Section */}
        <Card className="cyber-border lg:col-span-2">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-primary" />
              RAG GOVERNANCE POLICY
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                RAG Policy Presets
              </Label>
              <div className="flex gap-2">
                {(['balanced', 'knowledge', 'creative'] as const).map((preset) => (
                  <Button
                    key={preset}
                    variant={activePreset === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="uppercase text-xs font-mono"
                  >
                    {preset === 'balanced' && 'Balanced'}
                    {preset === 'knowledge' && 'Knowledge-Intensive'}
                    {preset === 'creative' && 'Creative'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Ratios */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Knowledge Base Ratio
                    </Label>
                    <span className="text-sm font-mono text-primary">
                      {Math.round(formData.rag_policy.knowledge_base_ratio * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.rag_policy.knowledge_base_ratio * 100]}
                    onValueChange={([val]) => setFormData(prev => ({
                      ...prev,
                      rag_policy: {
                        ...prev.rag_policy,
                        knowledge_base_ratio: val / 100,
                        web_verification_ratio: (100 - val) / 100,
                      }
                    }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Web Verification Ratio
                    </Label>
                    <span className="text-sm font-mono text-primary">
                      {Math.round(formData.rag_policy.web_verification_ratio * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.rag_policy.web_verification_ratio * 100]}
                    onValueChange={([val]) => setFormData(prev => ({
                      ...prev,
                      rag_policy: {
                        ...prev.rag_policy,
                        web_verification_ratio: val / 100,
                        knowledge_base_ratio: (100 - val) / 100,
                      }
                    }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Hallucination Control
                  </Label>
                  <Select
                    value={formData.rag_policy.hallucination_tolerance}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      rag_policy: { ...prev.rag_policy, hallucination_tolerance: val }
                    }))}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_low">STRICT</SelectItem>
                      <SelectItem value="low">LOW</SelectItem>
                      <SelectItem value="medium">MEDIUM</SelectItem>
                      <SelectItem value="high">PERMISSIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Creativity Level
                  </Label>
                  <Select
                    value={formData.rag_policy.creativity_level}
                    onValueChange={(val: CreativityLevel) => setFormData(prev => ({
                      ...prev,
                      rag_policy: { ...prev.rag_policy, creativity_level: val }
                    }))}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">NONE</SelectItem>
                      <SelectItem value="very_low">VERY_LOW</SelectItem>
                      <SelectItem value="low">LOW</SelectItem>
                      <SelectItem value="medium">MEDIUM</SelectItem>
                      <SelectItem value="high">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Response Rules */}
            <div className="border-t border-border/50 pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-4 block">
                Response Rules
              </Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.step_by_step}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, step_by_step: val }
                    }))}
                  />
                  <Label className="text-sm">Step-by-Step Reasoning</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.cite_if_possible}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, cite_if_possible: val }
                    }))}
                  />
                  <Label className="text-sm">Cite Sources</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.response_rules.refuse_if_uncertain}
                    onCheckedChange={(val) => setFormData(prev => ({
                      ...prev,
                      response_rules: { ...prev.response_rules, refuse_if_uncertain: val }
                    }))}
                  />
                  <Label className="text-sm">Refuse If Uncertain</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Preview Panel */}
        <ResponsePreviewPanel 
          responseRules={formData.response_rules}
          agentName={formData.display_name || 'Agent'}
        />

        {/* Agent Lifecycle Section */}
        <AgentLifecycleSettings
          isActive={formData.is_active}
          onIsActiveChange={(val) => setFormData({ ...formData, is_active: val })}
          activeFrom={formData.active_from}
          onActiveFromChange={(val) => setFormData({ ...formData, active_from: val })}
          activeUntil={formData.active_until}
          onActiveUntilChange={(val) => setFormData({ ...formData, active_until: val })}
          activeDays={formData.active_days}
          onActiveDaysChange={(days) => setFormData({ ...formData, active_days: days })}
        />
      </div>
    </div>
  );
};
