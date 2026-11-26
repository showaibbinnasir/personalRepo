import { getLicense } from "@/lib/licenses";

/** Small licence badge: scales icon + short name (e.g. "MIT"). */
export default function LicenseBadge({ value, size = "sm" }: { value?: string; size?: "sm" | "lg" }) {
  const lic = getLicense(value);
  if (!lic) return null;
  return (
    <span className={`license-badge license-badge--${size} ${lic.open ? "is-open" : "is-closed"}`} title={lic.name}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v12M4.5 14h7M3 4.5h10M8 3.2l-5 1.3M8 3.2l5 1.3" />
        <path d="M3 4.5 1.2 9h3.6L3 4.5ZM13 4.5 11.2 9h3.6L13 4.5Z" />
        <path d="M1.2 9a1.8 1.8 0 0 0 3.6 0M11.2 9a1.8 1.8 0 0 0 3.6 0" />
      </svg>
      <span className="sr-only">Licence: </span>
      {size === "lg" ? lic.name : lic.short}
    </span>
  );
}
