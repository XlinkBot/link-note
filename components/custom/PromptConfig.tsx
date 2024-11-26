'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Settings2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getFileDB } from '@/lib/indexeddb'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


const fileDB = getFileDB()
interface PromptConfig {
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

const MODEL_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'yilightning', label: 'YiLightning' },
  { value: 'volces', label: '火山引擎' },
  { value: 'custom', label: '自定义' },
]

const MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
  anthropic: [
    { value: 'claude-2', label: 'Claude 2' },
    { value: 'claude-instant', label: 'Claude Instant' },
  ],
  yilightning: [
    { value: 'yi-lightning', label: 'Yi-Lightning' },
  ],
  volces: [
    { value: 'volces', label: '火山引擎' }
  ],
  custom: [
    { value: 'custom', label: '自定义模型' },
  ],
}

const API_BASE_URL = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  yilightning: 'https://api.lingyiwanwu.com/v1',
  volces: 'https://ark.cn-beijing.volces.com/api/v3',
}

const DEFAULT_CONFIG: PromptConfig = {
  id: 'default',
  model_provider: 'yilightning',
  model_name: 'yi-34b-chat',
  api_url: 'https://api.lingyiwanwu.com/v1',
  api_key: '',
  autocomplete_system_prompt: `你是一个专业的写作助手。请根据上下文和用户的选择，推测建议后续的文本
可用的上下文信息：
- {selection} - 用户选中的文本
- {context} - 当前文档的完整内容
- {reference} - 相关的参考文档

请注意：
1. 保持原文的风格和语气,不用复述原文的内容，直接补充后续内容，自然
2. 输出中不要包含提示词的内容
`,
  autocomplete_temperature: 0.7,
  autocomplete_max_tokens: 1000,
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
  chat_max_tokens: 2000
}

// 修改提示词变量定义
const PROMPT_VARIABLES = [
  { id: 'selection', label: 'Selection', description: '当前选中的文本内容' },
  { id: 'context', label: 'Context', description: '当前文档的完整内容' },
  { id: 'reference', label: 'Reference', description: '当前文档的所有引用内容' },
] as const;

