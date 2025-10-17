import { AsyncLocalStorage } from 'node:async_hooks';

export type LLMTraceContext = {
  projectSlug?: string;
  sessionId?: string;
  phase?: 'decompose' | 'single' | 'subtask' | 'repair' | string;
  subtaskId?: string;
};

const storage = new AsyncLocalStorage<LLMTraceContext>();

export function withTraceContext<T>(ctx: LLMTraceContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getTraceContext(): LLMTraceContext | undefined {
  return storage.getStore();
}

