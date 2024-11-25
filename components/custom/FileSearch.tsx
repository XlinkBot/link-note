'use client'

import React from 'react'
import { Search, FileText } from "lucide-react"
import { useFiles } from '@/contexts/FileContext'
import elasticlunr from 'elasticlunr'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface FileSearchProps {
  onSelect?: (fileId: string) => void
}

interface SearchResult {
  id: string
  name: string
  type: string
  score: number
  content?: string
}

export const FileSearch: React.FC<FileSearchProps> = ({
  onSelect,
}) => {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const { refreshFiles } = useFiles()

  // 从 localStorage 获取索引
  const getSearchIndex = () => {
    try {
      const state = localStorage.getItem(`document-index`)
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
    
    // 如果查询为空，清空结果并返回
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
    const searchResults = await Promise.all(results
      .map(async (result) => {
        const files = await refreshFiles()
        const file = files.find(f => f.id === result.ref)
        if (file) {
          return {
            id: file.id,
            name: file.name,
            type: file.type,
            score: result.score,
            content: file.content
          }
        }
        return null
      }))
     

    setSearchResults(searchResults.filter(Boolean) as SearchResult[])
  }

  // 获取可用的文件列表 - 只在有搜索查询时显示搜索结果
  const availableFiles = searchQuery.trim() 
    ? searchResults
    : []  // 空查询时返回空数组，而不是所有文件

  const handleSelect = (fileId: string) => {
    onSelect?.(fileId)
    setOpen(false)
    setSearchQuery('')
    setSearchResults([]) // 清空搜索结果
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[400px]" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="搜索文件..." 
            value={searchQuery}
            onValueChange={handleSearch}
            autoFocus
          />
          <CommandList className="max-h-[300px]">
            {!searchQuery.trim() ? (
              <CommandEmpty>输入关键词开始搜索...</CommandEmpty>
            ) : availableFiles.length === 0 ? (
              <CommandEmpty>没有找到匹配的文档</CommandEmpty>
            ) : (
              <CommandGroup heading={`${availableFiles.length} 个文件`}>
                {availableFiles.map((file) => (
                  <CommandItem
                    key={file.id}
                    value={file.id}
                    onSelect={() => handleSelect(file.id)}
                    className="cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                  >
                    <div className="flex items-start gap-2 py-1">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {file.name}
                        </div>
                        {file.content && (
                          <div className="text-xs text-gray-500 truncate">
                            {file.content.slice(0, 100)}...
                          </div>
                        )}
                        {file.score !== 1 && (
                          <div className="text-xs text-gray-400">
                            相关度: {(file.score * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 