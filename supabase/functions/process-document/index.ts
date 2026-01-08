import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChunkMetadata {
  chunk_index: number;
  total_chunks: number;
  document_summary: string;
  document_context: string;
  chunk_type: string;
  semantic_tags: string[];
  entities: object[];
  key_concepts: string[];
  quality_score: number;
  token_count: number;
  metadata: object;
}

interface DocumentAnalysis {
  summary: string;
  key_topics: string[];
  entities: { name: string; type: string }[];
  document_type: string;
  complexity_level: string;
}

// Analyze document to extract metadata using AI
async function analyzeDocument(content: string, fileName: string): Promise<DocumentAnalysis> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return {
      summary: `Document: ${fileName}`,
      key_topics: [],
      entities: [],
      document_type: "unknown",
      complexity_level: "medium"
    };
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
            content: `You are a document analysis expert. Analyze documents and extract structured metadata.
Always respond with valid JSON in this exact format:
{
  "summary": "2-3 sentence summary of the document",
  "key_topics": ["topic1", "topic2", "topic3"],
  "entities": [{"name": "entity name", "type": "PERSON|ORG|LOCATION|DATE|CONCEPT|PRODUCT"}],
  "document_type": "technical|legal|medical|business|educational|narrative|reference",
  "complexity_level": "simple|medium|complex|expert"
}`
          },
          {
            role: "user",
            content: `Analyze this document "${fileName}" and extract metadata:\n\n${content.substring(0, 8000)}`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || `Document: ${fileName}`,
          key_topics: parsed.key_topics || [],
          entities: parsed.entities || [],
          document_type: parsed.document_type || "unknown",
          complexity_level: parsed.complexity_level || "medium"
        };
      }
    }
  } catch (error) {
    console.error("Document analysis error:", error);
  }

  return {
    summary: `Document: ${fileName}`,
    key_topics: [],
    entities: [],
    document_type: "unknown",
    complexity_level: "medium"
  };
}

// Generate contextual description for a chunk
async function generateChunkContext(
  chunk: string, 
  documentSummary: string, 
  fileName: string,
  chunkIndex: number,
  totalChunks: number
): Promise<{ context: string; concepts: string[]; tags: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { context: "", concepts: [], tags: [] };
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
            content: `You are a RAG context engineer. Generate contextual metadata for document chunks.
Respond with valid JSON:
{
  "context": "1-2 sentence description of what this chunk is about in relation to the whole document",
  "concepts": ["key concept 1", "key concept 2"],
  "tags": ["semantic tag 1", "semantic tag 2"]
}`
          },
          {
            role: "user",
            content: `Document: "${fileName}"
Document Summary: ${documentSummary}
Chunk ${chunkIndex + 1} of ${totalChunks}:

${chunk.substring(0, 2000)}

Generate context and tags for this chunk.`
          }
        ],
        max_tokens: 500,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          context: parsed.context || "",
          concepts: parsed.concepts || [],
          tags: parsed.tags || []
        };
      }
    }
  } catch (error) {
    console.error("Chunk context generation error:", error);
  }

  return { context: "", concepts: [], tags: [] };
}

// Smart chunking with semantic boundaries
function smartChunk(content: string, targetSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  // Split by semantic boundaries: paragraphs, sections, sentences
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = "";
  let overlapBuffer = "";
  
  for (const para of paragraphs) {
    // If paragraph itself is too large, split by sentences
    if (para.length > targetSize) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > targetSize && currentChunk.length > 0) {
          chunks.push(overlapBuffer + currentChunk.trim());
          overlapBuffer = currentChunk.slice(-overlap);
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
        }
      }
    } else {
      if ((currentChunk + "\n\n" + para).length > targetSize && currentChunk.length > 0) {
        chunks.push(overlapBuffer + currentChunk.trim());
        overlapBuffer = currentChunk.slice(-overlap);
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(overlapBuffer + currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 50);
}

// Extract entities using simple NER patterns
function extractSimpleEntities(text: string): { name: string; type: string }[] {
  const entities: { name: string; type: string }[] = [];
  
  // Email patterns
  const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
  emails.forEach(e => entities.push({ name: e, type: "EMAIL" }));
  
  // URL patterns
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];
  urls.forEach(u => entities.push({ name: u, type: "URL" }));
  
  // Date patterns
  const dates = text.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi) || [];
  dates.forEach(d => entities.push({ name: d, type: "DATE" }));
  
  // Money patterns
  const money = text.match(/\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?)\b/gi) || [];
  money.forEach(m => entities.push({ name: m, type: "MONEY" }));
  
  // Percentage patterns
  const percentages = text.match(/\b\d+(?:\.\d+)?%/g) || [];
  percentages.forEach(p => entities.push({ name: p, type: "PERCENTAGE" }));
  
  return entities.slice(0, 20); // Limit entities
}

