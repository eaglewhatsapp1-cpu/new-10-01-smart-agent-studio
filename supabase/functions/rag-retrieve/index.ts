import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetrievalConfig {
  top_k: number;
  rerank_top_n: number;
  use_query_expansion: boolean;
  use_hyde: boolean;
  use_reranking: boolean;
  use_multi_hop: boolean;
  max_hop_depth: number;
  confidence_threshold: number;
  folder_ids?: string[];
}

interface RetrievedChunk {
  id: string;
  content: string;
  source_file: string;
  relevance_score: number;
  chunk_index: number;
  document_context: string | null;
  key_concepts: string[];
  semantic_tags: string[];
  quality_score: number;
}

interface QueryExpansion {
  original: string;
  expanded: string[];
  hypothetical_answer: string | null;
  subqueries: string[];
  intent: string;
  entities: { name: string; type: string }[];
}

// Expand query using LLM
async function expandQuery(query: string): Promise<QueryExpansion> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const expansion: QueryExpansion = {
    original: query,
    expanded: [query],
    hypothetical_answer: null,
    subqueries: [],
    intent: "informational",
    entities: []
  };

  if (!LOVABLE_API_KEY) return expansion;

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
            content: `You are a query expansion expert for RAG systems. Analyze the query and generate expansions.
Respond with valid JSON:
{
  "expanded_queries": ["rephrased query 1", "rephrased query 2"],
  "hypothetical_answer": "A brief hypothetical answer that would satisfy this query (HyDE technique)",
  "subqueries": ["decomposed subquery 1", "decomposed subquery 2"],
  "intent": "informational|navigational|transactional|comparison",
  "entities": [{"name": "entity", "type": "TYPE"}]
}`
          },
          {
            role: "user",
            content: `Expand this search query for better retrieval:\n\n"${query}"`
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        expansion.expanded = [query, ...(parsed.expanded_queries || [])];
        expansion.hypothetical_answer = parsed.hypothetical_answer || null;
        expansion.subqueries = parsed.subqueries || [];
        expansion.intent = parsed.intent || "informational";
        expansion.entities = parsed.entities || [];
      }
    }
  } catch (error) {
    console.error("Query expansion error:", error);
  }

  return expansion;
}

