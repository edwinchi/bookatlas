import { randomUUID } from 'node:crypto';
import { GoogleGenAI, type GenerateContentParameters } from '@google/genai';
import { z } from 'zod';
import { STUDIO_SPEECH_MODEL, narrationDirection } from '@workspace/bookatlas-catalog/voices';
import { reserveBudget, tokenCostUpperBound } from './budget.js';
import { decodeBase64 } from './source.js';
import { decodeStudioWav, inspectWav, wrapPcm16LE } from './audio.js';
import { type Job, PublishingError, updateJob } from './jobs.js';

export const outlineSchema = z.object({
  description: z.string().min(20).max(3000),
  category: z.string().min(1).max(100),
  chapters: z.array(z.object({ title: z.string().min(1).max(180), purpose: z.string().min(10).max(1500) })).min(2).max(8),
});
export type Outline = z.infer<typeof outlineSchema>;

/** A provider request cannot run until its conservative reservation is durably checkpointed. */
export class Generator {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { timeout: 120_000 } });
  constructor(public job: Job) {}

  async checkpoint(data: Job['data'], stage: string) {
    this.job = await updateJob(this.job, {
      data, stage, lease_until: new Date(Date.now() + 10 * 60_000).toISOString(),
    }, true);
  }
  async request(parameters: GenerateContentParameters, speech = false) {
    if (this.job.data.pendingCall) throw new PublishingError('An interrupted provider call requires explicit Retry. Its reserved budget is retained.');
    const count = await this.ai.models.countTokens({ model: parameters.model, contents: parameters.contents });
    if (!Number.isSafeInteger(count.totalTokens) || count.totalTokens! > 100_000) {
      throw new PublishingError('The source exceeds the supported token limit; split it explicitly.');
    }
    const upperBound = tokenCostUpperBound(count.totalTokens! + 1024, parameters.config!.maxOutputTokens!, {
      // Conservative published 2027 standard rates, not lower promotional 2026 rates.
      inputMicrosPerMillionTokens: speech ? 1_000_000 : 1_500_000,
      outputMicrosPerMillionTokens: speech ? 18_000_000 : 7_500_000,
      safetyPercent: 50,
    });
    const attempt = randomUUID();
    const ledger = reserveBudget(this.job.data.ledger, attempt, upperBound);
    await this.checkpoint({ ...this.job.data, ledger, pendingCall: attempt }, this.job.stage);
    let response;
    try {
      response = await this.ai.models.generateContent(parameters);
    } catch (failure) {
      const status = typeof (failure as { status?: unknown })?.status === 'number'
        ? (failure as { status: number }).status : 0;
      await this.checkpoint({
        ...this.job.data,
        lastProviderFailure: { status, kind: status ? 'provider-http-error' : 'provider-network-or-timeout' },
      }, this.job.stage);
      throw new PublishingError(`The model provider request failed${status ? ` (HTTP ${status})` : ' or timed out'}. Its reservation is retained; no output or refund is claimed.`, 503);
    }
    const finishReason = response.candidates?.[0]?.finishReason ?? 'NO_CANDIDATE';
    await this.checkpoint({
      ...this.job.data,
      lastProviderResult: {
        finishReason, modelVersion: response.modelVersion,
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        thoughtTokens: response.usageMetadata?.thoughtsTokenCount,
      },
    }, this.job.stage);
    if (response.candidates?.[0]?.finishReason !== 'STOP') {
      throw new PublishingError(`The provider stopped with ${finishReason}. No partial output was marked complete.`);
    }
    return response;
  }
  async json(prompt: string, maxOutputTokens: number, inlineData?: { data: string; mimeType: string }) {
    const response = await this.request({
      model: 'gemini-3.7-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }, ...(inlineData ? [{ inlineData }] : [])] }],
      config: { responseMimeType: 'application/json', maxOutputTokens },
    });
    try { return JSON.parse(response.text ?? ''); }
    catch { throw new PublishingError('The provider returned invalid structured output. Review or retry within the remaining budget.'); }
  }
  async narration(text: string) {
    const words = text.match(/\S+/gu)?.length ?? 0;
    const response = await this.request({
      model: STUDIO_SPEECH_MODEL,
      contents: [{ role: 'user', parts: [{ text, speechMetadata: { style: narrationDirection(this.job.data.config.voice) } }] }],
      config: {
        responseModalities: ['AUDIO'],
        maxOutputTokens: Math.min(16_000, Math.ceil(words / 1.8 * 25) + 512),
        speechConfig: { voiceConfig: { voice: this.job.data.config.voice } },
      },
    }, true);
    const audio = response.candidates?.[0]?.content?.parts?.filter(part => part.inlineData?.data);
    if (audio?.length !== 1) throw new PublishingError('The speech provider did not return a single complete audio asset.');
    const inline = audio[0]!.inlineData!;
    // Gemini's documented PCM output is signed 16-bit little-endian at 24 kHz.
    if (/^audio\/L16;.*(?:rate=24000)/i.test(inline.mimeType ?? '') && /codec=pcm/i.test(inline.mimeType ?? '')) {
      const bytes = wrapPcm16LE(decodeBase64(inline.data!, 64 * 1024 * 1024), 24_000);
      return { bytes, ...inspectWav(bytes) };
    }
    return decodeStudioWav(inline.data!, inline.mimeType ?? '');
  }
}
