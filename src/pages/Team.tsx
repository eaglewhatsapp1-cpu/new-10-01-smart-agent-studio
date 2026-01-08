import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  UserPlus, 
  Mail,
  Shield,
  Clock,
  Trash2,
  Loader2,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_at: string;
  accepted_at: string | null;
}

interface ActivityItem {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_name: string | null;
  description: string | null;
  created_at: string;
}

const roleColors = {
  owner: 'bg-purple-500/10 text-purple-500',
  admin: 'bg-blue-500/10 text-blue-500',
  editor: 'bg-green-500/10 text-green-500',
  viewer: 'bg-gray-500/10 text-gray-500',
};

export const Team: React.FC = () => {
  const { t } = useApp();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('invited_at', { ascending: false });
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!currentWorkspace,
  });

  // Fetch activity feed
  const { data: activities, isLoading: activitiesLoading } = useQuery({
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
      return data as ActivityItem[];
    },
    enabled: !!currentWorkspace,
  });

  // Invite member
  const inviteMember = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace || !user) throw new Error('No workspace or user');
      const { error } = await supabase
        .from('team_members')
        .insert({
          workspace_id: currentWorkspace.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation sent');
      setInviteEmail('');
      setIsInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create': return '✨';
      case 'update': return '📝';
      case 'delete': return '🗑️';
      default: return '📌';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team & Collaboration</h1>
          <p className="text-muted-foreground mt-1">Manage your workspace team and view activity</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                    <SelectItem value="editor">Editor - Can create & edit</SelectItem>
                    <SelectItem value="viewer">Viewer - Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={() => inviteMember.mutate()}
                disabled={!inviteEmail || inviteMember.isPending}
              >
                {inviteMember.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members?.length || 0} member{members?.length !== 1 ? 's' : ''} in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : members && members.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {members.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              Invited {formatDistanceToNow(new Date(member.invited_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={roleColors[member.role]}>
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember.mutate(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No team members yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Invite colleagues to collaborate
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Recent actions in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activities && activities.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activities.map(activity => (
                    <div 
                      key={activity.id}
                      className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg">{getActionIcon(activity.action_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.entity_name || 'Someone'}</span>
                          {' '}
                          <span className="text-muted-foreground">{activity.description || activity.action_type}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No activity yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Actions will appear here as they happen
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
