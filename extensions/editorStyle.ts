import { Extension } from '@tiptap/core'

export const EditorStyle = Extension.create({
  name: 'editorStyle',

  addOptions() {
    return {
      // 可以通过选项配置样式
      className: 'custom-editor-content',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          // 可以添加自定义属性
        },
      },
    ]
  },

  onCreate() {
    // 当编辑器创建时添加自定义类名
    const element = this.editor.view.dom as HTMLElement
    element.classList.add(this.options.className)
  },
}) 