import sanitizeHtml from "sanitize-html";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function plainTextToHtml(value: string) {
  return `<p>${escapeHtml(value).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
}

export const headingSlug = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";

const stripTags = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();

/** Sanitises CMS rich text so it is safe to render with dangerouslySetInnerHTML. */
export function sanitizeRichText(value?: string) {
  if (!value?.trim()) return "";
  const source = /<\/?[a-z][\s\S]*>/i.test(value) ? value : plainTextToHtml(value);

  return sanitizeHtml(source, {
    allowedTags: [
      "p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "mark",
      "blockquote", "br", "hr", "a", "img", "span", "code", "pre", "figure", "figcaption"
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "class", "loading"],
      p: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], span: ["style"],
      pre: ["class"], code: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
        "font-size": [/^(14|16|20|24|32)px$/]
      }
    },
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:\/\//i.test(attribs.href || "");
        return { tagName, attribs: external ? { ...attribs, target: "_blank", rel: "noopener noreferrer" } : attribs };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } })
    }
  });
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Adds anchor ids to h2/h3 headings and returns a table of contents. */
export function withHeadingAnchors(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_m, level: string, attrs: string, inner: string) => {
    const text = stripTags(inner);
    let id = headingSlug(text);
    const count = used.get(id) || 0;
    used.set(id, count + 1);
    if (count) id = `${id}-${count + 1}`;
    if (text) toc.push({ id, text, level: Number(level) as 2 | 3 });
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}
