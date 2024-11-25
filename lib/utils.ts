
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { Extension, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Markdown } from "tiptap-markdown"
import { createLowlight, common } from 'lowlight'
import { MessageEditor } from '@/extensions/messageEditor'


// 导入更多语言支持
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import py from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Link from "@tiptap/extension-link"
import Blockquote from "@tiptap/extension-blockquote"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"


// 创建 lowlight 实例并注册语言
const lowlight = createLowlight(common)

// 注册所有语言
lowlight.register({
  js,
  javascript: js,
  ts,
  typescript: ts,
  python: py,
  py,
  java,
  cpp,
  'c++': cpp,
  rust,
  go,
  bash,
  sh: bash,
  shell: bash,
  sql,
  json,
  yaml,
  yml: yaml,
  xml,
  html: xml,
  css,
  md: markdown,
  markdown
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const createMessageEditor = (options?: {
  extensions?: Extension[],
  editable?: boolean,
  onCopy?: (text: string) => void,
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useEditor({
    extensions: [
      ...defaultEditorExtensions(),
      ...(options?.extensions || []),
      MessageEditor.configure({
        onCopy: options?.onCopy,
      }),
    ],
    editable: options?.editable ?? true,
  })
}


export function defaultEditorExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Underline.configure({}),
    Highlight.configure({
      multicolor: false,
      HTMLAttributes: {
        class: 'bg-yellow-100',
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
      HTMLAttributes: {
        class: [
          'rounded-md',
          'bg-gray-900',
          'p-4',
          'my-4',
          'overflow-x-auto',
          'relative',
          // 代码块样式
          '[&_pre]:text-sm',
          '[&_pre]:font-mono',
          '[&_pre]:leading-relaxed',
          '[&_pre]:bg-transparent',
          // 语言标签样式
          '[&::before]:absolute',
          '[&::before]:top-0',
          '[&::before]:right-0',
          '[&::before]:px-2',
          '[&::before]:py-1',
          '[&::before]:text-xs',
          '[&::before]:font-mono',
          '[&::before]:text-gray-400',
          '[&::before]:bg-gray-800',
          '[&::before]:rounded-bl',
          '[&::before]:content-[attr(data-language)]',
          // 语法高亮样式
          '[&_.hljs-keyword]:text-purple-400',
          '[&_.hljs-function]:text-blue-400',
          '[&_.hljs-string]:text-green-400',
          '[&_.hljs-number]:text-orange-400',
          '[&_.hljs-comment]:text-gray-500',
          '[&_.hljs-operator]:text-gray-300',
          '[&_.hljs-punctuation]:text-gray-300',
          '[&_.hljs-property]:text-blue-300',
          '[&_.hljs-variable]:text-red-300',
          '[&_.hljs-title]:text-blue-400',
          '[&_.hljs-params]:text-orange-300',
          '[&_.hljs-built_in]:text-cyan-400',
          // 代码块内部的代码背景色
          '[&_code]:bg-transparent',
        ].join(' ')
      }
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        class: 'text-blue-500 hover:underline'
      }
    }),
    Blockquote.configure({
      HTMLAttributes: {
        class: 'border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700'
      }
    }),
    TaskList,
    TaskItem,
    Markdown.configure({
      html: false,
      transformPastedText: true,
      transformCopiedText: true
    })
  ]

}
