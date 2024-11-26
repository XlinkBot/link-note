"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getFileDB } from "@/lib/indexeddb";
import { BaseFileItem } from "@/types/file";
import { FILE_EVENTS, FileContextType, FileItem } from "@/types/file";
import { FileEvent, FileEventType, FileEventDetail } from "@/types/file";



// 创建事件发射器
export const fileEvents = new EventTarget();

const FileContext = createContext<FileContextType>({} as FileContextType);

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000);
  const [openFiles, setOpenFiles] = useState<(FileItem | FileItem)[]>([]);
  const [currentEditingFile, setCurrentEditingFile] = useState<
    (FileItem | FileItem) | null
  >(null);
  const [fileDB, setFileDB] = useState<ReturnType<typeof getFileDB>>();

  // 在客户端初始化 fileDB
  useEffect(() => {
    setFileDB(getFileDB());
  }, []);

  // 检查是否有未保存的更改
  const hasUnsavedChanges = openFiles.some(
    (file) => file.isTemp && file.isDirty
  );

  // 修改自动保存功能
  useEffect(() => {
    if (!autoSaveInterval) return;

    const autoSaveTimer = setInterval(() => {
      openFiles.forEach((file) => {
        if (file.isDirty) {
          // 只传入需要更新的属性
          fileDB?.saveFile({
            id: file.id,
            content: file.content,
            file_references: file.file_references,
          });
        }
      });
    }, autoSaveInterval);

    return () => clearInterval(autoSaveTimer);
  }, [openFiles, autoSaveInterval, fileDB]);


  const saveFile = async (
    fileId: string,
    content: string,
    newFileName: string,
    onComplete?: () => void
  ) => {
    try {
      const newFile = await getFileDB().createFile({
        id: fileId,
        name: newFileName,
        type: "file",
        parent_id: null,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_references: [],
      });

      setOpenFiles((prev) => prev.map((f) => 
        f.id === fileId 
          ? { ...newFile }
          : f
      ));
      
      setCurrentEditingFile(newFile);

      dispatchFileEvent(FILE_EVENTS.CREATED, {
        file: newFile,
      });

      await refreshFiles();
      onComplete?.();
      return newFile;
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  };

  // 离开页面提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "您有未保存的更改，确定要离开吗？";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const discardChanges = (fileId: string) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (!file) return;
    if (file.isTemp && file.isDirty) {
      // 如果是临时文件, 直接删除
      setOpenFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else {
      getFileContent(fileId);
      setOpenFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isDirty: false } : f))
      );
    }
  };

  const createDirectory = async (parentId: string, name: string): Promise<FileItem> => {
    return await getFileDB().createFile({
      id: `dir_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      type: "folder",
      parent_id: parentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  // 修改创建本地文件的方法
  const createFileItem = (
    parentId: string | null = null  
  ): Promise<FileItem> => {
    // 生成唯一的本地文件 ID
    const uniqueId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 创建本地文件对象
    const FileItem: FileItem = {
      id: uniqueId,
      name: `untitled.md`,
      type: 'file',
      parent_id: parentId,
      isDirty: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: '',
      file_references: [],
      isTemp: true,
    };

    // 使用 Promise 确保状态更新的顺序性
    return new Promise<FileItem>((resolve) => {
      // 先更新 IndexedDB
      fileDB?.createFile(FileItem)
        .then(() => {
          // 然后更新状态

          
          setOpenFiles(prev => {
            // 检查文件是否已经打开
            if (prev.some(f => f.id === uniqueId)) {
              return prev;
            }
            return [...prev, FileItem];
          });
          
          setCurrentEditingFile(FileItem);

          // 触发事件
          dispatchFileEvent(FILE_EVENTS.OPENED, {
            file: FileItem,
          });

          resolve(FileItem);
        })
        .catch(error => {
          console.error("Error creating local file:", error);
          resolve(FileItem); // 即使出错也返回文件对象
        });
    });
  };

  // 在 FileProvider 中加事件分发
  const dispatchFileEvent = (type: FileEventType, detail: FileEventDetail) => {
    console.log("Dispatching file event:", { type, detail });
    const event = new CustomEvent(type, { detail });
    fileEvents.dispatchEvent(event);
  };

  // 修改文内容更方法
  const updateFileContent = async (fileId: string, content: string, file_references: string[]) => {
    if (!fileDB) return;
    
    try {
      await fileDB.updateFile({
        id: fileId,
        content,
        file_references,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating file content:", error);
      throw error;
    }
  };


  const refreshFiles = async (): Promise<BaseFileItem[]> => {
    try {
      const files = await getFileDB().listFiles();
      
      return files;
    } catch (error) {
      console.error("Error refreshing files:", error);
      throw error;
    }
  };

  useEffect(() => {
    const handleFileEvent = (event: Event) => {
      const fileEvent = event as FileEvent;
      const { type, detail } = fileEvent;
      const { file } = detail;


      switch (type) {
        case FILE_EVENTS.CREATED:
          setOpenFiles((prev) => {
            const filteredFiles = prev.filter(
              (f) => file.isTemp || f.id !== file.id
            );
            return [file, ...filteredFiles];
          });
          break;

        case FILE_EVENTS.UPDATED:
          setOpenFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    updated_at: new Date().toISOString(),
                  }
                : f
            )
          );
          break;

      }
    };

    Object.values(FILE_EVENTS).forEach((eventType) => {
      fileEvents.addEventListener(eventType, handleFileEvent);
    });

    return () => {
      Object.values(FILE_EVENTS).forEach((eventType) => {
        fileEvents.removeEventListener(eventType, handleFileEvent);
      });
    };
  }, []);


  const deleteFile = async (fileId: string) => {
    try {
      // 1. 获取所有文件
      const allFiles = await getFileDB().listFiles();
      
      // 2. 找到所有引用了要删除文件的文件
      const filesReferencingThis = allFiles.filter(file => 
        file.file_references?.includes(fileId)
      );

      // 3. 从这些文件中移除对要删除文件的引用
      for (const file of filesReferencingThis) {
        const updatedRefs = file.file_references?.filter(ref => ref !== fileId) || [];
        await fileDB?.updateReferences(file.id, updatedRefs);
      }

      // 4. 删除文件本身
      await fileDB?.deleteFile(fileId);

      // 5. 更新状态
      setOpenFiles(prev => prev.filter(f => f.id !== fileId));
      
      // 6. 如果是当前编辑的文件，切换到其他文件
      if (currentEditingFile?.id === fileId) {
        const remainingFiles = openFiles.filter(f => f.id !== fileId);
        setCurrentEditingFile(remainingFiles.length > 0 ? remainingFiles[0] : null);
      }

      // 7. 触发删除事件
      dispatchFileEvent(FILE_EVENTS.DELETED, {
        file: {
          id: fileId,
          name: '',  // 这些字段是必需的，但此时文件已删除
          type: 'file',
          parent_id: null,
          created_at: '',
          updated_at: '',
        },
      });

      console.log(`File ${fileId} and all its references have been cleaned up`);
    } catch (error) {
      console.error("Error deleting file and cleaning up references:", error);
      throw error;
    }
  };

  const getFileContent = async (fileId: string) => {
    try {
      const file = await fileDB?.getFile(fileId);
      return file?.content;
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  };

  const getFileReferences = async (fileId: string) => {
    const references = await fileDB?.listReferences(fileId);
    return references || [];
  };



  // 修改 closeFile 方法
  const closeFile = (fileId: string) => {
    console.log("FileContext: Closing file:", fileId);
    const file = openFiles.find((f) => f.id === fileId);
    if (!file) {
      console.log("FileContext: File not found");
      return;
    }

    // 先发送关事件
    dispatchFileEvent(FILE_EVENTS.CLOSED, {
      file,
    });

    // 从打开的文件列表中移除
    setOpenFiles((prev) => {
      const newOpenFiles = prev.filter((f) => f.id !== fileId);
      console.log("FileContext: Updated open files:", newOpenFiles);
      return newOpenFiles;
    });

    // 如果是当前编辑的文件，切换到其他文件或清空
    if (currentEditingFile?.id === fileId) {
      const remainingFiles = openFiles.filter((f) => f.id !== fileId);
      setCurrentEditingFile(
        remainingFiles.length > 0 ? remainingFiles[0] : null
      );
    }

    if (file.isTemp) {
      console.log("FileContext: Cleaning up local file");
      // 如果是本地文件，从文件表中删除

      deleteFile(fileId);

      setOpenFiles((prev) => {
        const newFiles = prev.filter((f) => f.id !== fileId);
        console.log("FileContext: Updated files:", newFiles);
        return newFiles;
      });

    }
  };

  const updateFile = async (file: BaseFileItem & { id: string }): Promise<FileItem> => {
    await fileDB?.updateFile(file);
    return file as FileItem;
  }

  const createFile = async (file: BaseFileItem & { id: string }): Promise<FileItem> => {
    await fileDB?.createFile(file);
    return file as FileItem;
  }

  // 修改选择文件的方法
  const selectFile = (file: FileItem ) => {
    console.log("FileContext: Selecting file:", file);

    const isFileAlreadyOpen = openFiles.some((f) => f.id === file.id);

    if (!isFileAlreadyOpen) {
      setOpenFiles((prev) => [...prev, file]);
      dispatchFileEvent(FILE_EVENTS.OPENED, {
        file,
      });
    }
    setCurrentEditingFile(file);
  };

  const updateFileReferences = async (fileId: string, references: string[]) => {
    const file = await fileDB?.getFile(fileId);
    if (!file) return;
    file.file_references = references;
  };


  return (
    <FileContext.Provider
      value={{
        openFiles,
        createFile,
        refreshFiles,
        createFileItem,
        createDirectory,
        saveFile,
        updateFileContent,
        deleteFile,
        updateFile,
        getFileContent,
        hasUnsavedChanges,
        autoSaveInterval,
        setAutoSaveInterval,
        discardChanges,
        closeFile,
        selectFile,
        currentEditingFile,
        setCurrentEditingFile,
        updateFileReferences,
        getFileReferences
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error("useFiles must be used within a FileProvider");
  }
  return context;
};
