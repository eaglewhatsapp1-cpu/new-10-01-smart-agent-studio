import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption using Web Crypto API with AES-GCM
async function getEncryptionKey(): Promise<CryptoKey> {
  // Use a proper secret for encryption - stored in Supabase Secrets
  const encryptionSecret = Deno.env.get("API_KEY_ENCRYPTION_SECRET");
  
  if (!encryptionSecret || encryptionSecret.length < 32) {
    throw new Error("API_KEY_ENCRYPTION_SECRET not configured or too short (minimum 32 characters required)");
  }
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(encryptionSecret.slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  // Use a project-specific salt from secrets, or derive from the encryption secret
  const saltSecret = Deno.env.get("API_KEY_SALT") || encryptionSecret.slice(32, 64) || "secure-salt-value";
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(saltSecret),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptApiKey(encryptedBase64: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedBase64).split("").map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch {
    // If decryption fails, it might be a legacy plaintext key
    return encryptedBase64;
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { action, workspace_id, provider, api_key, display_name, key_id } = await req.json();

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabaseUser
      .from("team_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    // Also check if user is workspace creator
    const { data: workspace } = await supabaseUser
      .from("workspaces")
      .select("created_by")
      .eq("id", workspace_id)
      .single();

    const isOwner = workspace?.created_by === user.id;
    const isAdmin = membership?.role === "admin" || isOwner;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: "Only workspace admins can manage API keys" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "list": {
        // Return masked keys only - never expose the actual encrypted value to client
        const { data: keys, error } = await supabaseService
          .from("workspace_api_keys")
          .select("id, workspace_id, provider, display_name, is_active, created_at, updated_at, api_key_encrypted")
          .eq("workspace_id", workspace_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Decrypt and mask each key for display
        const maskedKeys = await Promise.all((keys || []).map(async (key) => {
          let maskedKey = "••••••••";
          try {
            const decrypted = await decryptApiKey(key.api_key_encrypted);
            maskedKey = maskApiKey(decrypted);
          } catch {
            maskedKey = maskApiKey(key.api_key_encrypted);
          }
          return {
            id: key.id,
            workspace_id: key.workspace_id,
            provider: key.provider,
            display_name: key.display_name,
            is_active: key.is_active,
            created_at: key.created_at,
            updated_at: key.updated_at,
            masked_key: maskedKey,
          };
        }));

        return new Response(
          JSON.stringify({ keys: maskedKeys }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        if (!provider || !api_key) {
          return new Response(
            JSON.stringify({ error: "Provider and API key are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Encrypt the API key before storing
        const encryptedKey = await encryptApiKey(api_key);

        const { data, error } = await supabaseService
          .from("workspace_api_keys")
          .upsert({
            workspace_id,
            provider,
            api_key_encrypted: encryptedKey,
            display_name: display_name || null,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: "workspace_id,provider" })
          .select("id, provider, display_name, is_active, created_at")
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ 
            success: true, 
            key: { ...data, masked_key: maskApiKey(api_key) }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!key_id || !api_key) {
          return new Response(
            JSON.stringify({ error: "Key ID and new API key are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Encrypt the new API key
        const encryptedKey = await encryptApiKey(api_key);

        const { error } = await supabaseService
          .from("workspace_api_keys")
          .update({
            api_key_encrypted: encryptedKey,
            display_name: display_name || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", key_id)
          .eq("workspace_id", workspace_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!key_id) {
          return new Response(
            JSON.stringify({ error: "Key ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseService
          .from("workspace_api_keys")
          .delete()
          .eq("id", key_id)
          .eq("workspace_id", workspace_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_for_use": {
        // This action is for internal use by other edge functions
        // Returns the decrypted key for making external API calls
        if (!provider) {
          return new Response(
            JSON.stringify({ error: "Provider is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: keyData, error } = await supabaseService
          .from("workspace_api_keys")
          .select("api_key_encrypted")
          .eq("workspace_id", workspace_id)
          .eq("provider", provider)
          .eq("is_active", true)
          .single();

        if (error || !keyData) {
          return new Response(
            JSON.stringify({ error: "API key not found or not active" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const decryptedKey = await decryptApiKey(keyData.api_key_encrypted);

        return new Response(
          JSON.stringify({ api_key: decryptedKey }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Error in manage-api-keys:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});