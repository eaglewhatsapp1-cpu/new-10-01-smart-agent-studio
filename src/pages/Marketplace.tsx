import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Store, 
  Bot, 
  Network, 
  Download, 
  Star, 
  Search, 
  Filter,
  Users,
  Clock,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface MarketplaceItem {
  id: string;
  name: string;
  description: string | null;
  item_type: string;
  config_data: Json;
  canvas_data: Json | null;
  agent_count: number | null;
  tags: string[] | null;
  category: string | null;
  publisher_id: string;
  download_count: number | null;
  rating: number | null;
  rating_count: number | null;
  created_at: string;
}

export const Marketplace: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [importing, setImporting] = useState<string | null>(null);

  // Fetch marketplace items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketplace-items', activeTab, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_public', true)
        .order('download_count', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('item_type', activeTab);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketplaceItem[];
    },
  });

  // Fetch user's published items
  const { data: myItems = [] } = useQuery({
    queryKey: ['my-marketplace-items'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('publisher_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketplaceItem[];
    },
  });

  // Filter items by search
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get unique categories
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

  const handleImport = async (item: MarketplaceItem) => {
    if (!currentWorkspace) {
      toast({
        title: 'No Workspace',
        description: 'Please select a workspace first',
        variant: 'destructive',
      });
      return;
    }

    setImporting(item.id);
    const { data: user } = await supabase.auth.getUser();

    try {
      if (item.item_type === 'single_agent') {
        // Import as a new agent
        const agentConfig = item.config_data as Record<string, unknown>;
        const { data: newAgent, error: agentError } = await supabase
          .from('ai_profiles')
          .insert([{
            display_name: `${item.name} (Imported)`,
            core_model: (agentConfig.core_model as 'core_analyst' | 'core_reviewer' | 'core_synthesizer') || 'core_analyst',
            role_description: agentConfig.role_description as string || null,
            persona: agentConfig.persona as string || null,
            intro_sentence: agentConfig.intro_sentence as string || null,
            response_rules: agentConfig.response_rules as Json || null,
            rag_policy: agentConfig.rag_policy as Json || null,
            created_by: user.user?.id || null,
          }])
          .select()
          .single();

        if (agentError) throw agentError;

        // Track import
        await supabase.from('marketplace_imports').insert({
          marketplace_item_id: item.id,
          imported_by: user.user?.id!,
          workspace_id: currentWorkspace.id,
          imported_config_id: newAgent.id,
        });

        toast({
          title: 'Agent Imported',
          description: `${item.name} has been imported to your agents`,
        });

        queryClient.invalidateQueries({ queryKey: ['agents'] });
      } else {
        // Import as multi-agent config
        const { data: newConfig, error: configError } = await supabase
          .from('multi_agent_configs')
          .insert({
            name: `${item.name} (Imported)`,
            description: item.description,
            workspace_id: currentWorkspace.id,
            canvas_data: item.canvas_data,
            agent_nodes: (item.config_data as Record<string, unknown>).agent_nodes as Json,
            connections: (item.config_data as Record<string, unknown>).connections as Json,
            created_by: user.user?.id!,
          })
          .select()
          .single();

        if (configError) throw configError;

        // Track import
        await supabase.from('marketplace_imports').insert({
          marketplace_item_id: item.id,
          imported_by: user.user?.id!,
          workspace_id: currentWorkspace.id,
          imported_config_id: newConfig.id,
        });

        toast({
          title: 'Configuration Imported',
          description: `${item.name} has been imported to your multi-agent configurations`,
        });

        queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import configuration',
        variant: 'destructive',
      });
    } finally {
      setImporting(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Item removed from marketplace',
      });
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-items'] });
    }
  };

  const renderItemCard = (item: MarketplaceItem, showDelete = false) => (
    <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              item.item_type === 'single_agent' 
                ? 'bg-primary/10' 
                : 'bg-gradient-to-br from-primary/20 to-accent/20'
            }`}>
              {item.item_type === 'single_agent' ? (
                <Bot className="h-5 w-5 text-primary" />
              ) : (
                <Network className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <Badge variant="secondary" className="text-xs mt-1">
                {item.item_type === 'single_agent' ? 'Agent' : `${item.agent_count || 0} Agents`}
              </Badge>
            </div>
          </div>
          {item.category && (
            <Badge variant="outline" className="text-xs">
              {item.category}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <CardDescription className="line-clamp-2 text-sm">
          {item.description || 'No description provided'}
        </CardDescription>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-muted/50">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs bg-muted/50">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>{item.download_count || 0}</span>
          </div>
          {(item.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{item.rating?.toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {showDelete ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => handleDelete(item.id)}
            >
              Delete
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={() => handleImport(item)}
              disabled={importing === item.id}
              className="gap-1"
            >
              {importing === item.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
              Import
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-muted-foreground text-sm">
              Browse and import pre-configured agents and workflows
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search marketplace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Store className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="single_agent" className="gap-2">
            <Bot className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="multi_agent" className="gap-2">
            <Network className="h-4 w-4" />
            Multi-Agent
          </TabsTrigger>
          <TabsTrigger value="my_items" className="gap-2">
            <Users className="h-4 w-4" />
            My Published
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Store className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No items in marketplace</h3>
                <p className="text-muted-foreground text-sm">
                  Be the first to publish your agent or workflow configuration!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => renderItemCard(item))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="single_agent" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No agents available</h3>
                <p className="text-muted-foreground text-sm">
                  Publish your first agent to the marketplace!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => renderItemCard(item))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="multi_agent" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Network className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No multi-agent configs available</h3>
                <p className="text-muted-foreground text-sm">
                  Publish your first multi-agent workflow to the marketplace!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => renderItemCard(item))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my_items" className="mt-6">
          {myItems.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No published items</h3>
                <p className="text-muted-foreground text-sm">
                  Export your agents or workflows to the marketplace from their respective pages
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myItems.map(item => renderItemCard(item, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketplace;
