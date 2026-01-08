import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Key, Globe, Palette, Moon, Sun, Bell, Database } from 'lucide-react';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';

export const Settings: React.FC = () => {
  const { t, theme, toggleTheme, lang, setLang } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.sidebar.settings}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">System settings and preferences</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {/* Appearance Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Palette className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleTheme}
                className="gap-2 shrink-0"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="h-4 w-4" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Language
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Choose interface language</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Display Language</Label>
                <p className="text-xs text-muted-foreground">Select your preferred language</p>
              </div>
              <Select value={lang} onValueChange={(value: 'en' | 'ar') => setLang(value)}>
                <SelectTrigger className="w-[120px] sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Card - Full width for better UX */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Key className="h-5 w-5 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Manage external API keys for AI providers. These keys are used by your agents and workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeyManager />
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive workflow updates</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Browser Notifications</Label>
                <p className="text-xs text-muted-foreground">Show desktop alerts</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* RAG Settings Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-5 w-5 text-primary" />
              RAG Settings
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Configure retrieval parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Citation Display</Label>
                <p className="text-xs text-muted-foreground">Show sources in responses</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Hallucination Check</Label>
                <p className="text-xs text-muted-foreground">Verify AI responses</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* General Card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <SettingsIcon className="h-5 w-5 text-primary" />
              General
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">General system settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Auto-save</Label>
                <p className="text-xs text-muted-foreground">Save changes automatically</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Analytics</Label>
                <p className="text-xs text-muted-foreground">Help improve the platform</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
