'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn, getInitials } from '@/lib/utils'
import { useState } from 'react'
import type { User } from '@/lib/types/database.types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  user: User
  onCommandPalette: () => void
}

export function Sidebar({ user, onCommandPalette }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">CRM Pro</span>
      </div>

      {/* Search shortcut */}
      <div className="px-3 pt-3">
        <button
          onClick={onCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(user.full_name ?? user.id)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">CRM Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCommandPalette} className="w-8 h-8">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="w-8 h-8">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-card h-full shadow-xl border-r border-border">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
