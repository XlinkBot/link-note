'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface TableOfContentsProps {
  editor: Editor | null
  onClose?: () => void
  className?: string
}

interface HeadingItem {
  id: string
  level: number
  text: string
  pos: number
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  editor,
  onClose,
  className
}) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeId] = useState<string>('')

  // 将 updateHeadings 包装在 useCallback 中
  const updateHeadings = useCallback(() => {
    if (!editor) return

    const items: HeadingItem[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const id = `heading-${pos}`
        items.push({
          id,
          level: node.attrs.level,
          text: node.textContent,
          pos
        })
      }
    })
    setHeadings(items)
  }, [editor])

  // 监听编辑器变化
  useEffect(() => {
    if (!editor) return

    editor.on('update', updateHeadings)
    return () => {
      editor.off('update', updateHeadings)
    }
  }, [editor, updateHeadings])

  // 初始化目录
  useEffect(() => {
    updateHeadings()
  }, [updateHeadings])

  // 点击目录项
  const handleClick = (pos: number) => {
    if (!editor) return

    editor.commands.setTextSelection(pos)
    editor.commands.scrollIntoView()
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 h-12 border-b">
        <h3 className="font-medium text-sm">目录</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {headings.length === 0 ? (
          <div className="text-sm text-gray-500 text-center">
            暂无目录内容
          </div>
        ) : (
          <div className="space-y-1">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => handleClick(heading.pos)}
                className={cn(
                  "block text-sm w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors",
                  heading.level === 2 && "pl-4",
                  heading.level === 3 && "pl-6",
                  activeId === heading.id && "bg-gray-100 text-blue-600",
                  "truncate"
                )}
              >
                {heading.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 