import { getFileDB } from './indexeddb';
import OpenAI from 'openai';

interface CompletionOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  provider?: string;
  messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  stream?: boolean;
}



/**
 * 获取 OpenAI 完成
 */
export async function getCompletions(
  prompt: string,
  options: CompletionOptions = {}
): Promise<string> {
  const fileDB = getFileDB();
  const config = await fileDB.getConfig();
  console.log('getCompletions', config)
  // 构建消息数组
  const messages = options.messages || [{ role: 'user' as const, content: prompt }];

  // 如果是火山引擎
  if (config.model_provider === 'volces') {
    try {
      const response = await fetch('/api/volces/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
        },
        body: JSON.stringify({
          model: config.model_name,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 1000,
          stream: false, // 非流式输出
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Error calling Volces API:', error);
      throw error;
    }
  } else {
    // OpenAI 处理逻辑
    const openai = new OpenAI({
      apiKey: config.api_key,
      baseURL: config.api_url,
      dangerouslyAllowBrowser: true,
    });

    try {
      const response = await openai.chat.completions.create({
        model: config.model_name,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 1000,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}

/**
 * 获取流式响应
 */
export async function getStreamingCompletion(
  prompt: string,
  options: CompletionOptions = {},
  onChunk?: (chunk: string) => void
) {
  const fileDB = getFileDB();
  const config = await fileDB.getConfig();

  console.log('getStreamingCompletion', config)
  
  // 构建消息数组
  const messages = options.messages || [{ role: 'user' as const, content: prompt }];
  
  // 如果是火山引擎
  if (config.model_provider === 'volces') {
    try {
      const response = await fetch('/api/volces/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
        },
        body: JSON.stringify({
          model: config.model_name,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 1000,
          stream: true, // 流式请求
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              if (data === '[DONE]') break;
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content;
              if (content) {
                onChunk?.(content);
              }
            } catch (e) {
              console.error('Error parsing SSE message:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calling Volces API:', error);
      throw error;
    }
  } else {
    // OpenAI 处理逻辑
    const openai = new OpenAI({
      apiKey: config.api_key,
      baseURL: config.api_url,
      dangerouslyAllowBrowser: true,
    });

    try {
      const stream = await openai.chat.completions.create({
        model: config.model_name,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 1000,
        stream: true,
      });

      let content = '';
      for await (const chunk of stream) {
        const chunkContent = chunk.choices[0]?.delta?.content || '';
        if (chunkContent) {
          content += chunkContent;
          onChunk?.(chunkContent);
        }
      }

      return content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}