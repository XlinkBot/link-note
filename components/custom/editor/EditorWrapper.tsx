'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { X, FileText, FileCode, FileSpreadsheet } from "lucide-react"
import { useFiles } from '@/contexts/FileContext'
import { EmptyState } from '@/components/custom/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { EditorContainer } from '@/components/custom/editor/EditorContainer'
import { cn } from "@/lib/utils"
import { FileItem, Tempfile } from '@/types/file'

export const EditorWrapper: React.FC = () => {
  
  const { 
    openFiles, 
    currentEditingFile, 
    setCurrentEditingFile,
    closeFile,
    deleteFile,
  } = useFiles()

  // 保存所有打开文件的编辑器容器状态
  const [containers, setContainers] = useState<Record<string, {
    hasChanges: boolean
  }>>({})
  
  const [fileToClose, setFileToClose] = useState<string | null>(null)
  const [showCloseWarning, setShowCloseWarning] = useState(false)

  // 处理关闭文件
  const handleCloseFile = (fileId: string) => {
    console.log('EditorWrapper: handleCloseFile', fileId)
    const file = openFiles.find(f => f.id === fileId)
    if (!file) return

    if (containers[fileId]?.hasChanges) {
      setFileToClose(fileId)
      setShowCloseWarning(true)
    } else {
      if ('isLocal' in file) {
        deleteFile(fileId)
      } else {
        closeFile(fileId)
      }
    }
  }

  const handleFileSaved = (newFile: FileItem | Tempfile) => {
    console.log('EditorWrapper: handleFileSaved', newFile)
    if ('isLocal' in newFile) {
      setContainers(prev => ({
        ...prev,
        [newFile.id]: { hasChanges: false }
      }))
    }else{
      setContainers(prev => ({
        ...prev,
        [newFile.id]: { hasChanges: false }
      }))
    }
  }

  // 如果没有打开的文件，显示空状态
  if (openFiles.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex flex-col bg-white shadow-sm z-10">
        {/* 文件标签页 */}
        <div className="flex items-center justify-between px-4 h-12 border-b">
          <div className="flex items-center gap-1 overflow-x-auto">
            {openFiles.map(file => (
              <Button
                key={file.id}
                variant={currentEditingFile?.id === file.id ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 px-3 relative group",
                  currentEditingFile?.id === file.id && "bg-gray-100"
                )}
                onClick={() => setCurrentEditingFile(file)}
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(file.name)}
                  <span className="max-w-[120px] truncate">
                    {file.name}
                    {containers[file.id]?.hasChanges && (
                      <span className="ml-1 text-gray-400">*</span>
                    )}
                  </span>
                  <span
                    className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-full p-1 transition-all duration-200 cursor-pointer ml-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCloseFile(file.id)
                    }}
                  >
                    <X className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* 修改编辑器容器区域的渲染方式 */}
        <div className="flex-1 overflow-hidden">
          {openFiles.map(file => {

            
            return (
              <div
                key={file.id}
                style={{ 
                  display: currentEditingFile?.id === file.id ? 'block' : 'none',
                  height: '100%'
                }}
              >
                <EditorContainer
                  fileId={file.id}
                  isTemp={ 'isTemp' in file || false}
                  onChangeState={(state) => {
                    setContainers(prev => ({
                      ...prev,
                      [file.id]: state
                    }))
                  }}
                  onFileSaved={(newFile) => handleFileSaved(newFile)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* 关闭文件确认对话框 */}
      <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>确认关闭</DialogTitle>
            <DialogDescription>
              文件有未保存的更改，关闭后更改将丢失。确定要关闭吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFileToClose(null)
                setShowCloseWarning(false)
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              onClick={() => {
                if (fileToClose) {
                  const file = openFiles.find(f => f.id === fileToClose)
                  if (file && 'isLocal' in file) {
                    deleteFile(fileToClose)
                  } else {
                    closeFile(fileToClose)
                  }
                  setFileToClose(null)
                  setShowCloseWarning(false)
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              确认关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 文件图标辅助函数
function getFileIcon(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'md':
      return <FileText className="h-4 w-4 text-purple-500" />
    case 'csv':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />
    default:
      return <FileCode className="h-4 w-4 text-blue-500" />
  }
}