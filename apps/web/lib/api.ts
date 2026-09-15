import type { Portfolio } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function getPortfolio(): Promise<Portfolio | null> {
  try {
    const res = await fetch(`${API_URL}/portfolio`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
