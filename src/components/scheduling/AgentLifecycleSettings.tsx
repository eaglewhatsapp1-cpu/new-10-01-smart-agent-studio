import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, Power } from 'lucide-react';

interface AgentLifecycleSettingsProps {
  isActive: boolean;
  onIsActiveChange: (value: boolean) => void;
  activeFrom: string | null;
  onActiveFromChange: (value: string | null) => void;
  activeUntil: string | null;
  onActiveUntilChange: (value: string | null) => void;
  activeDays: number[];
  onActiveDaysChange: (days: number[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00:00`, label: `${hour}:00` };
});

export const AgentLifecycleSettings: React.FC<AgentLifecycleSettingsProps> = ({
  isActive,
  onIsActiveChange,
  activeFrom,
  onActiveFromChange,
  activeUntil,
  onActiveUntilChange,
  activeDays,
  onActiveDaysChange,
}) => {
  const toggleDay = (day: number) => {
    onActiveDaysChange(
      activeDays.includes(day)
        ? activeDays.filter((d) => d !== day)
        : [...activeDays, day].sort()
    );
  };

  return (
    <Card className="cyber-border">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Power className="h-5 w-5 text-primary" />
          AGENT LIFECYCLE
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Active Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Agent Status</Label>
            <p className="text-xs text-muted-foreground">
              {isActive ? 'Agent is active and will execute in workflows' : 'Agent is disabled'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
              {isActive ? 'ONLINE' : 'OFFLINE'}
            </span>
            <Switch checked={isActive} onCheckedChange={onIsActiveChange} />
          </div>
        </div>

        {/* Active Time Range */}
        <div className="space-y-4">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active Hours (Optional)
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">From</Label>
              <Select 
                value={activeFrom || 'any'} 
                onValueChange={(val) => onActiveFromChange(val === 'any' ? null : val)}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Until</Label>
              <Select 
                value={activeUntil || 'any'} 
                onValueChange={(val) => onActiveUntilChange(val === 'any' ? null : val)}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to allow agent to run at any time.
          </p>
        </div>

        {/* Active Days */}
        <div className="space-y-4">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Active Days
          </Label>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  activeDays.includes(day.value)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/50 border-border hover:border-primary/50'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select which days the agent should be active. Click to toggle.
          </p>
        </div>

        {/* Summary */}
        <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
          <p className="text-sm text-center">
            {!isActive ? (
              <span className="text-muted-foreground">Agent is currently disabled</span>
            ) : (
              <>
                Active on{' '}
                <span className="text-primary font-medium">
                  {activeDays.length === 7
                    ? 'all days'
                    : activeDays.map((d) => DAYS_OF_WEEK[d].label).join(', ')}
                </span>
                {activeFrom && activeUntil ? (
                  <>
                    {' '}from{' '}
                    <span className="text-primary font-medium">{activeFrom.slice(0, 5)}</span>
                    {' '}to{' '}
                    <span className="text-primary font-medium">{activeUntil.slice(0, 5)}</span>
                  </>
                ) : activeFrom ? (
                  <>
                    {' '}starting at{' '}
                    <span className="text-primary font-medium">{activeFrom.slice(0, 5)}</span>
                  </>
                ) : activeUntil ? (
                  <>
                    {' '}until{' '}
                    <span className="text-primary font-medium">{activeUntil.slice(0, 5)}</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
