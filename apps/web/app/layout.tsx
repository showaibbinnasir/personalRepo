import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Showaib Bin Nasir — Robotics & AI",
  description: "Portfolio of Mohammad Showaib Bin Nasir, MSc Robotics and Artificial Intelligence graduate.",
  openGraph: {
    title: "Showaib Bin Nasir — Robotics & AI",
    description: "Robotics, artificial intelligence, software and intelligent systems.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
