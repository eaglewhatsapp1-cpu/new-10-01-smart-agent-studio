import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Heart, Code2, Shield, FileText, HelpCircle } from 'lucide-react';
import { useOnboarding, OnboardingOverlay } from '@/components/onboarding/OnboardingTooltip';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const onboarding = useOnboarding();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <main className="ms-72 flex-1 p-6">
        {children}
      </main>
      <footer className="ms-72 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Shield className="h-4 w-4" />
              <span>Privacy & Security</span>
            </Link>
            <Link to="/terms" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <FileText className="h-4 w-4" />
              <span>Terms of Service</span>
            </Link>
            <Link to="/help" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Code2 className="h-4 w-4" />
            <span>Designed & Built by</span>
            <span className="font-semibold text-foreground">Elhamy Sobhy</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
          </div>
        </div>
      </footer>

      {/* Onboarding Overlay */}
      <OnboardingOverlay {...onboarding} />
    </div>
  );
};
