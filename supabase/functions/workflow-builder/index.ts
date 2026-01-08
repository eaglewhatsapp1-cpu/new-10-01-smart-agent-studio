import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const systemPrompt = `You are an AI workflow architect that helps users design multi-agent AI workflows. Your role is to:

1. Understand the user's workflow idea through conversation
2. Ask clarifying questions to fully understand their needs
3. When you have enough information, generate a complete workflow configuration

CONVERSATION GUIDELINES:
- Be friendly and helpful
- Ask 2-3 clarifying questions at a time, not too many
- Focus on understanding: the goal, the agents needed, how they should connect, and what each agent should do
- When ready to generate, create a complete workflow

WHEN GENERATING A WORKFLOW, respond with a JSON block wrapped in \`\`\`json\`\`\` markers containing:
{
  "ready": true,
  "workflow": {
    "name": "Workflow Name",
    "description": "Brief description",
    "agents": [
      {
        "display_name": "Agent Name",
        "role_description": "What this agent does",
        "persona": "How the agent should behave",
        "intro_sentence": "A greeting for this agent",
        "core_model": "core_analyst" | "core_reviewer" | "core_synthesizer"
      }
    ],
    "connections": [
      { "from": 0, "to": 1 }  // Index-based connections between agents
    ]
  }
}

CORE MODEL SELECTION:
- core_analyst: For agents that analyze, research, or gather information
- core_reviewer: For agents that review, validate, or provide feedback
- core_synthesizer: For agents that summarize, combine, or create final outputs

If you're still gathering information, respond normally without the JSON block.
Always be conversational and helpful. Don't generate a workflow until you understand the user's needs well.`;

// Input validation helpers
function isValidMessage(msg: unknown): msg is { role: string; content: string } {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.role === 'string' &&
    ['user', 'assistant', 'system'].includes(m.role) &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    m.content.length <= 50000
  );
}

function validateMessages(messages: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }
  if (messages.length > 50) {
    return { valid: false, error: 'Too many messages (max 50)' };
  }
  for (let i = 0; i < messages.length; i++) {
    if (!isValidMessage(messages[i])) {
      return { valid: false, error: `Invalid message at index ${i}: must have role (user/assistant/system) and content (1-50000 chars)` };
    }
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = body as { messages: unknown };

    // Validate messages
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing workflow builder request for user ${user.id} with ${(messages as unknown[]).length} messages`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages as Array<{ role: string; content: string }>,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Workflow builder error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
