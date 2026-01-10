import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// App help context for in-app guidance
const APP_HELP_CONTEXT = `
You are an AI assistant for the Smart Agents Generator platform. When users ask how to use features, provide clear step-by-step instructions.

## FEATURE GUIDES

### Creating an Agent
When asked "how to create an agent" or similar:
1. Navigate to **Agents** from the sidebar
2. Click the **"New Agent"** button in the top right
3. Fill in the agent details:
   - **Display Name**: Give your agent a memorable name
   - **Model Type**: Choose Analyst (research), Reviewer (validation), or Synthesizer (summarization)
   - **Persona**: Describe the agent's personality and expertise
   - **Role Description**: Define what the agent does
   - **Intro Sentence**: The agent's greeting message
4. Assign **Knowledge Folders** to limit what documents the agent can access
5. Click **Save** to create your agent

### Building a Knowledge Base
When asked about knowledge base or uploading documents:
1. Go to **Knowledge Base** from the sidebar
2. Click **"New Folder"** to create organization folders (e.g., "Research", "Policies")
3. Select a folder and click **"Upload Document"**
4. Supported formats: PDF, DOCX, TXT, XLSX, images (with OCR)
5. Documents are automatically processed with:
   - Smart chunking for better retrieval
   - Entity extraction and key concepts
   - AI-generated summaries
6. Assign folders to agents in their configuration

### Creating Multi-Agent Workflows
When asked about workflows or multi-agent canvas:
1. Navigate to **Multi-Agent Canvas** from the sidebar
2. Click **"New Configuration"** to start fresh
3. From the agent panel, **drag agents** onto the canvas
4. **Connect agents** by dragging from one agent's output to another's input
5. Configure the flow:
   - Set **Input Folder**: Where source documents come from
   - Set **Output Folder**: Where results are saved
6. Click **Save** to store your workflow
7. Click **Run** to execute the workflow
8. Optionally click **Publish** to share on the Marketplace

### Using AI Chat
When asked about chatting or conversations:
1. Go to **AI Chat** from the sidebar
2. Select an agent from the dropdown (or use Default Assistant)
3. Type your message and press Enter or click Send
4. View **citations** to see source documents for responses
5. Use **thumbs up/down** to provide feedback
6. Click **"Submit Correction"** if the AI made an error
7. Use **Smart Suggestions** for follow-up questions

### Using the Marketplace
When asked about marketplace:
1. Navigate to **Marketplace** from the sidebar
2. Browse tabs: **All**, **Agents**, **Multi-Agent**, **My Published**
3. Use search and category filters to find configurations
4. Click **Import** to copy a configuration to your workspace
5. Imported items appear in your Agents or Multi-Agent Canvas
6. Customize imported configurations as needed

### Publishing to Marketplace
When asked about publishing or sharing:
1. Create and save your agent or multi-agent configuration
2. From Multi-Agent Canvas, click the **Publish** button
3. Fill in details:
   - **Name**: Public name for your configuration
   - **Description**: What it does
   - **Category**: Select the best fit
   - **Tags**: Keywords for discovery
4. Click **Publish** to share publicly
5. View your published items in Marketplace → **My Published**

### Monitoring Workflows
When asked about workflow runs or monitoring:
1. Check **Workflow Runs** from the sidebar for execution history
2. View status: Pending, Running, Completed, or Failed
3. Click on a run to see detailed execution logs
4. Failed runs show error messages for debugging
5. Use **Analytics** for aggregated statistics

### Team Collaboration
When asked about teams or inviting members:
1. Go to **Team** from the sidebar
2. Click **"Invite Member"**
3. Enter their email address
4. Assign a role: Admin, Editor, or Viewer
5. They'll receive an email invitation
6. Manage member permissions anytime

### Understanding RAG Features
When asked about RAG, citations, or AI quality:
- **Citations**: Each AI response shows source documents used
- **Confidence Scores**: How relevant each source was (0-100%)
- **Hallucination Detection**: System flags unverified claims
- **Feedback**: Rate responses to improve future answers
- **Corrections**: Submit fixes when AI makes mistakes

### Settings
When asked about settings or preferences:
1. Click **Settings** from the sidebar
2. Available options:
   - **Theme**: Toggle dark/light mode
   - **Language**: Switch between English and Arabic
   - **RAG Settings**: Citation display, hallucination checks
   - **Notifications**: Email and browser alerts
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT using getClaims for proper validation
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Authentication failed:", claimsError?.message || "Missing sub claim");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log(`Authenticated user: ${userId}`);

    const { messages, agentConfig } = await req.json();
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message limit to prevent abuse
    if (messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Too many messages (max 100)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message content length and format
    for (const msg of messages) {
      if (!msg.content || typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid message format: content must be a string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (msg.content.length > 50000) {
        return new Response(
          JSON.stringify({ error: "Message too long (max 50,000 characters per message)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Invalid message role: must be 'user', 'assistant', or 'system'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If agentConfig includes an agent_id, verify user has access
    if (agentConfig?.agent_id) {
      const { data: agent, error: agentError } = await supabase
        .from("ai_profiles")
        .select("id, created_by, workspace_id")
        .eq("id", agentConfig.agent_id)
        .single();

      if (agentError || !agent) {
        console.error("Agent not found or access denied:", agentConfig.agent_id);
        return new Response(
          JSON.stringify({ error: "Agent not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Verified access to agent: ${agentConfig.agent_id}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt with app help context and agent config
    let systemPrompt = APP_HELP_CONTEXT;
    
    systemPrompt += `\n\n## RESPONSE GUIDELINES
- If the user asks about app features (how to create agents, workflows, etc.), provide clear step-by-step instructions
- If the user asks domain questions, answer based on your knowledge
- Be concise but thorough
- Format with numbered lists and **bold** text for UI elements
- If unsure about something, say so honestly`;
    
    if (agentConfig) {
      systemPrompt += `\n\n## AGENT CONFIGURATION`;
      if (agentConfig.persona) systemPrompt += `\nPersona: ${agentConfig.persona}`;
      if (agentConfig.role_description) systemPrompt += `\nRole: ${agentConfig.role_description}`;
      if (agentConfig.intro_sentence) systemPrompt += `\nIntroduction: ${agentConfig.intro_sentence}`;
    }

    console.log(`Sending request to Lovable AI Gateway for user: ${userId}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
