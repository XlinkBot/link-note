import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface MessageEditorOptions {
  onCopy?: (text: string) => void
}

export const MessageEditor = Extension.create<MessageEditorOptions>({
  name: 'messageEditor',

  addOptions() {
    return {
      onCopy: undefined,
    }
  },

  addProseMirrorPlugins() {
    const { onCopy } = this.options

    return [
      new Plugin({
        key: new PluginKey('messageEditor'),
        props: {
          handleDOMEvents: {
            mouseover: (view, event) => {
              const target = event.target as HTMLElement
              const paragraph = target.closest('p')
              

              if (paragraph) {
                // 为段落添加可点击的样式
                paragraph.classList.add('hoverable-block')
                // 添加点击事件
                if (!paragraph.dataset.hasClickHandler) {
                  paragraph.dataset.hasClickHandler = 'true'
                  paragraph.addEventListener('click', (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onCopy?.(paragraph.textContent || '')
                  })
                }
              }
              return false
            },
            mouseout: (view, event) => {
              const target = event.target as HTMLElement
              const paragraph = target.closest('p')
              
              if (paragraph) {
                // 移除hover样式
                paragraph.classList.remove('hoverable-block')
              }
              return false
            }
          }
        }
      }),
    ]
  },
}) 