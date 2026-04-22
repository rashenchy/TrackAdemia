'use client'

import { useId, useState } from 'react'
import { Editor } from '@hugerte/hugerte-react'
import { normalizeRichTextEditorValue } from '@/lib/research/document'

export function ResearchRichTextEditor({
  inputName,
  value,
  onChange,
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
  const editorId = useId().replace(/:/g, '-')
  const normalizedValue = normalizeRichTextEditorValue(value)
  const [initialValue] = useState(() => normalizedValue)

  return (
    <div className="rounded-xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950">
      {inputName ? <input type="hidden" name={inputName} value={value} /> : null}

      <div className="relative">
        <div
          data-editor-content-root
          data-annotation-text-root="true"
          onMouseUp={onMouseUp}
          className="min-h-[320px]"
        >
          <Editor
            id={`research-editor-${editorId}`}
            initialValue={initialValue}
            value={normalizedValue}
            onEditorChange={(nextValue) => onChange(nextValue)}
            disabled={!editable}
            hugerteScriptSrc="/hugerte/hugerte.min.js"
            init={{
              base_url: '/hugerte',
              suffix: '.min',
              menubar: editable ? 'file edit view insert format tools table help' : false,
              branding: false,
              promotion: false,
              statusbar: editable,
              elementpath: false,
              autoresize_bottom_margin: 16,
              min_height: 420,
              resize: true,
              automatic_uploads: true,
              images_file_types: 'jpg,jpeg,png,gif,webp',
              toolbar_mode: 'wrap',
              toolbar_sticky: false,
              object_resizing: true,
              plugins:
                'advlist autolink autoresize charmap code codesample fullscreen help image insertdatetime link lists media preview searchreplace table visualblocks visualchars wordcount',
              toolbar: editable
                ? 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | table link image media codesample charmap | visualblocks preview fullscreen | removeformat code'
                : false,
              block_formats:
                'Paragraph=p;Heading 1=h1;Heading 2=h2;Heading 3=h3;Heading 4=h4;Blockquote=blockquote',
              contextmenu: 'undo redo | inserttable | cell row column deletetable | link image media',
              content_style:
                'body { font-family: Georgia, Cambria, "Times New Roman", Times, serif; font-size: 16px; line-height: 1.8; color: #0f172a; padding: 10px 14px; max-width: none; }',
              file_picker_types: 'image',
              file_picker_callback: (callback, _value, meta) => {
                if (meta.filetype !== 'image') {
                  return
                }

                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp'

                input.onchange = () => {
                  const file = input.files?.[0]
                  if (!file) {
                    return
                  }

                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = typeof reader.result === 'string' ? reader.result : ''
                    if (!result) {
                      return
                    }

                    callback(result, {
                      alt: file.name.replace(/\.[^.]+$/, ''),
                      title: file.name,
                    })
                  }
                  reader.readAsDataURL(file)
                }

                input.click()
              },
              setup: (editor) => {
                let selectionFrameId = 0
                const notifySelectionChange = () => {
                  if (selectionFrameId) {
                    window.cancelAnimationFrame(selectionFrameId)
                  }

                  selectionFrameId = window.requestAnimationFrame(() => {
                    onMouseUp?.()
                  })
                }

                editor.on('init', () => {
                  const target = editor.getElement()
                  target?.setAttribute('data-hugerte-classic-root', 'true')
                  const body = editor.getBody()
                  body?.setAttribute('data-annotation-text-root', 'true')
                })

                editor.on('mouseup keyup touchend selectionchange', () => {
                  notifySelectionChange()
                })

                editor.on('remove', () => {
                  if (selectionFrameId) {
                    window.cancelAnimationFrame(selectionFrameId)
                  }
                })
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
