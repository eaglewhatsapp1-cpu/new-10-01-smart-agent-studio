import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  Activity, 
  Clock, 
  MessageSquare,
  Users,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  FileText,
  GitBranch,
  Timer,
  Cpu,
  Sparkles,
  Target,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { motion } from 'framer-motion';

const CHART_COLORS = ['hsl(252, 80%, 60%)', 'hsl(172, 66%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 70%, 55%)'];

export const Analytics: React.FC = () => {
  const { t } = useApp();
  const { currentWorkspace } = useWorkspace();

  // Fetch usage logs with more data
  const { data: usageLogs } = useQuery({
    queryKey: ['usage-logs', currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Fetch 30-day usage data for comprehensive charts
  const { data: monthlyUsage } = useQuery({
    queryKey: ['monthly-usage'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 29);

      const { data, error } = await supabase
        .from('usage_logs')
        .select('created_at, tokens_used, response_time_ms, agent_id')
        .gte('created_at', startOfDay(thirtyDaysAgo).toISOString())
        .order('created_at');
      
      if (error) throw error;

      // Group by day
      const grouped = new Map<string, { 
        messages: number; 
        tokens: number; 
        avgResponseTime: number;
        responseTimes: number[];
      }>();
      
      // Initialize all 30 days
      for (let i = 0; i < 30; i++) {
        const d = subDays(new Date(), 29 - i);
        const key = format(d, 'MMM dd');
        grouped.set(key, { messages: 0, tokens: 0, avgResponseTime: 0, responseTimes: [] });
      }

      // Fill with actual data
      data?.forEach(log => {
        const date = new Date(log.created_at);
        const key = format(date, 'MMM dd');
        const current = grouped.get(key);
        if (current) {
          current.messages += 1;
          current.tokens += (log.tokens_used || 0);
          if (log.response_time_ms) {
            current.responseTimes.push(log.response_time_ms);
          }
        }
      });

      // Calculate averages
      grouped.forEach((value) => {
        if (value.responseTimes.length > 0) {
          value.avgResponseTime = Math.round(
            value.responseTimes.reduce((a, b) => a + b, 0) / value.responseTimes.length
          );
        }
      });

      return Array.from(grouped.entries()).map(([date, stats]) => ({
        date,
        messages: stats.messages,
        tokens: stats.tokens,
        avgResponseTime: stats.avgResponseTime,
      }));
    },
  });

  // Fetch agents with usage stats
  const { data: agentStats } = useQuery({
    queryKey: ['agent-stats-detailed'],
    queryFn: async () => {
      const [agentsRes, logsRes] = await Promise.all([
        supabase.from('ai_profiles').select('id, display_name, core_model, created_at'),
        supabase.from('usage_logs').select('agent_id, tokens_used, response_time_ms'),
      ]);
      
      if (agentsRes.error) throw agentsRes.error;
      
      const agents = agentsRes.data || [];
      const logs = logsRes.data || [];

      // Calculate usage per agent
      const agentUsage = agents.map(agent => {
        const agentLogs = logs.filter(log => log.agent_id === agent.id);
        const totalTokens = agentLogs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
        const avgResponseTime = agentLogs.length > 0
          ? Math.round(agentLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / agentLogs.length)
          : 0;

        return {
          id: agent.id,
          name: agent.display_name,
          model: agent.core_model,
          usage: agentLogs.length,
          tokens: totalTokens,
          avgResponseTime,
        };
      });

      // Model distribution
      const modelCounts = agents.reduce((acc, agent) => {
        acc[agent.core_model] = (acc[agent.core_model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: agents.length,
        byModel: Object.entries(modelCounts).map(([name, value]) => ({ name, value })),
        topAgents: agentUsage.sort((a, b) => b.usage - a.usage).slice(0, 5),
        allAgents: agentUsage,
      };
    },
  });

  // Fetch knowledge base stats with details
  const { data: kbStats } = useQuery({
    queryKey: ['kb-stats-detailed'],
    queryFn: async () => {
      const [chunksRes, foldersRes, chunksData] = await Promise.all([
        supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }),
        supabase.from('knowledge_folders').select('id, name, folder_type', { count: 'exact' }),
        supabase.from('knowledge_chunks').select('source_file, created_at').limit(1000),
      ]);

      // Group chunks by source file
      const sourceFiles = new Set(chunksData.data?.map(c => c.source_file) || []);
      
      // Folder types distribution
      const folderTypes = (foldersRes.data || []).reduce((acc, folder) => {
        const type = folder.folder_type || 'general';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        chunks: chunksRes.count || 0,
        folders: foldersRes.count || 0,
        uniqueFiles: sourceFiles.size,
        folderTypes: Object.entries(folderTypes).map(([name, value]) => ({ name, value })),
        avgChunksPerFile: sourceFiles.size > 0 ? Math.round((chunksRes.count || 0) / sourceFiles.size) : 0,
      };
    },
  });

  // Fetch comprehensive workflow stats
  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats-detailed', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('status, trigger_type, started_at, completed_at, created_at, execution_logs, workflow:multi_agent_configs(name)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const runs = data || [];
      
      // Status distribution
      const statusCounts = runs.reduce((acc, run) => {
        acc[run.status] = (acc[run.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Trigger type distribution
      const triggerCounts = runs.reduce((acc, run) => {
        acc[run.trigger_type] = (acc[run.trigger_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate average execution time
      const completedRuns = runs.filter(r => r.started_at && r.completed_at);
      const avgExecutionTime = completedRuns.length > 0
        ? Math.round(
            completedRuns.reduce((sum, run) => {
              return sum + differenceInMinutes(new Date(run.completed_at!), new Date(run.started_at!));
            }, 0) / completedRuns.length
          )
        : 0;

      // Daily runs for the last 7 days
      const dailyRuns = new Map<string, { total: number; completed: number; failed: number }>();
      for (let i = 0; i < 7; i++) {
        const d = subDays(new Date(), 6 - i);
        const key = format(d, 'EEE');
        dailyRuns.set(key, { total: 0, completed: 0, failed: 0 });
      }

      runs.forEach(run => {
        const date = new Date(run.created_at);
        const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
          const key = format(date, 'EEE');
          const current = dailyRuns.get(key);
          if (current) {
            current.total += 1;
            if (run.status === 'completed') current.completed += 1;
            if (run.status === 'failed') current.failed += 1;
          }
        }
      });

      return {
        total: runs.length,
        completed: statusCounts['completed'] || 0,
        failed: statusCounts['failed'] || 0,
        running: statusCounts['running'] || 0,
        pending: statusCounts['pending'] || 0,
        successRate: runs.length > 0 ? Math.round(((statusCounts['completed'] || 0) / runs.length) * 100) : 0,
        avgExecutionTime,
        byTrigger: Object.entries(triggerCounts).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        dailyRuns: Array.from(dailyRuns.entries()).map(([day, stats]) => ({ day, ...stats })),
        recentRuns: runs.slice(0, 5),
      };
    },
    enabled: !!currentWorkspace,
  });

  // Fetch chat statistics
  const { data: chatStats } = useQuery({
    queryKey: ['chat-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const [conversationsRes, messagesRes] = await Promise.all([
        supabase.from('chat_conversations')
          .select('id, created_at, agent_id')
          .eq('workspace_id', currentWorkspace.id),
        supabase.from('chat_messages')
          .select('role, created_at, tokens_used, conversation_id'),
      ]);

      const conversations = conversationsRes.data || [];
      const messages = messagesRes.data || [];

      // Get conversation IDs for this workspace
      const conversationIds = new Set(conversations.map(c => c.id));
      const workspaceMessages = messages.filter(m => conversationIds.has(m.conversation_id || ''));

      const userMessages = workspaceMessages.filter(m => m.role === 'user').length;
      const assistantMessages = workspaceMessages.filter(m => m.role === 'assistant').length;
      const totalTokens = workspaceMessages.reduce((sum, m) => sum + (m.tokens_used || 0), 0);

      return {
        totalConversations: conversations.length,
        totalMessages: workspaceMessages.length,
        userMessages,
        assistantMessages,
        totalTokens,
        avgMessagesPerConversation: conversations.length > 0 
          ? Math.round(workspaceMessages.length / conversations.length) 
          : 0,
      };
    },
    enabled: !!currentWorkspace,
  });

  // Calculate summary stats
  const totalMessages = usageLogs?.length || 0;
  const totalTokens = usageLogs?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0;
  const avgResponseTime = usageLogs?.length 
    ? Math.round(usageLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / usageLogs.length)
    : 0;

  // Calculate trends (compare last 7 days to previous 7 days)
  const calculateTrend = () => {
    if (!monthlyUsage || monthlyUsage.length < 14) return { messages: 0, tokens: 0 };
    
    const recent = monthlyUsage.slice(-7);
    const previous = monthlyUsage.slice(-14, -7);
    
    const recentMessages = recent.reduce((sum, d) => sum + d.messages, 0);
    const previousMessages = previous.reduce((sum, d) => sum + d.messages, 0);
    
    const recentTokens = recent.reduce((sum, d) => sum + d.tokens, 0);
    const previousTokens = previous.reduce((sum, d) => sum + d.tokens, 0);

    return {
      messages: previousMessages > 0 ? Math.round(((recentMessages - previousMessages) / previousMessages) * 100) : 0,
      tokens: previousTokens > 0 ? Math.round(((recentTokens - previousTokens) / previousTokens) * 100) : 0,
    };
  };

  const trends = calculateTrend();

  const statCards = [
    {
      title: t.analytics.messagesProcessed,
      value: totalMessages,
      icon: MessageSquare,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: trends.messages,
    },
    {
      title: t.analytics.avgResponseTime,
      value: avgResponseTime > 0 ? `${avgResponseTime}ms` : '-',
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Active Agents',
      value: agentStats?.total || 0,
      icon: Bot,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t.analytics.tokensUsed,
      value: totalTokens > 0 ? totalTokens.toLocaleString() : '0',
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      trend: trends.tokens,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.analytics.title}</h1>
          <p className="text-muted-foreground mt-1">Real-time usage metrics, performance analytics, and system insights</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Activity className="h-3 w-3 text-green-500" />
          Live Data
        </Badge>
      </div>

      {/* Stat Cards with Trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="card-interactive">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.trend !== undefined && stat.trend !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${stat.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{Math.abs(stat.trend)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 30-Day Usage Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              30-Day Usage Trend
            </CardTitle>
            <CardDescription>Messages and tokens over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyUsage && monthlyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyUsage}>
                  <defs>
                    <linearGradient id="colorMessages30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(252, 80%, 60%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(252, 80%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTokens30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="messages" 
                    stroke="hsl(252, 80%, 60%)" 
                    fillOpacity={1} 
                    fill="url(#colorMessages30)" 
                    strokeWidth={2}
                    name="Messages"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="hsl(172, 66%, 50%)" 
                    fillOpacity={1} 
                    fill="url(#colorTokens30)" 
                    strokeWidth={2}
                    name="Tokens"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
                <p>No usage data yet</p>
                <p className="text-sm">Start using agents to see analytics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Response Time Trend
            </CardTitle>
            <CardDescription>Average response time in milliseconds</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyUsage && monthlyUsage.some(d => d.avgResponseTime > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyUsage.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value}ms`, 'Avg Response Time']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="hsl(38, 92%, 50%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(38, 92%, 50%)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No response time data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Workflow Runs (7 Days)
            </CardTitle>
            <CardDescription>Daily workflow execution breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {workflowStats?.dailyRuns && workflowStats.dailyRuns.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={workflowStats.dailyRuns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="hsl(172, 66%, 50%)" name="Completed" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(0, 84%, 60%)" name="Failed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No workflow runs yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agent Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agents by Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentStats?.byModel && agentStats.byModel.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={agentStats.byModel}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {agentStats.byModel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {agentStats.byModel.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-muted-foreground capitalize">{item.name.replace('_', ' ')}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No agents created yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Agents by Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Agents by Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentStats?.topAgents && agentStats.topAgents.length > 0 ? (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {agentStats.topAgents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{agent.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{agent.usage} calls</span>
                          <span>•</span>
                          <span>{agent.tokens.toLocaleString()} tokens</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No agent usage data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Workflow Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowStats ? (
              <>
                {/* Success Rate Radial */}
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <ResponsiveContainer width={120} height={120}>
                      <RadialBarChart 
                        innerRadius="70%" 
                        outerRadius="100%" 
                        data={[{ value: workflowStats.successRate, fill: 'hsl(172, 66%, 50%)' }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{workflowStats.successRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      {workflowStats.completed}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Failed</span>
                    </div>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500">
                      {workflowStats.failed}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Running</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                      {workflowStats.running}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Avg Execution</span>
                    </div>
                    <span className="font-medium">
                      {workflowStats.avgExecutionTime > 0 ? `${workflowStats.avgExecutionTime} min` : '-'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No workflow data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Knowledge Base Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{kbStats?.uniqueFiles || 0}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Database className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{kbStats?.chunks || 0}</p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Folders</span>
                <span className="font-medium">{kbStats?.folders || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Chunks/File</span>
                <span className="font-medium">{kbStats?.avgChunksPerFile || 0}</span>
              </div>
            </div>
            {kbStats?.folderTypes && kbStats.folderTypes.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Folder Types</p>
                <div className="flex flex-wrap gap-2">
                  {kbStats.folderTypes.map(ft => (
                    <Badge key={ft.name} variant="secondary" className="text-xs">
                      {ft.name}: {ft.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {chatStats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <MessageSquare className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold">{chatStats.totalConversations}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-2xl font-bold">{chatStats.totalMessages}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">User Messages</span>
                    <span className="font-medium">{chatStats.userMessages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AI Responses</span>
                    <span className="font-medium">{chatStats.assistantMessages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg/Conversation</span>
                    <span className="font-medium">{chatStats.avgMessagesPerConversation}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Total Tokens</span>
                    <span className="font-medium">{chatStats.totalTokens.toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No chat data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trigger Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Workflow Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workflowStats?.byTrigger && workflowStats.byTrigger.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={workflowStats.byTrigger}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {workflowStats.byTrigger.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {workflowStats.byTrigger.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-muted-foreground capitalize">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No trigger data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
