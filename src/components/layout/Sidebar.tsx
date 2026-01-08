import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Bot, Database, Network, Play, Sparkles, MessageSquare, Store, BarChart3, Users2, HelpCircle, Settings, LogOut, Sun, Moon, Languages, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export const Sidebar: React.FC = () => {
  const {
    lang,
    setLang,
    theme,
    toggleTheme,
    t
  } = useApp();
  const location = useLocation();

  // Logical order: Overview → Content → Build → Use → Share → Monitor → Manage
  const navItems = [
  // Overview
  {
    path: '/dashboard',
    label: t.sidebar.dashboard,
    icon: LayoutDashboard
  },
  // Content (what you work with)
  {
    path: '/knowledge-base',
    label: t.sidebar.knowledgeBase,
    icon: Database
  },
  // Build (create agents and workflows)
  {
    path: '/agents',
    label: t.sidebar.agents,
    icon: Bot
  }, {
    path: '/multi-agent-canvas',
    label: t.sidebar.multiAgentCanvas,
    icon: Network
  }, {
    path: '/workflow-builder',
    label: 'AI Workflow Builder',
    icon: Wand2
  },
  // Use (interact with agents)
  {
    path: '/ai-chat',
    label: 'AI Chat',
    icon: Sparkles
  }, {
    path: '/agent-test',
    label: t.sidebar.agentTestChat,
    icon: MessageSquare
  },
  // Share & Discover
  {
    path: '/marketplace',
    label: t.sidebar.marketplace,
    icon: Store
  },
  // Monitor
  {
    path: '/workflow-runs',
    label: 'Workflow Runs',
    icon: Play
  }, {
    path: '/analytics',
    label: t.sidebar.analytics,
    icon: BarChart3
  },
  // Manage
  {
    path: '/team',
    label: 'Team',
    icon: Users2
  }, {
    path: '/help',
    label: 'Help',
    icon: HelpCircle
  }];
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    }
  };
  return <aside className="fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">Smart Agents</span>
          <span className="text-[10px] font-medium text-primary">
            Generator Platform
          </span>
        </div>
      </div>

      {/* Workspace Selector */}
      <WorkspaceSelector />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-modern">
        {navItems.map(item => {
        const isActive = location.pathname === item.path || item.path !== '/' && location.pathname.startsWith(item.path);
        return <Link key={item.path} to={item.path} className={cn('group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all', isActive ? 'bg-primary text-primary-foreground glow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <item.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')} />
              {item.label}
            </Link>;
      })}
      </nav>

      {/* Bottom Controls */}
      <div className="space-y-2 border-t border-border p-4">
        {/* Theme & Language Toggles */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleTheme} className="flex-1 gap-2">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="flex-1 gap-2">
            <Languages className="h-4 w-4" />
            <span className="text-xs font-bold">{lang === 'ar' ? 'EN' : 'AR'}</span>
          </Button>
        </div>

        {/* Settings Link */}
        <Link to="/settings" className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all', location.pathname === '/settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
          <Settings className="h-5 w-5" />
          {t.sidebar.settings}
        </Link>

        {/* Sign Out */}
        <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-5 w-5" />
          {t.sidebar.signOut}
        </button>
      </div>
    </aside>;
};