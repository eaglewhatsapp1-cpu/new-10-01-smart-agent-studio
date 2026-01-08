import React, { useState } from 'react';
import { X, Send, AlertTriangle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CorrectionInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  conversationId?: string;
  chunkId?: string;
  originalContent: string;
}

type CorrectionType = 'factual_error' | 'incomplete' | 'outdated' | 'unclear' | 'wrong_source' | 'other';

const correctionTypes: { value: CorrectionType; label: string; description: string }[] = [
  { value: 'factual_error', label: 'Factual Error', description: 'The response contains incorrect information' },
  { value: 'incomplete', label: 'Incomplete', description: 'Important information is missing' },
  { value: 'outdated', label: 'Outdated', description: 'The information is no longer current' },
  { value: 'unclear', label: 'Unclear', description: 'The response is confusing or hard to understand' },
  { value: 'wrong_source', label: 'Wrong Source', description: 'The cited sources are incorrect' },
  { value: 'other', label: 'Other', description: 'Other type of issue' },
];

export const CorrectionInterface: React.FC<CorrectionInterfaceProps> = ({
  isOpen,
  onClose,
  messageId,
  conversationId,
  chunkId,
  originalContent,
}) => {
  const [correctionType, setCorrectionType] = useState<CorrectionType>('factual_error');
  const [correctedContent, setCorrectedContent] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!correctedContent.trim() && !correctionReason.trim()) {
      toast.error('Please provide a correction or explanation');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit feedback
      const { error: feedbackError } = await supabase.from('rag_feedback').insert({
        message_id: messageId,
        conversation_id: conversationId,
        chunk_id: chunkId,
        feedback_type: 'correction',
        feedback_text: correctionReason,
        user_correction: correctedContent,
        correct_answer: correctedContent,
        is_relevant: false,
        rating: 2,
      });

      if (feedbackError) throw feedbackError;

      // If there's a chunk, also submit chunk correction
      if (chunkId && correctedContent.trim()) {
        const { error: correctionError } = await supabase.from('rag_chunk_corrections').insert({
          chunk_id: chunkId,
          original_content: originalContent,
          corrected_content: correctedContent,
          correction_reason: correctionReason,
          correction_type: correctionType,
          approved: false,
        });

        if (correctionError) throw correctionError;
      }

      toast.success('Thank you! Your correction has been submitted for review.');
      onClose();
      setCorrectedContent('');
      setCorrectionReason('');
    } catch (error) {
      console.error('Failed to submit correction:', error);
      toast.error('Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Suggest a Correction
          </DialogTitle>
          <DialogDescription>
            Help improve the AI by providing corrections. Your feedback trains better responses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>What type of issue is this?</Label>
            <RadioGroup
              value={correctionType}
              onValueChange={(v) => setCorrectionType(v as CorrectionType)}
              className="grid grid-cols-2 gap-2"
            >
              {correctionTypes.map((type) => (
                <div
                  key={type.value}
                  className="flex items-start space-x-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setCorrectionType(type.value)}
                >
                  <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor={type.value} className="text-sm font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="original">Original Response</Label>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground max-h-24 overflow-y-auto">
              {originalContent.slice(0, 300)}
              {originalContent.length > 300 && '...'}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="corrected" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Correct Response
            </Label>
            <Textarea
              id="corrected"
              value={correctedContent}
              onChange={(e) => setCorrectedContent(e.target.value)}
              placeholder="Provide the corrected information..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Explanation (optional)</Label>
            <Textarea
              id="reason"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Explain why this is incorrect or how it should be improved..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
