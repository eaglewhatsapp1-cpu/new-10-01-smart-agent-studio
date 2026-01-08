import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "@/pages/Index";
import { Dashboard } from "@/pages/Dashboard";
import { Agents } from "@/pages/Agents";
import { AgentConfiguration } from "@/pages/AgentConfiguration";
import { AgentTestChat } from "@/pages/AgentTestChat";
import { MultiAgentCanvas } from "@/pages/MultiAgentCanvas";
import { KnowledgeBase } from "@/pages/KnowledgeBase";
import { Analytics } from "@/pages/Analytics";
import { Settings } from "@/pages/Settings";
import { Auth } from "@/pages/Auth";
import { AIChat } from "@/pages/AIChat";
import { WorkflowRuns } from "@/pages/WorkflowRuns";
import { WorkflowMonitor } from "@/pages/WorkflowMonitor";
import { Team } from "@/pages/Team";
import { Marketplace } from "@/pages/Marketplace";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { TermsOfService } from "@/pages/TermsOfService";
import { Help } from "@/pages/Help";
import { WorkflowBuilder } from "@/pages/WorkflowBuilder";
import { AIAssistant } from "@/components/assistant/AIAssistant";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <WorkspaceProvider>
                    <MainLayout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/agents" element={<Agents />} />
                        <Route path="/agents/:id" element={<AgentConfiguration />} />
                        <Route path="/agent-test" element={<AgentTestChat />} />
                        <Route path="/multi-agent-canvas" element={<MultiAgentCanvas />} />
                        <Route path="/multi-agent-canvas/:id" element={<MultiAgentCanvas />} />
                        <Route path="/workflow-builder" element={<WorkflowBuilder />} />
                        <Route path="/knowledge-base" element={<KnowledgeBase />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/ai-chat" element={<AIChat />} />
                        <Route path="/workflow-runs" element={<WorkflowRuns />} />
                        <Route path="/workflow-monitor/:runId" element={<WorkflowMonitor />} />
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                    <AIAssistant />
                  </WorkspaceProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
