"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ScanLine,
  Boxes,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Store,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut } from "@/app/actions/auth"

const groups = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sell",
    items: [
      { title: "Point of Sale", href: "/dashboard/pos", icon: ScanLine },
      { title: "Sales", href: "/dashboard/sales", icon: Receipt },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Inventory", href: "/dashboard/inventory", icon: Boxes },
      { title: "Customers", href: "/dashboard/customers", icon: Users },
      { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [{ title: "Settings", href: "/dashboard/settings", icon: Settings }],
  },
]

export function AppSidebar({ name, email, role }: { name: string; email: string; role: string }) {
  const pathname = usePathname()
  const initials = (name || email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">JIRANI SYSTEM</span>
            <span className="text-xs text-sidebar-foreground/60">Retail POS</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton render={<Link href={item.href}><item.icon className="size-4" /><span>{item.title}</span></Link>} isActive={active} tooltip={item.title} />
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-none">{name || "User"}</span>
                <span className="text-xs capitalize text-sidebar-foreground/60">{role}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{name || "User"}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <button type="submit" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  <span className="flex w-full items-center">
                    <LogOut className="mr-2 size-4" /> Sign out
                  </span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
