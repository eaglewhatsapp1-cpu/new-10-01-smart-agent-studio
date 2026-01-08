import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Database, 
  FolderTree, 
  GitBranch, 
  Loader2,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { RecentWorkflows } from '@/components/dashboard/RecentWorkflows';
import { AIInsights, useAIInsights } from '@/components/assistant/AIInsights';

export const Dashboard: React.FC = () => {
  const { t } = useApp();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [agentsRes, chunksRes, foldersRes, workflowsRes, errorsRes] = await Promise.all([
        supabase.from('ai_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }),
        supabase.from('knowledge_folders').select('id', { count: 'exact', head: true }),
        supabase.from('multi_agent_configs').select('id', { count: 'exact', head: true }),
        supabase.from('workflow_runs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      ]);

      return {
        agents: agentsRes.count ?? 0,
        documents: chunksRes.count ?? 0,
        folders: foldersRes.count ?? 0,
        workflows: workflowsRes.count ?? 0,
        recentErrors: errorsRes.count ?? 0,
      };
    },
  });

  const insights = useAIInsights({
    agentCount: stats?.agents,
    workflowCount: stats?.workflows,
    recentErrors: stats?.recentErrors,
    documentCount: stats?.documents,
  });

  const statCards = [
    {
      title: t.dashboard.totalAgents,
      value: stats?.agents ?? 0,
      icon: Users,
      href: '/agents',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t.dashboard.totalDocuments,
      value: stats?.documents ?? 0,
      icon: Database,
      href: '/knowledge-base',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: t.dashboard.totalFolders,
      value: stats?.folders ?? 0,
      icon: FolderTree,
      href: '/knowledge-base',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: t.dashboard.activeWorkflows,
      value: stats?.workflows ?? 0,
      icon: GitBranch,
      href: '/multi-agent-canvas',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">{t.dashboard.title}</h1>
          <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
        </div>
        <Link to="/ai-chat">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Start Chat
          </Button>
        </Link>
      </div>

      {/* Today's Stats */}
      <QuickStats />

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-3xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* AI Insights */}
      {insights.length > 0 && <AIInsights insights={insights} />}

      {/* Activity & Workflows Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed />
        <RecentWorkflows />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/ai-chat">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-gradient-primary p-3 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">AI Chat</h3>
                  <p className="text-xs text-muted-foreground">Start a conversation</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/agents">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-blue-500/10 p-3 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.agents.createNew}</h3>
                  <p className="text-xs text-muted-foreground">Configure AI agent</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/knowledge-base">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-emerald-500/10 p-3 group-hover:scale-110 transition-transform">
                  <Database className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.knowledgeBase.uploadFiles}</h3>
                  <p className="text-xs text-muted-foreground">Add documents</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/multi-agent-canvas">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-purple-500/10 p-3 group-hover:scale-110 transition-transform">
                  <GitBranch className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.workflowCanvas.newWorkflow}</h3>
                  <p className="text-xs text-muted-foreground">Create workflow</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};
