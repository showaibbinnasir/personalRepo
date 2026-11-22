"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { uploadImage } from "./cmsApi";

function normalizeContent(value?: string) {
  if (!value?.trim()) return "<p></p>";
  return /<\/?[a-z][\s\S]*>/i.test(value) ? value : `<p>${value}</p>`;
}

type Props = { value?: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number };

export default function RichTextEditor({ value, onChange, minHeight = 360, placeholder = "Start writing… paste or drop images anywhere." }: Props) {
  const imageInput = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<(file: File) => void>(() => {});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" }
      }),
      Image.configure({ allowBase64: false, HTMLAttributes: { class: "project-article-image" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
      Placeholder.configure({ placeholder })
    ],
    content: normalizeContent(value),
    editorProps: {
      attributes: { class: "cms-rte-content", style: `min-height:${minHeight}px` },
      handlePaste: (_view, event) => {
        const file = [...(event.clipboardData?.files || [])].find(f => f.type.startsWith("image/"));
        if (!file) return false;
        uploadRef.current(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = [...((event as DragEvent).dataTransfer?.files || [])].find(f => f.type.startsWith("image/"));
        if (!file) return false;
        event.preventDefault();
        uploadRef.current(file);
        return true;
      }
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  useEffect(() => {
    if (!editor) return;
    const next = normalizeContent(value);
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  uploadRef.current = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    setError("");
    try {
      const src = await uploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      editor.chain().focus().setImage({ src, alt }).run();
    } catch (e: any) {
      setError(e.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const href = window.prompt("Link URL (leave empty to remove)", previous);
    if (href === null) return;
    if (!href.trim()) return void editor.chain().focus().extendMarkRange("link").unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  function imageFromUrl() {
    if (!editor) return;
    const src = window.prompt("Image URL");
    if (!src?.trim()) return;
    const alt = window.prompt("Describe the image (alt text, helps SEO & accessibility)") || "";
    editor.chain().focus().setImage({ src: src.trim(), alt }).run();
  }

  function editAlt() {
    if (!editor) return;
    const current = editor.getAttributes("image").alt || "";
    const alt = window.prompt("Alt text for this image", current);
    if (alt !== null) editor.chain().focus().updateAttributes("image", { alt }).run();
  }

  if (!editor) return <div className="cms-rte cms-rte--loading">Loading editor…</div>;

  const e = editor;
  const text = e.getText().trim();
  const state = {
    block: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("heading", { level: 4 }) ? "h4" : "p",
    bold: e.isActive("bold"),
    italic: e.isActive("italic"),
    underline: e.isActive("underline"),
    strike: e.isActive("strike"),
    code: e.isActive("code"),
    link: e.isActive("link"),
    bulletList: e.isActive("bulletList"),
    orderedList: e.isActive("orderedList"),
    blockquote: e.isActive("blockquote"),
    codeBlock: e.isActive("codeBlock"),
    image: e.isActive("image"),
    left: e.isActive({ textAlign: "left" }),
    center: e.isActive({ textAlign: "center" }),
    right: e.isActive({ textAlign: "right" }),
    justify: e.isActive({ textAlign: "justify" }),
    canUndo: e.can().undo(),
    canRedo: e.can().redo(),
    words: text ? text.split(/\s+/).length : 0
  };

  const b = (active?: boolean) => `cms-rte-btn ${active ? "is-active" : ""}`;
  const c = () => editor.chain().focus();

  return (
    <div className="cms-rte">
      <div className="cms-rte-toolbar" role="toolbar" aria-label="Formatting">
        <div className="cms-rte-group">
          <select
            aria-label="Block type"
            value={state.block}
            onChange={e => {
              const v = e.target.value;
              if (v === "p") c().setParagraph().run();
              else c().toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
            }}
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
            <option value="h4">Small heading</option>
          </select>
          <select
            aria-label="Text size"
            defaultValue=""
            onChange={e => {
              const size = e.target.value;
              size ? c().setFontSize(size).run() : c().unsetFontSize().run();
            }}
          >
            <option value="">Size</option>
            <option value="14px">Small</option>
            <option value="16px">Normal</option>
            <option value="20px">Large</option>
            <option value="24px">XL</option>
            <option value="32px">2XL</option>
          </select>
        </div>

        <div className="cms-rte-group">
          <button type="button" title="Bold (⌘B)" className={b(state.bold)} onClick={() => c().toggleBold().run()}><b>B</b></button>
          <button type="button" title="Italic (⌘I)" className={b(state.italic)} onClick={() => c().toggleItalic().run()}><i>I</i></button>
          <button type="button" title="Underline (⌘U)" className={b(state.underline)} onClick={() => c().toggleUnderline().run()}><u>U</u></button>
          <button type="button" title="Strikethrough" className={b(state.strike)} onClick={() => c().toggleStrike().run()}><s>S</s></button>
          <button type="button" title="Inline code" className={b(state.code)} onClick={() => c().toggleCode().run()}>{"</>"}</button>
          <button type="button" title="Link" className={b(state.link)} onClick={setLink}>Link</button>
        </div>

        <div className="cms-rte-group">
          <button type="button" title="Bulleted list" className={b(state.bulletList)} onClick={() => c().toggleBulletList().run()}>• List</button>
          <button type="button" title="Numbered list" className={b(state.orderedList)} onClick={() => c().toggleOrderedList().run()}>1. List</button>
          <button type="button" title="Quote" className={b(state.blockquote)} onClick={() => c().toggleBlockquote().run()}>“ ”</button>
          <button type="button" title="Code block" className={b(state.codeBlock)} onClick={() => c().toggleCodeBlock().run()}>Code</button>
          <button type="button" title="Divider" className="cms-rte-btn" onClick={() => c().setHorizontalRule().run()}>—</button>
        </div>

        <div className="cms-rte-group">
          {(["left", "center", "right", "justify"] as const).map(a => (
            <button key={a} type="button" title={`Align ${a}`} className={b(state[a])} onClick={() => c().setTextAlign(a).run()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {a === "left" && <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />}
                {a === "center" && <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />}
                {a === "right" && <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />}
                {a === "justify" && <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
              </svg>
            </button>
          ))}
        </div>

        <div className="cms-rte-group">
          <button type="button" className="cms-rte-btn" onClick={() => imageInput.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : "Image"}</button>
          <button type="button" className="cms-rte-btn" onClick={imageFromUrl} title="Insert image from URL">URL</button>
          {state.image && <button type="button" className="cms-rte-btn is-active" onClick={editAlt}>Alt text</button>}
          <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => e.target.files?.[0] && uploadRef.current(e.target.files[0])} />
        </div>

        <div className="cms-rte-group cms-rte-group--end">
          <button type="button" title="Undo (⌘Z)" className="cms-rte-btn" disabled={!state.canUndo} onClick={() => c().undo().run()}>↶</button>
          <button type="button" title="Redo (⇧⌘Z)" className="cms-rte-btn" disabled={!state.canRedo} onClick={() => c().redo().run()}>↷</button>
        </div>
      </div>

      <EditorContent editor={editor} />

      <div className="cms-rte-footer">
        <span>{state.words.toLocaleString()} words · {Math.max(1, Math.round(state.words / 220))} min read</span>
        <span>Paste or drop images straight into the text</span>
        {error && <span className="cms-error">{error}</span>}
      </div>
    </div>
  );
}
