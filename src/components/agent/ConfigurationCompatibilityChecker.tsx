import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Minus,
  Wrench,
  ToggleLeft
} from 'lucide-react';
import { checkConfigurationCompatibility, generateSampleTemplate } from '@/lib/responseValidation';
import type { ResponseRules, CompatibilityMismatch } from '@/types';

interface ConfigurationCompatibilityCheckerProps {
  responseRules: ResponseRules;
  onAutoFixTemplate: (template: string) => void;
  onDisableMismatchedRules: (rules: Partial<ResponseRules>) => void;
}

interface RuleCheckItem {
  key: keyof ResponseRules;
  label: string;
  placeholder: string;
}

const RULE_ITEMS: RuleCheckItem[] = [
  { key: 'step_by_step', label: 'Step-by-Step', placeholder: '{STEPS}' },
  { key: 'cite_if_possible', label: 'Citations', placeholder: '{SOURCES}' },
  { key: 'refuse_if_uncertain', label: 'Uncertainty Check', placeholder: '{UNCERTAINTY_NOTE}' },
  { key: 'include_confidence_scores', label: 'Confidence Scores', placeholder: '{CONFIDENCE}' },
  { key: 'use_bullet_points', label: 'Bullet Points', placeholder: '{BULLETS}' },
  { key: 'summarize_at_end', label: 'Summary Section', placeholder: '{SUMMARY}' },
];

export const ConfigurationCompatibilityChecker: React.FC<ConfigurationCompatibilityCheckerProps> = ({
  responseRules,
  onAutoFixTemplate,
  onDisableMismatchedRules
}) => {
  const compatibility = useMemo(() => {
    return checkConfigurationCompatibility(responseRules, responseRules.custom_response_template);
  }, [responseRules]);

  const getMismatchForRule = (ruleName: string): CompatibilityMismatch | undefined => {
    return compatibility.mismatches.find(m => m.rule_name === ruleName);
  };

  const handleAutoFix = () => {
    const newTemplate = generateSampleTemplate(responseRules);
    onAutoFixTemplate(newTemplate);
  };

  const handleDisableMismatched = () => {
    const rulesToDisable: Partial<ResponseRules> = {};
    for (const mismatch of compatibility.mismatches) {
      const ruleItem = RULE_ITEMS.find(r => r.label === mismatch.rule_name);
      if (ruleItem && mismatch.rule_enabled) {
        (rulesToDisable as any)[ruleItem.key] = false;
      }
    }
    onDisableMismatchedRules(rulesToDisable);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-glow">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            Configuration Compatibility Check
          </span>
          <Badge 
            variant={compatibility.is_compatible ? "default" : "secondary"}
            className={`text-xs ${compatibility.is_compatible ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}
          >
            {compatibility.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress 
            value={compatibility.score} 
            className={`h-2 ${getProgressColor(compatibility.score)}`}
          />
          <p className={`text-xs ${getScoreColor(compatibility.score)}`}>
            {compatibility.is_compatible 
              ? 'Configuration and template are compatible' 
              : `${compatibility.mismatches.length} issue${compatibility.mismatches.length > 1 ? 's' : ''} detected`}
          </p>
        </div>

        {/* Rule Check List */}
        <div className="space-y-2">
          {RULE_ITEMS.map((item) => {
            const ruleValue = responseRules[item.key];
            const isEnabled = typeof ruleValue === 'boolean' && ruleValue;
            const mismatch = getMismatchForRule(item.label);
            const hasTemplate = responseRules.custom_response_template && responseRules.custom_response_template.length > 0;
            
            let status: 'success' | 'warning' | 'disabled' = 'disabled';
            if (isEnabled) {
              status = mismatch ? 'warning' : 'success';
            }

            return (
              <div 
                key={item.key}
                className={`flex items-center justify-between py-1.5 px-2 rounded-md text-sm ${
                  status === 'warning' ? 'bg-yellow-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {status === 'warning' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  {status === 'disabled' && (
                    <Minus className="h-4 w-4 text-muted-foreground/50" />
                  )}
                  <span className={status === 'disabled' ? 'text-muted-foreground/50' : ''}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {status === 'success' && hasTemplate && (
                    <span className="text-xs text-green-500/70">
                      Template has {item.placeholder}
                    </span>
                  )}
                  {status === 'success' && !hasTemplate && (
                    <span className="text-xs text-muted-foreground">
                      Auto-generated
                    </span>
                  )}
                  {status === 'warning' && (
                    <span className="text-xs text-yellow-500/70">
                      Missing {item.placeholder}
                    </span>
                  )}
                  {status === 'disabled' && (
                    <span className="text-xs text-muted-foreground/50">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        {compatibility.mismatches.length > 0 && (
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAutoFix}
              className="flex-1 gap-1 text-xs"
            >
              <Wrench className="h-3 w-3" />
              Auto-Fix Template
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisableMismatched}
              className="flex-1 gap-1 text-xs"
            >
              <ToggleLeft className="h-3 w-3" />
              Disable Mismatched
            </Button>
          </div>
        )}

        {/* Recommendations */}
        {compatibility.recommendations.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
            <p className="font-medium">Recommendations:</p>
            {compatibility.recommendations.slice(0, 3).map((rec, i) => (
              <p key={i} className="pl-2">• {rec}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