// Keyword-based search (BM25-like scoring)
async function keywordSearch(
  supabase: any, 
  queries: string[], 
  folderIds: string[] | undefined,
  limit: number
): Promise<RetrievedChunk[]> {
  const results: Map<string, RetrievedChunk> = new Map();
  
  for (const query of queries) {
    // Extract keywords (simple tokenization)
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    if (keywords.length === 0) continue;

    // Build search query
    let queryBuilder = supabase
      .from('knowledge_chunks')
      .select('id, content, source_file, chunk_index, document_context, key_concepts, semantic_tags, quality_score')
      .limit(limit * 2);

    if (folderIds && folderIds.length > 0) {
      queryBuilder = queryBuilder.in('folder_id', folderIds);
    }

    // Use text search with OR for keywords
    const { data, error } = await queryBuilder.or(
      keywords.map(k => `content.ilike.%${k}%`).join(',')
    );

    if (error) {
      console.error("Keyword search error:", error);
      continue;
    }

    // Score results based on keyword matches
    for (const chunk of (data || [])) {
      const content = chunk.content.toLowerCase();
      let score = 0;
      
      for (const keyword of keywords) {
        const matches = (content.match(new RegExp(keyword, 'gi')) || []).length;
        score += matches * (1 / Math.log(content.length + 1)); // TF-IDF-like scoring
      }
      
      // Boost by quality score
      score *= (0.5 + chunk.quality_score);

      const existing = results.get(chunk.id);
      if (!existing || existing.relevance_score < score) {
        results.set(chunk.id, {
          id: chunk.id,
          content: chunk.content,
          source_file: chunk.source_file,
          relevance_score: score,
          chunk_index: chunk.chunk_index,
          document_context: chunk.document_context,
          key_concepts: chunk.key_concepts || [],
          semantic_tags: chunk.semantic_tags || [],
          quality_score: chunk.quality_score || 0.5
        });
      }
    }
  }

  return Array.from(results.values())
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

// Semantic tag-based search
async function semanticTagSearch(
  supabase: any,
  queries: string[],
  entities: { name: string; type: string }[],
  folderIds: string[] | undefined,
  limit: number
): Promise<RetrievedChunk[]> {
  const results: Map<string, RetrievedChunk> = new Map();
  
  // Extract potential tags from queries
  const potentialTags = queries.flatMap(q => 
    q.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  );
  
  // Add entity names
  const entityNames = entities.map(e => e.name.toLowerCase());
  const searchTerms = [...new Set([...potentialTags, ...entityNames])];

  if (searchTerms.length === 0) return [];

  let queryBuilder = supabase
    .from('knowledge_chunks')
    .select('id, content, source_file, chunk_index, document_context, key_concepts, semantic_tags, quality_score')
    .limit(limit);

  if (folderIds && folderIds.length > 0) {
    queryBuilder = queryBuilder.in('folder_id', folderIds);
  }

  // Search by semantic tags overlap
  const { data, error } = await queryBuilder.overlaps('semantic_tags', searchTerms);

  if (error) {
    console.error("Semantic tag search error:", error);
    return [];
  }

  for (const chunk of (data || [])) {
    const tagOverlap = (chunk.semantic_tags || []).filter((t: string) => 
      searchTerms.some(st => t.toLowerCase().includes(st))
    ).length;
    
    const score = tagOverlap * 0.3 + chunk.quality_score * 0.2;
    
    results.set(chunk.id, {
      id: chunk.id,
      content: chunk.content,
      source_file: chunk.source_file,
      relevance_score: score,
      chunk_index: chunk.chunk_index,
      document_context: chunk.document_context,
      key_concepts: chunk.key_concepts || [],
      semantic_tags: chunk.semantic_tags || [],
      quality_score: chunk.quality_score || 0.5
    });
  }

  return Array.from(results.values())
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

// Knowledge graph traversal for related chunks
async function graphSearch(
  supabase: any,
  entities: { name: string; type: string }[],
  limit: number
): Promise<RetrievedChunk[]> {
  if (entities.length === 0) return [];

  const entityNames = entities.map(e => e.name);
  
  // Find related entities via knowledge graph
  const { data: graphData, error: graphError } = await supabase
    .from('rag_knowledge_graph')
    .select('chunk_id, source_entity, target_entity, confidence')
    .or(`source_entity.in.(${entityNames.join(',')}),target_entity.in.(${entityNames.join(',')})`)
    .limit(50);

  if (graphError || !graphData || graphData.length === 0) {
    return [];
  }

  // Get unique chunk IDs
  const chunkIds = [...new Set(graphData.map((g: any) => g.chunk_id).filter(Boolean))];
  
  if (chunkIds.length === 0) return [];

  const { data: chunks, error: chunkError } = await supabase
    .from('knowledge_chunks')
    .select('id, content, source_file, chunk_index, document_context, key_concepts, semantic_tags, quality_score')
    .in('id', chunkIds)
    .limit(limit);

  if (chunkError) return [];

  return (chunks || []).map((chunk: any) => ({
    id: chunk.id,
    content: chunk.content,
    source_file: chunk.source_file,
    relevance_score: 0.5, // Base score for graph-retrieved chunks
    chunk_index: chunk.chunk_index,
    document_context: chunk.document_context,
    key_concepts: chunk.key_concepts || [],
    semantic_tags: chunk.semantic_tags || [],
    quality_score: chunk.quality_score || 0.5
  }));
}

// Hybrid search combining multiple strategies
async function hybridSearch(
  supabase: any,
  queryExpansion: QueryExpansion,
  config: RetrievalConfig
): Promise<RetrievedChunk[]> {
  const allQueries = [
    queryExpansion.original,
    ...queryExpansion.expanded,
    ...queryExpansion.subqueries
  ];

  // Add hypothetical answer for HyDE
  if (config.use_hyde && queryExpansion.hypothetical_answer) {
    allQueries.push(queryExpansion.hypothetical_answer);
  }

  // Parallel searches
  const [keywordResults, tagResults, graphResults] = await Promise.all([
    keywordSearch(supabase, allQueries, config.folder_ids, config.top_k * 2),
    semanticTagSearch(supabase, allQueries, queryExpansion.entities, config.folder_ids, config.top_k),
    graphSearch(supabase, queryExpansion.entities, config.top_k)
  ]);

  // Merge results with score fusion
  const merged: Map<string, RetrievedChunk> = new Map();

  const addWithBoost = (chunks: RetrievedChunk[], boost: number) => {
    for (const chunk of chunks) {
      const existing = merged.get(chunk.id);
      if (existing) {
        existing.relevance_score += chunk.relevance_score * boost;
      } else {
        merged.set(chunk.id, { ...chunk, relevance_score: chunk.relevance_score * boost });
      }
    }
  };

  addWithBoost(keywordResults, 1.0);  // Keyword has base weight
  addWithBoost(tagResults, 0.8);       // Semantic tags
  addWithBoost(graphResults, 0.6);     // Knowledge graph

  return Array.from(merged.values())
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, config.top_k);
}

// Rerank results using LLM
async function rerankResults(
  query: string,
  chunks: RetrievedChunk[],
  topN: number
): Promise<RetrievedChunk[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || chunks.length <= topN) {
    return chunks.slice(0, topN);
  }

  try {
    const chunkSummaries = chunks.slice(0, 10).map((c, i) => 
      `[${i}] ${c.content.substring(0, 300)}...`
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
            content: `You are a relevance ranking expert. Rank document passages by relevance to a query.
Respond with JSON: {"rankings": [0, 3, 1, ...]} where numbers are the original indices ordered by relevance (most relevant first).
Only include the top ${topN} most relevant passages.`
          },
          {
            role: "user",
            content: `Query: "${query}"\n\nPassages:\n${chunkSummaries}\n\nRank these passages by relevance to the query.`
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
        const rankings = parsed.rankings || [];
        
        const reranked: RetrievedChunk[] = [];
        for (let i = 0; i < Math.min(rankings.length, topN); i++) {
          const idx = rankings[i];
          if (typeof idx === 'number' && idx >= 0 && idx < chunks.length) {
            const chunk = chunks[idx];
            reranked.push({
              ...chunk,
              relevance_score: chunk.relevance_score + (topN - i) * 0.1 // Boost by rank
            });
          }
        }
        
        if (reranked.length > 0) {
          return reranked;
        }
      }
    }
  } catch (error) {
    console.error("Reranking error:", error);
  }

  return chunks.slice(0, topN);
}

