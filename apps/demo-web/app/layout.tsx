import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "GPT-5.4 CUA サンプルアプリ",
  description:
    "GPT-5.4 コンピューター操作ワークフローのシナリオ駆動型サンプルアプリ。",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
