import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeSeller — магазин програм",
  description: "Створюйте товари, тестуйте продажі та завантажуйте програми в CodeSeller.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="antialiased">{children}</body>
    </html>
  );
}
