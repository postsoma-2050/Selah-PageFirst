import { MemoryStoreSchema } from './types';
import { ActionType } from '../chat-orchestration/types';

export function retrieveRelevantMemory(
  store: MemoryStoreSchema,
  pageTitle: string,
  query: string,
  actionType?: ActionType
): string {
  // If memory system is globally disabled by user, return empty context
  if (store.profile.memoryEnabled === false) {
    return '';
  }

  const memorySnippets: string[] = [];

  // 1. Profile Memory (Tone & Guidelines apply to all responses)
  if (store.profile.preferredTone) {
    memorySnippets.push(`- Preferred Response Format/Tone: ${store.profile.preferredTone}`);
  }
  if (store.profile.customInstructions) {
    memorySnippets.push(`- User Custom Guidelines: ${store.profile.customInstructions}`);
  }

  // 2. STRICT BOUNDARY: Extract Facts & Summarize Page MUST NOT inject Topic/Task Memories!
  // This prevents fact pollution or summary bias.
  if (actionType === 'extract-facts' || actionType === 'summarize') {
    if (memorySnippets.length === 0) return '';
    return `=== USER RESPONSE PREFERENCES ===\n${memorySnippets.join('\n')}\n=== END PREFERENCES ===\n`;
  }

  // 3. Topic Memory Retrieval (Only for Insights and Q&A where background context adds value)
  const searchCorpus = `${pageTitle} ${query}`.toLowerCase();
  const matchedTopics = (store.topics || [])
    .filter(t => t.topic && searchCorpus.includes(t.topic.toLowerCase()))
    .slice(0, 2);

  if (matchedTopics.length > 0) {
    memorySnippets.push('- User Background Topic Context:');
    matchedTopics.forEach(t => {
      memorySnippets.push(`  * ${t.topic}: ${t.summary}`);
    });
  }

  // 4. Task Memory Retrieval (Only for Insights & Q&A)
  if (actionType === 'analyze-insights' || actionType === 'ask-document' || actionType === 'custom-query') {
    const activeTasks = (store.tasks || []).filter(t => t.status === 'active').slice(0, 1);
    if (activeTasks.length > 0) {
      memorySnippets.push('- Active User Research Goal:');
      activeTasks.forEach(t => {
        memorySnippets.push(`  * ${t.goalDescription}`);
      });
    }
  }

  if (memorySnippets.length === 0) return '';
  return `=== RELEVANT BACKGROUND CONTEXT & PREFERENCES ===\n${memorySnippets.join('\n')}\n=== END CONTEXT ===\n`;
}
