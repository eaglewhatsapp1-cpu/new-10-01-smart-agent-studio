import type { ResponseRules, ValidationScore, ValidationIssue, CompatibilityCheck, CompatibilityMismatch } from '@/types';

// Template placeholder mappings for each rule
const RULE_PLACEHOLDER_MAP: Record<string, { placeholders: string[]; patterns: RegExp[] }> = {
  step_by_step: {
    placeholders: ['{STEPS}'],
    patterns: [/\*\*Step \d+/i, /Step \d+:/i, /^\d+\./m]
  },
  cite_if_possible: {
    placeholders: ['{SOURCES}'],
    patterns: [/\*\*Sources:\*\*/i, /\[Source \d+\]/i, /\[\d+\]/]
  },
  refuse_if_uncertain: {
    placeholders: ['{UNCERTAINTY_NOTE}'],
    patterns: [/\*Note:/i, /I cannot confirm/i, /not certain/i, /uncertain/i]
  },
  include_confidence_scores: {
    placeholders: ['{CONFIDENCE}'],
    patterns: [/Confidence:/i, /\d+%/, /confidence level/i]
  },
  use_bullet_points: {
    placeholders: ['{BULLETS}'],
    patterns: [/^[-•*]\s/m, /^\s*[-•*]\s/m]
  },
  summarize_at_end: {
    placeholders: ['{SUMMARY}'],
    patterns: [/\*\*Summary:\*\*/i, /In summary,/i, /To summarize:/i, /\*\*Conclusion:\*\*/i]
  }
};

// Check if template contains required placeholders for enabled rules
export function checkConfigurationCompatibility(
  responseRules: ResponseRules,
  customTemplate: string | null
): CompatibilityCheck {
  const mismatches: CompatibilityMismatch[] = [];
  const recommendations: string[] = [];
  let totalRules = 0;
  let matchedRules = 0;

  const template = customTemplate || '';

  // Check each rule
  const ruleChecks: { key: keyof ResponseRules; label: string }[] = [
    { key: 'step_by_step', label: 'Step-by-Step Reasoning' },
    { key: 'cite_if_possible', label: 'Citations' },
    { key: 'refuse_if_uncertain', label: 'Uncertainty Handling' },
    { key: 'include_confidence_scores', label: 'Confidence Scores' },
    { key: 'use_bullet_points', label: 'Bullet Points' },
    { key: 'summarize_at_end', label: 'Summary Section' }
  ];

  for (const check of ruleChecks) {
    const ruleValue = responseRules[check.key];
    if (typeof ruleValue !== 'boolean') continue;

    totalRules++;
    const mapping = RULE_PLACEHOLDER_MAP[check.key];
    
    if (!mapping) continue;

    const hasPlaceholder = mapping.placeholders.some(p => template.includes(p));
    const hasPattern = mapping.patterns.some(p => p.test(template));
    const templateHasPlaceholder = hasPlaceholder || hasPattern;

    if (ruleValue) {
      if (templateHasPlaceholder) {
        matchedRules++;
      } else if (template.length > 0) {
        mismatches.push({
          rule_name: check.label,
          rule_enabled: true,
          template_has_placeholder: false,
          issue: `Rule "${check.label}" is enabled but template doesn't include ${mapping.placeholders[0]}`
        });
        recommendations.push(`Add ${mapping.placeholders[0]} to your template for ${check.label}`);
      } else {
        matchedRules++; // No template means auto-generation works
      }
    } else {
      if (templateHasPlaceholder) {
        mismatches.push({
          rule_name: check.label,
          rule_enabled: false,
          template_has_placeholder: true,
          issue: `Template has ${mapping.placeholders[0]} but "${check.label}" rule is disabled`
        });
        recommendations.push(`Enable "${check.label}" or remove ${mapping.placeholders[0]} from template`);
      } else {
        matchedRules++;
      }
    }
  }

  const score = totalRules > 0 ? Math.round((matchedRules / totalRules) * 100) : 100;

  return {
    is_compatible: mismatches.length === 0,
    score,
    mismatches,
    recommendations
  };
}

