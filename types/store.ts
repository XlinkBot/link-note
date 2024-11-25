export interface PromptConfigStore {
    id: string;
    model_provider: string;
    model_name: string;
    api_url: string;
    api_key: string;
    autocomplete_system_prompt: string;
    autocomplete_temperature: number;
    autocomplete_max_tokens: number;
    chat_system_prompt: string;
    chat_temperature: number;
    chat_max_tokens: number;
  }
  
  export interface ChatMessage {
    id: string;
    fileId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }
  
  export const DEFAULT_CONFIG: PromptConfigStore = {
    id: 'default',
    model_provider: 'openai',
    model_name: 'gpt-3.5-turbo',
    api_url: '',
    api_key: '',
    autocomplete_system_prompt: '',
    autocomplete_temperature: 0.7,
    autocomplete_max_tokens: 100,
    chat_system_prompt: '',
    chat_temperature: 0.7,
    chat_max_tokens: 1000
  };