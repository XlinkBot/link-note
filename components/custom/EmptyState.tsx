'use client'

import React, { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Plus, Upload, FileText, Clock, Command } from "lucide-react"
import { FileUpload } from './FileUpload'
import { useFiles } from '@/contexts/FileContext'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { FileItem } from '@/types/file'

// 支持的文件格式说明
const SUPPORTED_FORMATS = [
  { extension: '.md', name: 'Markdown', description: '支持富文本编辑、实时预览' },
  { extension: '.txt', name: '文本文件', description: '支持基础文本编辑' }
]

export const EmptyState: React.FC = () => {
  const { refreshFiles, createFileItem, saveFile, selectFile } = useFiles()
  const [showUploadDialog, setShowUploadDialog] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [recentFiles, setRecentFiles] = React.useState<(FileItem | FileItem)[]>([])

  // 加载最近文件
  useEffect(() => {
    let mounted = true;

    const loadRecentFiles = async () => {
      try {
        const files = await refreshFiles();
        if (!mounted) return;
        
        const sortedFiles = files
          .filter(f => f.type === 'file')
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 3);
        
        setRecentFiles(sortedFiles);
      } catch (error) {
        if (!mounted) return;
        console.error("[EmptyState] Error loading recent files:", error);
      }
    };

    loadRecentFiles();

    return () => {
      mounted = false;
    };
  }, [refreshFiles]);

  // 处理文件上传
  const handleUpload = async (files: File[]) => {
    try {
      let lastCreatedFile = null
      for (const file of files) {
        const localFile = await createFileItem(null)
        if (!localFile) continue

        const content = await file.text()
        
        const savedFile = await saveFile(
          localFile.id, 
          content,
          file.name,
          undefined
        )
        lastCreatedFile = savedFile
      }
      
      setShowUploadDialog(false)
      setError(null)

      if (lastCreatedFile) {
        selectFile(lastCreatedFile)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      setError('上传文件失败，请重试')
    }
  }

  // 处理新建文件
  const handleCreateFile = async () => {
    setIsCreating(true);
    try {
      const localFile = await createFileItem(null);
      if (!localFile) return;
      setError(null);
    } catch (error) {
      console.error('Error creating file:', error);
      setError(error instanceof Error ? error.message : '创建文件失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        handleCreateFile()
      } else if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        setShowUploadDialog(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // 处理最近文件点击
  const handleRecentFileClick = (file: FileItem | FileItem) => {
    selectFile(file)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* 图标和标题 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">开始编辑文档</h2>
          <p className="mt-2 text-sm text-gray-500">
            创建新文件或上传现有文件开始使用智能文档编辑
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 最近文件 */}
        {recentFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>最近编辑的文件</span>
            </div>
            <ScrollArea className="h-30 rounded-md border">
              {recentFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRecentFileClick(file)}
                >
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(file.updated_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleCreateFile}
                  variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                  disabled={isCreating}
                >
                  <Plus className="h-6 w-6" />
                  <div className="space-y-1">
                    <span>新建文件</span>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                      <Command className="h-3 w-3" />
                      <span>Ctrl + N</span>
                    </div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>新建空白文件</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <div className="space-y-1">
                    <span>上传文件</span>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                      <Command className="h-3 w-3" />
                      <span>Ctrl + O</span>
                    </div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>上传本地文件</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 支持的文件格式 */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-500">支持的文件格式</h3>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_FORMATS.map(format => (
              <TooltipProvider key={format.extension}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge 
                        variant="secondary" 
                        className="cursor-help"
                      >
                        {format.extension}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      <span className="font-medium">{format.name}</span>
                      <br />
                      {format.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>

      {/* 上传对话框 */}
      <FileUpload
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUpload={handleUpload}
      />
    </div>
  )
} 