// Score a response against the configured rules and template
export function validateResponse(
  response: string,
  responseRules: ResponseRules,
  customTemplate: string | null
): ValidationScore {
  const issues: ValidationIssue[] = [];
  let structureScore = 100;
  let rulesScore = 100;
  let qualityScore = 100;

  // Check structure compliance with template
  if (customTemplate && customTemplate.length > 0) {
    const templateSections = extractTemplateSections(customTemplate);
    const responseSections = extractResponseSections(response);

    for (const section of templateSections) {
      if (!responseSections.includes(section) && !response.toLowerCase().includes(section.toLowerCase())) {
        structureScore -= 15;
        issues.push({
          type: 'structure',
          severity: 'warning',
          message: `Missing expected section: ${section}`,
          suggestion: `Add a "${section}" section to match the template`
        });
      }
    }
  }

  // Check rules compliance
  const ruleChecks: { key: keyof ResponseRules; label: string; check: () => boolean }[] = [
    {
      key: 'step_by_step',
      label: 'Step-by-Step',
      check: () => /Step \d+|^\d+\./m.test(response)
    },
    {
      key: 'cite_if_possible',
      label: 'Citations',
      check: () => /\[Source \d+\]|\[\d+\]|Sources:|References:/i.test(response)
    },
    {
      key: 'refuse_if_uncertain',
      label: 'Uncertainty Handling',
      check: () => true // Can't validate without knowing if uncertainty exists
    },
    {
      key: 'include_confidence_scores',
      label: 'Confidence Scores',
      check: () => /Confidence:|\d+%|confidence level/i.test(response)
    },
    {
      key: 'use_bullet_points',
      label: 'Bullet Points',
      check: () => /^[-•*]\s/m.test(response)
    },
    {
      key: 'summarize_at_end',
      label: 'Summary',
      check: () => /Summary:|In summary|To summarize|Conclusion:/i.test(response)
    }
  ];

  for (const rule of ruleChecks) {
    const ruleValue = responseRules[rule.key];
    if (typeof ruleValue !== 'boolean' || !ruleValue) continue;
    if (rule.key === 'refuse_if_uncertain') continue; // Skip validation for this rule

    if (!rule.check()) {
      rulesScore -= 15;
      issues.push({
        type: 'rules',
        severity: 'warning',
        message: `${rule.label} rule enabled but not detected in response`,
        suggestion: `Include ${rule.label.toLowerCase()} formatting in the response`,
        rule_name: rule.key
      });
    }
  }

  // Quality checks
  const wordCount = response.split(/\s+/).length;
  if (wordCount < 20) {
    qualityScore -= 20;
    issues.push({
      type: 'structure',
      severity: 'warning',
      message: 'Response is very short',
      suggestion: 'Provide more detailed information'
    });
  }

  // Calculate overall score
  const overallScore = Math.round(
    (structureScore * 0.3 + rulesScore * 0.4 + qualityScore * 0.3)
  );

  return {
    overall_score: Math.max(0, Math.min(100, overallScore)),
    structure_score: Math.max(0, structureScore),
    rules_score: Math.max(0, rulesScore),
    quality_score: Math.max(0, qualityScore),
    issues,
    passed: overallScore >= 70 && issues.filter(i => i.severity === 'error').length === 0
  };
}

// Generate correction prompt for re-work
export function generateCorrectionPrompt(
  originalResponse: string,
  validationScore: ValidationScore,
  responseRules: ResponseRules,
  customTemplate: string | null
): string {
  const issuesList = validationScore.issues
    .map((issue, i) => `${i + 1}. ${issue.message} - ${issue.suggestion}`)
    .join('\n');

  let prompt = `Your previous response scored ${validationScore.overall_score}/100 on template compliance.

Issues found:
${issuesList}

Please revise your response to:`;

  // Add specific fixes based on failed rules
  let fixNum = 1;
  for (const issue of validationScore.issues) {
    if (issue.rule_name) {
      switch (issue.rule_name) {
        case 'step_by_step':
          prompt += `\n${fixNum}. Include numbered steps (Step 1:, Step 2:, etc.)`;
          fixNum++;
          break;
        case 'cite_if_possible':
          prompt += `\n${fixNum}. Add source citations using [Source N] format`;
          fixNum++;
          break;
        case 'include_confidence_scores':
          prompt += `\n${fixNum}. Include a confidence score (e.g., "Confidence: 85%")`;
          fixNum++;
          break;
        case 'use_bullet_points':
          prompt += `\n${fixNum}. Format key points as bullet points`;
          fixNum++;
          break;
        case 'summarize_at_end':
          prompt += `\n${fixNum}. Add a summary section at the end`;
          fixNum++;
          break;
      }
    }
  }

  if (customTemplate) {
    prompt += `\n\nFollow this exact structure:\n${customTemplate}`;
  }

  return prompt;
}

