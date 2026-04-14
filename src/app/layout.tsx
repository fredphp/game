import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "九州争鼎 — SLG卡牌游戏架构方案",
  description: "Go微服务 + Unity客户端全栈SLG卡牌游戏《九州争鼎》完整项目架构文档，包含11个核心微服务、网关设计、Docker部署方案。",
  keywords: ["SLG", "卡牌游戏", "Go微服务", "Unity", "MySQL", "Redis", "Docker", "游戏架构"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "九州争鼎 — SLG卡牌游戏架构方案",
    description: "Go微服务 + Unity客户端全栈SLG卡牌游戏架构",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "九州争鼎 — SLG卡牌游戏架构方案",
    description: "Go微服务 + Unity客户端全栈SLG卡牌游戏架构",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