// Estimate token count (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Calculate quality score based on content characteristics
function calculateQualityScore(content: string): number {
  let score = 0.5; // Base score
  
  // Length bonus (prefer substantial chunks)
  if (content.length > 200) score += 0.1;
  if (content.length > 500) score += 0.1;
  
  // Structure bonus (has formatting)
  if (/\n/.test(content)) score += 0.05;
  if (/[•\-\*]/.test(content)) score += 0.05; // Has lists
  if (/\d+\./.test(content)) score += 0.05; // Has numbered items
  
  // Information density (has specific data)
  if (/\d/.test(content)) score += 0.05; // Has numbers
  if (/@|https?:\/\//.test(content)) score += 0.05; // Has references
  
  // Penalize low quality
  if (content.length < 100) score -= 0.2;
  if (/^[\s\n]*$/.test(content)) score = 0;
  
  return Math.max(0, Math.min(1, score));
}

// Extract text from PDF using AI
async function extractTextFromPDF(base64Content: string, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (LOVABLE_API_KEY) {
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
              content: "You are a document text extraction assistant. Extract ALL text content from the provided document. Preserve the structure, headings, paragraphs, lists, and tables as much as possible. Output only the extracted text, no commentary."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all text content from this PDF document named "${fileName}". Include all visible text, tables, and any text in images (OCR).`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64Content}`
                  }
                }
              ]
            }
          ],
          max_tokens: 16000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const extractedText = data.choices?.[0]?.message?.content;
        if (extractedText && extractedText.length > 50) {
          console.log(`Extracted ${extractedText.length} characters from PDF using AI OCR`);
          return extractedText;
        }
      }
    } catch (error) {
      console.error("PDF extraction error:", error);
    }
  }

  return `[PDF Document: ${fileName}]\nNote: This PDF has been uploaded. Text extraction attempted via AI OCR.`;
}

// Extract text from images using AI vision
async function extractTextFromImage(base64Content: string, mimeType: string, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return `[Image: ${fileName}]\nImage uploaded successfully. AI vision not configured for text extraction.`;
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
            content: "You are an image analysis and OCR assistant. Extract ALL visible text from images. Also describe any important visual elements, diagrams, charts, or infographics. Be thorough and accurate."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image "${fileName}" and extract all text content (OCR). Also describe any important visual elements, charts, diagrams, or infographics that contain information.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`
                }
              }
            ]
          }
        ],
        max_tokens: 8000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content;
      if (extractedText) {
        console.log(`Extracted ${extractedText.length} characters from image using AI vision`);
        return `[Image: ${fileName}]\n\n${extractedText}`;
      }
    }
  } catch (error) {
    console.error("Image extraction error:", error);
  }

  return `[Image: ${fileName}]\nImage uploaded. Text extraction attempted.`;
}

// Extract text from Office documents
async function extractTextFromOfficeDoc(base64Content: string, mimeType: string, fileName: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return `[Document: ${fileName}]\nDocument uploaded. Configure AI for full text extraction.`;
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
            content: "You are a document extraction assistant. Extract all text content from the provided document. Maintain structure including headings, paragraphs, lists, and tables. Output only the extracted content."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract all text content from this document: "${fileName}". Preserve the structure and formatting as much as possible.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`
                }
              }
            ]
          }
        ],
        max_tokens: 16000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content;
      if (extractedText && extractedText.length > 20) {
        console.log(`Extracted ${extractedText.length} characters from Office document`);
        return extractedText;
      }
    }
  } catch (error) {
    console.error("Office doc extraction error:", error);
  }

  return `[Document: ${fileName}]\nDocument uploaded and stored.`;
}

