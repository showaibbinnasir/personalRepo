"use client";

import { KeyboardEvent, useId, useState } from "react";

/** Chip input: Enter or comma adds, Backspace on empty removes the last chip. */
export default function TagInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter",
  suggestions = []
}: {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const parts = raw.split(",").map(t => t.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some(t => t.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const remaining = suggestions.filter(s => !value.some(v => v.toLowerCase() === s.toLowerCase()));

  return (
    <div className="cms-tags">
      <div className="cms-tags-box">
        {value.map(tag => (
          <span key={tag} className="cms-chip">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          value={draft}
          list={remaining.length ? listId : undefined}
          onChange={e => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
        />
      </div>
      {remaining.length > 0 && (
        <datalist id={listId}>
          {remaining.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}
