import type { Metadata } from "next";
import "./cms.css";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