// Determine content type and extract text accordingly
async function extractContent(
  base64Content: string | null, 
  textContent: string | null,
  mimeType: string, 
  fileName: string
): Promise<string> {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  // Text-based files
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.log', '.ini', '.conf', '.sh', '.bat', '.sql', '.r', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
  if (textExtensions.includes(ext) || mimeType.startsWith('text/')) {
    if (textContent) {
      return textContent;
    }
  }

  if (base64Content) {
    // PDF files
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      return await extractTextFromPDF(base64Content, fileName);
    }

    // Image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg', '.ico'];
    if (imageExtensions.includes(ext) || mimeType.startsWith('image/')) {
      return await extractTextFromImage(base64Content, mimeType, fileName);
    }

    // Office documents
    const officeExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.odt', '.ods', '.odp', '.rtf'];
    if (officeExtensions.includes(ext)) {
      return await extractTextFromOfficeDoc(base64Content, mimeType, fileName);
    }

    // Audio files
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma'];
    if (audioExtensions.includes(ext) || mimeType.startsWith('audio/')) {
      return `[Audio File: ${fileName}]\nType: ${mimeType}\nAudio file has been uploaded and stored. Transcription available upon request.`;
    }

    // Video files
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv'];
    if (videoExtensions.includes(ext) || mimeType.startsWith('video/')) {
      return `[Video File: ${fileName}]\nType: ${mimeType}\nVideo file has been uploaded and stored.`;
    }

    // Archive files
    const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
    if (archiveExtensions.includes(ext)) {
      return `[Archive: ${fileName}]\nType: ${mimeType}\nArchive file has been uploaded and stored.`;
    }
  }

  if (textContent) {
    return textContent;
  }

  return `[File: ${fileName}]\nType: ${mimeType}\nFile has been uploaded and stored in the knowledge base.`;
}

// Build knowledge graph entries from entities
async function buildKnowledgeGraph(
  supabase: any,
  entities: { name: string; type: string }[],
  chunkId: string,
  documentContext: string
) {
  const graphEntries = [];
  
  // Create relationships between entities in the same chunk
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      graphEntries.push({
        source_entity: entities[i].name,
        source_type: entities[i].type,
        relationship: "co-occurs",
        target_entity: entities[j].name,
        target_type: entities[j].type,
        chunk_id: chunkId,
        confidence: 0.8,
        metadata: { context: documentContext }
      });
    }
  }
  
  if (graphEntries.length > 0) {
    await supabase.from("rag_knowledge_graph").insert(graphEntries);
  }
}

