import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
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
  Zap,
  Shield,
  BarChart3,
  Globe,
  Code2,
  Layers,
  Cpu
} from "lucide-react";
import { useRef } from "react";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description,
  gradient
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  gradient?: string;
}) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    className="group relative p-8 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/40 transition-all duration-500 overflow-hidden"
  >
    {/* Gradient overlay on hover */}
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient || 'bg-gradient-to-br from-primary/5 to-accent/5'}`} />
    
    <div className="relative z-10">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3 tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="text-center"
  >
    <div className="text-4xl md:text-5xl font-bold text-gradient-primary mb-2">{value}</div>
    <div className="text-muted-foreground">{label}</div>
  </motion.div>
);

const Index = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const features = [
    {
      icon: Bot,
      title: "Intelligent AI Agents",
      description: "Create sophisticated AI agents with custom personas, knowledge domains, and behavioral patterns tailored to your needs.",
      gradient: "bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10"
    },
    {
      icon: Workflow,
      title: "Multi-Agent Orchestration",
      description: "Design complex workflows where multiple AI agents collaborate, share context, and solve problems together.",
      gradient: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10"
    },
    {
      icon: Database,
      title: "Knowledge Architecture",
      description: "Build structured knowledge bases with intelligent chunking, embeddings, and semantic search capabilities.",
      gradient: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
    },
    {
      icon: MessageSquare,
      title: "Natural Conversations",
      description: "Engage in context-aware dialogues with agents that understand nuance, maintain memory, and learn from interactions.",
      gradient: "bg-gradient-to-br from-orange-500/10 to-amber-500/10"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption, role-based access control, and comprehensive audit trails for enterprise compliance.",
      gradient: "bg-gradient-to-br from-rose-500/10 to-pink-500/10"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Monitor agent performance, conversation insights, and knowledge utilization with beautiful dashboards.",
      gradient: "bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
    }
  ];

  const capabilities = [
    { icon: FileText, label: "RAG-Powered" },
    { icon: Cpu, label: "Edge Computing" },
    { icon: Globe, label: "Multi-Language" },
    { icon: Code2, label: "API-First" },
    { icon: Layers, label: "Scalable" },
    { icon: Users, label: "Team Ready" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center py-20">
        {/* Animated background */}
        <motion.div 
          style={{ y, opacity }}
          className="absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-0 bg-mesh" />
          <div className="absolute inset-0 aurora" />
          
          {/* Floating orbs */}
          <motion.div
            animate={{ 
              x: [0, 30, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [0, 20, 0],
              y: [0, 20, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
          />
        </motion.div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-10"
            >
              <div className="relative">
                <Sparkles className="h-4 w-4 text-primary" />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
              <span className="text-sm font-medium text-primary">Next-Generation AI Platform</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground mb-8 leading-[1.1] tracking-tight">
              Build AI Agents
              <span className="block text-gradient-primary mt-2">That Think Together</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              Create, orchestrate, and deploy intelligent AI agents powered by your knowledge. 
              Design workflows where agents collaborate to solve the impossible.
            </p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Link to="/auth">
                <Button size="lg" className="gap-3 px-10 py-7 text-lg rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1">
                  <Zap className="h-5 w-5" />
                  Start Building Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="gap-3 px-10 py-7 text-lg rounded-2xl border-2 hover:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1">
                  <Brain className="h-5 w-5" />
                  Sign In
                </Button>
              </Link>
            </motion.div>

            {/* Capabilities Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-3"
            >
              {capabilities.map(({ icon: Icon, label }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/50 backdrop-blur-sm text-sm text-muted-foreground"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative mx-auto max-w-6xl rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-2 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-card to-card/50 p-10 min-h-[350px] flex items-center justify-center relative overflow-hidden">
                {/* Animated grid lines */}
                <div className="absolute inset-0 grid-pattern opacity-20" />
                
                <div className="grid grid-cols-3 gap-12 relative z-10">
                  <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center backdrop-blur-sm border border-violet-500/20 shadow-lg shadow-violet-500/10">
                      <Bot className="h-10 w-10 text-violet-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">AI Agents</span>
                  </motion.div>
                  <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, delay: 0.7, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 flex items-center justify-center backdrop-blur-sm border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
                      <Workflow className="h-10 w-10 text-cyan-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Workflows</span>
                  </motion.div>
                  <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, delay: 1.4, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center backdrop-blur-sm border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                      <Database className="h-10 w-10 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Knowledge</span>
                  </motion.div>
                </div>

                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  <motion.line
                    x1="33%" y1="50%" x2="50%" y2="50%"
                    stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="8 4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.line
                    x1="50%" y1="50%" x2="67%" y2="50%"
                    stroke="url(#gradient2)" strokeWidth="2" strokeDasharray="8 4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
                  />
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(262, 83%, 58%)" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="hsl(172, 66%, 50%)" stopOpacity="0.5" />
                    </linearGradient>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(172, 66%, 50%)" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatCard value="10K+" label="Active Agents" />
            <StatCard value="1M+" label="Conversations" />
            <StatCard value="99.9%" label="Uptime" />
            <StatCard value="<100ms" label="Response Time" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-mesh opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider mb-4 block">Capabilities</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Everything You Need to Build
              <span className="text-gradient-primary block mt-2">Intelligent AI Systems</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform for creating, managing, and deploying AI agents with enterprise-grade capabilities.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
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
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 aurora opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center p-12 md:p-16 rounded-[2.5rem] bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-8"
            >
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/25">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Ready to Transform Your AI Workflow?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of developers and teams building the next generation of intelligent applications.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-3 px-12 py-7 text-lg rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1">
                Start Building Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-8">
            {/* Creator Credit */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">AI Agent Platform</span>
              </div>
              <p className="text-muted-foreground mb-2">
                Designed, Architected & Developed by
              </p>
              <p className="text-xl font-semibold text-gradient-primary">
                Elhamy M. Sobhy
              </p>
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/help" className="hover:text-foreground transition-colors">Documentation</Link>
            </div>
            
            {/* Copyright */}
            <div className="text-sm text-muted-foreground">
              © 2025 AI Agent Platform. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;