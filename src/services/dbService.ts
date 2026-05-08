import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  writeBatch,
  where
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChatSession, Message, UserSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // --- Sessions ---
  async createSession(userId: string, session: Partial<ChatSession>) {
    const id = session.id || doc(collection(db, 'placeholder')).id;
    const path = `users/${userId}/sessions/${id}`;
    const data = {
      ...session,
      id,
      userId,
      createdAt: session.createdAt || Date.now(),
      updatedAt: session.updatedAt || Date.now(),
      title: session.title || 'New Session',
    };

    try {
      await setDoc(doc(db, path), data);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateSession(userId: string, sessionId: string, updates: Partial<ChatSession>) {
    const path = `users/${userId}/sessions/${sessionId}`;
    try {
      await updateDoc(doc(db, path), {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteSession(userId: string, sessionId: string) {
    const path = `users/${userId}/sessions/${sessionId}`;
    try {
      // Note: This doesn't delete subcollection messages automatically in Firestore REST/Client.
      // Usually you'd use a Cloud Function or manually delete.
      // For this app, we'll just delete the session doc.
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeSessions(userId: string, onUpdate: (sessions: ChatSession[]) => void) {
    const path = `users/${userId}/sessions`;
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as ChatSession);
      onUpdate(sessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // --- Messages ---
  async addMessage(userId: string, sessionId: string, message: Message) {
    const messageId = message.id || doc(collection(db, 'placeholder')).id;
    const path = `users/${userId}/sessions/${sessionId}/messages/${messageId}`;
    try {
      await setDoc(doc(db, path), {
        ...message,
        id: messageId,
        timestamp: message.timestamp || Date.now()
      });
      // Update session's updatedAt
      await this.updateSession(userId, sessionId, { updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateMessage(userId: string, sessionId: string, messageId: string, content: string) {
    const path = `users/${userId}/sessions/${sessionId}/messages/${messageId}`;
    try {
      await updateDoc(doc(db, path), { 
        content,
        timestamp: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeMessages(userId: string, sessionId: string, onUpdate: (messages: Message[]) => void) {
    const path = `users/${userId}/sessions/${sessionId}/messages`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => doc.data() as Message);
      onUpdate(messages);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // --- Settings ---
  async saveSettings(userId: string, settings: UserSettings) {
    const path = `users/${userId}/config/settings`;
    try {
      await setDoc(doc(db, path), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeSettings(userId: string, onUpdate: (settings: UserSettings) => void) {
    const path = `users/${userId}/config/settings`;
    return onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as UserSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }
};
