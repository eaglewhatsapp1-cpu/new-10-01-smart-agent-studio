import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Bot, 
  Upload, 
  Play, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  FolderPlus,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getActivityIcon = (entityType: string, actionType: string) => {
  switch (entityType) {
    case 'agent':
      return Bot;
    case 'document':
      return Upload;
    case 'workflow':
      return Play;
    case 'folder':
      return FolderPlus;
    case 'chat':
      return MessageSquare;
    case 'team':
      return Users;
    default:
      return Activity;
  }
};

const getStatusColor = (actionType: string) => {
  switch (actionType) {
    case 'created':
    case 'completed':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'failed':
    case 'deleted':
      return 'text-destructive bg-destructive/10';
    case 'updated':
    case 'started':
      return 'text-blue-500 bg-blue-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export const ActivityFeed: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-3 pb-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.entity_type, activity.action_type);
                const colorClass = getStatusColor(activity.action_type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {activity.entity_name || activity.entity_type}
                        </span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {activity.action_type}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity will appear here as you use the platform
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
