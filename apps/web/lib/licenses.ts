/** Licences a project can be marked with in the CMS (SPDX ids). */
export type LicenseInfo = { id: string; short: string; name: string; url?: string; summary: string; open: boolean };

export const LICENSES: LicenseInfo[] = [
  { id: "MIT", short: "MIT", name: "MIT License", url: "https://opensource.org/license/mit", summary: "Free to use, change and share, including commercially, with attribution.", open: true },
  { id: "Apache-2.0", short: "Apache 2.0", name: "Apache License 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0", summary: "Free to use, change and share, with attribution and an explicit patent grant.", open: true },
  { id: "GPL-3.0", short: "GPL-3.0", name: "GNU GPL v3.0", url: "https://www.gnu.org/licenses/gpl-3.0", summary: "Free to use and change; shared versions must stay open source under the GPL.", open: true },
  { id: "AGPL-3.0", short: "AGPL-3.0", name: "GNU AGPL v3.0", url: "https://www.gnu.org/licenses/agpl-3.0", summary: "Like the GPL, and also covers software offered over a network.", open: true },
  { id: "LGPL-3.0", short: "LGPL-3.0", name: "GNU LGPL v3.0", url: "https://www.gnu.org/licenses/lgpl-3.0", summary: "Open source library licence; can be linked from software under other licences.", open: true },
  { id: "MPL-2.0", short: "MPL 2.0", name: "Mozilla Public License 2.0", url: "https://www.mozilla.org/MPL/2.0/", summary: "Changes to these files must stay open; can be combined with other code.", open: true },
  { id: "BSD-3-Clause", short: "BSD-3", name: "BSD 3-Clause License", url: "https://opensource.org/license/bsd-3-clause", summary: "Free to use, change and share with attribution; no endorsement implied.", open: true },
  { id: "BSD-2-Clause", short: "BSD-2", name: "BSD 2-Clause License", url: "https://opensource.org/license/bsd-2-clause", summary: "Free to use, change and share with attribution.", open: true },
  { id: "Unlicense", short: "Unlicense", name: "The Unlicense", url: "https://unlicense.org/", summary: "Released into the public domain; no conditions.", open: true },
  { id: "CC-BY-4.0", short: "CC BY 4.0", name: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/", summary: "Free to share and adapt with attribution.", open: true },
  { id: "CC-BY-NC-4.0", short: "CC BY-NC", name: "Creative Commons Attribution-NonCommercial 4.0", url: "https://creativecommons.org/licenses/by-nc/4.0/", summary: "Free to share and adapt with attribution, non-commercial use only.", open: true },
  { id: "Proprietary", short: "Proprietary", name: "All rights reserved", summary: "Source and design are not licensed for reuse.", open: false }
];

/** Licence info for a stored value; unknown values are shown as typed. */
export function getLicense(value?: string): LicenseInfo | null {
  const v = (value || "").trim();
  if (!v) return null;
  const found = LICENSES.find(l => l.id.toLowerCase() === v.toLowerCase() || l.name.toLowerCase() === v.toLowerCase());
  return found || { id: v, short: v, name: v, summary: "", open: true };
}
