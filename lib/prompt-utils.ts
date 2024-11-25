import { fileDB } from './indexeddb';

interface PromptVariables {
  selection?: string;   // 选中的文本
  context?: string;     // 全文内容
  reference?: string[]; // 引用内容
}

interface ProcessedPrompt {
  prompt: string;       // 处理后的提示词
  temperature: number;  // 温度
  maxTokens: number;    // 最大令牌数
}

// 提示词类型
export type PromptType = 'autocomplete' | 'chat';

/**
 * 处理提示词中的变量
 */
const replaceVariables = (template: string, variables: PromptVariables): string => {
  let result = template;

  // 替换选中文本变量
  if (variables.selection !== undefined) {
    result = result.replace(/\{selection\}/gi, variables.selection);
  }

  // 替换全文变量
  if (variables.context !== undefined) {
    result = result.replace(/\{context\}/gi, variables.context);
  }

  // 替换引用变量
  if (variables.reference !== undefined) {
    const referencesText = variables.reference.join('\n\n');
    result = result.replace(/\{reference\}/gi, referencesText);
  }

  return result;
};

/**
 * 生成提示词
 */
export const generatePrompt = async (
  type: PromptType,
  variables: PromptVariables
): Promise<ProcessedPrompt> => {
  // 获取配置
  const config = await fileDB.getConfig();

  // 根据类型选择相应的配置
  const promptConfig = type === 'autocomplete' 
    ? {
        template: config.autocomplete_system_prompt,
        temperature: config.autocomplete_temperature,
        maxTokens: config.autocomplete_max_tokens,
      }
    : {
        template: config.chat_system_prompt,
        temperature: config.chat_temperature,
        maxTokens: config.chat_max_tokens,
      };

  // 处理提示词中的变量
  const processedPrompt = replaceVariables(promptConfig.template, variables);

  return {
    prompt: processedPrompt,
    temperature: promptConfig.temperature,
    maxTokens: promptConfig.maxTokens,
  };
};

/**
 * 验证提示词模板
 */
export const validatePromptTemplate = (template: string): string[] => {
  const variables: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1].toLowerCase());
  }

  return variables;
};

// 辅助函数：获取文件的引用内容
export const getFileReferences = async (fileId: string): Promise<string[]> => {
  try {
    const refs = await fileDB.listReferences(fileId);
    const refContents = await Promise.all(
      refs.map(async (refId) => {
        const file = await fileDB.getFile(refId);
        return file?.content || '';
      })
    );
    return refContents.filter(content => content !== '');
  } catch (error) {
    console.error('Error getting file references:', error);
    return [];
  }
};

// 辅助函数：构建完整的变量对象
export const buildPromptVariables = async (
  fileId: string,
  content: string,
  selection?: string,
): Promise<PromptVariables> => {
  // 只获取引用内容
  const references = await getFileReferences(fileId);

  return {
    selection,
    context: content,
    reference: references,
  };
}; 