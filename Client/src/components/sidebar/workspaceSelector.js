import React, { useContext, useState } from 'react'
import { useGlobalContext } from '../../api/useGlobalContext'
import { xCreateWorkspace, xDeleteWorkspace } from '../../api/fetch'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'

function WorkspaceSelector() {
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    getWorkspacesList,
  } = useContext(useGlobalContext)
  const { toast } = useToast()
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.workspace_id === selectedWorkspaceId
  )
  const currentRole = activeWorkspace?.role || 'owner'
  const isOwner = currentRole === 'owner'

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim()
    if (!name) {
      toast({ title: 'Workspace name is required', variant: 'danger' })
      return
    }

    setIsCreating(true)
    try {
      const result = await xCreateWorkspace(name)
      await getWorkspacesList()
      setSelectedWorkspaceId(result?.workspace_id || null)
      setNewWorkspaceName('')
      toast({ title: 'Workspace created', variant: 'success' })
    } catch (error) {
      toast({
        title: 'Failed to create workspace',
        description: error?.response?.data || 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspaceId || !isOwner) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this workspace? This action cannot be undone.'
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await xDeleteWorkspace(selectedWorkspaceId)
      await getWorkspacesList()
      toast({ title: 'Workspace deleted', variant: 'success' })
    } catch (error) {
      toast({
        title: 'Failed to delete workspace',
        description: error?.response?.data || 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='px-[20px] flex max-w-full flex-col gap-2 overflow-hidden'>
      <label className='text-[10px] uppercase tracking-[0.12em] text-muted-foreground'>Workspace</label>
      <select
        value={selectedWorkspaceId || ''}
        onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
        className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40'
      >
        {!workspaces.length ? (
          <option value=''>No workspace</option>
        ) : (
          workspaces.map((workspace) => (
            <option key={workspace.workspace_id} value={workspace.workspace_id}>
              {workspace.name}
            </option>
          ))
        )}
      </select>

      <div className='rounded-md border border-border bg-white/[3%] px-2.5 py-1.5 text-[11px] text-muted-foreground'>
        <span className='mr-2 uppercase tracking-[0.12em]'>Role</span>
        <span className='font-medium capitalize text-foreground'>{currentRole}</span>
      </div>

      {isOwner && (
        <Button
          size='sm'
          variant='destructive'
          onClick={handleDeleteWorkspace}
          disabled={isDeleting || !selectedWorkspaceId}
          className='w-full'
        >
          {isDeleting ? 'Deleting...' : 'Delete workspace'}
        </Button>
      )}

      <div className='flex flex-col gap-2'>
        <input
          type='text'
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
          placeholder='New workspace'
          className='min-w-0 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40'
        />
        <Button
          size='sm'
          variant='secondary'
          isLoading={isCreating}
          onClick={handleCreateWorkspace}
          disabled={!newWorkspaceName.trim() || isCreating}
          className='w-full shrink-0'
        >
          Add
        </Button>
      </div>
    </div>
  )
}

export default WorkspaceSelector
