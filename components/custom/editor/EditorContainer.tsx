'use client'

import React, { useState } from 'react'
import { TextEditor } from '@/components/custom/editor/TextEditor'
import { TableOfContents } from '@/components/custom/TableOfContents'
import { AIAssistant } from '@/components/custom/AIAssistant'
import { Editor } from '@tiptap/react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Clock } from "lucide-react"

import { FileItem, Tempfile } from '@/types/file'

interface EditorContainerProps {
  fileId: string
  isTemp: boolean
  onChangeState: (state: { hasChanges: boolean }) => void
  onFileSaved?: (newFile: FileItem | Tempfile) => void
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  fileId,
  isTemp,
  onChangeState,
  onFileSaved,
}) => {
  

  const [editor, setEditor] = useState<Editor | null>(null)
  const [showTableOfContents, setShowTableOfContents] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(true)
  const [selectedText, setSelectedText] = useState('')

  const handleEditorCreate = (newEditor: Editor) => {
    console.log('EditorContainer: handleEditorCreate', fileId)
    setEditor(newEditor)
  }

  const handleEditorChange = (hasChanges: boolean) => {
    onChangeState({ hasChanges })
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)]">
      <div className="flex flex-1 min-w-0">
        {showTableOfContents && (
          <div className="w-64 border-r bg-white">
            <ScrollArea className="h-full">
              <TableOfContents 
                editor={editor} 
                onClose={() => setShowTableOfContents(false)}
              />
            </ScrollArea>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            <TextEditor
              fileId={fileId}
              isTemp={isTemp}
              onEditorCreate={handleEditorCreate}
              onChange={handleEditorChange}
              onToggleTableOfContents={() => setShowTableOfContents(!showTableOfContents)}
              onToggleAIAssistant={() => setShowAIAssistant(!showAIAssistant)}
              onSelectedTextChange={setSelectedText}
              showTableOfContents={showTableOfContents}
              showAIAssistant={showAIAssistant}
              onFileSaved={onFileSaved}
            />
          </div>

          <div className="flex-none h-8 border-t bg-gray-50/50 px-6 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>字数: {editor?.storage.characterCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>最后编辑: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            <div>
              {editor?.isEditable ? '编辑模式' : '只读模式'}
            </div>
          </div>
        </div>

        {showAIAssistant && (
          <div className="w-[400px] border-l bg-white">
            <AIAssistant
              id={`chat-${fileId}`}
              onClose={() => setShowAIAssistant(false)}
              selectedText={selectedText}
              onAIResponse={(response: string) => {
                editor?.commands.insertContent(response)
              }}
              context={{
                fileId,
                fileName: editor?.storage.fileName,
                content: editor?.storage.markdown.getMarkdown()
              }}
              editor={editor as Editor}
            />
          </div>
        )}
      </div>
    </div>
  )
} 