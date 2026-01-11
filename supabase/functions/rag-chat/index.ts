import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// AGENTIC RAG 2.0 - Advanced AI Features Implementation
// Features: ReAct Pattern, Adaptive Retrieval, Agent Memory, Tool Calling, Re-work Loop
// =============================================================================

interface Citation {
  chunk_id: string;
  source_file: string;
  citation_text: string;
  confidence_score: number;
}

interface ReActStep {
  step_type: 'thought' | 'action' | 'observation' | 'answer';
  content: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  confidence?: number;
  latency_ms?: number;
}

interface AgentTool {
  name: string;
  display_name: string;
  description: string;
  tool_type: string;
  config: any;
}

interface ReworkSettings {
  enabled: boolean;
  max_retries: number;
  minimum_score_threshold: number;
  auto_correct: boolean;
}

interface ValidationScore {
  overall_score: number;
  structure_score: number;
  rules_score: number;
  issues: { type: string; severity: string; message: string }[];
  passed: boolean;
}

type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'conversational';

// =============================================================================
// QUERY COMPLEXITY ANALYZER - Adaptive Retrieval Strategy
// =============================================================================
async function analyzeQueryComplexity(
  query: string,
  conversationHistory: any[],
  supabase: any,
  userId: string | null = null
): Promise<{ complexity: QueryComplexity; strategy: string; reasoning: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  // Check cache first
  const queryHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(query.toLowerCase().trim())
  );
  const hashHex = Array.from(new Uint8Array(queryHash))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: cached } = await supabase
    .from('query_complexity_cache')
    .select('*')
    .eq('query_hash', hashHex)
    .single();

  if (cached) {
    return {
      complexity: cached.complexity as QueryComplexity,
      strategy: cached.recommended_strategy,
      reasoning: 'Cached analysis'
    };
  }

  if (!LOVABLE_API_KEY) {
    return { complexity: 'moderate', strategy: 'standard_rag', reasoning: 'Default fallback' };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a query complexity analyzer. Classify queries to determine the best retrieval strategy.

Respond with JSON:
{
  "complexity": "simple|moderate|complex|conversational",
  "strategy": "direct_answer|simple_lookup|standard_rag|multi_hop|agentic_full",
  "reasoning": "brief explanation",
  "indicators": {
    "requires_synthesis": true/false,
    "multi_document": true/false,
    "temporal_reasoning": true/false,
    "comparison_needed": true/false,
    "follow_up_question": true/false
  }
}

Classification guide:
- SIMPLE: Direct factual question, single document likely sufficient
- MODERATE: Needs multiple sources or some synthesis
- COMPLEX: Research-level, requires analysis, comparison, or multi-step reasoning
- CONVERSATIONAL: Follow-up question using context from conversation`
          },
          {
            role: "user",
            content: `Query: "${query}"
Conversation length: ${conversationHistory.length} messages
Last 2 messages context: ${conversationHistory.slice(-2).map(m => m.content?.substring(0, 100)).join(' | ')}`
          }
        ],
        max_tokens: 300,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Cache the result with user_id for RLS compliance
          await supabase.from('query_complexity_cache').insert({
            query_hash: hashHex,
            original_query: query.substring(0, 500),
            complexity: parsed.complexity,
            recommended_strategy: parsed.strategy,
            analysis_details: parsed.indicators || {},
            user_id: userId
          }).catch(() => {}); // Ignore cache errors

          return {
            complexity: parsed.complexity || 'moderate',
            strategy: parsed.strategy || 'standard_rag',
            reasoning: parsed.reasoning || ''
          };
        } catch (parseError) {
          console.error("Query complexity JSON parse error:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Query complexity analysis error:", error);
  }

  return { complexity: 'moderate', strategy: 'standard_rag', reasoning: 'Analysis failed, using default' };
}

// =============================================================================
// AGENT MEMORY SYSTEM - Long-term Learning
// =============================================================================
async function retrieveAgentMemory(
  userId: string,
  agentId: string | null,
  supabase: any
): Promise<any[]> {
  try {
    let query = supabase
      .from('agent_memory')
      .select('*')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('last_accessed', { ascending: false })
      .limit(10);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data } = await query;
    
    // Update access timestamps
    if (data && data.length > 0) {
      const ids = data.map((m: any) => m.id);
      await supabase
        .from('agent_memory')
        .update({ 
          last_accessed: new Date().toISOString(),
          access_count: supabase.raw('access_count + 1')
        })
        .in('id', ids);
    }

    return data || [];
  } catch (error) {
    console.error("Memory retrieval error:", error);
    return [];
  }
}

async function updateAgentMemory(
  userId: string,
  agentId: string | null,
  workspaceId: string | null,
  memoryType: string,
  memoryKey: string,
  memoryValue: any,
  conversationId: string | null,
  supabase: any
): Promise<void> {
  try {
    await supabase
      .from('agent_memory')
      .upsert({
        user_id: userId,
        agent_id: agentId,
        workspace_id: workspaceId,
        memory_type: memoryType,
        memory_key: memoryKey,
        memory_value: memoryValue,
        source_conversation_id: conversationId,
        confidence: 0.7,
        importance: 0.5
      }, {
        onConflict: 'user_id,agent_id,memory_key'
      });
  } catch (error) {
    console.error("Memory update error:", error);
  }
}

// =============================================================================
// TOOL IMPLEMENTATIONS - Agentic Capabilities
// =============================================================================
async function executeKnowledgeSearch(
  query: string,
  folderIds: string[] | undefined,
  supabaseUrl: string,
  topK: number = 5
): Promise<any[]> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/rag-retrieve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({
        query,
        config: {
          top_k: topK,
          rerank_top_n: Math.min(topK, 5),
          use_query_expansion: true,
          use_hyde: true,
          use_reranking: true,
          folder_ids: folderIds
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.chunks || [];
    }
  } catch (error) {
    console.error("Knowledge search error:", error);
  }
  return [];
}

async function executeSummarize(
  content: string,
  maxLength: number = 500
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return content.substring(0, maxLength);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Summarize the following content concisely in ${maxLength} characters or less. Preserve key facts and insights.` },
          { role: "user", content: content }
        ],
        max_tokens: 400,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || content.substring(0, maxLength);
    }
  } catch (error) {
    console.error("Summarize error:", error);
  }
  return content.substring(0, maxLength);
}

