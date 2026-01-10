import { useCallback, useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

export function useUndoRedo(
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void,
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50 } = options;

  const [past, setPast] = useState<CanvasState[]>([]);
  const [future, setFuture] = useState<CanvasState[]>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // Track changes and add to history
  const takeSnapshot = useCallback(() => {
    setPast((prev) => {
      const newPast = [...prev, { nodes: [...nodes], edges: [...edges] }];
      // Limit history size
      if (newPast.length > maxHistorySize) {
        return newPast.slice(newPast.length - maxHistorySize);
      }
      return newPast;
    });
    // Clear future when new action is taken
    setFuture([]);
  }, [nodes, edges, maxHistorySize]);

  // Undo action
  const undo = useCallback(() => {
    if (past.length === 0) return;

    setIsUndoRedoAction(true);
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    // Save current state to future
    setFuture((prev) => [...prev, { nodes: [...nodes], edges: [...edges] }]);
    setPast(newPast);

    // Restore previous state
    setNodes(previous.nodes);
    setEdges(previous.edges);

    // Reset flag after state update
    setTimeout(() => setIsUndoRedoAction(false), 0);
  }, [past, nodes, edges, setNodes, setEdges]);

  // Redo action
  const redo = useCallback(() => {
    if (future.length === 0) return;

    setIsUndoRedoAction(true);

    const next = future[future.length - 1];
    const newFuture = future.slice(0, future.length - 1);

    // Save current state to past
    setPast((prev) => [...prev, { nodes: [...nodes], edges: [...edges] }]);
    setFuture(newFuture);

    // Restore next state
    setNodes(next.nodes);
    setEdges(next.edges);

    // Reset flag after state update
    setTimeout(() => setIsUndoRedoAction(false), 0);
  }, [future, nodes, edges, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    takeSnapshot,
    isUndoRedoAction,
    historyLength: past.length,
    futureLength: future.length,
  };
}
