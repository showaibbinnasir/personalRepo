"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { API_URL } from "@/lib/api";

function normalizeContent(value?: string) {
  if (!value?.trim()) return "<p></p>";
  return /<\/?[a-z][\s\S]*>/i.test(value) ? value : `<p>${value}</p>`;
}

export default function RichTextEditor({
  value,
  onChange,
}: {
  value?: string;
  onChange: (html: string) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "project-article-image" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
    ],
    content: normalizeContent(value),
    editorProps: {
      attributes: {
        class: "rich-editor-content",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const next = normalizeContent(value);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  async function uploadImage(file?: File) {
    if (!file || !editor) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Image upload failed");
      editor.chain().focus().setImage({ src: json.url, alt: file.name }).run();
    } catch (e: any) {
      setError(e.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const href = window.prompt("Link URL", previous);
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  if (!editor) return <div className="rich-editor-loading">Loading editor…</div>;

  const btn = (active = false) => active ? "rich-tool active" : "rich-tool";

  return (
    <div className="rich-editor">
      <div className="rich-toolbar">
        <select
          aria-label="Text style"
          value={
            editor.isActive("heading", { level: 2 }) ? "h2" :
            editor.isActive("heading", { level: 3 }) ? "h3" : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <select
          aria-label="Text size"
          defaultValue=""
          onChange={(e) => {
            const size = e.target.value;
            if (size) editor.chain().focus().setFontSize(size).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
        >
          <option value="">Text size</option>
          <option value="14px">Small</option>
          <option value="16px">Normal</option>
          <option value="20px">Large</option>
          <option value="24px">XL</option>
          <option value="32px">2XL</option>
        </select>

        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <button type="button" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
        <button type="button" className={btn(editor.isActive("link"))} onClick={setLink}>Link</button>
        <button type="button" className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()}>Left</button>
        <button type="button" className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()}>Center</button>
        <button type="button" className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()}>Right</button>
        <button type="button" className="rich-tool" onClick={() => imageInput.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : "Image"}</button>
        <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => uploadImage(e.target.files?.[0])} />
        <button type="button" className="rich-tool" onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" className="rich-tool" onClick={() => editor.chain().focus().redo().run()}>Redo</button>
      </div>

      <EditorContent editor={editor} />
      <div className="rich-editor-footer">
        <span>Rich project article · images upload to ImgBB</span>
        {error && <span className="login-error">{error}</span>}
      </div>
    </div>
  );
}
