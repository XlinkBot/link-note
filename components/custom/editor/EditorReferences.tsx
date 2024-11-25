import React from 'react'
import { Editor } from '@tiptap/react'
import { X, Plus, FileText, Search } from "lucide-react"
import { useFiles } from '@/contexts/FileContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import elasticlunr from 'elasticlunr'
import { FileItem } from '@/types/file'

interface EditorReferencesProps {
  editor: Editor | null
  fileId: string
  onReferencesChange?: () => void
  className?: string
  maxReferences?: number
}

interface SearchResult {
  id: string
  name: string
  type: string
  score: number
  content?: string
}

export const EditorReferences: React.FC<EditorReferencesProps> = ({
  editor,
  fileId,
  onReferencesChange,
  className = '',
  maxReferences = 3
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [files, setFiles] = React.useState<FileItem[]>([])
  const { refreshFiles } = useFiles()
  
  // 初始化 storage
  React.useEffect(() => {
    if (editor && !editor.storage.references) {
      editor.storage.references = {
        references: []
      }
    }

    refreshFiles().then(setFiles)
  }, [editor, refreshFiles])
  
  // 获取当前文件的引用列表
  const currentReferences = editor?.storage.references?.references || []

  // 从 localStorage 获取索引
  const getSearchIndex = () => {
    const userId = editor?.storage.userId
    if (!userId) return null

    try {
      const state = localStorage.getItem(`document-index-${userId}`)
      if (state) {
        const { serializedIndex } = JSON.parse(state)
        return elasticlunr.Index.load(JSON.parse(serializedIndex))
      }
    } catch (error) {
      console.error('加载索引出错:', error)
    }
    return null
  }

  // 处理搜索
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const index = getSearchIndex()
    if (!index) {
      console.warn('索引未找到')
      return
    }

    const results = index.search(query, {
      fields: {
        title: {boost: 2},
        body: {boost: 1}
      },
      expand: true,
      bool: "OR"
    })

    // 获取搜索结果对应的文件信息

    const searchResults = results
      .map( result => {
        const file = files.find(f => f.id === result.ref)
        if (file && !currentReferences.includes(file.id) && file.id !== fileId) {
          return {
            id: file.id,
            name: file.name,
            type: file.type,
            score: result.score,
            content: file.content
          }
        }
        return null
      })
      .filter(Boolean) as SearchResult[]

    setSearchResults(searchResults)
  }



  // 获取可引用的文件列表
  const availableFiles = searchQuery 
    ? searchResults
    : files.filter(
        file => 
          file.type === 'file' && 
          file.id !== fileId && 
          !currentReferences.includes(file.id)
      ).map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        score: 1,
        content: file.content
      }))

  // 获取已引用文件的详细信息
  const referencedFiles = files.filter(
    file => currentReferences.includes(file.id)
  )

  const handleAddReference = async (id: string) => {
    if (!editor) return
    
    if (currentReferences.length >= maxReferences) {
      alert(`最多只能添加 ${maxReferences} 个引用`)
      return
    }
    
    editor.storage.references.references = [...currentReferences, id]
    editor.commands.focus()
    onReferencesChange?.()
  }

  const handleRemoveReference = async (id: string) => {
    if (!editor) return
    
    editor.storage.references.references = currentReferences.filter((ref: string) => ref !== id)
    editor.commands.focus()
    onReferencesChange?.()
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            引用
            {currentReferences.length > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {currentReferences.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>引用管理</DialogTitle>
            <DialogDescription>
              已引用 {currentReferences.length}/{maxReferences} 个文档
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">已引用文档</h4>
              <ScrollArea className="h-[120px]">
                {referencedFiles.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    暂无引用文档
                  </div>
                ) : (
                  <div className="space-y-1 pr-4">
                    {referencedFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md group"
                      >
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveReference(file.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">可引用文档</h4>
              <ScrollArea className="h-[200px]">
                {availableFiles.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    {searchQuery ? '没有找到匹配的文档' : '没有可引用的文档'}
                  </div>
                ) : (
                  <div className="space-y-1 pr-4">
                    {availableFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md group"
                      >
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{file.name}</div>
                          {'score' in file && (
                            <div className="text-xs text-gray-400">
                              相关度: {(file.score * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddReference(file.id)}
                          disabled={currentReferences.length >= maxReferences}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 