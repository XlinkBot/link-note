'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { Button } from "@/components/ui/button"
import { 
  BoldIcon, 
  ItalicIcon, 
  Strikethrough, 
  Sparkles, 
  List, 
  Save, 
  Loader2, 
  Underline,
  Code,
  Quote 
} from "lucide-react"
import { InlineAIAssistant } from '@/components/custom/editor/InlineAIAssistant'
import { DiffDeletedMark, DiffAddedMark } from '@/extensions/diffMarks'
import { EditorStyle } from '@/extensions/editorStyle'
import { EditorReferences } from '@/components/custom/editor/EditorReferences'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@radix-ui/react-scroll-area'
import { defaultEditorExtensions } from '@/lib/utils'
import { useFiles } from '@/contexts/FileContext'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EditorBubbleMenu } from '@/components/custom/editor/EditorBubbleMenu'
import { FloatingMenu } from '@/components/custom/editor/EditorFloatingMenu'
import { ListOrdered, Heading1, Heading2, Heading3 } from 'lucide-react'
import { AutoComplete } from '@/extensions/autoComplete'
import { buildPromptVariables } from '@/lib/prompt-utils'
import { generatePrompt } from '@/lib/prompt-utils'
import { getCompletions } from '@/lib/llm-client'
import { FileItem } from '@/types/file'
interface TextEditorProps {
  fileId: string;
  isTemp: boolean;
  onEditorCreate: (editor: Editor) => void;
  onChange: (hasChanges: boolean) => void;
  onToggleTableOfContents: () => void;
  onToggleAIAssistant: () => void;
  onSelectedTextChange: (text: string) => void;
  showTableOfContents: boolean;
  showAIAssistant: boolean;
  onFileSaved?: (file: FileItem) => void;
}

