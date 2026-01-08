import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Collaborator {
  id: string;
  email: string;
  cursor?: { x: number; y: number };
  color: string;
  lastActive: Date;
}

interface CollaboratorCursorsProps {
  collaborators: Collaborator[];
}

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  collaborators,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {collaborators.map(
          (collaborator) =>
            collaborator.cursor && (
              <motion.div
                key={collaborator.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                style={{
                  position: 'absolute',
                  left: collaborator.cursor.x,
                  top: collaborator.cursor.y,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {/* Cursor pointer */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ transform: 'rotate(-15deg)' }}
                >
                  <path
                    d="M5.65 1.65L21.35 12.35L12.35 12.85L8.65 21.15L5.65 1.65Z"
                    fill={collaborator.color}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Name label */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-4 top-4 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap shadow-lg"
                  style={{ backgroundColor: collaborator.color }}
                >
                  {collaborator.email.split('@')[0]}
                </motion.div>
              </motion.div>
            )
        )}
      </AnimatePresence>
    </div>
  );
};

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  collaborators,
}) => {
  if (collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Editing:</span>
      <div className="flex -space-x-2">
        {collaborators.slice(0, 5).map((collaborator) => (
          <motion.div
            key={collaborator.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="relative h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: collaborator.color }}
            title={collaborator.email}
          >
            {collaborator.email.charAt(0).toUpperCase()}
          </motion.div>
        ))}
        {collaborators.length > 5 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
            +{collaborators.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};