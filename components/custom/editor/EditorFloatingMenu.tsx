import React, { useState, useEffect } from 'react'
import { FloatingMenu as TiptapFloatingMenu, Editor } from '@tiptap/react'
import { Button } from "@/components/ui/button"

import {
  BoldIcon,
  ItalicIcon,
  Code,
  Quote,
  Heading1,
  List,
  ListOrdered,
  MoreHorizontal
} from "lucide-react"
import { cn } from '@/lib/utils'
import { Placement } from 'tippy.js'
import { TippyOptions } from '@/types/tippyjs'

interface FloatingMenuProps {
  editor: Editor;
  shouldShow?: ({ editor }: { editor: Editor }) => boolean;
  tippyOptions?: TippyOptions;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ 
  editor,
  shouldShow = () => true,
  tippyOptions = {
    duration: 100,
    placement: 'left-start',
    interactive: true,
    offset: [-10, 0],

  }
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // 添加点击编辑器内容时关闭菜单的处理
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // 检查点击是否在编辑器内容区域
      if (editor?.view.dom.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    // 添加事件监听
    document.addEventListener('click', handleClick)

    // 清理函数
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [editor])

  // 修改格式化函数，使其应用于整行
  const formatLine = (formatFn: () => void) => {
    const { selection } = editor.state
    const { $head } = selection
    const lineStart = $head.start(1)
    const lineEnd = $head.end(1)

    // 选中整行
    editor.chain()
      .focus()
      .setTextSelection({ from: lineStart, to: lineEnd })
      .run()

    // 应用格式化
    formatFn()
    
    // 关闭菜单
    setIsMenuOpen(false)
  }

  if (!editor) return null

  return (
    <TiptapFloatingMenu
      editor={editor}
      shouldShow={shouldShow}
      tippyOptions={{
        ...tippyOptions,
        placement: tippyOptions.placement as Placement
      }}
      className="flex items-center"
    >
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors rounded-full",
            isMenuOpen && "bg-gray-100"
          )}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {isMenuOpen && (
          <div
            className="absolute left-full ml-1 w-48 bg-white rounded-md shadow-lg border z-50"
          >
            <div className="flex flex-col p-1">
              {/* 标题选项 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('heading', { level: 1 }) && "bg-gray-100"
                )}
              >
                <Heading1 className="h-4 w-4 mr-2" />
                标题 1
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('heading', { level: 2 }) && "bg-gray-100"
                )}
              >
                <Heading1 className="h-4 w-4 mr-2 scale-90" />
                标题 2
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('heading', { level: 3 }) && "bg-gray-100"
                )}
              >
                <Heading1 className="h-4 w-4 mr-2 scale-75" />
                标题 3
              </Button>

              <div className="h-px bg-gray-200 my-1" />

              {/* 列表选项 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleBulletList().run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('bulletList') && "bg-gray-100"
                )}
              >
                <List className="h-4 w-4 mr-2" />
                无序列表
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleOrderedList().run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('orderedList') && "bg-gray-100"
                )}
              >
                <ListOrdered className="h-4 w-4 mr-2" />
                有序列表
              </Button>

              <div className="h-px bg-gray-200 my-1" />

              {/* 文本格式选项 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleBold().run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('bold') && "bg-gray-100"
                )}
              >
                <BoldIcon className="h-4 w-4 mr-2" />
                粗体
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleItalic().run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('italic') && "bg-gray-100"
                )}
              >
                <ItalicIcon className="h-4 w-4 mr-2" />
                斜体
              </Button>

              <div className="h-px bg-gray-200 my-1" />

              {/* 其他格式选项 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleCode().run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('code') && "bg-gray-100"
                )}
              >
                <Code className="h-4 w-4 mr-2" />
                代码
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatLine(() => editor.chain().focus().toggleBlockquote().run())}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('blockquote') && "bg-gray-100"
                )}
              >
                <Quote className="h-4 w-4 mr-2" />
                引用
              </Button>
            </div>
          </div>
        )}
      </div>
    </TiptapFloatingMenu>
  )
}