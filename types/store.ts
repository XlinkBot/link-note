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
    model_provider: 'volces',
    model_name: 'chatglm-4',
    api_url: 'https://ark.cn-beijing.volces.com/api/v3',
    api_key: '',
    autocomplete_system_prompt: `你是一个专业的写作助手。请根据上下文和用户的选择，推测建议后续的文本
可用的上下文信息：
- {selection} - 用户选中的文本
- {context} - 当前文档的完整内容
- {reference} - 相关的参考文档

请注意：
1. 保持原文的风格和语气,不用复述原文的内容，直接补充后续内容，自然
2. 输出中不要包含提示词的内容`,
    autocomplete_temperature: 0.7,
    autocomplete_max_tokens: 150,
    chat_system_prompt: `你是一个专业的写作助手。请根据上下文和用户的问题提供帮助。
可用的上下文信息：
- {selection} - 用户选中的文本
- {context} - 当前文档的完整内容
- {reference} - 相关的参考文档

如果需要修改文本： 用quote标记,有意义的引用也用quote标记

请注意：
1. 基于文档内容回答问题
2. 提供具体的建议和解释
3. 可以引用文档中的相关内容
4. 保持友好和专业的语气`,
    chat_temperature: 0.7,
    chat_max_tokens: 1000
  };
