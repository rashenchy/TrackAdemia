'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo2,
  Redo2,
} from 'lucide-react'
import { normalizeRichTextEditorValue } from '@/lib/research/document'

function ToolbarButton({
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

export function ResearchRichTextEditor({
  inputName,
  value,
  onChange,
  placeholder,
  editable = true,
  onMouseUp,
}: {
  inputName?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  editable?: boolean
  onMouseUp?: () => void
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    content: normalizeRichTextEditorValue(value),
    editable,
    editorProps: {
      attributes: {
        class:
          'trackademia-editor min-h-[220px] rounded-b-xl px-4 py-3 outline-none text-[var(--foreground)]',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return

    const normalizedValue = normalizeRichTextEditorValue(value)
    if (editor.getHTML() !== normalizedValue) {
      editor.commands.setContent(normalizedValue, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  return (
    <div className="rounded-xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950">
      {inputName ? <input type="hidden" name={inputName} value={value} /> : null}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <ToolbarButton
          active={editor?.isActive('bold')}
          disabled={!editor || !editable}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic')}
          disabled={!editor || !editable}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('heading', { level: 1 })}
          disabled={!editor || !editable}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('heading', { level: 2 })}
          disabled={!editor || !editable}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('bulletList')}
          disabled={!editor || !editable}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('orderedList')}
          disabled={!editor || !editable}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor?.can().chain().focus().undo().run()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor?.can().chain().focus().redo().run()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      <div className="relative">
        {!editor?.getText().trim() && (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-gray-400">
            {placeholder}
          </div>
        )}
        <div onMouseUp={onMouseUp}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
