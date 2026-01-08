import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar } from 'lucide-react';

interface WorkflowScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
  workspaceId: string;
  onSuccess?: () => void;
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

const PRESET_SCHEDULES = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every day at 9 AM', cron: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', cron: '0 9 * * 1' },
  { label: 'Every weekday at 9 AM', cron: '0 9 * * 1-5' },
  { label: 'Custom', cron: 'custom' },
];

export const WorkflowScheduleDialog: React.FC<WorkflowScheduleDialogProps> = ({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  workspaceId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('0 9 * * *');
  const [customCron, setCustomCron] = useState('');
  const [scheduleName, setScheduleName] = useState(`Schedule for ${workflowName}`);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const buildCronExpression = () => {
    if (selectedPreset === 'custom') {
      return customCron;
    }
    if (selectedPreset !== '0 9 * * *') {
      return selectedPreset;
    }
    // Build from selections
    const daysStr = selectedDays.length === 7 ? '*' : selectedDays.join(',');
    return `${parseInt(selectedMinute)} ${parseInt(selectedHour)} * * ${daysStr}`;
  };

  const handleSubmit = async () => {
    const cronExpression = buildCronExpression();
    if (!cronExpression) {
      toast({
        title: 'Error',
        description: 'Please provide a valid schedule',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('scheduled_jobs').insert({
        name: scheduleName,
        workflow_id: workflowId,
        workspace_id: workspaceId,
        cron_expression: cronExpression,
        is_active: isActive,
        created_by: user.user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Schedule Created',
        description: `Workflow will run according to schedule: ${cronExpression}`,
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Schedule Workflow
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Schedule Name</Label>
            <Input
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="My schedule"
            />
          </div>

          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_SCHEDULES.map((preset) => (
                  <SelectItem key={preset.cron} value={preset.cron}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPreset === 'custom' ? (
            <div className="space-y-2">
              <Label>Custom Cron Expression</Label>
              <Input
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
          ) : selectedPreset === '0 9 * * *' ? (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Run on Days
                </Label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                        selectedDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/50 border-border hover:border-primary/50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Run at Time
                </Label>
                <div className="flex gap-2 items-center">
                  <Select value={selectedHour} onValueChange={setSelectedHour}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-bold">:</span>
                  <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map((min) => (
                        <SelectItem key={min} value={min}>
                          {min}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : null}

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Schedule will run automatically</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm font-mono text-center">
              Cron: <span className="text-primary">{buildCronExpression()}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
