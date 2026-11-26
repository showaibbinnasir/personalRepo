"use client";

import { useState } from "react";
import Icon from "./icons";
import ImageUploader from "./ImageUploader";
import RichTextEditor from "./RichTextEditor";
import TagInput from "./TagInput";

export type FieldType = "text" | "url" | "textarea" | "checkbox" | "lines" | "csv" | "image" | "richtext" | "select";

export type Field = { key: string; label: string; type?: FieldType; full?: boolean; placeholder?: string; hint?: string; options?: { value: string; label: string }[] };

type Props = {
  title: string;
  items: any[];
  onChange: (items: any[]) => void;
  fields: Field[];
  blank: Record<string, any>;
  labelKey: string;
  subtitleKeys?: string[];
  description?: string;
};

export default function ArrayEditor({ title, items, onChange, fields, blank, labelKey, subtitleKeys = [], description }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const reindex = (list: any[]) => list.map((item, order) => ({ ...item, order }));

  const update = (index: number, key: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const add = () => {
    const item = { ...blank, id: crypto.randomUUID(), visible: blank.visible ?? true, order: items.length };
    onChange([...items, item]);
    setOpen(prev => new Set(prev).add(item.id));
    window.setTimeout(() => document.getElementById(`item-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  const duplicate = (index: number) => {
    const source = items[index];
    const copy = { ...structuredClone(source), id: crypto.randomUUID(), [labelKey]: `${source[labelKey] || title} (copy)` };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(reindex(next));
    setOpen(prev => new Set(prev).add(copy.id));
  };

  const remove = (index: number) => {
    const label = items[index]?.[labelKey] || `this ${title.toLowerCase()}`;
    if (!window.confirm(`Delete “${label}”? You can still discard this by not saving.`)) return;
    onChange(reindex(items.filter((_, i) => i !== index)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(reindex(next));
  };

  function renderField(item: any, field: Field, index: number) {
    const value = item[field.key];
    const id = `f-${item.id}-${field.key}`;
    const wrap = (control: React.ReactNode) => (
      <div className={`cms-field ${field.full ? "is-full" : ""}`} key={field.key}>
        <label htmlFor={id}>{field.label}</label>
        {control}
        {field.hint && <small className="cms-hint">{field.hint}</small>}
      </div>
    );

    switch (field.type) {
      case "checkbox":
        return (
          <label className="cms-switch" key={field.key}>
            <input type="checkbox" checked={Boolean(value)} onChange={e => update(index, field.key, e.target.checked)} />
            <span className="cms-switch-track" />
            <span>{field.label}</span>
          </label>
        );
      case "textarea":
        return wrap(<textarea id={id} className="cms-input" value={value || ""} placeholder={field.placeholder} onChange={e => update(index, field.key, e.target.value)} rows={3} />);
      case "lines":
        return wrap(
          <textarea
            id={id}
            className="cms-input"
            rows={4}
            value={Array.isArray(value) ? value.join("\n") : ""}
            placeholder={field.placeholder || "One point per line"}
            onChange={e => update(index, field.key, e.target.value.split("\n"))}
          />
        );
      case "select":
        return wrap(
          <select id={id} className="cms-input cms-select" value={value || ""} onChange={e => update(index, field.key, e.target.value)}>
            {(field.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      case "csv":
        return wrap(<TagInput value={Array.isArray(value) ? value : []} onChange={v => update(index, field.key, v)} placeholder={field.placeholder} />);
      case "image":
        return wrap(<ImageUploader value={value} onChange={url => update(index, field.key, url)} />);
      case "richtext":
        return wrap(<RichTextEditor value={value || ""} onChange={html => update(index, field.key, html)} />);
      default:
        return wrap(
          <input id={id} className="cms-input" type={field.type === "url" ? "url" : "text"} value={value || ""} placeholder={field.placeholder} onChange={e => update(index, field.key, e.target.value)} />
        );
    }
  }

  return (
    <section className="cms-array">
      <div className="cms-array-head">
        <div>
          <h3>{items.length} {items.length === 1 ? title.toLowerCase() : `${title.toLowerCase()} entries`}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className="cms-array-actions">
          {items.length > 1 && (
            <button type="button" className="cms-btn cms-btn--ghost" onClick={() => setOpen(open.size ? new Set() : new Set(items.map(i => i.id)))}>
              {open.size ? "Collapse all" : "Expand all"}
            </button>
          )}
          <button type="button" className="cms-btn cms-btn--primary" onClick={add}>
            <Icon name="plus" size={16} /> Add {title.toLowerCase()}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <button type="button" className="cms-empty" onClick={add}>
          <Icon name="plus" size={22} />
          <strong>No {title.toLowerCase()} entries yet</strong>
          <span>Click to add the first one.</span>
        </button>
      ) : (
        <ol className="cms-items">
          {items.map((item, index) => {
            const isOpen = open.has(item.id);
            const subtitle = subtitleKeys.map(k => item[k]).filter(Boolean).join(" · ");
            return (
              <li key={item.id} id={`item-${item.id}`} className={`cms-item ${isOpen ? "is-open" : ""} ${item.visible === false ? "is-hidden" : ""}`}>
                <div className="cms-item-head">
                  <button type="button" className="cms-item-toggle" onClick={() => toggle(item.id)} aria-expanded={isOpen}>
                    <span className="cms-item-index">{String(index + 1).padStart(2, "0")}</span>
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="cms-item-thumb" />}
                    <span className="cms-item-text">
                      <strong>{item[labelKey] || `Untitled ${title.toLowerCase()}`}</strong>
                      {subtitle && <small>{subtitle}</small>}
                    </span>
                    <span className="cms-item-badges">
                      {item.featured && <span className="cms-pill cms-pill--accent">Featured</span>}
                      {item.current && <span className="cms-pill">Current</span>}
                      {item.visible === false && <span className="cms-pill cms-pill--muted">Hidden</span>}
                    </span>
                    <Icon name="chevron" size={16} className="cms-item-chevron" />
                  </button>
                  <div className="cms-item-tools">
                    <button type="button" title="Move up" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="up" size={15} /></button>
                    <button type="button" title="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}><Icon name="down" size={15} /></button>
                    <button type="button" title={item.visible === false ? "Show on site" : "Hide from site"} onClick={() => update(index, "visible", item.visible === false)}>
                      <Icon name={item.visible === false ? "eyeOff" : "eye"} size={15} />
                    </button>
                    <button type="button" title="Duplicate" onClick={() => duplicate(index)}><Icon name="copy" size={15} /></button>
                    <button type="button" title="Delete" className="danger" onClick={() => remove(index)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
                {isOpen && <div className="cms-item-body cms-grid">{fields.map(field => renderField(item, field, index))}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