async function executeCalculate(expression: string): Promise<string> {
  try {
    // Safe evaluation for basic math
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return `Result: ${result}`;
  } catch (error) {
    return `Error: Unable to calculate "${expression}"`;
  }
}

async function executeCompare(
  chunks: any[],
  aspect: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || chunks.length < 2) return "Insufficient documents for comparison.";

  try {
    const docs = chunks.slice(0, 5).map((c, i) => 
      `Document ${i + 1} (${c.source_file}):\n${c.content.substring(0, 800)}`
    ).join('\n\n---\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a document comparison expert. Compare the provided documents and highlight similarities, differences, and key insights." },
          { role: "user", content: `Compare these documents${aspect ? ` focusing on: ${aspect}` : ''}:\n\n${docs}` }
        ],
        max_tokens: 800,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Comparison could not be completed.";
    }
  } catch (error) {
    console.error("Compare error:", error);
  }
  return "Comparison error occurred.";
}

// =============================================================================
// ReAct PATTERN - Reasoning and Acting Loop
// =============================================================================
async function executeReActLoop(
  query: string,
  tools: AgentTool[],
  folderIds: string[] | undefined,
  agentConfig: any,
  conversationHistory: any[],
  userMemory: any[],
  supabaseUrl: string,
  supabase: any,
  conversationId: string | null,
  maxSteps: number = 5
): Promise<{ steps: ReActStep[]; finalAnswer: string; chunks: any[]; citations: Citation[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { 
      steps: [], 
      finalAnswer: "AI service is not configured.", 
      chunks: [], 
      citations: [] 
    };
  }

  const steps: ReActStep[] = [];
  let allChunks: any[] = [];
  const citations: Citation[] = [];

  // Build tool descriptions for the agent
  const toolDescriptions = tools.map(t => 
    `- ${t.name}: ${t.description}`
  ).join('\n');

  // Build memory context
  const memoryContext = userMemory.length > 0
    ? `\n\nUser Memory (what you know about this user):\n${userMemory.map(m => 
        `- ${m.memory_type}: ${m.memory_key} = ${JSON.stringify(m.memory_value)}`
      ).join('\n')}`
    : '';

  // Build agent persona
  let agentPersona = "You are an intelligent AI agent with access to tools.";
  if (agentConfig?.persona) agentPersona = agentConfig.persona;
  if (agentConfig?.role_description) agentPersona += `\nRole: ${agentConfig.role_description}`;
  
  // Build response rules section
  let responseRulesSection = "";
  if (agentConfig?.response_rules) {
    const rules = agentConfig.response_rules;
    const rulesList: string[] = [];
    if (rules.step_by_step === true) {
      rulesList.push("Use step-by-step reasoning in your final answer");
    }
    if (rules.cite_if_possible === true) {
      rulesList.push("Cite sources using [Source N] format when using retrieved information");
    }
    if (rules.refuse_if_uncertain === true) {
      rulesList.push("Acknowledge limitations honestly when uncertain");
    }
    if (rulesList.length > 0) {
      responseRulesSection = `\n\n## Response Rules\n${rulesList.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    }
  }

  const systemPrompt = `${agentPersona}

You use the ReAct (Reasoning and Acting) pattern to answer questions thoroughly.

## Available Tools
${toolDescriptions}

## ReAct Format
For each step, respond with ONE of these formats:

THOUGHT: [Your reasoning about what to do next]
ACTION: [tool_name]
INPUT: [JSON input for the tool]

OR when you have enough information:

ANSWER: [Your final comprehensive answer]

## Rules
1. Always start with a THOUGHT about what information you need
2. Use tools to gather information before answering
3. After each tool result (OBSERVATION), think about what you learned
4. Cite sources using [Source N] format when using retrieved information
5. Maximum ${maxSteps} reasoning steps before you must provide an answer
6. If uncertain, acknowledge limitations honestly
${memoryContext}${responseRulesSection}`;

  let currentContext = `Question: ${query}`;
  
  // Add conversation context
  if (conversationHistory.length > 0) {
    const recentConvo = conversationHistory.slice(-4).map(m => 
      `${m.role}: ${m.content?.substring(0, 200) || ''}`
    ).join('\n');
    currentContext = `Recent conversation:\n${recentConvo}\n\nCurrent question: ${query}`;
  }

  for (let stepNum = 0; stepNum < maxSteps; stepNum++) {
    const stepStart = Date.now();

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: currentContext }
          ],
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        console.error("ReAct step failed:", await response.text());
        break;
      }

      const data = await response.json();
      const agentOutput = data.choices?.[0]?.message?.content || "";
      const latency = Date.now() - stepStart;

      // Parse agent output
      if (agentOutput.includes("ANSWER:")) {
        const answer = agentOutput.split("ANSWER:")[1]?.trim() || agentOutput;
        steps.push({
          step_type: 'answer',
          content: answer,
          latency_ms: latency
        });

        // Log reasoning step
        await logReasoningStep(supabase, conversationId, null, stepNum + 1, 'answer', answer, null, null, null, null, latency);

        return { steps, finalAnswer: answer, chunks: allChunks, citations };
      }

      // Parse THOUGHT
      const thoughtMatch = agentOutput.match(/THOUGHT:\s*([\s\S]*?)(?=ACTION:|ANSWER:|$)/i);
      if (thoughtMatch) {
        steps.push({
          step_type: 'thought',
          content: thoughtMatch[1].trim(),
          latency_ms: latency
        });
        await logReasoningStep(supabase, conversationId, null, stepNum + 1, 'thought', thoughtMatch[1].trim(), null, null, null, null, latency);
      }

      // Parse ACTION and INPUT
      const actionMatch = agentOutput.match(/ACTION:\s*(\w+)/i);
      const inputMatch = agentOutput.match(/INPUT:\s*([\s\S]*?)(?=THOUGHT:|ACTION:|ANSWER:|$)/i);

      if (actionMatch) {
        const toolName = actionMatch[1].toLowerCase();
        let toolInput: any = {};
        
        try {
          const inputStr = inputMatch?.[1]?.trim() || "{}";
          // Try to parse as JSON, or use as query string
          if (inputStr.startsWith('{')) {
            toolInput = JSON.parse(inputStr);
          } else {
            toolInput = { query: inputStr };
          }
        } catch {
          toolInput = { query: inputMatch?.[1]?.trim() || query };
        }

        steps.push({
          step_type: 'action',
          content: `Executing ${toolName}`,
          tool_name: toolName,
          tool_input: toolInput,
          latency_ms: latency
        });

        // Execute the tool
        const toolStart = Date.now();
        let toolOutput: any = null;

        switch (toolName) {
          case 'knowledge_search':
            const searchQuery = toolInput.query || query;
            const chunks = await executeKnowledgeSearch(searchQuery, folderIds, supabaseUrl, toolInput.top_k || 5);
            allChunks = [...allChunks, ...chunks];
            toolOutput = chunks.map((c: any, i: number) => ({
              index: i + 1,
              source: c.source_file,
              content: c.content.substring(0, 500),
              relevance: c.relevance_score || 0.5
            }));
            
            // Build citations
            chunks.forEach((c: any, i: number) => {
              citations.push({
                chunk_id: c.id,
                source_file: c.source_file,
                citation_text: c.content.substring(0, 200),
                confidence_score: c.relevance_score || 0.5
              });
            });
            break;

          case 'summarizer':
          case 'summarize':
            const summaryContent = toolInput.content || allChunks.map(c => c.content).join('\n\n');
            toolOutput = await executeSummarize(summaryContent, toolInput.max_length || 500);
            break;

          case 'calculator':
          case 'calculate':
            toolOutput = await executeCalculate(toolInput.expression || toolInput.query || '');
            break;

          case 'comparator':
          case 'compare':
            toolOutput = await executeCompare(allChunks, toolInput.aspect || '');
            break;

          case 'analyzer':
          case 'analyze':
            // Deep analysis uses more chunks and detailed prompting
            if (allChunks.length === 0) {
              allChunks = await executeKnowledgeSearch(query, folderIds, supabaseUrl, 10);
            }
            toolOutput = `Retrieved ${allChunks.length} documents for deep analysis. Key sources: ${allChunks.slice(0, 3).map(c => c.source_file).join(', ')}`;
            break;

          default:
            toolOutput = `Unknown tool: ${toolName}`;
        }

        const toolLatency = Date.now() - toolStart;

        // Add observation
        const observationContent = typeof toolOutput === 'string' 
          ? toolOutput 
          : JSON.stringify(toolOutput, null, 2).substring(0, 2000);

        steps.push({
          step_type: 'observation',
          content: observationContent,
          tool_name: toolName,
          tool_output: toolOutput,
          latency_ms: toolLatency
        });

        await logReasoningStep(supabase, conversationId, null, stepNum + 1, 'action', `Executed ${toolName}`, toolName, toolInput, toolOutput, null, toolLatency);

        // Update context for next iteration
        currentContext += `\n\nTHOUGHT: ${thoughtMatch?.[1]?.trim() || 'Gathering information'}\nACTION: ${toolName}\nOBSERVATION: ${observationContent}\n\nContinue reasoning:`;
      } else if (!thoughtMatch) {
        // No recognizable format, treat as final answer
        steps.push({
          step_type: 'answer',
          content: agentOutput,
          latency_ms: latency
        });
        return { steps, finalAnswer: agentOutput, chunks: allChunks, citations };
      }

    } catch (error) {
      console.error(`ReAct step ${stepNum + 1} error:`, error);
      break;
    }
  }

  // Max steps reached, generate final answer with gathered context
  const finalContext = allChunks.map((c, i) => 
    `[Source ${i + 1}: ${c.source_file}]\n${c.content}`
  ).join('\n\n---\n\n');

  try {
    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `${agentPersona}\n\nProvide a comprehensive answer based on the gathered information. Use [Source N] format to cite sources.` 
          },
          { 
            role: "user", 
            content: `Question: ${query}\n\nGathered Information:\n${finalContext.substring(0, 10000)}\n\nProvide a complete answer with citations.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (finalResponse.ok) {
      const data = await finalResponse.json();
      const answer = data.choices?.[0]?.message?.content || "Unable to generate response.";
      steps.push({ step_type: 'answer', content: answer });
      return { steps, finalAnswer: answer, chunks: allChunks, citations };
    }
  } catch (error) {
    console.error("Final answer generation error:", error);
  }

  return { 
    steps, 
    finalAnswer: "I gathered some information but couldn't formulate a complete answer. Please try rephrasing your question.", 
    chunks: allChunks, 
    citations 
  };
}

// =============================================================================
// LOGGING HELPERS
// =============================================================================
async function logReasoningStep(
  supabase: any,
  conversationId: string | null,
  messageId: string | null,
  stepNumber: number,
  stepType: string,
  content: string,
  toolName: string | null,
  toolInput: any,
  toolOutput: any,
  confidence: number | null,
  latencyMs: number
): Promise<void> {
  try {
    await supabase.from('agent_reasoning_logs').insert({
      conversation_id: conversationId,
      message_id: messageId,
      step_number: stepNumber,
      step_type: stepType,
      content: content.substring(0, 5000),
      tool_name: toolName,
      tool_input: toolInput,
      tool_output: typeof toolOutput === 'string' ? { result: toolOutput } : toolOutput,
      confidence: confidence,
      latency_ms: latencyMs
    });
  } catch (error) {
    console.error("Logging error:", error);
  }
}

async function updateStrategyMetrics(
  supabase: any,
  workspaceId: string | null,
  strategyName: string,
  complexity: QueryComplexity,
  success: boolean,
  latencyMs: number,
  confidence: number
): Promise<void> {
  try {
    // Upsert metrics
    const { data: existing } = await supabase
      .from('rag_strategy_metrics')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('strategy_name', strategyName)
      .eq('query_complexity', complexity)
      .single();

    if (existing) {
      const totalQueries = existing.total_queries + 1;
      const newAvgLatency = ((existing.avg_latency_ms || 0) * existing.total_queries + latencyMs) / totalQueries;
      const newAvgConfidence = ((existing.avg_confidence || 0) * existing.total_queries + confidence) / totalQueries;

      await supabase
        .from('rag_strategy_metrics')
        .update({
          total_queries: totalQueries,
          success_count: existing.success_count + (success ? 1 : 0),
          failure_count: existing.failure_count + (success ? 0 : 1),
          avg_latency_ms: newAvgLatency,
          avg_confidence: newAvgConfidence,
          last_used: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('rag_strategy_metrics').insert({
        workspace_id: workspaceId,
        strategy_name: strategyName,
        query_complexity: complexity,
        total_queries: 1,
        success_count: success ? 1 : 0,
        failure_count: success ? 0 : 1,
        avg_latency_ms: latencyMs,
        avg_confidence: confidence
      });
    }
  } catch (error) {
    console.error("Metrics update error:", error);
  }
}

// =============================================================================
// HALLUCINATION DETECTION (Enhanced)
// =============================================================================
async function detectHallucinations(
  response: string,
  chunks: any[],
  query: string
): Promise<{ detected: boolean; details: { claim: string; issue: string }[]; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || chunks.length === 0) {
    return { detected: false, details: [], confidence: 0.5 };
  }

  try {
    const context = chunks.slice(0, 5).map(c => c.content).join('\n\n');

    const checkResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a hallucination detector. Analyze if the response contains claims not supported by the provided sources.

Respond with JSON:
{
  "hallucination_detected": true/false,
  "unsupported_claims": [{"claim": "specific claim text", "issue": "why unsupported"}],
  "supported_claims_count": number,
  "confidence": 0.0-1.0
}`
          },
          {
            role: "user",
            content: `Query: "${query}"

Source Documents:
${context.substring(0, 4000)}

Response to Verify:
${response}

Check each factual claim in the response against the sources.`
          }
        ],
        max_tokens: 600,
      }),
    });

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            detected: parsed.hallucination_detected || false,
            details: parsed.unsupported_claims || [],
            confidence: parsed.confidence || 0.5
          };
        } catch (parseError) {
          console.error("Hallucination detection JSON parse error:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Hallucination detection error:", error);
  }

  return { detected: false, details: [], confidence: 0.5 };
}

// =============================================================================
// RESPONSE VALIDATION - Check template and rules compliance
// =============================================================================
function validateResponseCompliance(
  response: string,
  responseRules: any,
  customTemplate: string | null
): ValidationScore {
  const issues: { type: string; severity: string; message: string }[] = [];
  let structureScore = 100;
  let rulesScore = 100;
  
  // Check each enabled rule
  if (responseRules?.step_by_step === true) {
    const hasSteps = /step[\s-]*\d|^[\s]*\d+[.):]/im.test(response) || 
                     /^[\s]*[-•*]\s/m.test(response) ||
                     /first.*then|next.*after/i.test(response);
    if (!hasSteps) {
      issues.push({ type: 'rules', severity: 'warning', message: 'Missing step-by-step structure' });
      rulesScore -= 15;
    }
  }
  
  if (responseRules?.cite_if_possible === true) {
    const hasCitations = /\[Source\s*\d+\]/i.test(response) || /\[\d+\]/i.test(response);
    if (!hasCitations) {
      issues.push({ type: 'rules', severity: 'warning', message: 'Missing source citations' });
      rulesScore -= 15;
    }
  }
  
  if (responseRules?.include_confidence_scores === true) {
    const hasConfidence = /confidence[:\s]*\d+%?|(\d+%\s*confident)/i.test(response);
    if (!hasConfidence) {
      issues.push({ type: 'rules', severity: 'warning', message: 'Missing confidence score' });
      rulesScore -= 10;
    }
  }
  
  if (responseRules?.use_bullet_points === true) {
    const hasBullets = /^[\s]*[-•*]\s/m.test(response);
    if (!hasBullets) {
      issues.push({ type: 'rules', severity: 'info', message: 'Could use more bullet points' });
      rulesScore -= 5;
    }
  }
  
  if (responseRules?.summarize_at_end === true) {
    const hasSummary = /summary|to summarize|in conclusion|key takeaways/i.test(response);
    if (!hasSummary) {
      issues.push({ type: 'rules', severity: 'warning', message: 'Missing summary section' });
      rulesScore -= 10;
    }
  }
  
  // Check template compliance if custom template is provided
  if (customTemplate) {
    const templatePlaceholders = customTemplate.match(/\{[A-Z_]+\}/g) || [];
    const placeholderChecks: Record<string, RegExp> = {
      '{ANALYSIS}': /analysis|findings|based on/i,
      '{STEPS}': /step[\s-]*\d|^[\s]*\d+[.):]/im,
      '{SOURCES}': /\[Source\s*\d+\]|\[ref/i,
      '{CONFIDENCE}': /confidence[:\s]*\d+%?/i,
      '{SUMMARY}': /summary|conclusion/i,
      '{BULLETS}': /^[\s]*[-•*]\s/m,
    };
    
    let matchedPlaceholders = 0;
    for (const placeholder of templatePlaceholders) {
      const check = placeholderChecks[placeholder];
      if (check && check.test(response)) {
        matchedPlaceholders++;
      } else if (check) {
        structureScore -= 10;
        issues.push({ 
          type: 'structure', 
          severity: 'warning', 
          message: `Missing content for template placeholder: ${placeholder}` 
        });
      }
    }
    
    if (templatePlaceholders.length > 0) {
      structureScore = Math.max(0, (matchedPlaceholders / templatePlaceholders.length) * 100);
    }
  }
  
  const overallScore = Math.round((structureScore + rulesScore) / 2);
  
  return {
    overall_score: Math.max(0, Math.min(100, overallScore)),
    structure_score: Math.max(0, structureScore),
    rules_score: Math.max(0, rulesScore),
    issues,
    passed: overallScore >= 70
  };
}

// =============================================================================
// RE-WORK LOOP - Correct responses that don't meet quality threshold
// =============================================================================
async function reworkResponse(
  originalResponse: string,
  validationScore: ValidationScore,
  responseRules: any,
  customTemplate: string | null,
  systemPrompt: string,
  messages: any[],
  maxRetries: number
): Promise<{ response: string; attempts: number; finalScore: ValidationScore }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { response: originalResponse, attempts: 0, finalScore: validationScore };
  }
  
  let currentResponse = originalResponse;
  let currentScore = validationScore;
  let attempts = 0;
  
  while (attempts < maxRetries && !currentScore.passed) {
    attempts++;
    console.log(`Re-work attempt ${attempts}: Current score ${currentScore.overall_score}`);
    
    // Build correction prompt
    const issuesList = currentScore.issues.map(i => `- ${i.message}`).join('\n');
    const correctionInstructions = `
Your previous response scored ${currentScore.overall_score}/100 on template compliance.

Issues found:
${issuesList}

Please revise your response to fix these issues:
${currentScore.issues.map((issue, i) => `${i + 1}. ${issue.message}`).join('\n')}

${customTemplate ? `Follow this exact structure:\n${customTemplate}` : ''}

Requirements:
${responseRules?.step_by_step ? '- Use numbered steps or bullet points for clarity' : ''}
${responseRules?.cite_if_possible ? '- Include [Source N] citations for key facts' : ''}
${responseRules?.include_confidence_scores ? '- Add a confidence percentage (e.g., "Confidence: 85%")' : ''}
${responseRules?.use_bullet_points ? '- Use bullet points for key information' : ''}
${responseRules?.summarize_at_end ? '- End with a brief summary section' : ''}

Original response to improve:
${currentResponse}
`;

    try {
      const reworkRequest = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt + "\n\nIMPORTANT: You are correcting a previous response that didn't meet quality standards." },
            ...messages.slice(-4),
            { role: "user", content: correctionInstructions }
          ],
          max_tokens: 2500,
        }),
      });

      if (reworkRequest.ok) {
        const data = await reworkRequest.json();
        const newResponse = data.choices?.[0]?.message?.content || "";
        
        if (newResponse.length > 50) {
          currentResponse = newResponse;
          currentScore = validateResponseCompliance(newResponse, responseRules, customTemplate);
          console.log(`Re-work attempt ${attempts} new score: ${currentScore.overall_score}`);
        }
      }
    } catch (error) {
      console.error(`Re-work attempt ${attempts} error:`, error);
      break;
    }
  }
  
  return { response: currentResponse, attempts, finalScore: currentScore };
}

// =============================================================================
// MEMORY EXTRACTION - Learn from conversations
// =============================================================================
async function extractMemoryFromConversation(
  query: string,
  response: string,
  userId: string,
  agentId: string | null,
  workspaceId: string | null,
  conversationId: string | null,
  supabase: any
): Promise<void> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return;

  try {
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Extract any learnable facts about the user from this conversation exchange.

Respond with JSON:
{
  "memories": [
    {
      "type": "preference|fact|topic_interest|communication_style",
      "key": "short_identifier",
      "value": "the learned information"
    }
  ]
}

Only extract clear, useful information. Return empty array if nothing notable.`
          },
          {
            role: "user",
            content: `User asked: "${query.substring(0, 500)}"
Assistant responded: "${response.substring(0, 500)}"`
          }
        ],
        max_tokens: 300,
      }),
    });

    if (extractResponse.ok) {
      const data = await extractResponse.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const memories = parsed.memories || [];
          
          for (const mem of memories) {
            if (mem.key && mem.value) {
              await updateAgentMemory(
                userId, agentId, workspaceId,
                mem.type || 'fact',
                mem.key,
                mem.value,
                conversationId,
                supabase
              );
            }
          }
        } catch (parseError) {
          console.error("Memory extraction JSON parse error:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Memory extraction error:", error);
  }
}

