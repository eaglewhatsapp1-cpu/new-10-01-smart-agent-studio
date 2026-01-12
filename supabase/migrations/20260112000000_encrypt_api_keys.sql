-- Enable pgsodium extension
CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA extensions;

-- Create encryption key in vault
INSERT INTO vault.secrets (name, secret) 
VALUES ('api_key_encryption_key', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (name) DO NOTHING;

-- Create encryption/decryption functions
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_text TEXT;
BEGIN
  -- Simple encryption for demonstration, in production use pgsodium properly
  -- This is a placeholder for the actual pgsodium logic
  RETURN encode(encrypt(plain_text::bytea, (SELECT secret::bytea FROM vault.secrets WHERE name = 'api_key_encryption_key'), 'aes'), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN convert_from(decrypt(decode(encrypted_text, 'base64'), (SELECT secret::bytea FROM vault.secrets WHERE name = 'api_key_encryption_key'), 'aes'), 'utf8');
EXCEPTION WHEN OTHERS THEN
  RETURN encrypted_text; -- Fallback for legacy keys
END;
$$;

CREATE OR REPLACE FUNCTION public.get_masked_api_key(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plain_text TEXT;
BEGIN
  plain_text := public.decrypt_api_key(encrypted_text);
  IF length(plain_text) <= 8 THEN
    RETURN '••••••••';
  END IF;
  RETURN left(plain_text, 4) || '••••••••' || right(plain_text, 4);
END;
$$;
