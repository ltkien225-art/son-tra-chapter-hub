/** Optional model-specific thinking controls are intentionally omitted.
 * Keep the deployed model, server evidence gate and daily quota unchanged.
 * This removes a compatibility risk; it does not prove the cause of a live 400.
 */
export function legalGenerationConfig(maxOutputTokens: number) {
  return { temperature: 0, maxOutputTokens, responseMimeType: 'application/json' };
}

/** Never parse thoughts, safety-blocked output or a truncated JSON answer. */
export function legalResponseText(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const response = value as { promptFeedback?: { blockReason?: unknown }; candidates?: { finishReason?: unknown; content?: { parts?: { thought?: unknown; text?: unknown }[] } }[] };
  if (response.promptFeedback?.blockReason || !Array.isArray(response.candidates)) return null;
  const candidate = response.candidates[0];
  if (candidate?.finishReason !== 'STOP' || !Array.isArray(candidate.content?.parts)) return null;
  const text = candidate.content.parts.filter(p => p && p.thought !== true && typeof p.text === 'string').map(p => p.text).join('').trim();
  return text || null;
}
