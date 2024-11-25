'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface IndexContextType {
  indexedFiles: Set<string>
  updateIndexedFiles: (files: string[]) => void
  isIndexing: boolean
  setIsIndexing: (value: boolean) => void
}

const IndexContext = createContext<IndexContextType>({} as IndexContextType)

export function IndexProvider({ children }: { children: React.ReactNode }) {
  const [indexedFiles, setIndexedFiles] = useState<Set<string>>(new Set())
  const [isIndexing, setIsIndexing] = useState(false)

  // 从 localStorage 加载初始状态
  useEffect(() => {
    const indexState = localStorage.getItem('document-index')
    if (indexState) {
      const { fileHashes } = JSON.parse(indexState)
      setIndexedFiles(new Set(Object.keys(fileHashes)))
    }
  }, [])

  const updateIndexedFiles = (files: string[]) => {
    setIndexedFiles(new Set(files))
  }

  return (
    <IndexContext.Provider 
      value={{ 
        indexedFiles, 
        updateIndexedFiles,
        isIndexing,
        setIsIndexing,
      }}
    >
      {children}
    </IndexContext.Provider>
  )
}

export function useIndex() {
  const context = useContext(IndexContext)
  if (context === undefined) {
    throw new Error('useIndex must be used within an IndexProvider')
  }
  return context
} 