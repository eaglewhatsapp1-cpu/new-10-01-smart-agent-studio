import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MessageSquare,
  Zap,
  Clock
} from 'lucide-react';

export const QuickStats: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  const { data: stats } = useQuery({
    queryKey: ['quick-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get yesterday's date
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = yesterday.toISOString();

      // Fetch today's conversations
      const { count: todayConversations } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .gte('created_at', todayISO);

      // Fetch yesterday's conversations for comparison
      const { count: yesterdayConversations } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .gte('created_at', yesterdayISO)
        .lt('created_at', todayISO);

      // Fetch today's workflow runs
      const { count: todayRuns } = await supabase
        .from('workflow_runs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .gte('created_at', todayISO);

      // Fetch successful runs today
      const { count: successfulRuns } = await supabase
        .from('workflow_runs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'completed')
        .gte('created_at', todayISO);

      // Calculate average response time from usage logs
      const { data: usageLogs } = await supabase
        .from('usage_logs')
        .select('response_time_ms')
        .gte('created_at', todayISO)
        .not('response_time_ms', 'is', null)
        .limit(100);

      const avgResponseTime = usageLogs && usageLogs.length > 0
        ? Math.round(usageLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / usageLogs.length)
        : 0;

      return {
        todayConversations: todayConversations || 0,
        yesterdayConversations: yesterdayConversations || 0,
        todayRuns: todayRuns || 0,
        successfulRuns: successfulRuns || 0,
        avgResponseTime,
      };
    },
    enabled: !!currentWorkspace,
    refetchInterval: 60000, // Refetch every minute
  });

  const getTrend = (today: number, yesterday: number) => {
    if (today > yesterday) return { icon: TrendingUp, color: 'text-emerald-500', label: 'up' };
    if (today < yesterday) return { icon: TrendingDown, color: 'text-destructive', label: 'down' };
    return { icon: Minus, color: 'text-muted-foreground', label: 'stable' };
  };

  const conversationTrend = stats ? getTrend(stats.todayConversations, stats.yesterdayConversations) : null;

  const statCards = [
    {
      label: 'Chats Today',
      value: stats?.todayConversations ?? 0,
      icon: MessageSquare,
      trend: conversationTrend,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Workflows Run',
      value: stats?.todayRuns ?? 0,
      icon: Zap,
      subtitle: stats?.successfulRuns ? `${stats.successfulRuns} successful` : undefined,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Avg Response',
      value: stats?.avgResponseTime ? `${stats.avgResponseTime}ms` : '-',
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.trend && (
                    <stat.trend.icon className={`h-4 w-4 ${stat.trend.color}`} />
                  )}
                </div>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
