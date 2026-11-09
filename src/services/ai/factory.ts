import { AITeacherProvider } from './base.ts';
import { GeminiTeacherProvider } from './gemini.ts';

let activeProvider: AITeacherProvider | null = null;

/**
 * Factory pattern for retrieving the active AI Teacher Provider.
 * Defaults to Gemini, designed so OpenAI, Claude, or local models can be added seamlessly.
 */
export function getAITeacherProvider(providerType: string = 'gemini'): AITeacherProvider {
  if (!activeProvider || activeProvider.providerName !== providerType) {
    switch (providerType.toLowerCase()) {
      case 'gemini':
      default:
        activeProvider = new GeminiTeacherProvider();
        break;
    }
  }
  return activeProvider;
}
