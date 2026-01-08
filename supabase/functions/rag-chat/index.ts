import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Citation {
  chunk_id: string;
  source_file: string;
  citation_text: string;
  confidence_score: number;
}

interface SelfRAGEvaluation {
  retrieval_decision: 'retrieve' | 'no_retrieve' | 'retrieve_more';
  relevance_check: { chunk_id: string; is_relevant: boolean; score: number }[];
  support_check: { claim: string; supported: boolean; sources: string[] }[];
  utility_check: { score: number; reasoning: string };
  hallucination_detected: boolean;
  hallucination_details: { claim: string; issue: string }[];
  confidence_score: number;
}

// Retrieve relevant chunks using the RAG retrieval function
async function retrieveContext(
  supabaseUrl: string,
  query: string,
  conversationId: string | null,
  folderIds: string[] | undefined
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
        conversation_id: conversationId,
        config: {
          top_k: 5,
          rerank_top_n: 3,
          use_query_expansion: true,
          use_hyde: true,
          use_reranking: true,
          use_multi_hop: false,
          folder_ids: folderIds
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.chunks || [];
    }
  } catch (error) {
    console.error("Context retrieval error:", error);
  }

  return [];
}

// Self-RAG: Decide if retrieval is needed
async function selfRAGRetrievalDecision(
  query: string,
  conversationHistory: any[]
): Promise<'retrieve' | 'no_retrieve'> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) return 'retrieve';

  try {
    const recentContext = conversationHistory.slice(-4).map(m => 
      `${m.role}: ${m.content.substring(0, 200)}`
    ).join('\n');

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
            content: `You are a Self-RAG retrieval decision maker. Decide if external knowledge retrieval is needed.
Respond with JSON: {"decision": "retrieve" or "no_retrieve", "reasoning": "brief explanation"}`
          },
          {
            role: "user",
            content: `Query: "${query}"\n\nRecent conversation:\n${recentContext}\n\nShould we retrieve external documents to answer this query?`
          }
        ],
        max_tokens: 200,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.decision === 'no_retrieve' ? 'no_retrieve' : 'retrieve';
      }
    }
  } catch (error) {
    console.error("Self-RAG decision error:", error);
  }

  return 'retrieve';
}

// Corrective RAG: Evaluate and filter retrieved chunks
async function correctiveRAGEvaluation(
  query: string,
  chunks: any[]
): Promise<{ filteredChunks: any[]; evaluation: any }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || chunks.length === 0) {
    return { filteredChunks: chunks, evaluation: null };
  }

  try {
    const chunkSummaries = chunks.map((c, i) => 
      `[${i}] Source: ${c.source_file}\nContent: ${c.content.substring(0, 400)}`
    ).join('\n\n');

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
            content: `You are a Corrective RAG evaluator. Assess the relevance and quality of retrieved documents.
Respond with JSON:
{
  "evaluations": [
    {"index": 0, "is_relevant": true/false, "confidence": 0.0-1.0, "reason": "brief reason"}
  ],
  "overall_quality": "high/medium/low/insufficient",
  "recommendation": "use_all/filter/retrieve_more/web_search"
}`
          },
          {
            role: "user",
            content: `Query: "${query}"\n\nRetrieved documents:\n${chunkSummaries}\n\nEvaluate each document's relevance.`
          }
        ],
        max_tokens: 800,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const evaluations = parsed.evaluations || [];
        
        // Filter chunks based on evaluation
        const filteredChunks = chunks.filter((_, i) => {
          const eval_ = evaluations.find((e: any) => e.index === i);
          return eval_?.is_relevant !== false && (eval_?.confidence || 0.5) >= 0.4;
        });

        return { 
          filteredChunks: filteredChunks.length > 0 ? filteredChunks : chunks.slice(0, 2),
          evaluation: parsed 
        };
      }
    }
  } catch (error) {
    console.error("Corrective RAG error:", error);
  }

  return { filteredChunks: chunks, evaluation: null };
}

// Generate response with citations
async function generateResponseWithCitations(
  query: string,
  chunks: any[],
  agentConfig: any,
  conversationHistory: any[]
): Promise<{ response: string; citations: Citation[]; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { 
      response: "AI service is not configured.", 
      citations: [], 
      confidence: 0 
    };
  }

  // Build context from chunks
  const context = chunks.map((c, i) => 
    `[Source ${i + 1}: ${c.source_file}]\n${c.content}`
  ).join('\n\n---\n\n');

  // Build system prompt
  let systemPrompt = `You are a helpful AI assistant with access to a knowledge base. 
Answer questions accurately based on the provided context.

IMPORTANT RULES:
1. Use the provided context to answer questions
2. When using information from the context, cite sources using [Source N] format
3. If the context doesn't contain enough information, say so clearly
4. Never make up information not in the context
5. Be concise but thorough`;

  if (agentConfig) {
    if (agentConfig.persona) systemPrompt = agentConfig.persona + "\n\n" + systemPrompt;
    if (agentConfig.role_description) systemPrompt += `\n\nRole: ${agentConfig.role_description}`;
  }

  if (context) {
    systemPrompt += `\n\n=== KNOWLEDGE BASE CONTEXT ===\n${context}\n=== END CONTEXT ===`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: "user", content: query }
  ];

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 2000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";
      
      // Extract citations from response
      const citations: Citation[] = [];
      const citationPattern = /\[Source (\d+)\]/g;
      let match;
      const citedIndices = new Set<number>();
      
      while ((match = citationPattern.exec(responseText)) !== null) {
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

      // Calculate confidence based on citations and context quality
      const confidence = citations.length > 0 
        ? Math.min(0.9, 0.5 + citations.length * 0.1 + (chunks[0]?.quality_score || 0) * 0.2)
        : 0.4;

      return { response: responseText, citations, confidence };
    }
  } catch (error) {
    console.error("Response generation error:", error);
  }

  return { 
    response: "I apologize, but I encountered an error generating a response.", 
    citations: [], 
    confidence: 0 
  };
}

