'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, File, Folder, Upload, Plus, Download, Trash, Edit, ChevronRight, ChevronDown, FileText, FileCode, FileSpreadsheet} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { FileUpload } from '@/components/custom/FileUpload'
import { DragDropContext, Droppable, Draggable, DraggableProvided, DraggableStateSnapshot, DropResult } from '@hello-pangea/dnd'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useFiles, fileEvents } from '@/contexts/FileContext'

import { FileItem , FILE_EVENTS, FileEventDetail} from '@/types/file'

import {  FileSearch as  FileSearchComponent} from './FileSearch'

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

export const FileManager: React.FC = () => {
  const { 
    refreshFiles, 
    createFileItem, 
    createDirectory,
    createFile,
    updateFile,
    getFileContent,
    deleteFile, 
    selectFile,
    currentEditingFile  // 从 FileContext 获取 currentEditingFile
  } = useFiles()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const expanded = new Set<string>()
    files.forEach(file => {
      if (file.type === 'folder') {
        expanded.add(file.id)
      }
    })
    return expanded
  })

  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string | null>(null)

  // 使用 useCallback 包装 fetchFiles
  const fetchFiles = useCallback(async () => {
    console.log("[FileManager] fetchFiles called");
    setIsLoading(true)
    try {
      const filesData = await refreshFiles()
      console.log("[FileManager] Received files before filtering:", filesData);
      // 过滤掉临时文件
      const permanentFiles = filesData.filter(file => !(file.isTemp) || !file.isTemp);
      console.log("[FileManager] Received files:", permanentFiles);
      setFiles(permanentFiles)
    } catch (error) {
      console.error('[FileManager] Error fetching files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [refreshFiles]);

  // 组件挂载时获取文件
  useEffect(() => {
    console.log("[FileManager] Component mounted");
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (currentEditingFile) {
      let currentFile = files.find(f => f.id === currentEditingFile.id);
      
      // 添加空值检查
      while (currentFile && currentFile.parent_id) {
        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          // 确保 parent_id 存在再添加
          if (currentFile?.parent_id) {
            newSet.add(currentFile.parent_id);
          }
          return newSet;
        });
        
        // 查找父文件夹，添加可选链操作符
        currentFile = files.find(f => f.id === currentFile?.parent_id);
      }
    }
  }, [currentEditingFile, files]);

  useEffect(() => {
    setExpandedFolders(prev => {
      const expanded = new Set(prev);
      // 添加类型检查和空值处理
      files.forEach(file => {
        if (file && file.type === 'folder' && file.id) {
          expanded.add(file.id);
        }
      });
      return expanded;
    });
  }, [files]);



  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRename = async (file: FileItem) => {
    setSelectedFile(file)
    setNewFileName(file.name)
    setIsRenameDialogOpen(true)
  }

  // 添加重命名的 loading 状态
  const [isRenaming, setIsRenaming] = useState(false)

  // 修改重命名处理函数
  const handleRenameConfirm = async () => {
    if (!selectedFile || !newFileName.trim()) return
    
    setIsRenaming(true)
    try {
      await updateFile({
        id: selectedFile.id,
        name: newFileName,
        updated_at: new Date().toISOString(),
        type: selectedFile.type,
        parent_id: selectedFile.parent_id,
        created_at: selectedFile.created_at,
      });
      
      await refreshFiles()
      setIsRenameDialogOpen(false)
      setError(null)
    } catch (error) {
      setError('重命名失败，请重试, ' + error)
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDelete = async (file: FileItem) => {
    setSelectedFile(file)
    setIsDeleteDialogOpen(true)
  }

  // 添加删除的 loading 状态
  const [isDeleting, setIsDeleting] = useState(false)

  // 修改删除处理函数
  const handleDeleteConfirm = async () => {
    if (!selectedFile) return
    
    setIsDeleting(true)
    try {
      // 直接使用 FileContext 的 deleteFile 方法
      await deleteFile(selectedFile.id)
      setIsDeleteDialogOpen(false)
      setError(null)
    } catch (error) {
      console.error('Error deleting file:', error)
      setError('删除失败，请重试')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async (file: FileItem) => {
    if (file.type === 'folder') return

    try {
      const fileData = await getFileContent(file.id)
      if (!fileData) {
        throw new Error('文件内容为空')
      }
      
      // 创建 Blob 对象
      const blob = new Blob([fileData], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      setError('下载文件失败，请重试')
    }
  }



  // 修改 handleCreateFile 函数
  const handleCreateFile = async (parentFolderId: string | null) => {
    try {
      console.log('Creating new file in folder:', parentFolderId)
      const newFile = createFileItem(parentFolderId)
      console.log('New file created:', newFile)
      
    } catch (error) {
      console.error('Error creating file:', error)
      setError(error instanceof Error ? error.message : '创建文件失败，请试')
    }
  }

  const handleCreateFolderInFolder = async (parentFolderId: string) => {
    const folderName = prompt('Enter folder name:')
    if (!folderName) return

    try {
      await createDirectory(parentFolderId, folderName)
      
      await refreshFiles()
    } catch (error) {
      console.error('Error creating folder:', error)
      setError('创建文件夹失败，请重试')
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }


  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    
    if (!destination) return

    const draggedFile = files.find(f => f.id === draggableId)
    if (!draggedFile) return

    const newParentId = destination.droppableId === 'root' ? null : destination.droppableId

    try {
      if (source.droppableId === destination.droppableId) {
        // 更新本地状态以反映新的顺序
        const reorderedFiles = Array.from(files)
        const [removed] = reorderedFiles.splice(source.index, 1)
        reorderedFiles.splice(destination.index, 0, removed)
        setFiles(reorderedFiles)
        return
      }

      // 检查是否试图将文件夹移动到其子文件夹中
      if (draggedFile.type === 'folder' && isDescendant(draggedFile.id, newParentId)) {
        setError('不能将文件夹移动到其子文件夹中')
        return
      }

      // 更新文件的父级ID
      await updateFile({
        id: draggedFile.id,
        parent_id: newParentId,
        updated_at: new Date().toISOString(),
        type: draggedFile.type,
        name: draggedFile.name,
        created_at: draggedFile.created_at,
      });

      await refreshFiles()
    } catch (error) {
      console.error('Error moving file:', error)
      setError('移动文件失败，请重试')
    }
  }

  const isDescendant = (fileId: string, targetParentId: string | null): boolean => {
    if (!targetParentId) return false
    
    let currentParentId: string | null = targetParentId
    while (currentParentId) {
      if (currentParentId === fileId) return true
      const parentFile = files.find(f => f.id === currentParentId)
      currentParentId = parentFile?.parent_id || null
    }
    return false
  }

  // 添加一个辅助函数来检查件夹是否为空
  const isFolderEmpty = (folderId: string) => {
    return !files.some(file => file.parent_id === folderId)
  }
  // 修改 renderDraggableItem 函数
  const renderDraggableItem = (file: FileItem, provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
    const isLocalFile = 'isLocal' in file
    const depth = getItemDepth(file);
    
    // 如果是文件夹，包装一个 Droppable
    if (file.type === 'folder') {
      return (
        <Droppable droppableId={file.id}>
          {(dropProvided, dropSnapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                marginLeft: `${depth * 20}px`,
              }}
            >
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`
                  ${snapshot.isDragging ? 'opacity-70 shadow-lg z-[9999]' : ''}
                  ${dropSnapshot.isDraggingOver ? 'bg-blue-50' : ''}
                  ${currentEditingFile?.id === file.id ? 'bg-blue-100' : ''}
                  ${isLocalFile ? 'border-l-2 border-blue-400' : ''}
                  hover:bg-gray-50
                  transition-all duration-200
                  rounded-lg
                  min-h-[40px]
                `}
              >
                <div className="flex items-center p-2 gap-2">
                  {!isFolderEmpty(file.id) && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(file.id);
                      }}
                      className="cursor-pointer"
                    >
                      {expandedFolders.has(file.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                  <Folder className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700 truncate">
                    {file.name}
                  </span>
                </div>
                {dropProvided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      );
    }

    // 如果是文件，保持原样
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={{
          ...provided.draggableProps.style,
          marginLeft: `${depth * 20}px`,
        }}
        className={`
          ${snapshot.isDragging ? 'opacity-70 shadow-lg z-[9999]' : ''}
          ${currentEditingFile?.id === file.id ? 'bg-blue-100' : ''}
          ${isLocalFile ? 'border-l-2 border-blue-400' : ''}
          hover:bg-gray-50
          transition-colors duration-200
          rounded-lg
          min-h-[40px]
        `}
      >
        <div className="flex items-center p-2 gap-2">
          {getFileIcon(file.name)}
          <span 
            className="text-sm text-gray-700 truncate"
            onClick={() => handleFileSelect(file)}
          >
            {file.name}
          </span>
        </div>
      </div>
    );
  };

  // 新增：获取项目的深度
  const getItemDepth = (file: FileItem): number => {
    let depth = 0;
    let currentFile = file;
    
    while (currentFile.parent_id) {
      depth += 1;
      currentFile = files.find(f => f.id === currentFile.parent_id) || currentFile;
    }
    
    return depth;
  };

  // 新增：获取可见的文件列表（考虑折叠状态）
  const getVisibleFiles = (): FileItem[] => {
    const visibleFiles: FileItem[] = [];
    
    const addFilesRecursively = (parentId: string | null) => {
      const filesInFolder = files.filter(f => f.parent_id === parentId);
      
      filesInFolder.forEach(file => {
        visibleFiles.push(file);
        if (file.type === 'folder' && expandedFolders.has(file.id)) {
          addFilesRecursively(file.id);
        }
      });
    };
    
    addFilesRecursively(null);
    return visibleFiles;
  };

  // 修改文件上传处理函数
  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        // 读取文件内容
        const content = await file.text()
        

        

        // 使用 FileContext 的方法创建文件
        await createFile({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: 'file',
          parent_id: uploadTargetFolder,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // 刷新文件列表
        await refreshFiles()
      }
      
      setShowUploadDialog(false)
      setUploadTargetFolder(null)
    } catch (error) {
      console.error('Error uploading files:', error)
      setError('上传文件失败，请重试')
    }
  }

  // 一个函数来获取文件的完整路径
  const getFilePath = (file: FileItem): string => {
    const parts: string[] = [file.name]
    let currentFile = file
    
    while (currentFile.parent_id) {
      const parent = files.find(f => f.id === currentFile.parent_id)
      if (!parent) break
      parts.unshift(parent.name)
      currentFile = parent
    }
    
    return parts.join(' / ')
  }

  // 监听文件事件
  useEffect(() => {
    const handleFileEvent = (event: Event) => {
      const fileEvent = event as CustomEvent;
      const { type } = fileEvent;

      const refreshEvents = [
        FILE_EVENTS.CREATED,
        FILE_EVENTS.DELETED,
        FILE_EVENTS.UPDATED,
        FILE_EVENTS.MOVED,
        FILE_EVENTS.RENAMED,
      ] as const;

      if (refreshEvents.includes(type as typeof refreshEvents[number])) {
        const file = (fileEvent as CustomEvent<FileEventDetail>).detail?.file;
        if (!file || !file.id.startsWith('local_')) {
          fetchFiles();
        }
      }
    };

    const eventsToListen = [
      FILE_EVENTS.CREATED,
      FILE_EVENTS.DELETED,
      FILE_EVENTS.UPDATED,
      FILE_EVENTS.MOVED,
      FILE_EVENTS.RENAMED,
    ] as const;

    eventsToListen.forEach(eventType => {
      fileEvents.addEventListener(eventType, handleFileEvent);
    });

    return () => {
      eventsToListen.forEach(eventType => {
        fileEvents.removeEventListener(eventType, handleFileEvent);
      });
    };
  }, [fetchFiles]);

  // 修改文件选择处理
  const handleFileSelect = (file: FileItem ) => {
    console.log('FileManager: Sending select event for file:', file)
    selectFile(file)  // 只发送事件，不处理状态更新
  }



  // 获取要显示的文件列表
  const displayFiles = files

  return (
    <div className="flex flex-col bg-white h-full">
      {/* Header with Search */}
      <div className="flex-none px-4 h-12 border-b flex items-center gap-4">
        <h2 className="font-medium text-sm">文件</h2>
        <div className="flex-1" /> {/* 空白间隔 */}
        <FileSearchComponent
          onSelect={(fileId) => {
            const file = files.find(f => f.id === fileId)
            if (file) {
              handleFileSelect(file)
            }
          }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => handleCreateFile(null)}
              className="flex items-center gap-2"
            >
              <File className="h-4 w-4 text-gray-500" />
              <span>新建文件</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4 text-gray-500" />
              <span>上传文件</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto px-2 py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">加载文件中...</span>
          </div>
        ) : displayFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-400">
            <File className="h-8 w-8" />

          </div>
        ) : (
          <DragDropContext 
            onDragEnd={handleDragEnd}
          >
            <Droppable 
              droppableId="root"
              isDropDisabled={true}
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-1"
                >
                  {getVisibleFiles().map((file, index) => (
                    <Draggable
                      key={file.id}
                      draggableId={file.id}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <ContextMenu>
                          <ContextMenuTrigger>
                            {renderDraggableItem(file, dragProvided, dragSnapshot)}
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            {file.type === 'folder' && (
                              <>
                                <ContextMenuItem
                                  onClick={() => handleCreateFile(file.id)}
                                  className="flex items-center gap-2"
                                >
                                  <File className="h-4 w-4" />
                                  <span>新建文件</span>
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() => handleCreateFolderInFolder(file.id)}
                                  className="flex items-center gap-2"
                                >
                                  <Folder className="h-4 w-4" />
                                  <span>新建文件夹</span>
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() => {
                                    setShowUploadDialog(true)
                                    setUploadTargetFolder(file.id)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Upload className="h-4 w-4" />
                                  <span>上传文件</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                              </>
                            )}
                            <ContextMenuItem
                              onClick={() => handleRename(file)}
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>重命名</span>
                            </ContextMenuItem>
                            {file.type === 'file' && (
                              <ContextMenuItem
                                onClick={() => handleDownload(file)}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                <span>下载</span>
                              </ContextMenuItem>
                            )}
                            <ContextMenuItem
                              onClick={() => handleDelete(file)}
                              className="flex items-center gap-2 text-red-600"
                            >
                              <Trash className="h-4 w-4" />
                              <span>删除</span>
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Footer */}
      <div className="flex-none h-8 border-t bg-gray-50/50 px-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>共 {files.length} 个文件</span>
          <span>·</span>
          <span>{files.filter(f => f.type === 'folder').length} 个文件夹</span>
        </div>
        <div>
          {isLoading && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>同步中...</span>
            </div>
          )}
        </div>
      </div>

      <FileUpload
        isOpen={showUploadDialog}
        onClose={() => {
          setShowUploadDialog(false)
          setUploadTargetFolder(null)
        }}
        onUpload={handleUpload}
      />

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>重命名{selectedFile?.type === 'folder' ? '文件夹' : '文件'}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  请输入新的名称
                </div>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      {selectedFile.type === 'folder' ? (
                        <Folder className="h-4 w-4 text-gray-500" />
                      ) : (
                        getFileIcon(selectedFile.name)
                      )}
                      <span className="font-medium">{getFilePath(selectedFile)}</span>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称
              </Label>
              <Input
                id="name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="col-span-3"
                autoFocus
                disabled={isRenaming}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              onClick={handleRenameConfirm}
              disabled={isRenaming || !newFileName.trim()}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  重命名中...
                </>
              ) : (
                '确认'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {selectedFile?.type === 'folder' 
                    ? '确定要删除此文件夹及其所有内容吗？此操作无法撤销。'
                    : '确定要删除此文件吗？此操作无法撤销。'
                  }
                </div>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      {selectedFile.type === 'folder' ? (
                        <Folder className="h-4 w-4 text-gray-500" />
                      ) : (
                        getFileIcon(selectedFile.name)
                      )}
                      <span className="font-medium">{getFilePath(selectedFile)}</span>
                    </div>
                    {selectedFile.type === 'folder' && (
                      <div className="mt-2 text-xs text-gray-500">
                        包含 {files.filter(f => isDescendant(selectedFile.id, f.parent_id)).length} 个项目
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
