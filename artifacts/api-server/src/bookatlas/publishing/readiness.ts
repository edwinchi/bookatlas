import type { PublishingReadiness, PublishingReadinessCheck } from '@workspace/api-zod';
import { resolveSupabaseConfig } from '../db/config.js';

function configured(value?: string): boolean {
  return !!value?.trim() && !/^(YOUR_|MY_|your_.*_here)/.test(value.trim());
}

export function publishingReadiness(
  env: Record<string, string | undefined>,
  email: PublishingReadinessCheck[],
): PublishingReadiness {
  const ai = configured(env.GEMINI_API_KEY);
  const database = resolveSupabaseConfig(env).isConfigured;
  const storage = configured(env.PRIVATE_OBJECT_DIR);
  return {
    // Deliberately fail closed while the real durable pipeline is being built.
    // Supplying provider settings must never re-enable the old simulated endpoint.
    canPublish: false,
    summary: 'Publishing is unavailable. Provider setup and the real manuscript, EPUB, audio, and durable job pipeline must be completed before release.',
    checks: [
      {
        id: 'text-model', label: 'Text and document generation', state: ai ? 'configured' : 'missing',
        detail: ai
          ? 'A direct Gemini credential is configured. Model access and multimodal generation have not yet been verified.'
          : 'GEMINI_API_KEY is missing. No manuscript generation is available.',
      },
      {
        id: 'speech-model', label: 'Studio narration', state: ai ? 'configured' : 'missing',
        detail: ai
          ? 'Speech model and voice access still need verification. No studio audiobook has been generated.'
          : 'Direct speech-provider access is missing. Browser speech is not a generated studio audiobook.',
      },
      {
        id: 'database', label: 'Supabase persistence', state: database ? 'configured' : 'missing',
        detail: database
          ? 'Supabase settings are present. Publishing job schema, durable writes, and recovery remain unverified.'
          : 'Existing Supabase connection settings are missing. In-memory records cannot provide durable publishing.',
      },
      {
        id: 'storage', label: 'Private source and output storage', state: storage ? 'configured' : 'missing',
        detail: storage
          ? 'Private App Storage is configured; asset writes and access control still need end-to-end verification.'
          : 'Private App Storage must be configured for uploads, EPUBs, and chapter audio.',
      },
      ...email,
      {
        id: 'pipeline', label: 'Real publishing pipeline', state: 'blocked',
        detail: 'The simulated ingest and send paths remain disabled. Source validation, complete-manuscript EPUB packaging, WAV validation, and budget reservation calculations passed unit checks. They are not yet connected to a durable job worker. AI extraction/generation, stored assets, narration, review, consent checks, and delivery still require implementation and end-to-end verification.',
      },
    ],
  };
}
