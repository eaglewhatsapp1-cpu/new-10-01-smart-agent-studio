import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquareWarning, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageFeedbackProps {
  messageId: string;
  conversationId?: string;
  chunkId?: string;
  onOpenCorrection?: () => void;
  className?: string;
}

export const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  conversationId,
  chunkId,
  onOpenCorrection,
  className,
}) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (feedback === type) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('rag_feedback').insert({
        message_id: messageId,
        conversation_id: conversationId,
        chunk_id: chunkId,
        feedback_type: type === 'positive' ? 'helpful' : 'not_helpful',
        rating: type === 'positive' ? 5 : 1,
        is_relevant: type === 'positive',
      });

      if (error) throw error;
      
      setFeedback(type);
      toast.success(type === 'positive' ? 'Thanks for your feedback!' : 'Feedback recorded');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                feedback === 'positive' && "text-green-500 bg-green-500/10"
              )}
              onClick={() => handleFeedback('positive')}
              disabled={isSubmitting}
            >
              {feedback === 'positive' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Helpful response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                feedback === 'negative' && "text-red-500 bg-red-500/10"
              )}
              onClick={() => handleFeedback('negative')}
              disabled={isSubmitting}
            >
              {feedback === 'negative' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ThumbsDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Not helpful</TooltipContent>
        </Tooltip>

        {onOpenCorrection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onOpenCorrection}
              >
                <MessageSquareWarning className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Suggest correction</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
