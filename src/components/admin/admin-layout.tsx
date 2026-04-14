"use client";

import React, { useMemo } from "react";
import {
  Crown,
  LogOut,
  Bell,
  LayoutDashboard,
  Users,
  Layers,
  Sword,
  Map,
  Shield,
  CreditCard,
  BarChart3,
  ScrollText,
  Settings,
  PartyPopper,
  Lock,
  ArrowDownUp,
} from "lucide-react";

import { menuItems } from "@/lib/admin-data";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ---------------------------------------------------------------------------
// Icon mapping: string name (from admin-data) → lucide-react component
// ---------------------------------------------------------------------------
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  LayoutDashboard,
  Users,
  Layers,
  Sword,
  Map,
  Shield,
  CreditCard,
  BarChart3,
  ScrollText,
  Settings,
  PartyPopper,
  Lock,
  ArrowDownUp,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AdminLayoutProps {
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminLayout({
  activeMenu,
  onMenuChange,
  children,
}: AdminLayoutProps) {
  // Resolve the current page name for the breadcrumb
  const activeItem = useMemo(
    () => menuItems.find((item) => item.id === activeMenu),
    [activeMenu],
  );

  return (
    <SidebarProvider>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <Sidebar collapsible="icon" className="border-r-0">
        {/* Logo / Brand */}
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
              <Crown className="size-4" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold tracking-wide text-sidebar-foreground">
                九州争鼎
              </span>
              <span className="text-[10px] text-sidebar-foreground/60">
                后台管理系统
              </span>
            </div>
          </div>
        </SidebarHeader>

        {/* Navigation Menu */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>功能菜单</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const IconComponent = iconMap[item.icon];
                  const isActive = activeMenu === item.id;

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.name}
                        onClick={() => onMenuChange(item.id)}
                        className={
                          isActive
                            ? "bg-amber-600/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium hover:bg-amber-600/15 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }
                      >
                        {IconComponent && <IconComponent />}
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"
              >
                <Avatar className="size-7">
                  <AvatarImage src="" alt="Admin" />
                  <AvatarFallback className="bg-amber-100 text-amber-800 text-xs dark:bg-amber-900 dark:text-amber-200">
                    管
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">admin</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    超级管理员
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* ── Main content area ───────────────────────────────────────── */}
      <SidebarInset>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          {/* Sidebar trigger */}
          <SidebarTrigger className="-ml-1" />

          <Separator orientation="vertical" className="mr-2 h-5" />

          {/* Breadcrumb */}
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">管理后台</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {activeItem?.name ?? "数据看板"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile breadcrumb – just show page name */}
          <span className="text-sm font-medium text-foreground sm:hidden">
            {activeItem?.name ?? "数据看板"}
          </span>

          {/* Spacer */}
          <div className="ml-auto" />

          {/* Right side: Notifications + User */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="通知"
                >
                  <Bell className="size-4" />
                  <Badge className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-600 p-0 text-[10px] leading-none text-white">
                    5
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>通知消息</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>充值异常订单 x3</DropdownMenuItem>
                <DropdownMenuItem>服务器负载预警 x1</DropdownMenuItem>
                <DropdownMenuItem>新用户注册激增 x1</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="用户菜单"
                >
                  <Avatar className="size-8 border border-border">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback className="bg-amber-100 text-amber-800 text-xs dark:bg-amber-900 dark:text-amber-200">
                      管
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">admin</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      admin@jiuzhou.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人信息</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                  <LogOut className="mr-2 size-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
