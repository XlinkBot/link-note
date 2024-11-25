import React, { useState, useCallback } from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'
import { Button } from "@/components/ui/button"
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react"
import { cn } from '@/lib/utils'

interface EditorBubbleMenuProps {
  editor: Editor,
  onShowInlineAIAssistant: () => void
}

export const EditorBubbleMenu = ({ editor, onShowInlineAIAssistant }: EditorBubbleMenuProps) => {
  const [isHeadingOpen, setIsHeadingOpen] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false)
  const [isAlignOpen, setIsAlignOpen] = useState(false)
  
  const [headingTimer, setHeadingTimer] = useState<NodeJS.Timeout | null>(null)
  const [listTimer, setListTimer] = useState<NodeJS.Timeout | null>(null)
  const [alignTimer, setAlignTimer] = useState<NodeJS.Timeout | null>(null)

  const handleHeadingMouseEnter = useCallback(() => {
    if (headingTimer) clearTimeout(headingTimer)
    setIsHeadingOpen(true)
  }, [headingTimer])

  const handleHeadingMouseLeave = useCallback(() => {
    const timer = setTimeout(() => {
      setIsHeadingOpen(false)
    }, 100)
    setHeadingTimer(timer)
  }, [])

  const handleListMouseEnter = useCallback(() => {
    if (listTimer) clearTimeout(listTimer)
    setIsListOpen(true)
  }, [listTimer])

  const handleListMouseLeave = useCallback(() => {
    const timer = setTimeout(() => {
      setIsListOpen(false)
    }, 100)
    setListTimer(timer)
  }, [])

  const handleAlignMouseEnter = useCallback(() => {
    if (alignTimer) clearTimeout(alignTimer)
    setIsAlignOpen(true)
  }, [alignTimer])

  const handleAlignMouseLeave = useCallback(() => {
    const timer = setTimeout(() => {
      setIsAlignOpen(false)
    }, 100)
    setAlignTimer(timer)
  }, [])

  const handleAIAssistantClick = useCallback(() => {
    setIsHeadingOpen(false)
    setIsListOpen(false)
    setIsAlignOpen(false)
    
    onShowInlineAIAssistant()
  }, [onShowInlineAIAssistant])

  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ 
        duration: 100,
        placement: 'top',
        interactive: true,
        maxWidth: '100vw',
        zIndex: 50,
        appendTo: document.body,
        popperOptions: {
          modifiers: [
            {
              name: 'preventOverflow',
              options: {
                padding: 20,
              },
            },
          ],
        },
      }}
      className="flex items-center bg-white rounded-md border shadow-md divide-x max-w-[800px] overflow-visible"
    >
      {/* 标题样式 */}
      <div 
        className="relative flex items-center px-1" 
        style={{ 
          position: 'relative',
          overflow: 'visible'
        }}
        onMouseEnter={handleHeadingMouseEnter}
        onMouseLeave={handleHeadingMouseLeave}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 hover:bg-gray-100 transition-colors",
            isHeadingOpen && "bg-gray-100"
          )}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        {isHeadingOpen && (
          <div 
            className="absolute left-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border"
            style={{
              position: 'absolute',
              zIndex: 999,
            }}
            onMouseEnter={handleHeadingMouseEnter}
            onMouseLeave={handleHeadingMouseLeave}
          >
            <div className="flex flex-col p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('heading', { level: 1 }) && "bg-gray-100"
                )}
              >
                <Heading1 className="h-4 w-4 mr-2" />
                <span className="text-sm">标题 1</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('heading', { level: 2 }) && "bg-gray-100"
                )}
              >
                <Heading2 className="h-4 w-4 mr-2" />
                <span className="text-sm">标题 2</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('heading', { level: 3 }) && "bg-gray-100"
                )}
              >
                <Heading3 className="h-4 w-4 mr-2" />
                <span className="text-sm">标题 3</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 列表样式 */}
      <div 
        className="relative flex items-center px-1" 
        style={{ position: 'relative' }}
        onMouseEnter={handleListMouseEnter}
        onMouseLeave={handleListMouseLeave}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 hover:bg-gray-100 transition-colors",
            isListOpen && "bg-gray-100"
          )}
        >
          <List className="h-4 w-4" />
        </Button>

        {isListOpen && (
          <div 
            className="absolute left-0 top-[calc(100%+4px)] w-48 bg-white rounded-md shadow-lg border z-[999]"
            style={{
              position: 'absolute',
              zIndex: 999,
            }}
            onMouseEnter={handleListMouseEnter}
            onMouseLeave={handleListMouseLeave}
          >
            <div className="flex flex-col p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
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
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive('orderedList') && "bg-gray-100"
                )}
              >
                <ListOrdered className="h-4 w-4 mr-2" />
                有序列表
              </Button>
            </div>
          </div>
        )}
      </div>
      <div 
        className="relative flex items-center px-1" 
        style={{ position: 'relative' }}
        onMouseEnter={handleAlignMouseEnter}
        onMouseLeave={handleAlignMouseLeave}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 hover:bg-gray-100 transition-colors",
            isAlignOpen && "bg-gray-100"
          )}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        {isAlignOpen && (
          <div 
            className="absolute left-0 top-[calc(100%+4px)] w-48 bg-white rounded-md shadow-lg border z-[999]"
            style={{
              position: 'absolute',
              zIndex: 999,
            }}
            onMouseEnter={handleAlignMouseEnter}
            onMouseLeave={handleAlignMouseLeave}
          >
            <div className="flex flex-col p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive({ textAlign: 'left' }) && "bg-gray-100"
                )}
              >
                <AlignLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">左对齐</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive({ textAlign: 'center' }) && "bg-gray-100"
                )}
              >
                <AlignCenter className="h-4 w-4 mr-2" />
                <span className="text-sm">居中对齐</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={cn(
                  "justify-start h-8 px-2 w-full hover:bg-gray-100 transition-colors",
                  editor.isActive({ textAlign: 'right' }) && "bg-gray-100"
                )}
              >
                <AlignRight className="h-4 w-4 mr-2" />
                <span className="text-sm">右对齐</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* 文字效果 */}
      <div className="flex items-center px-1 space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
            editor.isActive('bold') && "bg-gray-100"
          )}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
            editor.isActive('italic') && "bg-gray-100"
          )}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
            editor.isActive('underline') && "bg-gray-100"
          )}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
            editor.isActive('strike') && "bg-gray-100"
          )}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      {/* 其他格式 */}
      <div className="flex items-center px-1 space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
            editor.isActive('code') && "bg-gray-100"
          )}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
            editor.isActive('blockquote') && "bg-gray-100"
          )}
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center px-1 space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAIAssistantClick}
          className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>

    </BubbleMenu>
  )
}