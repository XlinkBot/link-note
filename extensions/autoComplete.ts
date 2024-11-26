import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Editor } from '@tiptap/core'
import { Command } from '@tiptap/core'

interface AutoCompleteOptions {
  suggestion: string | null
  isLoading?: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    autoComplete: {
      setSuggestion: (suggestion: string | null) => Command
      setLoading: (isLoading: boolean) => Command
      acceptSuggestion: () => Command
      clearSuggestion: () => Command
    }
  }
}

export const AutoComplete = Extension.create<AutoCompleteOptions>({
  name: 'autoComplete',

  addOptions() {
    return {
      suggestion: null,
      isLoading: false,
    }
  },

  addStorage() {
    return {
      suggestion: null as string | null,
      isLoading: false,
    }
  },

  addCommands() {
    return {
      setSuggestion: (suggestion: string | null): Command => ({ editor }) => {
        editor.storage.autoComplete.suggestion = suggestion
        editor.storage.autoComplete.isLoading = false
        return true
      },

      setLoading: (isLoading: boolean): Command => ({ editor }) => {
        editor.storage.autoComplete.isLoading = isLoading
        console.log('[AutoComplete] setLoading', isLoading)
        return true
      },

      acceptSuggestion: (): Command => ({ editor, tr }) => {
        const suggestion = editor.storage.autoComplete.suggestion
        if (!suggestion) return false
        
        const { selection } = editor.state
        const { from } = selection
        
        tr.insertText(suggestion, from)
        editor.storage.autoComplete.suggestion = null
        
        return true
      },

      clearSuggestion: (): Command => ({ editor }) => {
        editor.storage.autoComplete.suggestion = null
        editor.storage.autoComplete.isLoading = false
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoComplete'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply: (tr, oldState) => {
            if (tr.docChanged && this.editor?.storage.autoComplete.suggestion) {
              this.editor.storage.autoComplete.suggestion = null
              this.editor.storage.autoComplete.isLoading = false
              return DecorationSet.empty
            }

            const suggestion = this.editor?.storage.autoComplete.suggestion
            const isLoading = this.editor?.storage.autoComplete.isLoading
            console.log('[AutoComplete] suggestion', suggestion)
            console.log('[AutoComplete] isLoading', isLoading)
            //if (!suggestion && !isLoading) return DecorationSet.empty
            
            const pos = tr.selection.$head.pos
            const decorations: Decoration[] = []
           
            if (isLoading) {
              console.log('[AutoComplete] isLoading pushing loading icon', isLoading)
              const loadingWidget = document.createElement('span')
              loadingWidget.className = 'auto-complete-loading'
              decorations.push(
                Decoration.widget(pos, loadingWidget, {
                  side: 1,
                  key: 'loading'
                })
              )
            }

            if (suggestion) {
              const suggestionWidget = document.createElement('span')
              suggestionWidget.className = 'text-gray-400 pointer-events-none select-none'
              suggestionWidget.textContent = suggestion
              decorations.push(
                Decoration.widget(pos, suggestionWidget, {
                  side: 1,
                  key: 'suggestion'
                })
              )
            }

            return DecorationSet.create(tr.doc, decorations)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      }),
    ]
  },
}) 