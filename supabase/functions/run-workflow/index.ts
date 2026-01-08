import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user context for RLS
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

    const { workflowId, workspaceId, triggerType = "manual", inputData } = await req.json();
    
    // Validate required field
    if (!workflowId) {
      return new Response(
        JSON.stringify({ error: "workflowId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workflowId)) {
      return new Response(
        JSON.stringify({ error: "Invalid workflowId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting workflow: ${workflowId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Get workflow configuration - RLS will enforce access control
    const { data: workflow, error: workflowError } = await supabase
      .from("multi_agent_configs")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      console.error("Workflow not found or access denied:", workflowId, workflowError?.message);
      return new Response(
        JSON.stringify({ error: "Workflow not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verified access to workflow: ${workflowId}, workspace: ${workflow.workspace_id}`);

    // Create workflow run record
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        workspace_id: workspaceId || workflow.workspace_id,
        trigger_type: triggerType,
        status: "running",
        started_at: new Date().toISOString(),
        input_data: inputData || {},
        execution_logs: [],
        created_by: user.id,
      })
      .select()
      .single();

    if (runError) {
      console.error("Failed to create workflow run:", runError.message);
      throw runError;
    }

    console.log(`Created workflow run: ${run.id}`);

    const executionLogs: any[] = [];
    let outputData: any = {};

    try {
      // Parse agent nodes from workflow
      const agentNodes = workflow.agent_nodes || [];
      
      // Limit agents to prevent abuse
      if (agentNodes.length > 50) {
        throw new Error("Maximum 50 agents per workflow");
      }
      
      if (agentNodes.length === 0) {
        executionLogs.push({
          timestamp: new Date().toISOString(),
          type: "info",
          message: "No agents configured in workflow",
        });
      }

      // Execute each agent in sequence
      for (const node of agentNodes) {
        const agentId = node.agentId;
        const agentName = node.label || "Unknown Agent";
        
        executionLogs.push({
          timestamp: new Date().toISOString(),
          type: "start",
          agent: agentName,
          message: `Starting agent: ${agentName}`,
        });

        // Get agent configuration - RLS will enforce access
        const { data: agent, error: agentError } = await supabase
          .from("ai_profiles")
          .select("*")
          .eq("id", agentId)
          .single();

        if (agentError || !agent) {
          executionLogs.push({
            timestamp: new Date().toISOString(),
            type: "warning",
            agent: agentName,
            message: `Agent not found or access denied: ${agentId}`,
          });
          continue;
        }

        // Check agent lifecycle - is_active
        if (agent.is_active === false) {
          executionLogs.push({
            timestamp: new Date().toISOString(),
            type: "skipped",
            agent: agentName,
            message: `Agent is disabled (is_active=false)`,
          });
          continue;
        }

        // Check agent lifecycle - active_days (0=Sunday, 6=Saturday)
        const now = new Date();
        const currentDay = now.getUTCDay();
        const activeDays = agent.active_days || [0, 1, 2, 3, 4, 5, 6];
        
        if (!activeDays.includes(currentDay)) {
          executionLogs.push({
            timestamp: new Date().toISOString(),
            type: "skipped",
            agent: agentName,
            message: `Agent not active on day ${currentDay} (active days: ${activeDays.join(', ')})`,
          });
          continue;
        }

        // Check agent lifecycle - active time range
        if (agent.active_from || agent.active_until) {
          const currentTime = now.toISOString().slice(11, 19); // HH:MM:SS
          
          if (agent.active_from && currentTime < agent.active_from) {
            executionLogs.push({
              timestamp: new Date().toISOString(),
              type: "skipped",
              agent: agentName,
              message: `Agent not active yet (starts at ${agent.active_from}, current: ${currentTime})`,
            });
            continue;
          }
          
          if (agent.active_until && currentTime > agent.active_until) {
            executionLogs.push({
              timestamp: new Date().toISOString(),
              type: "skipped",
              agent: agentName,
              message: `Agent active period ended (ends at ${agent.active_until}, current: ${currentTime})`,
            });
            continue;
          }
        }

        // Call AI to execute agent task
        if (!LOVABLE_API_KEY) {
          executionLogs.push({
            timestamp: new Date().toISOString(),
            type: "error",
            agent: agentName,
            message: "LOVABLE_API_KEY not configured - cannot execute agent",
          });
          continue;
        }

        // Sanitize and limit input prompt
        const rawPrompt = inputData?.prompt || `Execute your role as ${agentName}. ${agent.role_description || ''}`;
        const prompt = String(rawPrompt).substring(0, 10000); // Limit prompt size
        
        let systemPrompt = agent.persona || "You are a helpful assistant.";
        if (agent.role_description) {
          systemPrompt += `\n\nRole: ${agent.role_description}`;
        }

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
              { role: "user", content: prompt },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content || "";
          
          outputData[agentId] = {
            agent: agentName,
            response: content,
          };

          executionLogs.push({
            timestamp: new Date().toISOString(),
            type: "complete",
            agent: agentName,
            message: `Agent completed successfully`,
            preview: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
          });
        } else {
          const errorText = await response.text();
          executionLogs.push({
            timestamp: new Date().toISOString(),
            type: "error",
            agent: agentName,
            message: `AI request failed: ${response.status}`,
          });
        }
        
        // Limit execution logs size
        if (executionLogs.length > 1000) {
          executionLogs.splice(0, executionLogs.length - 1000);
        }
      }

      // Update run as completed
      await supabase
        .from("workflow_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          execution_logs: executionLogs,
          output_data: outputData,
        })
        .eq("id", run.id);

      console.log(`Workflow run ${run.id} completed successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          runId: run.id,
          status: "completed",
          executionLogs,
          outputData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (execError) {
      // Update run as failed
      await supabase
        .from("workflow_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: execError instanceof Error ? execError.message : "Execution failed",
          execution_logs: executionLogs,
        })
        .eq("id", run.id);

      throw execError;
    }
  } catch (error) {
    console.error("Workflow execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Execution failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