// Multi-hop retrieval for complex queries
async function multiHopRetrieval(
  supabase: any,
  query: string,
  initialChunks: RetrievedChunk[],
  maxDepth: number,
  config: RetrievalConfig
): Promise<RetrievedChunk[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || maxDepth <= 0) {
    return initialChunks;
  }

  let allChunks = [...initialChunks];
  let currentChunks = initialChunks;

  for (let hop = 0; hop < maxDepth; hop++) {
    // Generate follow-up queries based on current context
    const context = currentChunks.map(c => c.content.substring(0, 200)).join('\n');
    
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
              content: `You are a research assistant. Based on the query and current context, generate follow-up queries to find additional relevant information.
Respond with JSON: {"follow_up_queries": ["query1", "query2"], "needs_more_info": true/false}`
            },
            {
              role: "user",
              content: `Original query: "${query}"\n\nCurrent context:\n${context}\n\nGenerate follow-up queries if more information is needed.`
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
          const parsed = JSON.parse(jsonMatch[0]);
          
          if (!parsed.needs_more_info) break;
          
          const followUpQueries = parsed.follow_up_queries || [];
          if (followUpQueries.length === 0) break;

          // Search for follow-up queries
          const followUpExpansion: QueryExpansion = {
            original: followUpQueries[0],
            expanded: followUpQueries,
            hypothetical_answer: null,
            subqueries: [],
            intent: "informational",
            entities: []
          };

          const newChunks = await hybridSearch(supabase, followUpExpansion, {
            ...config,
            top_k: 3
          });

          // Add new chunks that aren't duplicates
          const existingIds = new Set(allChunks.map(c => c.id));
          const uniqueNew = newChunks.filter(c => !existingIds.has(c.id));
          
          if (uniqueNew.length === 0) break;
          
          allChunks = [...allChunks, ...uniqueNew];
          currentChunks = uniqueNew;
        }
      }
    } catch (error) {
      console.error("Multi-hop error:", error);
      break;
    }
  }

  return allChunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      conversation_id,
      config: userConfig 
    } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Default config
    const config: RetrievalConfig = {
      top_k: userConfig?.top_k || 5,
      rerank_top_n: userConfig?.rerank_top_n || 3,
      use_query_expansion: userConfig?.use_query_expansion !== false,
      use_hyde: userConfig?.use_hyde !== false,
      use_reranking: userConfig?.use_reranking !== false,
      use_multi_hop: userConfig?.use_multi_hop || false,
      max_hop_depth: userConfig?.max_hop_depth || 2,
      confidence_threshold: userConfig?.confidence_threshold || 0.3,
      folder_ids: userConfig?.folder_ids
    };

    console.log(`RAG Retrieval: "${query.substring(0, 50)}..." with config:`, config);

    // Step 1: Query Expansion
    let queryExpansion: QueryExpansion;
    if (config.use_query_expansion) {
      queryExpansion = await expandQuery(query);
      console.log(`Query expanded: ${queryExpansion.expanded.length} variants, ${queryExpansion.subqueries.length} subqueries`);
      
      // Log query expansion
      await supabase.from('rag_query_expansions').insert({
        original_query: query,
        expanded_queries: queryExpansion.expanded,
        hypothetical_answers: queryExpansion.hypothetical_answer ? [queryExpansion.hypothetical_answer] : [],
        decomposed_subqueries: queryExpansion.subqueries,
        query_intent: queryExpansion.intent,
        detected_entities: queryExpansion.entities,
        expansion_method: 'llm'
      });
    } else {
      queryExpansion = {
        original: query,
        expanded: [query],
        hypothetical_answer: null,
        subqueries: [],
        intent: "informational",
        entities: []
      };
    }

    // Step 2: Hybrid Search
    let retrievedChunks = await hybridSearch(supabase, queryExpansion, config);
    console.log(`Hybrid search returned ${retrievedChunks.length} chunks`);

    // Step 3: Reranking
    if (config.use_reranking && retrievedChunks.length > config.rerank_top_n) {
      retrievedChunks = await rerankResults(query, retrievedChunks, config.rerank_top_n);
      console.log(`Reranked to top ${retrievedChunks.length} chunks`);
    }

    // Step 4: Multi-hop Retrieval (if enabled)
    if (config.use_multi_hop && retrievedChunks.length > 0) {
      retrievedChunks = await multiHopRetrieval(
        supabase, 
        query, 
        retrievedChunks, 
        config.max_hop_depth,
        config
      );
      console.log(`Multi-hop expanded to ${retrievedChunks.length} chunks`);
    }

    // Filter by confidence threshold
    retrievedChunks = retrievedChunks.filter(c => c.relevance_score >= config.confidence_threshold);

    const searchLatency = Date.now() - startTime;

    // Log retrieval
    await supabase.from('rag_retrieval_logs').insert({
      conversation_id: conversation_id || null,
      query,
      expanded_query: queryExpansion.expanded.join(' | '),
      retrieval_strategy: 'hybrid',
      chunks_retrieved: retrievedChunks.map(c => ({ id: c.id, score: c.relevance_score })),
      reranked_chunks: config.use_reranking ? retrievedChunks.map(c => ({ id: c.id, score: c.relevance_score })) : [],
      relevance_scores: Object.fromEntries(retrievedChunks.map(c => [c.id, c.relevance_score])),
      search_latency_ms: searchLatency
    });

    console.log(`RAG Retrieval complete in ${searchLatency}ms: ${retrievedChunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks: retrievedChunks,
        query_expansion: {
          original: queryExpansion.original,
          expanded_count: queryExpansion.expanded.length,
          intent: queryExpansion.intent,
          entities: queryExpansion.entities
        },
        metadata: {
          total_retrieved: retrievedChunks.length,
          search_latency_ms: searchLatency,
          strategies_used: ['keyword', 'semantic_tags', 'knowledge_graph'],
          reranked: config.use_reranking,
          multi_hop: config.use_multi_hop
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RAG Retrieval error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Retrieval failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});