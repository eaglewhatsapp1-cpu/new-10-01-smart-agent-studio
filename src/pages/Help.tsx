import React from 'react';
import { 
  HelpCircle, Bot, Workflow, Database, BarChart3, 
  Users, MessageSquare, Sparkles, FolderOpen, Play,
  Settings, Zap, Video, CircleHelp, Store, ThumbsUp,
  FileSearch, Shield, Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const videoTutorials = [
  {
    title: "Creating Your First AI Agent",
    description: "Learn how to create and configure an AI agent with custom personas and knowledge access.",
    icon: Bot,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "5:30"
  },
  {
    title: "Building a Knowledge Base",
    description: "Upload documents, organize folders, and set up your knowledge base for AI processing.",
    icon: FolderOpen,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "4:15"
  },
  {
    title: "Multi-Agent Workflow Design",
    description: "Design complex workflows with multiple agents using the visual canvas editor.",
    icon: Workflow,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "8:45"
  },
  {
    title: "Chatting with AI Agents",
    description: "Start conversations with your configured agents and get intelligent responses.",
    icon: MessageSquare,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "3:20"
  },
  {
    title: "Advanced RAG Features",
    description: "Learn about citations, feedback, corrections, and hallucination detection.",
    icon: Brain,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "7:15"
  },
  {
    title: "Using the Marketplace",
    description: "Browse, import, and publish agent configurations in the marketplace.",
    icon: Store,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "5:00"
  }
];

const faqItems = [
  {
    question: "What file types can I upload to the Knowledge Base?",
    answer: "You can upload a wide variety of file types including PDFs, Word documents (DOCX), Excel spreadsheets (XLSX), PowerPoint presentations (PPTX), plain text files (TXT), images (PNG, JPG, GIF, WebP), audio files (MP3, WAV), and more. PDFs and images are processed with OCR to extract text, while documents are parsed to extract their content."
  },
  {
    question: "How do I choose the right agent model type?",
    answer: "There are three model types: Analyst agents are best for research and data analysis tasks; Reviewer agents are ideal for validation, fact-checking, and quality assurance; Synthesizer agents excel at summarizing information and combining insights from multiple sources. Choose based on your primary use case."
  },
  {
    question: "Can I use multiple agents in a single workflow?",
    answer: "Yes! The Multi-Agent Canvas allows you to connect multiple agents in sequence or parallel. Each agent can pass its output to the next, enabling complex processing pipelines like analyze → review → synthesize."
  },
  {
    question: "How does the Advanced RAG system work?",
    answer: "Our Advanced RAG (Retrieval Augmented Generation) uses hybrid search combining keyword, semantic tags, and knowledge graph lookups. Documents are contextually chunked with AI-generated summaries, key concepts, and entity extraction. The system includes query expansion (HyDE), re-ranking, multi-hop retrieval for complex questions, Self-RAG for relevance decisions, and Corrective-RAG to filter low-quality chunks."
  },
  {
    question: "What are citations and how do they work?",
    answer: "Citations automatically link AI responses to source documents. Each response shows which knowledge chunks were used, with confidence scores and verification status. You can expand citations to see the exact source text, file location, and relevance score. This ensures transparency and allows you to verify AI-generated information."
  },
  {
    question: "How does hallucination detection work?",
    answer: "The system automatically checks if AI responses are supported by the retrieved source documents. If a claim cannot be verified against the knowledge base, it's flagged as a potential hallucination. The Self-RAG component evaluates relevance, support, and utility of each response before delivery."
  },
  {
    question: "How can I provide feedback on AI responses?",
    answer: "Each AI response has thumbs up/down buttons for quick feedback. You can also submit corrections if the AI got something wrong—specify the original content, your correction, and the reason. This feedback helps improve future responses and is stored for analysis."
  },
  {
    question: "What is the Marketplace?",
    answer: "The Marketplace is a shared repository where you can publish and discover agent configurations. You can share single agents or complete multi-agent workflows. Other users can import configurations as copies to customize for their own use. This enables reusing proven agent setups across workspaces."
  },
  {
    question: "How do I publish to the Marketplace?",
    answer: "When viewing a Multi-Agent Canvas configuration, click the 'Publish' button. Provide a name, description, category, and tags. Once published, your configuration becomes available to all users. You can also publish single agents from the Agents page."
  },
  {
    question: "What are knowledge folders and how should I organize them?",
    answer: "Knowledge folders help you organize documents by topic, project, or department. You can assign specific folders to agents, limiting their knowledge scope. This is useful for creating specialized agents that only access relevant information."
  },
  {
    question: "How do I monitor workflow execution?",
    answer: "Use the Workflow Monitor page for real-time execution tracking, and the Workflow Runs page to view historical execution data. The Analytics page provides aggregated statistics on usage, performance, and token consumption."
  },
  {
    question: "Can I invite team members to collaborate?",
    answer: "Yes! Navigate to the Team page to invite members via email. You can assign roles (Admin, Editor, Viewer) to control access levels. Team members will receive an invitation email to join your workspace."
  },
  {
    question: "What happens if my workflow fails?",
    answer: "Failed workflow runs are logged with detailed error messages in the Workflow Runs page. You can view execution logs to diagnose issues, then fix your workflow configuration and re-run. The system preserves all run history for debugging."
  },
  {
    question: "How do I improve agent response quality?",
    answer: "Fine-tune agent personas with clear instructions, use specific response rules, and ensure your Knowledge Base contains high-quality, relevant documents. Use the feedback system to mark good/bad responses. The RAG pipeline automatically learns from corrections to improve retrieval accuracy over time."
  },
  {
    question: "Is there a limit on document uploads?",
    answer: "Individual files must be under 20MB. There's no strict limit on the number of documents, but we recommend organizing them into folders for better performance and easier agent configuration."
  }
];

export const Help: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Learn how to use Smart Agents Generator</p>
        </div>
      </div>

      {/* App Overview */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            What is Smart Agents Generator?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4">
          <p>
            <strong>Smart Agents Generator</strong> is a powerful platform for creating, configuring, and orchestrating 
            AI agents with advanced RAG capabilities. It enables you to build intelligent workflows that can analyze, 
            review, and synthesize information from your knowledge base with full citation support and hallucination detection.
          </p>
          <p>
            Whether you need automated document processing, intelligent Q&A systems, or complex multi-agent 
            workflows, Smart Agents Generator provides the tools to make it happen—all without writing code.
            Share your configurations via the Marketplace and leverage community-built agents.
          </p>
        </CardContent>
      </Card>

      {/* Video Tutorials */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          Video Tutorials
        </h2>
        <p className="text-muted-foreground mb-4">
          Watch these step-by-step video guides to master each feature of Smart Agents Generator.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videoTutorials.map((tutorial, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-muted">
                <iframe
                  src={tutorial.videoUrl}
                  title={tutorial.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-2 py-1 rounded">
                  {tutorial.duration}
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <tutorial.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="line-clamp-1">{tutorial.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground pt-0">
                {tutorial.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Core Features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-primary" />
                AI Agents
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create specialized AI agents with different roles: Analyst, Reviewer, or Synthesizer. 
              Customize their personas, response rules, and knowledge access.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Workflow className="h-5 w-5 text-primary" />
                Multi-Agent Workflows
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Design complex workflows using a visual canvas. Connect multiple agents to create 
              sophisticated processing pipelines with handoff rules.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Advanced RAG
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Hybrid search with query expansion, re-ranking, and multi-hop retrieval. 
              Self-RAG and Corrective-RAG ensure high-quality, relevant responses.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSearch className="h-5 w-5 text-primary" />
                Citations & Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every AI response includes citations linking to source documents with confidence scores. 
              Verify information and trace answers back to their origins.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Hallucination Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Automatic detection of unsupported claims in AI responses. 
              The system verifies all statements against your knowledge base.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ThumbsUp className="h-5 w-5 text-primary" />
                Feedback & Corrections
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Rate responses with thumbs up/down and submit corrections. 
              Your feedback improves the system's accuracy over time.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5 text-primary" />
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Browse and import pre-built agent configurations. Publish your own 
              agents and workflows for the community to use.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5 text-primary" />
                Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Upload and organize documents into folders. Smart chunking with AI-generated 
              summaries, key concepts, and entity extraction.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Monitor real-time usage statistics, workflow performance, agent activity, and 
              knowledge base metrics through comprehensive dashboards.
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How to Use */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Getting Started Guide</h2>
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="step1" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">1</div>
                <span className="text-left">Create Your First Agent</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <ol className="list-decimal list-inside space-y-2 ml-11">
                <li>Navigate to the <strong>Agents</strong> page from the sidebar</li>
                <li>Click <strong>"New Agent"</strong> to create a new AI agent</li>
                <li>Choose a model type: Analyst, Reviewer, or Synthesizer</li>
                <li>Configure the agent's persona and response rules</li>
                <li>Assign knowledge folders the agent can access</li>
                <li>Save your agent configuration</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step2" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">2</div>
                <span className="text-left">Build Your Knowledge Base</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <ol className="list-decimal list-inside space-y-2 ml-11">
                <li>Go to the <strong>Knowledge Base</strong> page</li>
                <li>Create folders to organize your documents</li>
                <li>Upload documents (PDF, TXT, DOCX, images, etc.)</li>
                <li>The system automatically processes content with smart chunking, entity extraction, and knowledge graph building</li>
                <li>Assign folders to specific agents for targeted knowledge access</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step3" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">3</div>
                <span className="text-left">Design Multi-Agent Workflows</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <ol className="list-decimal list-inside space-y-2 ml-11">
                <li>Open the <strong>Multi-Agent Canvas</strong></li>
                <li>Drag agents onto the canvas</li>
                <li>Connect agents to define the workflow flow</li>
                <li>Configure handoff rules between agents</li>
                <li>Set input and output folders for the workflow</li>
                <li>Save, run, or publish your workflow to the Marketplace</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step4" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">4</div>
                <span className="text-left">Chat with Your Agents</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <ol className="list-decimal list-inside space-y-2 ml-11">
                <li>Navigate to the <strong>AI Chat</strong> page</li>
                <li>Select an agent to chat with</li>
                <li>Start a conversation by typing your question</li>
                <li>View <strong>citations</strong> to see source documents for each response</li>
                <li>Use <strong>thumbs up/down</strong> to provide feedback on responses</li>
                <li>Submit <strong>corrections</strong> if the AI gets something wrong</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step5" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">5</div>
                <span className="text-left">Use the Marketplace</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <ol className="list-decimal list-inside space-y-2 ml-11">
                <li>Browse the <strong>Marketplace</strong> for pre-built agents and workflows</li>
                <li>Filter by type (single agent, multi-agent) or category</li>
                <li>Click <strong>Import</strong> to add a configuration to your workspace</li>
                <li>Customize imported configurations for your specific needs</li>
                <li>Publish your own configurations to share with the community</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step6" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">6</div>
                <span className="text-left">Monitor & Analyze</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <ol className="list-decimal list-inside space-y-2 ml-11">
                <li>Check the <strong>Dashboard</strong> for quick stats and activity</li>
                <li>View <strong>Workflow Runs</strong> to track execution history</li>
                <li>Use <strong>Analytics</strong> for detailed usage and performance insights</li>
                <li>Monitor real-time workflow execution in the <strong>Workflow Monitor</strong></li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CircleHelp className="h-6 w-6 text-primary" />
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqItems.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline text-left">
                <span className="font-medium">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Use citations:</strong> Always expand citations to verify AI responses against source documents.</li>
            <li><strong>Provide feedback:</strong> Rate responses to help the system learn and improve over time.</li>
            <li><strong>Submit corrections:</strong> If the AI gets something wrong, submit a correction to improve future responses.</li>
            <li><strong>Organize knowledge:</strong> Group related documents into folders for better agent specialization.</li>
            <li><strong>Check the Marketplace:</strong> Before building from scratch, see if someone has already created a similar agent.</li>
            <li><strong>Use specific personas:</strong> The more specific your agent's persona, the better the responses.</li>
            <li><strong>Monitor workflows:</strong> Check the Workflow Monitor to ensure your multi-agent pipelines run smoothly.</li>
            <li><strong>Start simple:</strong> Begin with a single agent, then scale to multi-agent workflows as needed.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
