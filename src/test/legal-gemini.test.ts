import { describe, expect, it } from 'vitest';
import { legalGenerationConfig, legalResponseText } from '@/lib/legal-gemini';

const response = (parts: unknown[], finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { parts } }] });
describe('Gemini output boundary', () => {
  it('does not impose a zero thinking budget on an unknown provider model', () => {
    expect(legalGenerationConfig(1800)).not.toHaveProperty('thinkingConfig');
    expect(legalGenerationConfig(1800).responseMimeType).toBe('application/json');
  });
  it('parses final JSON without merging internal thought text into it', () => {
    expect(legalResponseText(response([{ thought: true, text: 'private reasoning, not JSON' }, { text: '{"claims":[]}' }]))).toBe('{"claims":[]}');
  });
  it.each(['MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER', ''])('never accepts partial or blocked output: %s', reason => {
    expect(legalResponseText(response([{ text: '{"supported":true}' }], reason))).toBeNull();
  });
  it('requires a completed candidate even if a body looks like a valid verdict', () => {
    expect(legalResponseText({ candidates: [{ content: { parts: [{ text: '{"supported":true}' }] } }] })).toBeNull();
  });
  it('does not accept a prompt-blocked candidate', () => {
    expect(legalResponseText({ ...response([{ text: '{"supported":true}' }]), promptFeedback: { blockReason: 'SAFETY' } })).toBeNull();
  });
  it.each([null, {}, { candidates: [] }, response([{ thought: true, text: 'not an answer' }])])('fails closed on missing final text', value => {
    expect(legalResponseText(value)).toBeNull();
  });
});
