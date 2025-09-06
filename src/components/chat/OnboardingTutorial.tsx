'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Button } from '@/components/ui';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  tip?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CozyChat! 🎉',
    description: 'Connect with friendly strangers in a warm, safe environment.',
    icon: '🌟',
    tip: 'Your identity is completely anonymous'
  },
  {
    id: 'matching',
    title: 'Finding Your Match',
    description: 'We\'ll pair you with someone who shares your interests.',
    icon: '🔍',
    tip: 'This might take a moment - good things are worth waiting for!'
  },
  {
    id: 'chatting',
    title: 'Start Chatting',
    description: 'Share thoughts, stories, or just say hello!',
    icon: '💬',
    tip: 'Be kind and respectful - it makes conversations better'
  },
  {
    id: 'safety',
    title: 'Stay Safe & Cozy',
    description: 'Report any inappropriate behavior and enjoy your chat.',
    icon: '🛡️',
    tip: 'You can end the chat anytime if you feel uncomfortable'
  }
];

interface OnboardingTutorialProps {
  isVisible: boolean;
  onComplete: () => void;
  currentStep?: string;
}

export const OnboardingTutorial = ({ 
  isVisible, 
  onComplete, 
  currentStep = 'welcome' 
}: OnboardingTutorialProps) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    const seenOnboarding = localStorage.getItem('cozy-chat-seen-onboarding');
    setHasSeenOnboarding(!!seenOnboarding);
  }, []);

  useEffect(() => {
    if (currentStep) {
      const stepIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStep);
      if (stepIndex !== -1) {
        setActiveStepIndex(stepIndex);
      }
    }
  }, [currentStep]);

  const handleNext = () => {
    if (activeStepIndex < ONBOARDING_STEPS.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('cozy-chat-seen-onboarding', 'true');
    setHasSeenOnboarding(true);
    onComplete();
  };

  if (hasSeenOnboarding && !isVisible) return null;

  const currentStepData = ONBOARDING_STEPS[activeStepIndex];
  const isLastStep = activeStepIndex === ONBOARDING_STEPS.length - 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="max-w-md w-full"
          >
            <Card className="shadow-2xl">
              <CardContent className="p-6">
                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mb-6">
                  {ONBOARDING_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index <= activeStepIndex 
                          ? 'bg-cozy-orange-500' 
                          : 'bg-cozy-brown-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Step Content */}
                <motion.div
                  key={activeStepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center space-y-4"
                >
                  <div className="text-4xl mb-4">
                    {currentStepData.icon}
                  </div>
                  
                  <h2 className="text-xl font-semibold text-cozy-brown-800">
                    {currentStepData.title}
                  </h2>
                  
                  <p className="text-cozy-brown-600">
                    {currentStepData.description}
                  </p>
                  
                  {currentStepData.tip && (
                    <div className="bg-cozy-orange-50 border border-cozy-orange-200 rounded-lg p-3">
                      <p className="text-sm text-cozy-orange-700">
                        💡 {currentStepData.tip}
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Actions */}
                <div className="flex justify-between mt-6">
                  <Button 
                    variant="ghost" 
                    onClick={handleSkip}
                    className="text-cozy-brown-500 hover:text-cozy-brown-700"
                  >
                    Skip Tutorial
                  </Button>
                  
                  <Button 
                    onClick={handleNext}
                    className="px-6"
                  >
                    {isLastStep ? 'Start Chatting!' : 'Next'}
                  </Button>
                </div>

                {/* Step Counter */}
                <p className="text-center text-xs text-cozy-brown-400 mt-4">
                  Step {activeStepIndex + 1} of {ONBOARDING_STEPS.length}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
