import { Mark, mergeAttributes } from '@tiptap/core'

interface DiffMarkAttributes {
  class?: string
  'data-diff-type'?: string
}

export const DiffDeletedMark = Mark.create({
  name: 'diffDeleted',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'diff-deleted',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type="deleted"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: DiffMarkAttributes }) {
    return ['span', mergeAttributes(
      { 'data-diff-type': 'deleted' },
      this.options.HTMLAttributes,
      HTMLAttributes
    ), 0]
  },
})

export const DiffAddedMark = Mark.create({
  name: 'diffAdded',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'diff-added',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type="added"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: DiffMarkAttributes }) {
    return ['span', mergeAttributes(
      { 'data-diff-type': 'added' },
      this.options.HTMLAttributes,
      HTMLAttributes
    ), 0]
  },
}) 