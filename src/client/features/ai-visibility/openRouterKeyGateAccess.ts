/**
 * OpenRouter gates automatic brand research and prompt suggestions. DataForSEO
 * collection, prompt research, and manual topic entry work without it on
 * self-hosts; do not block those pages when generation is unavailable.
 */
export function bypassOpenRouterKeyGate(input: {
  hosted: boolean;
  openRouterConfigured: boolean;
  generationAvailable: boolean | undefined;
}): boolean {
  if (input.hosted || input.openRouterConfigured) return true;
  return input.generationAvailable === false;
}
