import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Brain, 
  Workflow, 
  Database, 
  MessageSquare, 
  Sparkles, 
  ArrowRight,
  Bot,
  FileText,
  Users,
  Zap
} from "lucide-react";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover-glow"
  >
    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </motion.div>
);

const Index = () => {
  const features = [
    {
      icon: Bot,
      title: "AI Agents",
      description: "Create and customize intelligent AI agents tailored to your specific needs with advanced personas and knowledge bases."
    },
    {
      icon: Workflow,
      title: "Multi-Agent Workflows",
      description: "Design complex workflows where multiple AI agents collaborate seamlessly to accomplish sophisticated tasks."
    },
    {
      icon: Database,
      title: "Knowledge Base",
      description: "Upload and organize documents that your agents can reference for accurate, context-aware responses."
    },
    {
      icon: MessageSquare,
      title: "AI Chat Interface",
      description: "Engage in natural conversations with your configured agents through an intuitive chat experience."
    },
    {
      icon: FileText,
      title: "RAG-Powered Retrieval",
      description: "Advanced retrieval-augmented generation ensures your agents provide accurate, source-backed answers."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Invite team members to your workspace and collaborate on building intelligent AI solutions together."
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-radial opacity-50" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Learning Platform</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Build Intelligent AI Agents
              <span className="block text-gradient-primary mt-2">That Actually Understand</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Create, configure, and deploy AI agents powered by your own knowledge base. 
              Design multi-agent workflows that collaborate to solve complex problems.
            </p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/auth">
                <Button size="lg" className="gap-2 px-8 py-6 text-lg glow-primary">
                  <Zap className="h-5 w-5" />
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="gap-2 px-8 py-6 text-lg hover-glow">
                  <Brain className="h-5 w-5" />
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4 glow-subtle">
              <div className="rounded-xl bg-gradient-dark p-8 min-h-[300px] flex items-center justify-center">
                <div className="grid grid-cols-3 gap-8 opacity-80">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">AI Agents</span>
                  </motion.div>
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center">
                      <Workflow className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Workflows</span>
                  </motion.div>
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Database className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">Knowledge</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Build
              <span className="text-primary"> Smart AI Solutions</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform for creating, managing, and deploying AI agents with advanced capabilities.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-radial opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-card border border-border glow-subtle"
          >
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of users building intelligent AI agents. Start for free today.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 px-10 py-6 text-lg glow-primary">
                Start Building Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">AI Agent Platform</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/help" className="hover:text-foreground transition-colors">Help</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
