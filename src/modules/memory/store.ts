import { MemoryStoreSchema, ProfileMemory, TopicMemory, TaskMemory, SessionMemory } from './types';

const STORAGE_KEY = 'pagefirst_memory_store';

const DEFAULT_MEMORY_STORE: MemoryStoreSchema = {
  profile: {
    preferredTone: 'concise',
    language: 'auto',
    memoryEnabled: true
  },
  topics: [],
  tasks: [],
  sessions: []
};

export class MemoryStore {
  async getStore(): Promise<MemoryStoreSchema> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data && data[STORAGE_KEY]) {
        return data[STORAGE_KEY];
      }
    }
    return DEFAULT_MEMORY_STORE;
  }

  async saveStore(store: MemoryStoreSchema): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: store });
    }
  }

  async updateProfile(profile: Partial<ProfileMemory>): Promise<void> {
    const store = await this.getStore();
    store.profile = { ...store.profile, ...profile };
    await this.saveStore(store);
  }

  async addTopic(topic: string, summary: string): Promise<void> {
    const store = await this.getStore();
    const existing = store.topics.find(t => t.topic.toLowerCase() === topic.toLowerCase());
    if (existing) {
      existing.summary = summary;
      existing.frequencyCount += 1;
      existing.lastUpdated = Date.now();
    } else {
      store.topics.push({
        id: `topic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        topic,
        summary,
        frequencyCount: 1,
        lastUpdated: Date.now()
      });
    }
    await this.saveStore(store);
  }

  async deleteTopic(id: string): Promise<void> {
    const store = await this.getStore();
    store.topics = store.topics.filter(t => t.id !== id);
    await this.saveStore(store);
  }

  async addTask(goalDescription: string, url: string): Promise<void> {
    const store = await this.getStore();
    store.tasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      goalDescription,
      status: 'active',
      relatedUrls: [url],
      createdTimestamp: Date.now()
    });
    await this.saveStore(store);
  }

  async deleteTask(id: string): Promise<void> {
    const store = await this.getStore();
    store.tasks = store.tasks.filter(t => t.id !== id);
    await this.saveStore(store);
  }

  async addOrUpdateSession(session: SessionMemory): Promise<void> {
    const store = await this.getStore();
    const idx = store.sessions.findIndex(s => s.sessionId === session.sessionId);
    if (idx >= 0) {
      store.sessions[idx] = session;
    } else {
      store.sessions.unshift(session);
      if (store.sessions.length > 20) {
        store.sessions = store.sessions.slice(0, 20);
      }
    }
    await this.saveStore(store);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const store = await this.getStore();
    store.sessions = store.sessions.filter(s => s.sessionId !== sessionId);
    await this.saveStore(store);
  }

  async clearAllMemory(): Promise<void> {
    const store = await this.getStore();
    store.topics = [];
    store.tasks = [];
    store.sessions = [];
    store.profile = {
      preferredTone: 'concise',
      language: 'auto',
      memoryEnabled: true
    };
    await this.saveStore(store);
  }
}