export const PromptConfig = () => {
  const { toast } = useToast()
  const [config, setConfig] = useState<PromptConfig>(DEFAULT_CONFIG)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchConfig = async () => {
    try {
      const savedConfig = await fileDB.getConfig()
      if (savedConfig) {
        const newConfig = {
          ...savedConfig,
          autocomplete_system_prompt: savedConfig.autocomplete_system_prompt || DEFAULT_CONFIG.autocomplete_system_prompt,
          chat_system_prompt: savedConfig.chat_system_prompt || DEFAULT_CONFIG.chat_system_prompt,
        }
        setConfig(newConfig)
        
        if (newConfig.autocomplete_system_prompt !== savedConfig.autocomplete_system_prompt ||
            newConfig.chat_system_prompt !== savedConfig.chat_system_prompt) {
          await fileDB.saveConfig(newConfig)
        }
      } else {
        setConfig(DEFAULT_CONFIG)
        await fileDB.saveConfig(DEFAULT_CONFIG)
      }
    } catch (error) {
      console.error('Error fetching prompt config:', error)
      setConfig(DEFAULT_CONFIG)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    try {
      await fileDB.saveConfig(config)
      setIsOpen(false)
      toast({
        title: "配置已保存",
        description: "提示词配置已成功更新",
      })
    } catch (error) {
      console.error('Error saving prompt config:', error)
      toast({
        title: "保存失败",
        description: "保存配置时发生错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 修改变量插入函数
  const handleInsertVariable = (
    variableId: typeof PROMPT_VARIABLES[number]['id'],
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 获取当前光标位置
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    // 插入变量标记
    const newValue = value.substring(0, start) + 
      `{${variableId}}` + 
      value.substring(end);
    
    // 更新对应的提示词
    if (textarea.name === 'autocomplete_system_prompt') {
      setConfig(prev => ({
        ...prev,
        autocomplete_system_prompt: newValue
      }));
    } else if (textarea.name === 'chat_system_prompt') {
      setConfig(prev => ({
        ...prev,
        chat_system_prompt: newValue
      }));
    }

    // 设置新的光标位置并聚焦
    textarea.value = newValue;
    textarea.focus();
    const newCursorPos = start + variableId.length + 2;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  };

  // 创建 textarea 引用
  const autocompleteTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 创建变量标签组件
  const VariableTags = ({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement> }) => (
    <div className="flex flex-wrap gap-2 mb-2">
      {PROMPT_VARIABLES
        // 根据当前标签页过滤显示的变量
        .filter(variable => {
          const isChat = textareaRef.current?.name === 'chat_system_prompt';
          // 对话场景显示所有变量，自动补全场景只显示基础变量
          return isChat || !['query', 'messages'].includes(variable.id);
        })
        .map(variable => (
          <TooltipProvider key={variable.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 hover:bg-gray-100 transition-colors"
                  onClick={() => handleInsertVariable(variable.id, textareaRef)}
                >
                  {`{${variable.label}}`}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{variable.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
    </div>
  );

  return (
    <div className="p-4 border-t">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full hover:bg-gray-100 transition-colors">
            <Settings2 className="mr-2 h-4 w-4" />
            提示词配置
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>提示词配置</DialogTitle>
          </DialogHeader>
          
          <div className="h-[400px] overflow-y-auto">
            <Tabs defaultValue="model">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="model" className="hover:bg-gray-100 transition-colors">模型设置</TabsTrigger>
                <TabsTrigger value="autocomplete" className="hover:bg-gray-100 transition-colors">自动补全</TabsTrigger>
                <TabsTrigger value="chat" className="hover:bg-gray-100 transition-colors">对话</TabsTrigger>
              </TabsList>
              
              <TabsContent value="model" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>模型提供商</Label>
                    <Select
                      value={config.model_provider}
                      onValueChange={(value) => {
                        setConfig({
                          ...config,
                          model_provider: value,
                          model_name: MODELS[value as keyof typeof MODELS][0].value,
                          api_url: API_BASE_URL[value as keyof typeof API_BASE_URL] || ''
                        })
                      }}
                    >
                      <SelectTrigger className="hover:bg-gray-50 transition-colors">
                        <SelectValue placeholder="选择模型提供商" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_PROVIDERS.map(provider => (
                          <SelectItem 
                            key={provider.value} 
                            value={provider.value}
                            className="hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>模型</Label>
                    {config.model_provider === 'volces' ? (
                      <Input
                        value={config.model_name}
                        onChange={(e) => setConfig({
                          ...config,
                          model_name: e.target.value
                        })}
                        placeholder="输入模型名称，如 chatglm-4"
                        className="hover:border-gray-400 transition-colors"
                      />
                    ) : (
                      <Select
                        value={config.model_name}
                        onValueChange={(value) => setConfig({
                          ...config,
                          model_name: value
                        })}
                      >
                        <SelectTrigger className="hover:bg-gray-50 transition-colors">
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS[config.model_provider as keyof typeof MODELS].map(model => (
                            <SelectItem 
                              key={model.value} 
                              value={model.value}
                              className="hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>API 地址</Label>
                    <Input
                      value={config.api_url}
                      onChange={(e) => setConfig({
                        ...config,
                        api_url: e.target.value
                      })}
                      placeholder="输入 API 地址..."
                      className="hover:border-gray-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API 密钥</Label>
                    <Input
                      type="password"
                      value={config.api_key}
                      onChange={(e) => setConfig({
                        ...config,
                        api_key: e.target.value
                      })}
                      placeholder="输入 API 密钥..."
                      className="hover:border-gray-400 transition-colors"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="autocomplete" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>系统提示词</Label>
                    <div className="space-y-2">
                      <VariableTags textareaRef={autocompleteTextareaRef} />
                      <Textarea
                        ref={autocompleteTextareaRef}
                        name="autocomplete_system_prompt"
                        value={config.autocomplete_system_prompt}
                        onChange={(e) => setConfig({
                          ...config,
                          autocomplete_system_prompt: e.target.value
                        })}
                        placeholder="输入自动补全的系统提示词，可使用上方变量..."
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-gray-500">
                        提示：使用 {'{Selection}'} 表示选中文本，{'{Context}'} 表示全文，{'{Reference}'} 表示引用
                        {autocompleteTextareaRef.current?.name === 'chat_system_prompt' && 
                          <>，{'{Query}'} 表示当前问题，{'{Messages}'} 表示对话历史</>
                        }。
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>温度 ({config.autocomplete_temperature})</Label>
                    <Slider
                      value={[config.autocomplete_temperature]}
                      onValueChange={([value]) => setConfig({
                        ...config,
                        autocomplete_temperature: value
                      })}
                      max={1}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>最大令牌数</Label>
                    <Input
                      type="number"
                      value={config.autocomplete_max_tokens}
                      onChange={(e) => setConfig({
                        ...config,
                        autocomplete_max_tokens: parseInt(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="chat" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>系统提示词</Label>
                    <div className="space-y-2">
                      <VariableTags textareaRef={chatTextareaRef} />
                      <Textarea
                        ref={chatTextareaRef}
                        name="chat_system_prompt"
                        value={config.chat_system_prompt}
                        onChange={(e) => setConfig({
                          ...config,
                          chat_system_prompt: e.target.value
                        })}
                        placeholder="输入对话的系统提示词，可使用上方变量..."
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-gray-500">
                        提示：使用 {'{Selection}'} 表示选中文本，{'{Context}'} 表示全文，{'{Reference}'} 表示引用
                        {chatTextareaRef.current?.name === 'chat_system_prompt' && 
                          <>，{'{Query}'} 表示当前问题，{'{Messages}'} 表示对话历史</>
                        }。
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>温度 ({config.chat_temperature})</Label>
                    <Slider
                      value={[config.chat_temperature]}
                      onValueChange={([value]) => setConfig({
                        ...config,
                        chat_temperature: value
                      })}
                      max={1}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>最大令牌数</Label>
                    <Input
                      type="number"
                      value={config.chat_max_tokens}
                      onChange={(e) => setConfig({
                        ...config,
                        chat_max_tokens: parseInt(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              disabled={isSaving}
              className="hover:bg-gray-100 transition-colors"
            >
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="hover:bg-blue-600 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存配置'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 