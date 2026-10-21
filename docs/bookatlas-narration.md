# Bookatlas narration

## Curated studio voices

The default female voice is **Sulafat** (warm). The recommended male voice is
**Charon** (informative). Both use **Gemini 3.8 Flash TTS**, Google's documented
high-fidelity model for expressive, long-form narration. “Recommended” means
selected for Bookatlas's audiobook use case, not a universal quality ranking or
a claim that these new selections were auditioned during implementation.

Kore, Puck, Aoede, Fenrir, and Zephyr remain available as alternatives. Gender
and style labels follow Google's catalog, not inferred pitch changes. Existing
saved publishing jobs retain their original voice selection.

Source documentation:
- https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
- https://docs.cloud.google.com/text-to-speech/docs/gemini-tts

## Publishing

The publishing studio uses the same voice catalog as reader studio previews.
Voice-specific acting directions are sent separately from the script, with
instructions to preserve vocal identity, measured pacing, diction, and the exact
written text. Chapter narration remains within the publishing job's existing
approved budget. No previously generated audiobook is regenerated automatically.

## Reader studio previews

A studio preview narrates the explicitly displayed first 500 characters. It is
not a full audiobook. Each request needs a signed-in reader, an explicit paid-run
approval, and a US$0.10 request cap. The server reserves a conservative bound
before calling the model, stores a durable private request identity, and does
not silently repeat ambiguous requests or claim refunds for possibly billed work.

The browser plays actual generated WAV bytes using native audio controls. Failed
generation is an error, not a fabricated studio success. Replays of the same
saved clip do not require another model request. The provider reservation is not
an invoice total.

## Device speech is different

Device read-aloud and browser-based companion speech use the operating system's
available voices. Their names, languages, availability, and quality depend on
the browser and device. The browser speech API does not reliably disclose gender,
so device voices are not presented as guaranteed male/female Gemini voices.

Device speech must be labelled separately and explicitly chosen. It must never
silently replace real studio audio, and changing pitch is not a substitute for
selecting a real studio voice.

## Auto mode

Routine implementation choices can be made autonomously. Auto mode does not
authorize new spending, live campaigns, publishing, or database changes outside
their established approval boundaries. This implementation does not run paid
voice auditions or regenerate any existing audio automatically.
