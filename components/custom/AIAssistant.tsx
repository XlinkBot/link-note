'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, X, Copy } from "lucide-react"
import { EditorContent, Editor } from '@tiptap/react'
import { createMessageEditor } from '@/lib/utils'
import { getStreamingCompletion } from '@/lib/llm-client'
import { generatePrompt, buildPromptVariables } from '@/lib/prompt-utils'
import { getFileDB } from '@/lib/indexeddb'


const fileDB = getFileDB()

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  fileId: string
}

interface AIAssistantProps {
  id: string
  onClose: () => void
  selectedText: string
  onAIResponse: (response: string) => void
  context: {
    fileId: string
    fileName?: string
    content?: string
  }
  editor?: Editor
}

// 修改消息组件
const Message: React.FC<{
  content: string
  role: 'user' | 'assistant'
  editor?: Editor
  isStreaming?: boolean
}> = ({ content, role, editor, isStreaming }) => {
  const messageEditor = role === 'assistant' ? createMessageEditor({
    editable: false,
    onCopy: (text) => {
      if (editor) {
        editor.chain()
          .focus()
          .insertContent('\n' + text)
          .run()
      }
    }
  }) : null
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messageEditor && role === 'assistant') {
      messageEditor.commands.setContent(content)
    }
  }, [content, messageEditor, role])

  useEffect(() => {
    if (contentRef.current && role === 'assistant') {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [content, role])

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div 
        ref={contentRef}
        className={`
          max-w-[80%] 
          ${role === 'user' 
            ? 'bg-gray-100 px-4 py-2 rounded'
            : 'text-sm space-y-4'
          }
        `}
      >
        {role === 'user' ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="prose prose-sm max-w-none text-gray-600">
              <div className="relative [&_.ProseMirror]:!border-none [&_.ProseMirror]:!outline-none [&_.ProseMirror]:!p-0">
                <EditorContent editor={messageEditor} />
              </div>
            </div>
            {/* 底部复制按钮，仅在非流式输出时显示 */}
            {!isStreaming && content && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-gray-100 transition-colors text-gray-500"
                  onClick={() => {
                    if (editor) {
                      editor.chain()
                        .focus()
                        .insertContent('\n' + content)
                        .run()
                    }
                  }}
                  title="插入到编辑器"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  全部插入到编辑器
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onClose,
  selectedText,
  context,
  editor,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // 修改滚动逻辑，始终跟随 loading 图标
  const scrollToLoading = useCallback(() => {
    if (!loadingRef.current) return;
    
    loadingRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, []);

  // 在消息更新或加载状态变化时滚动
  useEffect(() => {
    scrollToLoading();
  }, [messages, isLoading, scrollToLoading]);

  // 加载聊天记录
  useEffect(() => {
    const loadMessages = async () => {
      if (!context.fileId) return
      const fileMessages = await fileDB?.listChatMessages(context.fileId)
      setMessages(fileMessages || [])
    }
    loadMessages()
  }, [context.fileId])

  // 修改刷新会话的处理函数
  const handleRefreshSession = async () => {
    if (!context.fileId || isLoading) return;
    
    try {
      // 清除数据库中的聊天记录
      await fileDB?.clearChatMessages(context.fileId);
      // 清除状态中的消息
      setMessages([]);
      // 清空输入框
      setInputValue('');
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading || !context.fileId) return;

    setIsLoading(true);
    try {
      // 创建用户消息
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: inputValue,
        timestamp: Date.now(),
        fileId: context.fileId
      };

      // 保存用户消息到 IndexedDB
      await fileDB?.addChatMessage(userMessage);
      setMessages(prev => [...prev, userMessage]);

      // 构建提示词变量
      const variables = await buildPromptVariables(
        context.fileId,
        context.content || '',
        selectedText,
      );

      // 生成系统提示词
      const { prompt: systemPrompt, temperature, maxTokens } = await generatePrompt('chat', variables);

      // 构建符合 OpenAI 格式的消息历史
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: inputValue }
      ];

      // 创建助手消息
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        fileId: context.fileId
      };

      let fullResponse = '';

      // 修改流式响应处理
      await getStreamingCompletion(
        systemPrompt,
        {
          temperature,
          max_tokens: maxTokens,
          messages: apiMessages as { role: 'user' | 'assistant' | 'system'; content: string }[]
        },
        async (chunk: string) => {
          fullResponse += chunk;
          
          // 只更新状态，不保存到数据库
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: fullResponse }
              ];
            }
            return prev;
          });
        }
      );

      // 流式响应完成后，一次性保存完整的消息
      const finalMessage: ChatMessage = {
        ...assistantMessage,
        content: fullResponse,
        timestamp: Date.now()
      };

      // 保存完整的助手消息
      await fileDB?.addChatMessage(finalMessage);

      // 更新状态为最终消息
      setMessages(prev => [
        ...prev.slice(0, -1),
        finalMessage
      ]);

      setInputValue('');

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b">
        <h3 className="font-medium text-sm">AI Assistant</h3>
        <div className="flex items-center gap-2">
          {/* 新建会话按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 hover:bg-gray-100 transition-colors"
            onClick={handleRefreshSession}
            disabled={isLoading}
            title="新建会话"
          >
            新建会话
          </Button>
          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div 
            ref={scrollAreaRef}
            className="p-4 space-y-4"
          >
            {messages.map((message, index) => (
              <Message
                key={message.id}
                content={message.content}
                role={message.role}
                editor={editor}
                isStreaming={isLoading && index === messages.length - 1}
              />
            ))}
            {/* Loading 指示器 */}
            <div ref={loadingRef}>
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-full px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 border-t bg-white">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入您的问题..."
          className="min-h-[100px] max-h-[200px] resize-none mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                思考中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                发送
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}