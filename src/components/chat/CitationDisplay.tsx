import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface Citation {
  id: string;
  source_file: string;
  citation_text: string;
  source_location?: string;
  confidence_score?: number;
  verified?: boolean;
}

interface CitationDisplayProps {
  citations: Citation[];
  className?: string;
}

export const CitationDisplay: React.FC<CitationDisplayProps> = ({
  citations,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  if (!citations || citations.length === 0) return null;

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 0.8) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 0.5) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  };

  return (
    <div className={cn("mt-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{citations.length} source{citations.length !== 1 ? 's' : ''}</span>
            {isOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2 space-y-2">
          {citations.map((citation) => (
            <div
              key={citation.id}
              className="border border-border rounded-lg p-3 bg-muted/30 text-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-normal">
                    {citation.source_file}
                  </Badge>
                  {citation.source_location && (
                    <span className="text-xs text-muted-foreground">
                      {citation.source_location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {citation.verified !== undefined && (
                    citation.verified ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                    )
                  )}
                  {citation.confidence_score !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getConfidenceColor(citation.confidence_score))}
                    >
                      {Math.round(citation.confidence_score * 100)}%
                    </Badge>
                  )}
                </div>
              </div>

              <div 
                className={cn(
                  "text-xs text-muted-foreground",
                  expandedCitation !== citation.id && "line-clamp-2"
                )}
              >
                {citation.citation_text}
              </div>

              {citation.citation_text.length > 150 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs mt-1"
                  onClick={() => setExpandedCitation(
                    expandedCitation === citation.id ? null : citation.id
                  )}
                >
                  {expandedCitation === citation.id ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
