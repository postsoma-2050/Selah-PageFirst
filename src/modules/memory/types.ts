import { ChatMessage } from '../chat-orchestration/types';

export interface ProfileMemory {
  userRole?: string;
  preferredTone?: 'concise' | 'detailed' | 'bulleted' | 'casual';
  language?: string;
  customInstructions?: string;
  memoryEnabled?: boolean;
}

export interface TopicMemory {
  id: string;
  topic: string;
  summary: string;
  frequencyCount: number;
  lastUpdated: number;
}

export interface TaskMemory {
  id: string;
  goalDescription: string;
  status: 'active' | 'completed';
  relatedUrls: string[];
  createdTimestamp: number;
}

export interface SessionMemory {
  sessionId: string;
  url: string;
  pageTitle: string;
  chatSummary?: string;
  messages?: ChatMessage[];
  lastTimestamp: number;
}

export interface MemoryStoreSchema {
  profile: ProfileMemory;
  topics: TopicMemory[];
  tasks: TaskMemory[];
  sessions: SessionMemory[];
}
