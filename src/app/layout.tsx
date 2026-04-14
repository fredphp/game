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
  title: "九州争鼎 — 后台管理系统",
  description: "SLG卡牌游戏《九州争鼎》生产级后台管理系统，包含RBAC权限、用户管理、卡池配置、地图控制、充值支付、数据统计等核心运营功能。",
  keywords: ["SLG", "后台管理", "RBAC", "游戏运营", "数据统计", "九州争鼎"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "九州争鼎 — 后台管理系统",
    description: "SLG卡牌游戏《九州争鼎》生产级后台管理系统",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "九州争鼎 — 后台管理系统",
    description: "SLG卡牌游戏《九州争鼎》生产级后台管理系统",
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
