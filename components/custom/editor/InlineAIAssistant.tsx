'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, X } from "lucide-react"
import { getCompletions } from '@/lib/llm-client'
import { generatePrompt, buildPromptVariables } from '@/lib/prompt-utils'
import { Editor } from '@tiptap/react'
interface InlineAIAssistantProps {
  position: { top: number; left: number }
  onClose: () => void
  onAccept: (text: string) => void
  selectedText: string
  editor: Editor
}

export const InlineAIAssistant: React.FC<InlineAIAssistantProps> = ({
  position,
  onClose,
  selectedText,
  editor,
}) => {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = containerRef.current?.querySelector('textarea')
    if (textarea) {
      textarea.focus()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        event.stopPropagation();
        return;
      }

      const editorContent = document.querySelector('.ProseMirror');
      if (editorContent?.contains(event.target as Node)) {
        onClose();
        return;
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || !editor) return

    setIsLoading(true)
    try {
      const fileId = editor.storage.fileId
      const content = editor.state.doc.textContent

      // 构建提示词变量
      const variables = await buildPromptVariables(
        fileId,
        content,
        selectedText,
      )

      // 生成系统提示词
      const { prompt: systemPrompt, temperature, maxTokens } = await generatePrompt('chat', variables)

      // 构建符合 OpenAI 格式的消息历史
      const apiMessages = [
        // 系统提示词
        { role: 'system', content: systemPrompt },
        // 当前问题
        { role: 'user', content: prompt }
      ]

      // 调用 LLM API
      const response = await getCompletions(systemPrompt, {
        temperature,
        max_tokens: maxTokens,
        messages: apiMessages as { role: 'system' | 'user' | 'assistant'; content: string }[]
      })

      // 处理编辑器中的文本更新
      const { from, to } = editor.state.selection
      const originalText = editor.state.doc.textBetween(from, to, ' ')
      
      if (originalText !== response) {
        // 创建一个事务
        const tr = editor.state.tr

        // 删除原始文本
        tr.delete(from, to)

        // 插入原始文本（带删除标记）
        const deletedText = editor.schema.text(originalText)
        tr.insert(from, deletedText)
        tr.addMark(
          from,
          from + originalText.length,
          editor.schema.marks.diffDeleted.create()
        )

        // 插入分隔符
        const separatorPos = from + originalText.length
        tr.insert(separatorPos, editor.schema.text(' → '))

        // 插入新文本（带添加标记）
        const addedPos = separatorPos + 3
        const addedText = editor.schema.text(response)
        tr.insert(addedPos, addedText)
        tr.addMark(
          addedPos,
          addedPos + response.length,
          editor.schema.marks.diffAdded.create()
        )

        // 应用事务
        editor.view.dispatch(tr)

        // 存储差异信息
        editor.storage.diffInfo = {
          original: originalText,
          suggested: response,
          originalRange: { from, to },
          displayRange: { 
            from,
            to: addedPos + response.length
          }
        }
      }

      // 创建提示 UI
      const hintContainer = document.createElement('div')
      hintContainer.id = 'ai-hint-container'
      hintContainer.className = 'fixed bg-white rounded-md shadow-md border px-3 py-2 text-xs flex items-center gap-2 z-[99999]'
      
      // 获取编辑器中插入的文本位置
      const editorView = editor.view
      const endPos = editorView.coordsAtPos(from + (originalText !== response ? originalText.length + response.length + 3 : response.length))
      
      // 设置提示 UI 的位置
      const scrollY = window.scrollY || document.documentElement.scrollTop
      hintContainer.style.top = `${endPos.bottom + scrollY + 8}px`
      hintContainer.style.left = `${endPos.left}px`
      
      hintContainer.innerHTML = `
        <span class="text-gray-400">按</span>
        <kbd class="px-2 py-1 bg-gray-50 border rounded text-gray-500 font-mono">Tab</kbd>
        <span class="text-gray-400">接受或</span>
        <kbd class="px-2 py-1 bg-gray-50 border rounded text-gray-500 font-mono">Esc</kbd>
        <span class="text-gray-400">取消</span>
      `
      
      document.body.appendChild(hintContainer)

      // 添加键盘事件监听
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab' || e.key === 'Escape') {
          e.preventDefault()
          
          if (e.key === 'Escape') {
            // 恢复原始文本
            if (editor && editor.storage.diffInfo) {
              const { original, originalRange, displayRange } = editor.storage.diffInfo
              const tr = editor.state.tr
              tr.delete(displayRange.from, displayRange.to)
              tr.insert(originalRange.from, editor.schema.text(original))
              editor.view.dispatch(tr)
            }
            onClose()
          } else if (e.key === 'Tab') {
            // 接受建议文本
            if (editor && editor.storage.diffInfo) {
              const { suggested, originalRange, displayRange } = editor.storage.diffInfo
              const tr = editor.state.tr
              tr.delete(displayRange.from, displayRange.to)
              tr.insert(originalRange.from, editor.schema.text(suggested))
              editor.view.dispatch(tr)
              onClose()
            }
          }
          
          // 清理
          if (hintContainer && hintContainer.parentNode) {
            hintContainer.parentNode.removeChild(hintContainer)
          }
          document.removeEventListener('keydown', handleKey)
        }
      }
      
      document.addEventListener('keydown', handleKey)
      
      if (containerRef.current) {
        containerRef.current.style.display = 'none'
      }

    } catch (error) {
      console.error('Error in handleSubmit:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 在组件卸载时清理
  useEffect(() => {
    return () => {
      const hint = document.getElementById('ai-hint-container')
      if (hint) {
        hint.remove()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="inline-ai-assistant"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="p-3 bg-white rounded-lg shadow-lg border min-w-[300px]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">AI Assistant</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 选中文字显示区域 */}
        {selectedText && (
          <div className="mb-4 bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">选中的文字：</div>
            <div className="text-sm">
              <mark className="selected-text">{selectedText}</mark>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <Textarea
          ref={textareaRef}
          placeholder="请输入您的问题..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[50px] text-sm resize-none"
        />

        {isLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
} 