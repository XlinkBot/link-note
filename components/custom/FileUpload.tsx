'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[]) => Promise<void>
}

export const FileUpload: React.FC<FileUploadProps> = ({ isOpen, onClose, onUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('请选择要上传的文件')
      return
    }

    setIsUploading(true)
    try {
      await onUpload(selectedFiles)
      setSelectedFiles([])
      setError(null)
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : '上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className={`
                flex items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg
                cursor-pointer
                transition-colors duration-200
                ${isUploading 
                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                  : 'hover:bg-gray-50 border-gray-300 hover:border-blue-500'
                }
              `}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>上传中...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Upload className="h-8 w-8" />
                  <span>点击或拖拽文件到此处</span>
                </div>
              )}
            </label>
            {selectedFiles.length > 0 && (
              <div className="w-full">
                <h4 className="text-sm font-medium mb-2">已选择的文件：</h4>
                <ul className="text-sm text-gray-500 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="truncate">
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            取消
          </Button>
          <Button
            type="submit"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              '上传'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 