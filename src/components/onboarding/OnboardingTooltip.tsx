import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AI Agent Platform! 🎉',
    description: 'Let\'s take a quick tour to help you get started with building intelligent AI agents.',
  },
  {
    id: 'agents',
    title: 'Create AI Agents',
    description: 'Start by creating your first AI agent. Configure its personality, model, and knowledge access.',
    targetId: 'nav-agents',
    position: 'right',
  },
  {
    id: 'knowledge',
    title: 'Build Your Knowledge Base',
    description: 'Upload documents to create a knowledge base. Your agents can reference this information for accurate responses.',
    targetId: 'nav-knowledge',
    position: 'right',
  },
  {
    id: 'workflows',
    title: 'Design Multi-Agent Workflows',
    description: 'Connect multiple agents in workflows where they collaborate to solve complex tasks.',
    targetId: 'nav-workflows',
    position: 'right',
  },
  {
    id: 'chat',
    title: 'Chat with Your Agents',
    description: 'Test and interact with your configured agents through the AI Chat interface.',
    targetId: 'nav-chat',
    position: 'right',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'Start exploring the platform and build your first AI agent. Visit the Help section anytime for guidance.',
  },
];

const ONBOARDING_KEY = 'onboarding_completed';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Small delay to let the UI render
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setCurrentStep(0);
    setShowOnboarding(true);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return {
    showOnboarding,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    currentStepData: ONBOARDING_STEPS[currentStep],
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding,
  };
};

interface OnboardingOverlayProps {
  showOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: OnboardingStep;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  showOnboarding,
  currentStep,
  totalSteps,
  currentStepData,
  nextStep,
  prevStep,
  completeOnboarding,
}) => {
  if (!showOnboarding) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCentered = !currentStepData.targetId;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            completeOnboarding();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md mx-4"
        >
          <Card className="p-6 shadow-xl border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {totalSteps}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={completeOnboarding}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {currentStepData.description}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep
                      ? 'w-6 bg-primary'
                      : i < currentStep
                      ? 'w-1.5 bg-primary/50'
                      : 'w-1.5 bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isFirst}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              {isLast ? (
                <Button onClick={completeOnboarding} className="gap-1">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={nextStep} className="gap-1">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            <button
              onClick={completeOnboarding}
              className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