// =============================================================================
// AGENT BEHAVIOR ANALYZER - For Future Output Style Decisions
// =============================================================================
function analyzeResponseBehavior(
  response: string,
  responseRules?: { step_by_step?: boolean; cite_if_possible?: boolean; refuse_if_uncertain?: boolean }
): {
  word_count: number;
  character_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  paragraph_count: number;
  has_bullet_points: boolean;
  has_numbered_list: boolean;
  has_citations: boolean;
  citation_count: number;
  has_headers: boolean;
  has_code_blocks: boolean;
  tone_indicators: {
    formal_score: number;
    uses_contractions: boolean;
    uses_first_person: boolean;
  };
  structure: 'concise' | 'balanced' | 'detailed';
  rules_applied: string[];
} {
  const words = response.split(/\s+/).filter(w => w.length > 0);
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  const wordCount = words.length;
  const characterCount = response.length;
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  
  // Detect formatting patterns
  const hasBulletPoints = /^[\s]*[-•*]\s/m.test(response);
  const hasNumberedList = /^[\s]*\d+[.)]\s/m.test(response);
  const hasCitations = /\[Source \d+\]/i.test(response);
  const citationMatches = response.match(/\[Source \d+\]/gi);
  const citationCount = citationMatches ? citationMatches.length : 0;
  const hasHeaders = /^#+\s|^[A-Z][A-Z\s]+:$/m.test(response);
  const hasCodeBlocks = /```[\s\S]*?```/.test(response);
  
  // Tone analysis
  const contractions = /(don't|won't|can't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|couldn't|shouldn't|I'm|you're|we're|they're|it's|that's|there's|here's|what's|who's|let's)/gi;
  const usesContractions = contractions.test(response);
  const usesFirstPerson = /\b(I|me|my|mine|we|us|our|ours)\b/i.test(response);
  
  // Formal score (0-1): higher = more formal
  let formalScore = 0.5;
  if (!usesContractions) formalScore += 0.2;
  if (!usesFirstPerson) formalScore += 0.1;
  if (hasHeaders) formalScore += 0.1;
  if (avgSentenceLength > 20) formalScore += 0.1;
  formalScore = Math.min(1, formalScore);
  
  // Determine structure category
  let structure: 'concise' | 'balanced' | 'detailed' = 'balanced';
  if (wordCount < 100) structure = 'concise';
  else if (wordCount > 300) structure = 'detailed';
  
  // Check which rules were applied
  const rulesApplied: string[] = [];
  if (responseRules?.step_by_step && (hasNumberedList || hasBulletPoints)) {
    rulesApplied.push('step_by_step');
  }
  if (responseRules?.cite_if_possible && hasCitations) {
    rulesApplied.push('cite_if_possible');
  }
  if (responseRules?.refuse_if_uncertain) {
    const uncertaintyPhrases = /I('m| am) not (sure|certain)|don't have enough|cannot (confirm|verify)|beyond my knowledge|uncertain/i;
    if (uncertaintyPhrases.test(response)) {
      rulesApplied.push('refuse_if_uncertain');
    }
  }
  
  return {
    word_count: wordCount,
    character_count: characterCount,
    sentence_count: sentenceCount,
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    paragraph_count: paragraphs.length,
    has_bullet_points: hasBulletPoints,
    has_numbered_list: hasNumberedList,
    has_citations: hasCitations,
    citation_count: citationCount,
    has_headers: hasHeaders,
    has_code_blocks: hasCodeBlocks,
    tone_indicators: {
      formal_score: Math.round(formalScore * 100) / 100,
      uses_contractions: usesContractions,
      uses_first_person: usesFirstPerson
    },
    structure,
    rules_applied: rulesApplied
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { 
      messages, 
      agentConfig, 
      conversation_id,
      folder_ids,
      workspace_id,
      user_id,
      enable_agentic = true,
      enable_memory = true,
      enable_hallucination_check = true,
      enable_adaptive_strategy = true,
      max_reasoning_steps = 5,
      stream = false,
      rework_settings,
      custom_response_template
    } = await req.json();
    
    // Parse rework settings with defaults
    const reworkConfig: ReworkSettings = rework_settings || {
      enabled: true,
      max_retries: 2,
      minimum_score_threshold: 70,
      auto_correct: true
    };
    
    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userMessage = messages[messages.length - 1]?.content || "";
    console.log(`Agentic RAG: "${userMessage.substring(0, 50)}..."`);

    // Step 1: Analyze query complexity for adaptive strategy
    let complexity: QueryComplexity = 'moderate';
    let strategy = 'standard_rag';
    
    if (enable_adaptive_strategy) {
      const analysis = await analyzeQueryComplexity(userMessage, messages.slice(0, -1), supabase, user_id);
      complexity = analysis.complexity;
      strategy = analysis.strategy;
      console.log(`Adaptive Strategy: ${complexity} -> ${strategy}`);
    }

    // Step 2: Retrieve agent memory
    let userMemory: any[] = [];
    if (enable_memory && user_id) {
      userMemory = await retrieveAgentMemory(user_id, agentConfig?.agent_id || null, supabase);
      console.log(`Retrieved ${userMemory.length} memory items`);
    }

    // Step 3: Get available tools
    const { data: tools } = await supabase
      .from('agent_tools')
      .select('*')
      .eq('is_active', true)
      .or(`workspace_id.is.null,workspace_id.eq.${workspace_id || 'null'}`);

    const agentTools: AgentTool[] = tools || [];

    // Step 4: Execute based on strategy
    let response = "";
    let citations: Citation[] = [];
    let chunks: any[] = [];
    let reasoningSteps: ReActStep[] = [];

    if (enable_agentic && (strategy === 'agentic_full' || complexity === 'complex')) {
      // Full Agentic RAG with ReAct
      console.log("Using Agentic RAG with ReAct pattern");
      const result = await executeReActLoop(
        userMessage,
        agentTools,
        folder_ids,
        agentConfig,
        messages.slice(0, -1),
        userMemory,
        supabaseUrl,
        supabase,
        conversation_id,
        max_reasoning_steps
      );
      response = result.finalAnswer;
      citations = result.citations;
      chunks = result.chunks;
      reasoningSteps = result.steps;
    } else {
      // Standard RAG for simpler queries
      console.log("Using Standard RAG");
      chunks = await executeKnowledgeSearch(userMessage, folder_ids, supabaseUrl, 5);
      
      // Build context and generate response
      const context = chunks.map((c, i) => 
        `[Source ${i + 1}: ${c.source_file}]\n${c.content}`
      ).join('\n\n---\n\n');

      let systemPrompt = agentConfig?.persona || "You are a helpful AI assistant.";
      if (agentConfig?.role_description) systemPrompt += `\nRole: ${agentConfig.role_description}`;
      
      // Apply response rules from agent configuration
      if (agentConfig?.response_rules) {
        const rules = agentConfig.response_rules;
        systemPrompt += `\n\n## RESPONSE RULES`;
        if (rules.step_by_step === true) {
          systemPrompt += `\n- Use step-by-step reasoning: Break down complex answers into clear, numbered steps`;
        }
        if (rules.cite_if_possible === true) {
          systemPrompt += `\n- Cite sources: Reference specific documents or knowledge using [Source N] format`;
        } else {
          systemPrompt += `\n- You may cite sources using [Source N] format when relevant`;
        }
        if (rules.refuse_if_uncertain === true) {
          systemPrompt += `\n- Refuse if uncertain: Acknowledge when you don't have enough information rather than guessing`;
        }
        if (rules.include_confidence_scores === true) {
          systemPrompt += `\n- Include confidence score: Add a confidence percentage (e.g., "Confidence: 85%") at the end of your response`;
        }
        if (rules.use_bullet_points === true) {
          systemPrompt += `\n- Use bullet points: Format key information as bullet points for easy scanning`;
        }
        if (rules.summarize_at_end === true) {
          systemPrompt += `\n- Summarize at end: Include a brief summary section at the end of your response`;
        }
      }
      
      // Apply custom response template if provided
      const templateToUse = custom_response_template || agentConfig?.response_rules?.custom_response_template;
      if (templateToUse) {
        systemPrompt += `\n\n## RESPONSE TEMPLATE\nStructure your response following this template:\n${templateToUse}`;
      }
      
      systemPrompt += `\n\nUse the provided context to answer questions.\n\n=== CONTEXT ===\n${context}\n=== END CONTEXT ===`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-6)
            ],
            max_tokens: 2000,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          response = data.choices?.[0]?.message?.content || "";
        }
      }

      // Extract citations
      const citationPattern = /\[Source (\d+)\]/g;
      let match;
      const citedIndices = new Set<number>();
      while ((match = citationPattern.exec(response)) !== null) {
        const idx = parseInt(match[1]) - 1;
        if (idx >= 0 && idx < chunks.length && !citedIndices.has(idx)) {
          citedIndices.add(idx);
          citations.push({
            chunk_id: chunks[idx].id,
            source_file: chunks[idx].source_file,
            citation_text: chunks[idx].content.substring(0, 200),
            confidence_score: chunks[idx].relevance_score || 0.5
          });
        }
      }
    }

    // Step 5: Response Validation and Re-work Loop
    let validationResult: ValidationScore = { overall_score: 100, structure_score: 100, rules_score: 100, issues: [], passed: true };
    let reworkAttempts = 0;
    
    if (response && agentConfig?.response_rules) {
      validationResult = validateResponseCompliance(
        response, 
        agentConfig.response_rules, 
        custom_response_template || agentConfig.response_rules.custom_response_template
      );
      console.log(`Initial validation score: ${validationResult.overall_score}`);
      
      // Apply re-work loop if enabled and score is below threshold
      if (reworkConfig.enabled && reworkConfig.auto_correct && !validationResult.passed) {
        console.log(`Starting re-work loop (threshold: ${reworkConfig.minimum_score_threshold})`);
        
        // Build a simplified system prompt for re-work
        let reworkSystemPrompt = agentConfig?.persona || "You are a helpful AI assistant.";
        if (agentConfig?.role_description) reworkSystemPrompt += `\nRole: ${agentConfig.role_description}`;
        
        const reworkResult = await reworkResponse(
          response,
          validationResult,
          agentConfig.response_rules,
          custom_response_template || agentConfig.response_rules.custom_response_template,
          reworkSystemPrompt,
          messages,
          reworkConfig.max_retries
        );
        
        response = reworkResult.response;
        reworkAttempts = reworkResult.attempts;
        validationResult = reworkResult.finalScore;
        console.log(`Re-work complete after ${reworkAttempts} attempts. Final score: ${validationResult.overall_score}`);
      }
    }

    // Step 6: Hallucination detection
    let hallucinationCheck = { detected: false, details: [] as any[], confidence: 0.5 };
    if (enable_hallucination_check && chunks.length > 0) {
      hallucinationCheck = await detectHallucinations(response, chunks, userMessage);
      if (hallucinationCheck.detected) {
        console.log(`Hallucination detected: ${hallucinationCheck.details.length} issues`);
      }
    }

    // Step 6: Update agent memory with learnings
    if (enable_memory && user_id && response) {
      extractMemoryFromConversation(
        userMessage, response, user_id,
        agentConfig?.agent_id || null,
        workspace_id || null,
        conversation_id,
        supabase
      ).catch(console.error); // Fire and forget
    }

    // Step 7: Log self-evaluation
    const confidence = citations.length > 0 
      ? Math.min(0.95, 0.5 + citations.length * 0.1)
      : 0.4;

    try {
      await supabase.from('rag_self_evaluation').insert({
        conversation_id: conversation_id || null,
        query: userMessage,
        initial_response: response,
        retrieval_decision: strategy === 'direct_answer' ? 'no_retrieve' : 'retrieve',
        relevance_check: [],
        support_check: [],
        utility_check: { score: confidence, reasoning: `Strategy: ${strategy}` },
        hallucination_detected: hallucinationCheck.detected,
        hallucination_details: hallucinationCheck.details,
        final_response: response,
        refinement_iterations: reasoningSteps.filter(s => s.step_type === 'thought').length,
        confidence_score: confidence
      });
    } catch (e) {
      console.error("Self evaluation log error:", e);
    }

    // Store citations
    if (citations.length > 0 && conversation_id) {
      try {
        await supabase.from('rag_citations').insert(
          citations.map(c => ({
            conversation_id,
            chunk_id: c.chunk_id,
            citation_text: c.citation_text,
            source_file: c.source_file,
            confidence_score: c.confidence_score,
            verified: false
          }))
        );
      } catch (e) {
        console.error("Citations log error:", e);
      }
    }

    // Step 8: Log agent behavior patterns for future Output Style analysis
    const behaviorMetrics = analyzeResponseBehavior(response, agentConfig?.response_rules);
    console.log(`Behavior Metrics: ${JSON.stringify(behaviorMetrics)}`);

    // Update strategy metrics
    const totalLatency = Date.now() - startTime;
    await updateStrategyMetrics(
      supabase, workspace_id || null, strategy, complexity,
      !hallucinationCheck.detected && response.length > 50,
      totalLatency, confidence
    ).catch(console.error);

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        response,
        citations,
        confidence,
        validation: {
          score: validationResult.overall_score,
          structure_score: validationResult.structure_score,
          rules_score: validationResult.rules_score,
          passed: validationResult.passed,
          issues: validationResult.issues,
          rework_attempts: reworkAttempts
        },
        metadata: {
          strategy_used: strategy,
          query_complexity: complexity,
          chunks_used: chunks.length,
          reasoning_steps: reasoningSteps.length,
          hallucination_detected: hallucinationCheck.detected,
          hallucination_count: hallucinationCheck.details.length,
          memory_items_used: userMemory.length,
          total_latency_ms: totalLatency,
          rework_enabled: reworkConfig.enabled,
          rework_threshold: reworkConfig.minimum_score_threshold
        },
        reasoning_trace: reasoningSteps.map(s => ({
          type: s.step_type,
          content: s.content.substring(0, 500),
          tool: s.tool_name
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agentic RAG error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