// Sanitize file name to prevent path traversal
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[.]{2,}/g, '') // Remove ..
    .replace(/[\\/]/g, '_') // Replace path separators
    .replace(/[^a-zA-Z0-9._\- ]/g, '_') // Only allow safe chars
    .substring(0, 255);
}

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

    // Check content length to prevent abuse
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50_000_000) {
      return new Response(
        JSON.stringify({ error: "Request too large (max 50MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const { fileName, folderId, content, base64Content, mimeType, enableContextual = true } = await req.json();
    
    // Validate required fields
    if (!fileName || typeof fileName !== 'string') {
      return new Response(
        JSON.stringify({ error: "fileName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(fileName);

    // Validate UUID format for folderId if provided
    if (folderId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(folderId)) {
        return new Response(
          JSON.stringify({ error: "Invalid folderId format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user has access to the folder - RLS will handle this
      const { data: folder, error: folderError } = await supabase
        .from("knowledge_folders")
        .select("id, workspace_id")
        .eq("id", folderId)
        .single();

      if (folderError || !folder) {
        console.error("Folder not found or access denied:", folderId);
        return new Response(
          JSON.stringify({ error: "Folder not found or access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Verified access to folder: ${folderId}`);
    }

    // Validate content size
    if (content && content.length > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "Content too large (max 10MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (base64Content && base64Content.length > 50_000_000) {
      return new Response(
        JSON.stringify({ error: "Base64 content too large (max 50MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing document: ${sanitizedFileName} (${mimeType || 'unknown type'}) with contextual=${enableContextual}`);

    // Extract content
    const extractedContent = await extractContent(
      base64Content || null,
      content || null,
      mimeType || 'application/octet-stream',
      sanitizedFileName
    );

    if (!extractedContent || extractedContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not extract content from file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate extracted content size
    if (extractedContent.length > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "Extracted content exceeds 10MB limit" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedContent.length} characters from ${sanitizedFileName}`);

    // Analyze document for metadata (contextual RAG)
    let documentAnalysis: DocumentAnalysis | null = null;
    if (enableContextual) {
      console.log("Analyzing document for contextual metadata...");
      documentAnalysis = await analyzeDocument(extractedContent, sanitizedFileName);
      console.log(`Document analysis complete: ${documentAnalysis.key_topics.length} topics, ${documentAnalysis.entities.length} entities`);
    }

    // Smart chunking with semantic boundaries
    const chunks = smartChunk(extractedContent, 1000, 200);
    console.log(`Created ${chunks.length} smart chunks from document`);

    // Process each chunk with contextual metadata
    const chunksToInsert = [];
    const knowledgeGraphBatch = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let chunkContext = { context: "", concepts: [] as string[], tags: [] as string[] };
      
      // Generate contextual metadata for each chunk
      if (enableContextual && documentAnalysis) {
        chunkContext = await generateChunkContext(
          chunk,
          documentAnalysis.summary,
          sanitizedFileName,
          i,
          chunks.length
        );
      }
      
      // Extract entities from chunk
      const chunkEntities = extractSimpleEntities(chunk);
      const allEntities = [
        ...chunkEntities,
        ...(documentAnalysis?.entities || []).filter(e => chunk.includes(e.name))
      ];

      // Build chunk record
      const chunkRecord = {
        source_file: sanitizedFileName,
        content: chunk.trim(),
        folder_id: folderId || null,
        chunk_index: i,
        total_chunks: chunks.length,
        document_summary: documentAnalysis?.summary || null,
        document_context: chunkContext.context || null,
        chunk_type: i === 0 ? 'intro' : (i === chunks.length - 1 ? 'conclusion' : 'content'),
        semantic_tags: [...(chunkContext.tags || []), ...(documentAnalysis?.key_topics?.slice(0, 3) || [])],
        entities: allEntities,
        key_concepts: chunkContext.concepts || [],
        quality_score: calculateQualityScore(chunk),
        token_count: estimateTokens(chunk),
        metadata: {
          document_type: documentAnalysis?.document_type || 'unknown',
          complexity_level: documentAnalysis?.complexity_level || 'medium',
          processing_version: '2.0',
          contextual_rag: enableContextual,
          uploaded_by: user.id
        }
      };

      chunksToInsert.push(chunkRecord);
    }

    // Insert chunks - RLS will validate folder access
    const { data: insertedChunks, error: insertError } = await supabase
      .from("knowledge_chunks")
      .insert(chunksToInsert)
      .select('id');

    if (insertError) {
      console.error("Error inserting chunks:", insertError);
      throw insertError;
    }

    // Build knowledge graph from entities
    if (enableContextual && insertedChunks) {
      for (let i = 0; i < insertedChunks.length; i++) {
        const chunkId = insertedChunks[i].id;
        const entities = chunksToInsert[i].entities;
        if (entities.length > 1) {
          await buildKnowledgeGraph(supabase, entities, chunkId, chunksToInsert[i].document_context || "");
        }
      }
    }

    console.log(`Successfully processed ${sanitizedFileName}: ${chunks.length} chunks with contextual metadata`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: chunks.length,
        contentLength: extractedContent.length,
        documentAnalysis: documentAnalysis ? {
          summary: documentAnalysis.summary,
          topics: documentAnalysis.key_topics,
          entityCount: documentAnalysis.entities.length,
          documentType: documentAnalysis.document_type
        } : null,
        message: `Document processed with advanced RAG: ${chunks.length} contextual chunks created`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Document processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
