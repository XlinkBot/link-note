'use client'

import { useEffect, useRef, useCallback } from 'react'
import elasticlunr from 'elasticlunr'
import { calculateMD5 } from '@/lib/md5'
import { useIndex } from '@/contexts/IndexContext'
import { getFileDB } from '@/lib/indexeddb'
import { BaseFileItem } from '@/types/file'

const fileDB = getFileDB()
interface IndexState {
  lastUpdated: number
  serializedIndex: string
  fileHashes: { [fileId: string]: string }
}

export const DocumentIndexer = () => {
  const { 
    updateIndexedFiles, 
    setIsIndexing,
    isIndexing,
  } = useIndex()

  const initialized = useRef(false);

  const loadIndexState = useCallback(() => {
    try {
      const state = localStorage.getItem(`document-index`)
      if (state) {
        const parsedState = JSON.parse(state)
        updateIndexedFiles(Object.keys(parsedState.fileHashes))
        return parsedState
      }
    } catch (error) {
      console.error('加载索引状态出错:', error)
    }
    return null
  }, [updateIndexedFiles]);

  const needsReindex = useCallback(async (file: BaseFileItem, indexState: IndexState | null): Promise<boolean> => {
    if (!indexState || !indexState.fileHashes[file.id]) return true
    
    if (file.md5) {
      return file.md5 !== indexState.fileHashes[file.id]
    }

    try {
      const fileData = await fileDB?.getFile(file.id)
      if (!fileData?.content) return true
      
      const currentHash = await calculateMD5(fileData.content)
      return currentHash !== indexState.fileHashes[file.id]
    } catch (error) {
      console.error('Error checking file hash:', error)
      return true
    }
  }, []);

  const indexDocuments = useCallback(async () => {
    if (isIndexing) return

    try {
      setIsIndexing(true)

      const files = await fileDB?.listFiles()
      const textFiles = files?.filter(f => f.type === 'file')
      
      const indexState = loadIndexState()

      const index = indexState?.serializedIndex ? 
        elasticlunr.Index.load(JSON.parse(indexState.serializedIndex)) :
        elasticlunr(function() {
          this.addField('title' as never)
          this.addField('body' as never)
          this.addField('path' as never)
          this.addField('type' as never)
          this.setRef('id' as never)
          this.pipeline.reset()
        })

      const newFileHashes = { ...indexState?.fileHashes || {} }
      let hasUpdates = false

      for (let i = 0; i < textFiles.length; i++) {
        const file = textFiles[i]
      
        if (await needsReindex(file, indexState)) {
          hasUpdates = true

          try {
            const fileData = await fileDB.getFile(file.id)
            if (!fileData?.content) continue
            
            const currentHash = await calculateMD5(fileData.content)

            if (index.documentStore.hasDoc(file.id)) {
              index.removeDoc({ id: file.id })
            }

            index.addDoc({
              id: file.id,
              title: file.name,
              body: fileData.content,
              type: file.type
            })

            newFileHashes[file.id] = currentHash
          } catch (error) {
            console.error(`处理文件 ${file.name} 时出错:`, error)
          }
        }
      }

      if (hasUpdates) {
        const serializedIndex = index.toJSON()
        const newState: IndexState = {
          lastUpdated: Date.now(),
          serializedIndex: JSON.stringify(serializedIndex),
          fileHashes: newFileHashes
        }
        
        try {
          console.log('保存索引状态:', {
            lastUpdated: newState.lastUpdated,
            documentsCount: Object.keys(JSON.parse(newState.serializedIndex)).length,
            fileHashes: Object.keys(newState.fileHashes)
          })
          localStorage.setItem(`document-index`, JSON.stringify(newState))
          updateIndexedFiles(Object.keys(newState.fileHashes))
        } catch (error) {
          console.error('保存索引状态出错:', error)
        }
      }

    } catch (error) {
      console.error('索引过程出错:', error)
    } finally {
      setIsIndexing(false)
    }
  }, [isIndexing, loadIndexState, needsReindex, setIsIndexing, updateIndexedFiles]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      Promise.all([
        loadIndexState(),
        indexDocuments()
      ]).catch(error => {
        console.error('Error during initialization:', error)
      });
    }
  }, [indexDocuments, loadIndexState]);

  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key?.startsWith('file_content_')) {
        await indexDocuments()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [indexDocuments])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isIndexing && (
        <div className="bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">正在索引文件...</span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
            />
          </div>
        </div>
      )}
    </div>
  )
} 