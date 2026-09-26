"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full",
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: next }) => {
      onChange(next.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-48 max-w-none px-3 py-3 text-sm leading-relaxed text-zinc-200 outline-none prose-invert [&_a]:text-white [&_a]:underline [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-[0.08em] [&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:tracking-[0.08em] [&_img]:my-3 [&_img]:max-h-80 [&_img]:object-contain [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  function setLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  function insertImage() {
    const url = window.prompt("Image URL (https://…)");
    if (!url?.trim()) return;
    editor?.chain().focus().setImage({ src: url.trim() }).run();
  }

  const buttonClass =
    "border border-white/15 bg-zinc-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300 disabled:opacity-40";

  return (
    <div className="border border-white/15 bg-zinc-950">
      <div className="flex flex-wrap gap-1 border-b border-white/10 px-2 py-2">
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={setLink}
        >
          Link
        </button>
        <button
          type="button"
          disabled={disabled}
          className={buttonClass}
          onClick={insertImage}
        >
          Image URL
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
