'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/shared/Sidebar'
import { CommandPalette } from '@/components/shared/CommandPalette'
import type { User } from '@/lib/types/database.types'
import { Loader2 } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount with the current session.
    // This is more reliable than getSession() because with soft navigation
    // (router.push) the singleton client already holds the session in memory.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (!session) {
            router.push('/login')
          } else {
            await loadProfile(session.user.id, session.user.email)
          }
        } else if (event === 'SIGNED_IN' && session) {
          await loadProfile(session.user.id, session.user.email)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile(userId: string, email?: string | null) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile) {
      setUser(profile as User)
    } else {
      // Insert the profile if trigger didn't create it
      const { data: newProfile } = await supabase
        .from('users')
        .upsert({
          id: userId,
          full_name: email ?? null,
          role: 'rep',
        })
        .select()
        .single()
      setUser(newProfile as User ?? {
        id: userId,
        full_name: email ?? null,
        avatar_url: null,
        role: 'rep',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} onCommandPalette={() => setCmdOpen(true)} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-screen-2xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
