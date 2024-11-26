'use client'

import { openDB, IDBPDatabase } from 'idb';

import { BaseFileItem as FileStore } from '@/types/file';
import { PromptConfigStore, ChatMessage, DEFAULT_CONFIG } from '@/types/store';
const DB_NAME = 'linknote-files-db';
const DB_VERSION = 2;


class FileDatabase {
  private db: IDBPDatabase | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
    }
    this.initializeDefaultConfig();
  }

  private async initDB() {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION + 1, {
        upgrade(db: IDBPDatabase, oldVersion: number) {
          if (oldVersion < 1) {
            if (!db.objectStoreNames.contains('files')) {
              const store = db.createObjectStore('files', { keyPath: 'id' });
              store.createIndex('parent_id', 'parent_id');
            }
          }
          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains('config')) {
              db.createObjectStore('config', { keyPath: 'id' });
            }
          }
          if (!db.objectStoreNames.contains('chat_messages')) {
            const store = db.createObjectStore('chat_messages', { keyPath: 'id' });
            store.createIndex('fileId', 'fileId');
            store.createIndex('timestamp', 'timestamp');
          }
        },
      });
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  private async initializeDefaultConfig() {
    try {
      const db =  this.db;
      const config = await db?.get('config', 'default');
      if (!config) {
        await db?.put('config', DEFAULT_CONFIG);
        console.log('Default config initialized');
      }
    } catch (error) {
      console.error('Error initializing default config:', error);
    }
  }

  async listReferences(fileId: string): Promise<string[]> {
    const file = await this.getFile(fileId);
    return file?.file_references || [];
  }

  async updateReferences(fileId: string, references: string[]): Promise<void> {
    const db =  this.db;
    const file = await this.getFile(fileId);
    if (!file) throw new Error('File not found');

    await db?.put('files', {
      ...file,
      file_references: references,
      updated_at: new Date().toISOString()
    });
  }

  async listFiles(): Promise<FileStore[]> {
    const db =  this.db;
    const tx = db?.transaction('files', 'readonly');
    const store = tx?.objectStore('files');
    return store?.getAll() || [];
  }

  async getFile(id: string): Promise<FileStore | undefined> {
    const db =  this.db;
    return db?.get('files', id);
  }

  async createFile(file: FileStore): Promise<FileStore> {
    const db =  this.db;
    await db?.put('files', file);
    return file;
  }

  async updateFile(file: Partial<FileStore> & { id: string }): Promise<void> {
    const db =  this.db;
    const existingFile = await this.getFile(file.id);
    
    if (!existingFile) {
      await this.createFile({
        id: file.id,
        name: file.name || 'untitled.md',
        type: file.type || 'file',
        parent_id: file.parent_id || null,
        content: file.content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_references: file.file_references || [],
      } as FileStore);
      return;
    }
    
    await db?.put('files', {
      ...existingFile,
      ...file,
      updated_at: new Date().toISOString()
    });
  }

  async saveFile(file: Partial<FileStore> & { id: string }): Promise<void> {
    const db =  this.db;
    const existingFile = await this.getFile(file.id);
    
    if (!existingFile) {
      throw new Error('File not found');
    }
    
    const updatedFile = {
      ...existingFile,
      ...file,
      updated_at: new Date().toISOString()
    };
    
    await db?.put('files', updatedFile);
  }

  async deleteFile(id: string): Promise<void> {
    const db =  this.db;
    await db?.delete('files', id);
  }

  async getConfig(id: string = 'default'): Promise<PromptConfigStore> {
    const db =  this.db;
    const config = await db?.get('config', id);
    return config || DEFAULT_CONFIG;
  }

  async saveConfig(config: PromptConfigStore): Promise<void> {
    const db =  this.db;
    await db?.put('config', config);
  }

  async listChatMessages(fileId: string): Promise<ChatMessage[]> {
    const db =  this.db;
    const tx = db?.transaction('chat_messages', 'readonly');
    const store = tx?.objectStore('chat_messages');
    const index = store?.index('fileId');
    return index?.getAll(fileId) || [];
  }

  async addChatMessage(message: ChatMessage): Promise<void> {
    const db =  this.db;
    await db?.add('chat_messages', message);
  }

  async clearChatMessages(fileId: string): Promise<void> {
    const db =  this.db;
    const tx = db?.transaction('chat_messages', 'readwrite');
    const store = tx?.objectStore('chat_messages');
    const index = store?.index('fileId');
    const messages = await index?.getAllKeys(fileId) || [];
    for (const key of messages) {
      await store?.delete(key);
    }
  }
}

let fileDBInstance: FileDatabase | null = null;

export const getFileDB = () => {  
  if (!fileDBInstance) {
    fileDBInstance = new FileDatabase();
  }
  return fileDBInstance;
}; 