// Hallucination detection
async function detectHallucinations(
  response: string,
  chunks: any[],
  query: string
): Promise<{ detected: boolean; details: { claim: string; issue: string }[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { detected: false, details: [] };
  }

  try {
    const context = chunks.map(c => c.content).join('\n\n');

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
            content: `You are a hallucination detector. Check if the response contains claims not supported by the source documents.
Respond with JSON:
{
  "hallucination_detected": true/false,
  "unsupported_claims": [{"claim": "the specific claim", "issue": "why it's not supported"}],
  "confidence": 0.0-1.0
}`
          },
          {
            role: "user",
            content: `Query: "${query}"

Source Documents:
${context.substring(0, 3000)}

Response to Check:
${response}

Identify any claims in the response that are not supported by the source documents.`
          }
        ],
        max_tokens: 500,
      }),
    });

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          detected: parsed.hallucination_detected || false,
          details: parsed.unsupported_claims || []
        };
      }
    }
  } catch (error) {
    console.error("Hallucination detection error:", error);
  }

  return { detected: false, details: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      messages, 
      agentConfig, 
      conversation_id,
      folder_ids,
      enable_self_rag = true,
      enable_corrective_rag = true,
      enable_hallucination_check = true,
      stream = false
    } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userMessage = messages[messages.length - 1]?.content || "";
    console.log(`RAG Chat: "${userMessage.substring(0, 50)}..."`);

    // Step 1: Self-RAG - Decide if retrieval is needed
    let retrievalDecision: 'retrieve' | 'no_retrieve' = 'retrieve';
    if (enable_self_rag) {
      retrievalDecision = await selfRAGRetrievalDecision(userMessage, messages.slice(0, -1));
      console.log(`Self-RAG decision: ${retrievalDecision}`);
    }

    let chunks: any[] = [];
    let correctiveEvaluation: any = null;

    if (retrievalDecision === 'retrieve') {
      // Step 2: Retrieve context
      chunks = await retrieveContext(supabaseUrl, userMessage, conversation_id, folder_ids);
      console.log(`Retrieved ${chunks.length} chunks`);

      // Step 3: Corrective RAG - Evaluate and filter chunks
      if (enable_corrective_rag && chunks.length > 0) {
        const { filteredChunks, evaluation } = await correctiveRAGEvaluation(userMessage, chunks);
        chunks = filteredChunks;
        correctiveEvaluation = evaluation;
        console.log(`Corrective RAG: ${chunks.length} chunks after filtering`);
      }
    }

    // Step 4: Generate response with citations
    const { response, citations, confidence } = await generateResponseWithCitations(
      userMessage,
      chunks,
      agentConfig,
      messages.slice(0, -1)
    );

    // Step 5: Hallucination detection
    let hallucinationCheck = { detected: false, details: [] as any[] };
    if (enable_hallucination_check && chunks.length > 0) {
      hallucinationCheck = await detectHallucinations(response, chunks, userMessage);
      if (hallucinationCheck.detected) {
        console.log(`Hallucination detected: ${hallucinationCheck.details.length} issues`);
      }
    }

    // Log self-evaluation
    await supabase.from('rag_self_evaluation').insert({
      conversation_id: conversation_id || null,
      query: userMessage,
      initial_response: response,
      retrieval_decision: retrievalDecision,
      relevance_check: correctiveEvaluation?.evaluations || [],
      support_check: [],
      utility_check: { score: confidence, reasoning: 'Auto-generated' },
      hallucination_detected: hallucinationCheck.detected,
      hallucination_details: hallucinationCheck.details,
      final_response: response,
      refinement_iterations: 0,
      confidence_score: confidence
    });

    // Store citations
    if (citations.length > 0 && conversation_id) {
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
    }

    // If streaming is requested, use the standard chat endpoint
    if (stream) {
      // For streaming, we'll return the context and let the client handle streaming
      return new Response(
        JSON.stringify({
          success: true,
          context_chunks: chunks,
          citations,
          confidence,
          hallucination_check: hallucinationCheck,
          use_streaming_endpoint: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response,
        citations,
        confidence,
        metadata: {
          retrieval_decision: retrievalDecision,
          chunks_used: chunks.length,
          corrective_evaluation: correctiveEvaluation?.overall_quality || 'n/a',
          hallucination_detected: hallucinationCheck.detected,
          hallucination_count: hallucinationCheck.details.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RAG Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Chat failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});