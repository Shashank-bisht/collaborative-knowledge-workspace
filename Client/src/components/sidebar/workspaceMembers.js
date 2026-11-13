import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useGlobalContext } from '../../api/useGlobalContext'
import { Button } from '../ui/button'

const createSessionId = () => {
  if (crypto?.randomUUID) return crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

const API = {
  async list(workspaceId) {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      credentials: 'include',
    })
    return res.ok ? res.json() : []
  },
  async add(workspaceId, user, role) {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, role }),
    })
    return res
  },
  async update(workspaceId, userId, role) {
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    return res
  },
  async remove(workspaceId, userId) {
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    return res
  },
  async presence(workspaceId, status, sessionId) {
    const res = await fetch(`/api/workspaces/${workspaceId}/presence`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, session_id: sessionId }),
    })
    return res
  },
  async getPresence(workspaceId) {
    const res = await fetch(`/api/workspaces/${workspaceId}/presence`, {
      credentials: 'include',
    })
    return res.ok ? res.json() : []
  },
  async clearPresence(workspaceId, sessionId) {
    await fetch(`/api/workspaces/${workspaceId}/presence`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
  },
}

function WorkspaceMembers() {
  const { selectedWorkspaceId, workspaces } = useContext(useGlobalContext)
  const [members, setMembers] = useState([])
  const [userInput, setUserInput] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)
  const [presence, setPresence] = useState([])
  const sessionIdRef = useRef(null)

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.workspace_id === selectedWorkspaceId
  )
  const canManageMembers =
    activeWorkspace && ['owner', 'admin'].includes(activeWorkspace.role)

  const loadMembers = useCallback(async () => {
    if (!selectedWorkspaceId) return
    const data = await API.list(selectedWorkspaceId)
    setMembers(data)
  }, [selectedWorkspaceId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (!selectedWorkspaceId) return

    const asyncRefreshPresence = async () => {
      try {
        const sessionId = createSessionId()
        sessionIdRef.current = sessionId
        await API.presence(selectedWorkspaceId, 'viewing', sessionId)
        const data = await API.getPresence(selectedWorkspaceId)
        setPresence(Array.isArray(data) ? data : [])
      } catch (error) {
        setPresence([])
      }
    }

    asyncRefreshPresence()
    const interval = setInterval(async () => {
      if (!selectedWorkspaceId || !sessionIdRef.current) return

      try {
        await API.presence(selectedWorkspaceId, 'viewing', sessionIdRef.current)
        const data = await API.getPresence(selectedWorkspaceId)
        setPresence(Array.isArray(data) ? data : [])
      } catch (error) {
        setPresence([])
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      if (selectedWorkspaceId && sessionIdRef.current) {
        API.clearPresence(selectedWorkspaceId, sessionIdRef.current).catch(() => {})
      }
      sessionIdRef.current = null
    }
  }, [selectedWorkspaceId])

  const handleAdd = async () => {
    if (!selectedWorkspaceId || !userInput.trim() || !canManageMembers) return
    setLoading(true)
    const res = await API.add(selectedWorkspaceId, userInput.trim(), role)
    setLoading(false)
    if (res.ok) {
      setUserInput('')
      loadMembers()
    }
  }

  const handleRoleChange = async (userId, nextRole) => {
    if (!selectedWorkspaceId || !canManageMembers) return
    await API.update(selectedWorkspaceId, userId, nextRole)
    loadMembers()
  }

  const handleRemove = async (userId) => {
    if (!selectedWorkspaceId || !canManageMembers) return
    await API.remove(selectedWorkspaceId, userId)
    loadMembers()
  }

  if (!selectedWorkspaceId) return null

  return (
    <div className='px-[20px] flex max-w-full flex-col gap-3 overflow-hidden'>
      <div className='text-[10px] uppercase tracking-[0.12em] text-muted-foreground'>Workspace members</div>

      {!canManageMembers && (
        <div className='rounded-md border border-border bg-white/[3%] px-3 py-2 text-xs text-muted-foreground'>
          You can only view members in this workspace.
        </div>
      )}

      {canManageMembers && (
        <div className='flex flex-col gap-2'>
          <div className='flex gap-2 items-center min-w-0'>
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder='Username or email'
              className='min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40'
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className='w-[92px] rounded-md border border-border bg-background px-2 py-2 text-sm shrink-0'
            >
              <option value='viewer'>Viewer</option>
              <option value='editor'>Editor</option>
              <option value='admin'>Admin</option>
            </select>
          </div>
          <Button
            size='sm'
            variant='secondary'
            onClick={handleAdd}
            disabled={loading || !userInput.trim()}
            className='w-full shrink-0'
          >
            Add member
          </Button>
        </div>
      )}

      <div className='space-y-2'>
        {members.map((member) => {
          const memberPresence = presence.find((p) => p.user_id === member.user_id)
          return (
            <div
              key={member.user_id}
              className='flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm'
            >
              <div className='flex-1 min-w-0 overflow-hidden'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium truncate'>{member.username}</span>
                  {memberPresence ? (
                    <span className='inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300'>
                      {memberPresence.status}
                    </span>
                  ) : (
                    <span className='inline-flex items-center rounded-full border border-muted-foreground/30 bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground'>
                      offline
                    </span>
                  )}
                </div>
                <div className='text-xs text-muted-foreground truncate'>{member.email}</div>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                {canManageMembers ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                      className='w-[90px] rounded-md border border-border bg-background px-2 py-1 text-xs'
                    >
                      <option value='viewer'>Viewer</option>
                      <option value='editor'>Editor</option>
                      <option value='admin'>Admin</option>
                    </select>
                    <Button size='sm' variant='ghost' onClick={() => handleRemove(member.user_id)}>
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className='rounded-md border border-border bg-background px-2 py-1 text-xs capitalize text-muted-foreground'>
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkspaceMembers
