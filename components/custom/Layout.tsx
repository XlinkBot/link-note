'use client'

import React from 'react'
import { FileManager } from '@/components/custom/FileManager'
import { EditorWrapper } from '@/components/custom/editor/EditorWrapper'
import { DocumentIndexer } from '@/components/custom/DocumentIndexer'
import { PromptConfig } from '@/components/custom/PromptConfig'
import { IndexProvider } from '@/contexts/IndexContext'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = () => {
  return (
    <IndexProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <DocumentIndexer />
        <div className="flex-1 flex overflow-hidden">
          <aside className="w-64 flex-none border-r bg-white overflow-hidden flex flex-col">
            <div className="h-[66vh] overflow-auto">
              <FileManager />
            </div>
            <div className="flex-1">
              <PromptConfig />
            </div>    
          </aside>
          <main className="flex-1 overflow-hidden bg-white">
            <EditorWrapper />
          </main>
        </div>
      </div>
    </IndexProvider>
  )
}