const TextEditor = React.memo<TextEditorProps>(({ 
  fileId,
  isTemp,
  onEditorCreate,
  onChange,
  onToggleTableOfContents,
  onToggleAIAssistant,
  onSelectedTextChange,
  showTableOfContents,
  onFileSaved,
}) => {
  const { 
    getFileContent, 
    getFileReferences, 
    updateFileContent, 
    saveFile, 
    refreshFiles,
    currentEditingFile
  } = useFiles()
  const [showInlineAI, setShowInlineAI] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [aiPosition, setAIPosition] = useState({ top: 0, left: 0 })
  const [content, setContent] = useState('')
  const [references, setReferences] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])

  const editor = useEditor({
    extensions: [
      ...defaultEditorExtensions(),
      EditorStyle.configure({
        className: 'custom-editor-content'
      }),
      DiffDeletedMark,
      DiffAddedMark,
      AutoComplete.configure({
        suggestion: null,
        isLoading: false,
      }),
    ],
    content: '',
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      editor.storage.fileId = fileId
      editor.storage.hasChanges = false
      editor.storage.references = { references }
      onEditorCreate(editor)
    },
    onUpdate: ({ editor }) => {
      const currentContent = editor.storage.markdown.getMarkdown()
      if (currentContent !== content) {
        editor.storage.hasChanges = true
        onChange(true)
        
      }
    },
    onDestroy: () => {
    }
  })

  // 初始化时获取文件内容和引用
  useEffect(() => {
    const fetchContentAndReferences = async () => {
      setIsLoading(true)
      try {
        const result = await getFileContent(fileId)
        
        if (result) {
          const references = await getFileReferences(fileId)
          
          setContent(result)
          setReferences(references)
        }
      } catch (error) {
        console.error('TextEditor: Error fetching content:', error)
      } finally {
        setIsLoading(false)
      }
      refreshFiles().then(setFiles)
    }

    fetchContentAndReferences()
  }, [fileId, getFileContent, getFileReferences, refreshFiles])

  // 当内容加载完成后更新编辑器内容和引用
  useEffect(() => {
    if (editor && content) {
      // 只在编辑器没有未保存更改时更新内容
      if (!editor.storage.hasChanges) {
        editor.commands.setContent(content)
        
        // 更新编辑器的引用存储
        editor.storage.references = {
          references: references
        }
        
        // 重置更改状态
        editor.storage.hasChanges = false
        onChange(false)
        
        // 设置最后保存时间
        setLastSaved(new Date())
      }
    }
  }, [editor, content, fileId, references, refreshFiles, setFiles, files, onFileSaved, currentEditingFile, onChange])

  // 处理 AI 助手
  const handleAIAssistant = useCallback(() => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')

    // 获取光标位置
    const cursorCoords = editor.view.coordsAtPos(to)

    setSelectedText(selectedText)
    onSelectedTextChange(selectedText)
    setShowInlineAI(true)
    setAIPosition({
      top: cursorCoords.top + window.scrollY,
      left: cursorCoords.left + window.scrollX
    })
  }, [editor, onSelectedTextChange])

  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 验证文件名
  const validateFileName = (fileName: string): string | null => {
    if (!fileName) return '文件名不能为空'
    if (!fileName.trim()) return '文件名不能为空格'
    
    // 检查文件扩展名
    if (!fileName.endsWith('.md')) {
      fileName = `${fileName}.md`
    }

    // 检查是否有重名文件
    const existingFile = files.find(f => 
      f.name.toLowerCase() === fileName.toLowerCase()
    )

    if (existingFile) return '该目录下已存在同名文件'
    return null
  }

  // 处理保存临时文件
  const handleSaveTemp = async () => {
    if (!editor || isSaving) return;

    const validationError = validateFileName(newFileName);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const content = editor.storage.markdown.getMarkdown();
      
      // 调用 FileContext 的 saveFile 方法创建新文件
      const newFile = await saveFile(
        fileId, 
        content, 
        newFileName,
        undefined
      );
      
      if (newFile) {
        // 更新编辑器状态
        editor.storage.hasChanges = false;
        setLastSaved(new Date());
        
        // 关闭对话框
        setShowSaveDialog(false);
        setSaveError(null);
        
        // 知父组件文件已保存
        onFileSaved?.(newFile as FileItem);
      }
    } catch (error) {
      console.error('Error saving temp file:', error);
      setSaveError('保存文件失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 修保存处理函数
  const handleSave = async () => {
    if (!editor || isSaving) return;
    
    // 如果是临时文件，显示保存对话框
    if (isTemp) {
      setShowSaveDialog(true);
      return;
    }

    setIsSaving(true);
    try {
      const markdown = editor.storage.markdown.getMarkdown();
      const references = editor.storage.references?.references || [];
      
      // 使用 FileContext 的 updateFileContent 方法更新文件
      await updateFileContent(fileId, markdown, references);
      
      editor.storage.hasChanges = false;
      setLastSaved(new Date());
      onChange(false);
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 添加输入检测逻辑
  useEffect(() => {
    if (!editor?.view?.dom) return;

    let autoCompleteTimer: NodeJS.Timeout
    let cursorTimer: NodeJS.Timeout

    // 检查是否应该触发自动补全
    const checkForAutoComplete = async () => {
      if (!editor) return

      const { from } = editor.state.selection
      const currentLine = editor.state.doc.textBetween(
        Math.max(0, from - 100),
        from,
        ' '
      )

      // 检查当前行是否满足触发条件
      const hasSufficientContent = currentLine.trim().length >= 10
      const notEndWithPunctuation = !/[。！？，、；：""''（）《》【】\.,!?\-:;]$/.test(currentLine)

      console.log('Auto-complete check:', {
        lineLength: currentLine.length,
        content: currentLine,
        hasSufficientContent,
        notEndWithPunctuation
      })

      if (hasSufficientContent && notEndWithPunctuation) {
        try {
          console.log('Triggering auto-complete')
          editor.chain().focus().run()
          editor.storage.autoComplete = { isLoading: true }

          const variables = await buildPromptVariables(
            editor.storage.fileId,
            editor.state.doc.textContent,
            currentLine
          )

          const { prompt: systemPrompt, temperature } = await generatePrompt('autocomplete', variables)

          const messages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: `请简短地补充下面这段文字(100字以内)\n${currentLine}` }
          ]

          const suggestion = await getCompletions(systemPrompt, {
            temperature,
            max_tokens: 100,
            messages
          })

          console.log('Received suggestion:', suggestion)
          editor.storage.autoComplete = { suggestion }
        } catch (error) {
          console.error('Error getting suggestion:', error)
          editor.storage.autoComplete = { suggestion: null }
        }
      }
    }

    // 处理输入法完成事件
    const handleCompositionEnd = () => {
      if (autoCompleteTimer) {
        clearTimeout(autoCompleteTimer)
      }

      autoCompleteTimer = setTimeout(checkForAutoComplete, 1000)
    }

    // 处理光标位置变化
    const handleSelectionChange = () => {
      if (!editor) return

      // 清除之前的定时器
      if (cursorTimer) {
        clearTimeout(cursorTimer)
      }

      // 如果当前有建议或正在加载，不触发新的检查
      if (editor.storage.autoComplete?.suggestion || editor.storage.autoComplete?.isLoading) {
        return
      }

      // 设置新的定时器
      cursorTimer = setTimeout(checkForAutoComplete, 2000) // 光标停留 2 秒后触发
    }

    // 处理普通按键事件（非输入法）
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor) return;

      // Tab 键接受建议
      if (e.key === 'Tab' && editor.storage.autoComplete?.suggestion) {
        e.preventDefault()
        console.log('Tab pressed, accepting suggestion')
        editor.storage.autoComplete = { suggestion: null }
        return
      }

      // 如果有建议且按下其他键（除了方向键等特殊键），清除建议
      if (editor.storage.autoComplete?.suggestion || editor.storage.autoComplete?.isLoading) {
        const ignoredKeys = [
          'Shift', 'Control', 'Alt', 'Meta', 
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End', 'PageUp', 'PageDown',
          'Tab'
        ]

        if (!ignoredKeys.includes(e.key)) {
          console.log('Other key pressed, clearing suggestion')
          editor.storage.autoComplete = { suggestion: null }
        }
      }
    }

    // 处理点击事件
    const handleClick = () => {
      if (!editor) return;
      
      if (editor.storage.autoComplete?.suggestion || editor.storage.autoComplete?.isLoading) {
        console.log('Click detected, clearing suggestion')
        editor.storage.autoComplete = { suggestion: null }
      }
    }

    // 监听文档变化
    const handleDocChange = () => {
      if (!editor) return;
      
      if (editor.storage.autoComplete?.suggestion || editor.storage.autoComplete?.isLoading) {
        editor.storage.autoComplete = { suggestion: null }
      }
    }

    // 添加事件监听
    const editorElement = editor.view.dom
    editorElement.addEventListener('compositionend', handleCompositionEnd)
    editorElement.addEventListener('keydown', handleKeyDown)
    editorElement.addEventListener('click', handleClick)
    editor.on('update', handleDocChange)
    editor.on('selectionUpdate', handleSelectionChange) // 添加选择变化监听

    return () => {
      editorElement.removeEventListener('compositionend', handleCompositionEnd)
      editorElement.removeEventListener('keydown', handleKeyDown)
      editorElement.removeEventListener('click', handleClick)
      editor.off('update', handleDocChange)
      editor.off('selectionUpdate', handleSelectionChange)
      if (autoCompleteTimer) {
        clearTimeout(autoCompleteTimer)
      }
      if (cursorTimer) {
        clearTimeout(cursorTimer)
      }
    }
  }, [editor])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* 工具栏 */}
        <div className="flex-none bg-white/95 backdrop-blur-sm z-10">
          <div className="px-8 lg:px-16 xl:px-24 py-2 flex items-center justify-between border-b h-12">
            {/* 左侧工具组 */}
            <div className="flex items-center gap-4">
              {/* 基础格式化工具 */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().setHeading({ level: 1 }).run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('heading', { level: 1 }) && "bg-gray-100"
                  )}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().setHeading({ level: 2 }).run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('heading', { level: 2 }) && "bg-gray-100"
                  )}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().setHeading({ level: 3 }).run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('heading', { level: 3 }) && "bg-gray-100"
                  )}
                >
                  <Heading3 className="h-4 w-4" />
                </Button>

              <div className="h-6 w-px bg-gray-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('bold') && "bg-gray-100"
                  )}
                >
                  <BoldIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('italic') && "bg-gray-100"
                  )}
                >
                  <ItalicIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('strike') && "bg-gray-100"
                  )}
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('underline') && "bg-gray-100"
                  )}
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('code') && "bg-gray-100"
                  )}
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('blockquote') && "bg-gray-100"
                  )}
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <div className="h-6 w-px bg-gray-200" />
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('bulletList') && "bg-gray-100"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={cn(
                    "h-8 w-8 p-0 hover:bg-gray-100 transition-colors",
                    editor?.isActive('orderedList') && "bg-gray-100"
                  )}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>


              </div>

              {/* 分隔线 */}
              <div className="h-6 w-px bg-gray-200" />

              {/* 引用功能 */}
              <EditorReferences 
                editor={editor}
                fileId={fileId}
                onReferencesChange={() => {
                  if (editor) {
                    editor.storage.hasChanges = true
                    onChange(true)
                  }
                }}
                className="hover:bg-gray-100 transition-colors"
              />

              {/* 分隔线 */}
              <div className="h-6 w-px bg-gray-200" />

              {/* 目录按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTableOfContents}
                className={cn(
                  "gap-2",
                  "hover:bg-gray-100 transition-colors",
                  showTableOfContents && "bg-gray-100" 
                )}
              >
                <List className="h-4 w-4" />
                目录
              </Button>
            </div>

            {/* 右侧工具组 */}
            <div className="flex items-center gap-2">
              {/* 保存状态/按钮 */}
             
                {editor?.storage.hasChanges ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="hover:bg-gray-100 transition-colors outliine"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                  >
                    <span className="text-sm text-gray-500 cursor-default min-w">
                      {lastSaved ? (
                      `最后保存: ${formatLastSaved(lastSaved)}`
                    ) : (
                      '未保'
                      )}
                    </span>
                  </Button>
                )}
             

              {/* AI 助手按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAIAssistant}
                className="hover:bg-gray-100 rounded-md p-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI 助手
              </Button>
            </div>
          </div>
        </div>

        {/* 编辑器主体 */}
        <div className="flex-1 overflow-auto">
          {editor && <EditorBubbleMenu editor={editor} onShowInlineAIAssistant={handleAIAssistant} />}
          {editor && (
            <FloatingMenu
              editor={editor}
              shouldShow={() => {
                return true
              }}
              tippyOptions={{
                placement: 'left',
                duration: 100,
                interactive: true,
                offset: [-10, 0],
                getReferenceClientRect: (): ClientRect => {
                  const { selection } = editor.state
                  const { $from } = selection
                  
                  const lineStart = $from.start()
                  const startCoords = editor.view.coordsAtPos(lineStart)
                  const dom = editor.view.dom as HTMLElement
                  const domRect = dom.getBoundingClientRect()
                  
                  return {
                    top: startCoords.top,
                    bottom: startCoords.bottom,
                    left: domRect.left - 20,
                    right: domRect.left - 20,
                    width: 0,
                    height: startCoords.bottom - startCoords.top,
                    x: 0,
                    y: 0,
                    toJSON: () => ({
                      top: startCoords.top,
                      bottom: startCoords.bottom,
                      left: domRect.left - 20,
                      right: domRect.left - 20,
                      width: 0,
                      height: startCoords.bottom - startCoords.top,
                    })
                  }
                }
              }}
            />
          )}

          <ScrollArea className="h-full border-b">
            <div className="px-8 lg:px-16 xl:px-24 py-6 max-w-[100rem] mx-auto">
              <EditorContent 
                editor={editor} 
                className="prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none"
              />
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* InlineAIAssistant */}
      {showInlineAI && (
        <InlineAIAssistant
          position={aiPosition}
          onClose={() => setShowInlineAI(false)}
          onAccept={(text) => {
            if (editor) {
              const { from, to } = editor.state.selection
              editor.chain().focus().deleteRange({ from, to }).insertContent(text).run()
              editor.storage.hasChanges = true
            }
            setShowInlineAI(false)
          }}
          selectedText={selectedText}
          editor={editor as Editor}
        />
      )}

      {/* 保存临时文件对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>保存文件</DialogTitle>
            <DialogDescription>
              请输入文件名
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filename" className="text-right">
                文件名
              </Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => {
                  setNewFileName(e.target.value)
                  setSaveError(null)
                }}
                className="col-span-3"
                placeholder="example.md"
              />
            </div>
            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowSaveDialog(false)
                setSaveError(null)
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              onClick={handleSaveTemp}
              disabled={!newFileName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.fileId === nextProps.fileId &&
         prevProps.showTableOfContents === nextProps.showTableOfContents &&
         prevProps.showAIAssistant === nextProps.showAIAssistant
})

TextEditor.displayName = 'TextEditor'

export { TextEditor }