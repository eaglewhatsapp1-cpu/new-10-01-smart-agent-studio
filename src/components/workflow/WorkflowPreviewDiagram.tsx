import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Bot, 
  ArrowRight, 
  Play, 
  Flag,
  Brain,
  CheckCircle,
  Sparkles,
  FileText,
  Database,
  GripVertical
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
  onReorder?: (newAgents: AgentConfig[], newConnections: Connection[]) => void;
  editable?: boolean;
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

const modelGlows = {
  core_analyst: 'shadow-blue-500/20',
  core_reviewer: 'shadow-amber-500/20',
  core_synthesizer: 'shadow-purple-500/20',
};

const modelLabels = {
  core_analyst: 'Analyst',
  core_reviewer: 'Reviewer',
  core_synthesizer: 'Synthesizer',
};

// Sortable Agent Card Component
const SortableAgentCard: React.FC<{
  agent: AgentConfig;
  index: number;
  isLast: boolean;
  editable: boolean;
}> = ({ agent, index, isLast, editable }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `agent-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ModelIcon = modelIcons[agent.core_model];
  const gradientClass = modelColors[agent.core_model];
  const glowClass = modelGlows[agent.core_model];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : 'z-10'}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.08 }}
            className={`w-[200px] cursor-pointer group ${isDragging ? 'opacity-90' : ''}`}
          >
            {/* Agent Card */}
            <div className={`relative bg-card/80 backdrop-blur-sm border-2 border-border rounded-2xl p-4 shadow-xl ${glowClass} hover:shadow-2xl transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 ${isDragging ? 'ring-2 ring-primary' : ''}`}>
              {/* Drag Handle */}
              {editable && (
                <div
                  {...attributes}
                  {...listeners}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 h-10 w-5 rounded-l-lg bg-muted/80 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Glowing Background Effect */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradientClass} opacity-5 group-hover:opacity-10 transition-opacity`} />

              {/* Model Type Badge */}
              <div className={`absolute -top-3 -right-3 h-10 w-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg ring-4 ring-background`}>
                <ModelIcon className="h-5 w-5 text-white" />
              </div>

              {/* Step Number */}
              <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg ring-4 ring-background">
                <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
              </div>

              {/* Agent Content */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{agent.display_name}</p>
                  </div>
                </div>

                {/* Model Label */}
                <Badge variant="secondary" className={`text-xs mb-3 bg-gradient-to-r ${gradientClass} text-white border-0`}>
                  {modelLabels[agent.core_model]}
                </Badge>

                {/* Role Description Preview */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {agent.role_description}
                </p>

                {/* Input/Output Indicators */}
                <div className="flex items-center gap-2">
                  {agent.input_config?.accepts_user_input && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">
                      <FileText className="h-3 w-3" />
                      <span>Input</span>
                    </div>
                  )}
                  {agent.output_config?.saves_to_knowledge_base && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">
                      <Database className="h-3 w-3" />
                      <span>KB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Arrow */}
            {!isLast && (
              <div className="absolute -right-[50px] top-1/2 -translate-y-1/2 flex items-center">
                <div className="w-[35px] h-[3px] bg-gradient-to-r from-primary/50 to-primary rounded-full" />
                <div className="relative">
                  <div className="w-3 h-3 rotate-45 border-t-2 border-r-2 border-primary -ml-1" />
                </div>
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px] p-4">
          <div className="space-y-2">
            <p className="font-semibold text-base">{agent.display_name}</p>
            <p className="text-sm text-muted-foreground">{agent.role_description}</p>
            {agent.persona && (
              <p className="text-xs italic text-muted-foreground/80 border-l-2 border-primary/50 pl-2">
                "{agent.persona.slice(0, 150)}..."
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export const WorkflowPreviewDiagram: React.FC<WorkflowPreviewDiagramProps> = ({
  agents: initialAgents,
  connections: initialConnections,
  workflowName,
  onReorder,
  editable = true,
}) => {
  const [agents, setAgents] = useState(initialAgents);
  const [connections, setConnections] = useState(initialConnections);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id).replace('agent-', ''));
      const newIndex = parseInt(String(over.id).replace('agent-', ''));

      const newAgents = arrayMove(agents, oldIndex, newIndex);
      
      // Rebuild connections for sequential flow
      const newConnections: Connection[] = [];
      for (let i = 0; i < newAgents.length - 1; i++) {
        newConnections.push({
          from: i,
          to: i + 1,
          condition: 'always',
          data_mapping: 'pass_full_output',
        });
      }

      setAgents(newAgents);
      setConnections(newConnections);
      onReorder?.(newAgents, newConnections);
    }
  };

  const totalWidth = agents.length > 0 
    ? 120 + agents.length * 260 + 100 
    : 400;

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        <div 
          className="relative rounded-2xl border-2 border-border overflow-hidden"
          style={{ minWidth: `${totalWidth}px`, minHeight: '320px' }}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />

          {/* Content */}
          <div className="relative p-8 flex items-center gap-6">
            {/* Start Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 blur-xl opacity-40" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-xl shadow-green-500/30 ring-4 ring-green-500/20">
                  <Play className="h-6 w-6 text-white fill-white ml-1" />
                </div>
              </div>
              <p className="text-sm font-medium mt-3 text-muted-foreground">Start</p>
            </motion.div>

            {/* Connection to First Agent */}
            {agents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.15 }}
                className="flex items-center -mx-2"
              >
                <div className="w-[40px] h-[3px] bg-gradient-to-r from-green-500 to-primary/50 rounded-full" />
                <div className="w-3 h-3 rotate-45 border-t-2 border-r-2 border-primary/50 -ml-1" />
              </motion.div>
            )}

            {/* Agent Nodes with DnD */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={agents.map((_, i) => `agent-${i}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex items-center gap-12">
                  {agents.map((agent, index) => (
                    <SortableAgentCard
                      key={`agent-${index}`}
                      agent={agent}
                      index={index}
                      isLast={index === agents.length - 1}
                      editable={editable}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Connection to End */}
            {agents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.2 + agents.length * 0.08 }}
                className="flex items-center -mx-2"
              >
                <div className="w-[40px] h-[3px] bg-gradient-to-r from-primary/50 to-red-500 rounded-full" />
                <div className="w-3 h-3 rotate-45 border-t-2 border-r-2 border-red-500 -ml-1" />
              </motion.div>
            )}

            {/* End Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + agents.length * 0.08 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-rose-500 blur-xl opacity-40" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-xl shadow-red-500/30 ring-4 ring-red-500/20">
                  <Flag className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium mt-3 text-muted-foreground">End</p>
            </motion.div>
          </div>

          {/* Footer Info */}
          <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm text-muted-foreground font-medium">
                {workflowName}
              </p>
              <span className="text-xs text-muted-foreground/60">•</span>
              <p className="text-xs text-muted-foreground/60">
                {agents.length} agent{agents.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4">
              {Object.entries(modelLabels).map(([key, label]) => {
                const Icon = modelIcons[key as keyof typeof modelIcons];
                const gradient = modelColors[key as keyof typeof modelColors];
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`h-5 w-5 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drag Hint */}
          {editable && (
            <div className="absolute top-4 right-6">
              <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                <GripVertical className="h-3 w-3 mr-1" />
                Drag to reorder
              </Badge>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default WorkflowPreviewDiagram;
