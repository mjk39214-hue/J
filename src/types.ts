export type MessageRole = 'user' | 'assistant';

export type AttachmentType = 'image' | 'video' | 'file';

export interface Attachment {
  type: AttachmentType;
  url: string; // Blob URL or base64
  name?: string;
  mimeType: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface UserSettings {
  systemPrompt?: string;
  isIncognito: boolean;
  responseStyle: 'concise' | 'balanced' | 'creative';
  subscription: 'free' | 'pro' | 'ultra';
  brainComplexity: 'standard' | 'advanced' | 'agi' | 'deepseek';
  memory: string[];
  activePersonaId: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}