// Generate a sample response template based on active rules
export function generateSampleTemplate(responseRules: ResponseRules): string {
  const parts: string[] = [];

  parts.push('Based on my analysis of the available information:');

  if (responseRules.step_by_step) {
    parts.push('');
    parts.push('**Step 1: Initial Assessment**');
    parts.push('First, I reviewed the relevant documents and identified key factors...');
    parts.push('');
    parts.push('**Step 2: Analysis**');
    parts.push('Then, I cross-referenced the findings with established criteria...');
    parts.push('');
    parts.push('**Step 3: Conclusion**');
    parts.push('Finally, I synthesized the results to form a comprehensive answer.');
  }

  if (responseRules.use_bullet_points) {
    parts.push('');
    parts.push('**Key Points:**');
    parts.push('- Point one with relevant details');
    parts.push('- Point two with supporting information');
    parts.push('- Point three with actionable insights');
  }

  if (responseRules.include_confidence_scores) {
    parts.push('');
    parts.push('**Confidence: 85%** - Based on verified sources and cross-referenced data.');
  }

  if (responseRules.cite_if_possible) {
    parts.push('');
    parts.push('**Sources:**');
    parts.push('- [Source 1] Technical Documentation v2.3, Section 4.2');
    parts.push('- [Source 2] Internal Guidelines, Page 15');
    parts.push('- [Source 3] Research Report Q4-2024');
  }

  if (responseRules.summarize_at_end) {
    parts.push('');
    parts.push('**Summary:**');
    parts.push('In summary, the analysis indicates that the primary factors are directly related to the documented specifications. The key takeaway is that following established protocols ensures optimal outcomes.');
  }

  if (responseRules.refuse_if_uncertain) {
    parts.push('');
    parts.push('*Note: This response is based on verified information from the knowledge base. Any claims outside the available documentation have been omitted to ensure accuracy.*');
  }

  return parts.join('\n');
}

// Helper functions
function extractTemplateSections(template: string): string[] {
  const sections: string[] = [];
  const headerPattern = /\*\*([^*]+)\*\*:/g;
  let match;
  while ((match = headerPattern.exec(template)) !== null) {
    sections.push(match[1]);
  }
  return sections;
}

function extractResponseSections(response: string): string[] {
  const sections: string[] = [];
  const headerPattern = /\*\*([^*]+)\*\*:/g;
  let match;
  while ((match = headerPattern.exec(response)) !== null) {
    sections.push(match[1]);
  }
  return sections;
}

// Export preview in different formats
export function exportAsMarkdown(template: string, responseRules: ResponseRules): string {
  let md = '# Agent Response Template\n\n';
  md += '## Active Rules\n\n';
  
  const rules = [
    { key: 'step_by_step', label: 'Step-by-Step Reasoning' },
    { key: 'cite_if_possible', label: 'Cite Sources' },
    { key: 'refuse_if_uncertain', label: 'Refuse If Uncertain' },
    { key: 'include_confidence_scores', label: 'Include Confidence Scores' },
    { key: 'use_bullet_points', label: 'Use Bullet Points' },
    { key: 'summarize_at_end', label: 'Summarize at End' }
  ];

  for (const rule of rules) {
    const value = responseRules[rule.key as keyof ResponseRules];
    if (typeof value === 'boolean') {
      md += `- [${value ? 'x' : ' '}] ${rule.label}\n`;
    }
  }

  md += '\n## Template\n\n```\n' + template + '\n```\n';

  return md;
}

export function exportAsJSON(template: string, responseRules: ResponseRules): string {
  return JSON.stringify({
    response_rules: responseRules,
    custom_template: template,
    exported_at: new Date().toISOString()
  }, null, 2);
}
