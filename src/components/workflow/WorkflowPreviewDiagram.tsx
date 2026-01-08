import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  ArrowRight, 
  Play, 
  Flag,
  Brain,
  CheckCircle,
  Sparkles,
  FileText,
  Database
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AgentConfig {
  display_name: string;
  role_description: string;
  persona: string;
  intro_sentence: string;
  core_model: 'core_analyst' | 'core_reviewer' | 'core_synthesizer';
  input_config?: {
    accepts_user_input: boolean;
    accepts_from_agents: string[];
  };
  output_config?: {
    output_format: string;
    saves_to_knowledge_base: boolean;
  };
}

interface Connection {
  from: number;
  to: number;
  condition?: string;
  data_mapping?: string;
}

interface WorkflowPreviewDiagramProps {
  agents: AgentConfig[];
  connections: Connection[];
  workflowName: string;
}

const modelIcons = {
  core_analyst: Brain,
  core_reviewer: CheckCircle,
  core_synthesizer: Sparkles,
};

const modelColors = {
  core_analyst: 'from-blue-500 to-cyan-500',
  core_reviewer: 'from-amber-500 to-orange-500',
  core_synthesizer: 'from-purple-500 to-pink-500',
};

const modelLabels = {
  core_analyst: 'Analyst',
  core_reviewer: 'Reviewer',
  core_synthesizer: 'Synthesizer',
};

export const WorkflowPreviewDiagram: React.FC<WorkflowPreviewDiagramProps> = ({
  agents,
  connections,
  workflowName,
}) => {
  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const nodeWidth = 180;
    const nodeGap = 60;
    const startX = 80;
    const centerY = 120;

    agents.forEach((_, index) => {
      positions.push({
        x: startX + index * (nodeWidth + nodeGap),
        y: centerY,
      });
    });

    return positions;
  }, [agents]);

  const totalWidth = agents.length > 0 
    ? 80 + agents.length * 240 + 80 
    : 400;

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        <div 
          className="relative bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl border border-border p-6"
          style={{ minWidth: `${totalWidth}px`, minHeight: '280px' }}
        >
          {/* Start Node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute"
            style={{ left: 20, top: 110 }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
            <p className="text-xs text-center mt-2 text-muted-foreground font-medium">Start</p>
          </motion.div>

          {/* Arrow from Start to First Agent */}
          {agents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute"
              style={{ left: 52, top: 130 }}
            >
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          )}

          {/* Agent Nodes */}
          {agents.map((agent, index) => {
            const ModelIcon = modelIcons[agent.core_model];
            const position = nodePositions[index];
            const gradientClass = modelColors[agent.core_model];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="absolute"
                style={{ left: position.x, top: position.y - 50 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-[180px] cursor-pointer group">
                      {/* Agent Card */}
                      <div className="relative bg-card border border-border rounded-xl p-4 shadow-lg hover:shadow-xl transition-all hover:border-primary/50 hover:-translate-y-1">
                        {/* Model Type Badge */}
                        <div className={`absolute -top-2 -right-2 h-8 w-8 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-md`}>
                          <ModelIcon className="h-4 w-4 text-white" />
                        </div>

                        {/* Agent Icon */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{agent.display_name}</p>
                          </div>
                        </div>

                        {/* Model Label */}
                        <Badge variant="secondary" className="text-xs mb-2">
                          {modelLabels[agent.core_model]}
                        </Badge>

                        {/* Input/Output Indicators */}
                        <div className="flex items-center gap-2 mt-2">
                          {agent.input_config?.accepts_user_input && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>Input</span>
                            </div>
                          )}
                          {agent.output_config?.saves_to_knowledge_base && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Database className="h-3 w-3" />
                              <span>KB</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connection Arrow (except for last agent) */}
                      {index < agents.length - 1 && (
                        <div className="absolute -right-[38px] top-1/2 -translate-y-1/2">
                          <div className="flex items-center">
                            <div className="w-[30px] h-[2px] bg-gradient-to-r from-border to-muted-foreground/50" />
                            <ArrowRight className="h-4 w-4 text-muted-foreground -ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px]">
                    <div className="space-y-2">
                      <p className="font-semibold">{agent.display_name}</p>
                      <p className="text-xs text-muted-foreground">{agent.role_description}</p>
                      {agent.persona && (
                        <p className="text-xs italic text-muted-foreground/80">"{agent.persona.slice(0, 100)}..."</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            );
          })}

          {/* End Node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + agents.length * 0.1 }}
            className="absolute"
            style={{ 
              left: agents.length > 0 ? nodePositions[agents.length - 1].x + 200 : 120, 
              top: 110 
            }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-500/25">
              <Flag className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs text-center mt-2 text-muted-foreground font-medium">End</p>
          </motion.div>

          {/* Workflow Name Label */}
          <div className="absolute bottom-3 left-4">
            <p className="text-xs text-muted-foreground">
              {workflowName} • {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 right-4 flex items-center gap-3">
            {Object.entries(modelLabels).map(([key, label]) => {
              const Icon = modelIcons[key as keyof typeof modelIcons];
              return (
                <div key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default WorkflowPreviewDiagram;
