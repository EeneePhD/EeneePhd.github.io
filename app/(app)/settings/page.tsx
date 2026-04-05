'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/lib/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react'
import type { User, PipelineStage } from '@/lib/types/database.types'

export default function SettingsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [pipelineId, setPipelineId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // New stage form
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366f1')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const [{ data: profile }, { data: allUsers }, { data: pipeline }] = await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('users').select('*').order('full_name'),
      supabase.from('pipelines').select('id').order('created_at').limit(1).single(),
    ])

    if (profile) {
      setCurrentUser(profile as User)
      setFullName(profile.full_name ?? '')
      setEmail(authUser.email ?? '')
    }
    setUsers((allUsers ?? []) as User[])

    if (pipeline?.id) {
      setPipelineId(pipeline.id)
      const { data: stageData } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('order_index')
      setStages((stageData ?? []) as PipelineStage[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  async function saveProfile() {
    if (!currentUser) return
    setSaving(true)
    const { error: profileError } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', currentUser.id)

    if (profileError) {
      toast({ title: 'Error', description: profileError.message, variant: 'destructive' })
      setSaving(false)
      return
    }

    if (newPassword) {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
      if (pwError) {
        toast({ title: 'Password error', description: pwError.message, variant: 'destructive' })
        setSaving(false)
        return
      }
      setNewPassword('')
    }

    toast({ title: 'Profile updated' })
    setSaving(false)
    loadData()
  }

  async function addStage() {
    if (!newStageName.trim() || !pipelineId) return
    const nextOrder = stages.length
    const { error } = await supabase.from('pipeline_stages').insert({
      pipeline_id: pipelineId,
      name: newStageName.trim(),
      order_index: nextOrder,
      color: newStageColor,
    })
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Stage added' })
    setNewStageName('')
    loadData()
  }

  async function updateStageName(id: string, name: string) {
    await supabase.from('pipeline_stages').update({ name }).eq('id', id)
  }

  async function deleteStage(id: string) {
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Stage deleted' })
    loadData()
  }

  async function updateUserRole(userId: string, role: User['role']) {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return }
    toast({ title: 'Role updated' })
    loadData()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and CRM configuration" />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline stages</TabsTrigger>
          {currentUser?.role === 'admin' && (
            <TabsTrigger value="team">Team</TabsTrigger>
          )}
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>Update your name and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label>New password</Label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline stages */}
        <TabsContent value="pipeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline stages</CardTitle>
              <CardDescription>Add, rename, or delete pipeline stages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing stages */}
              <div className="space-y-2">
                {stages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <Input
                      defaultValue={stage.name}
                      className="flex-1 h-8"
                      onBlur={(e) => updateStageName(stage.id, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteStage(stage.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Add new stage */}
              <div className="flex gap-2">
                <Input
                  placeholder="New stage name..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStage()}
                />
                <input
                  type="color"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer p-0.5"
                />
                <Button onClick={addStage} disabled={!newStageName.trim()}>
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team (admin only) */}
        {currentUser?.role === 'admin' && (
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team members</CardTitle>
                <CardDescription>Manage roles for your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{u.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                      </div>
                      {u.id !== currentUser?.id && (
                        <Select
                          value={u.role}
                          onValueChange={(v) => updateUserRole(u.id, v as User['role'])}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="rep">Rep</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {u.id === currentUser?.id && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
