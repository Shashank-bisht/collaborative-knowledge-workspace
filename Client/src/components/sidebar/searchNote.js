import React, { useState, useMemo, useContext } from 'react'
import { Button } from '../ui/button'
import { FiFolder, FiSearch, FiX } from 'react-icons/fi'
import { FiFileText } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import * as NProgress from 'nprogress'
import { create } from 'zustand'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { AiFillStar } from 'react-icons/ai'

import { useGlobalContext } from '../../api/useGlobalContext'

const normalizeText = (value = '') =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const useSearchState = create((set) => ({
  search: '',
  setSearch: (val) => set(() => ({ search: val })),
  clearSearch: () => set({ search: '' }),

  isWaiting: false,
  setWaiting: (status) => set({ isWaiting: status }),

  loading: {},
  setLoading: (id) =>
    set((state) => ({ loading: { ...state.loading, [id]: true } })),
  doneLoading: () => set({ loading: {} }),
}))

const useSearchStateHook = () => {
  const { setIsSidebarOpen, setIsActiveNote, setNote } =
    useContext(useGlobalContext)

  const setSidebar = (state) => setIsSidebarOpen(state)
  const setActiveNote = (state) => setIsActiveNote(state)
  const setCurNote = (state) => setNote(state)
  const clearSearch = useSearchState((state) => state.clearSearch)
  const isWaiting = useSearchState((state) => state.isWaiting)
  const setWaiting = useSearchState((state) => state.setWaiting)
  const loading = useSearchState((state) => state.loading)
  const setLoading = useSearchState((state) => state.setLoading)
  const doneLoading = useSearchState((state) => state.doneLoading)
  return {
    setSidebar,
    setActiveNote,
    setCurNote,
    clearSearch,
    isWaiting,
    setWaiting,
    loading,
    setLoading,
    doneLoading,
  }
}

const RenderWorkspaceItem = ({ title, data, setOpen }) => {
  const { setSelectedWorkspaceId, setIsSidebarOpen } = useContext(useGlobalContext)
  const Navigate = useNavigate()

  const handleOpenWorkspace = async (workspace) => {
    setSelectedWorkspaceId(workspace.workspace_id)
    setIsSidebarOpen(false)
    setOpen(false)
    Navigate('/app')
  }

  if (!data?.length) return null

  return (
    <div className='flex flex-col px-[20px]'>
      <div className='flex items-center'>
        <p className='inactive-text text-sm pb-1 mr-4'>{title}</p>
        <div className='bg-white/[20%] w-full h-[1px]' />
      </div>
      {data.map((item, index) => (
        <div
          key={`${item.workspace_id || index}`}
          className='hover:bg-white/[5%] py-3 rounded-md transition px-3 cursor-pointer'
          onClick={() => handleOpenWorkspace(item)}
        >
          <div className='flex gap-[20px] items-center'>
            <FiFolder className='text-[20px]' />
            <div className='min-w-0'>
              <p className='truncate lg:text-base text-sm'>{item.name}</p>
              <p className='text-[10px] uppercase tracking-[0.12em] text-white/45'>Workspace</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const RenderFolderItem = ({ title, data, setOpen }) => {
  const { setSidebar, setActiveNote, setCurNote, clearSearch, setWaiting, setLoading, doneLoading } =
    useSearchStateHook()
  const Navigate = useNavigate()

  const redirectTo = (item) => {
    NProgress.start()
    setTimeout(() => {
      setActiveNote(false)
      setCurNote({})
      Navigate(`/app/folders/${item.folder_id}`)
      NProgress.done()
    }, 300)
  }

  const handlePushRoute = async (item) => {
    setLoading(item.folder_id)
    setWaiting(true)
    redirectTo(item)
    setOpen(false)
    setWaiting(false)
    doneLoading()
    clearSearch()
    setSidebar(false)
  }

  if (!data?.length) return null

  return (
    <div className='flex flex-col px-[20px]'>
      <div className='flex items-center'>
        <p className='inactive-text text-sm pb-1 mr-4'>{title}</p>
        <div className='bg-white/[20%] w-full h-[1px]' />
      </div>
      {data.map((item, i) => (
        <div
          className='hover:bg-white/[5%] py-3 rounded-md transition px-3 cursor-pointer relative'
          key={`${item.folder_id || i}`}
          onClick={() => handlePushRoute(item)}
        >
          <div className='flex gap-[20px] items-center'>
            <FiFolder className='text-[20px]' />
            <p className='truncate lg:text-base text-sm'>{item.name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const RenderNoteItem = ({ title, data, setOpen }) => {
  const { setSidebar, setActiveNote, setCurNote, setLoading, clearSearch, setWaiting, doneLoading } =
    useSearchStateHook()
  const Navigate = useNavigate()

  const handlePushRoute = async (item) => {
    setLoading(item.note_id)
    setActiveNote(true)
    setWaiting(true)
    NProgress.start()
    Navigate(`/app/folders/${item.folder_id}`)
    setCurNote(item)
    setOpen(false)
    setWaiting(false)
    doneLoading()
    NProgress.done()
    clearSearch()
    setSidebar(false)
  }

  if (!data?.length) return null

  return (
    <div className='flex flex-col px-[20px]'>
      <div className='flex items-center'>
        <p className='inactive-text text-sm pb-1 mr-4'>{title}</p>
        <div className='bg-white/[20%] w-full h-[1px]' />
      </div>
      {data.map((item, i) => (
        <div
          className='hover:bg-white/[5%] py-3 rounded-md transition px-3 cursor-pointer relative'
          key={`${item.note_id || i}`}
          onClick={() => handlePushRoute(item)}
        >
          <div className='flex gap-[20px] items-center'>
            <FiFileText className='text-[20px]' />
            <p className='truncate lg:text-base text-sm'>{item.name}</p>
            {item.favorite === 1 && <AiFillStar className='h-4 w-4 text-yellow-300' />}
          </div>
        </div>
      ))}
    </div>
  )
}

function SearchNote() {
  const [open, setOpen] = useState(false)
  const [workspaceFilter, setWorkspaceFilter] = useState('all')
  const [folderFilter, setFolderFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const {
    folders,
    notes,
    archive,
    trash,
    workspaces,
    currentUserId,
  } = useContext(useGlobalContext)

  const search = useSearchState((state) => state.search)
  const setSearch = useSearchState((state) => state.setSearch)
  const clearSearch = useSearchState((state) => state.clearSearch)

  const allEntries = useMemo(
    () => [...notes, ...archive, ...trash],
    [notes, archive, trash]
  )

  const filteredWorkspaces = useMemo(() => {
    const base = workspaces.filter((workspace) => {
      const matchesSearch = !search ||
        normalizeText(workspace.name).includes(normalizeText(search)) ||
        normalizeText(workspace.description).includes(normalizeText(search))
      const matchesWorkspace = workspaceFilter === 'all' || workspace.workspace_id === workspaceFilter
      return matchesSearch && matchesWorkspace
    })

    return base
  }, [workspaces, search, workspaceFilter])

  const filteredFolders = useMemo(() => {
    const base = folders.filter((folder) => {
      const matchesSearch = !search || normalizeText(folder.name).includes(normalizeText(search))
      const matchesWorkspace = workspaceFilter === 'all' || folder.workspace_id === workspaceFilter
      const matchesFolder = folderFilter === 'all' || folder.folder_id === folderFilter
      return matchesSearch && matchesWorkspace && matchesFolder
    })

    return base
  }, [folders, search, workspaceFilter, folderFilter])

  const filteredNotes = useMemo(() => {
    const now = new Date()
    const base = allEntries.filter((item) => {
      const text = `${item.name || ''} ${item.content || ''}`
      const matchesSearch = !search || normalizeText(text).includes(normalizeText(search))
      const matchesWorkspace =
        workspaceFilter === 'all' || item.workspace_id === workspaceFilter || (!item.workspace_id && workspaceFilter === 'personal')
      const matchesFolder = folderFilter === 'all' || item.folder_id === folderFilter
      const matchesUser = userFilter === 'all' || (userFilter === 'me' && item.user_id === currentUserId)
      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'personal' && !item.workspace_id) ||
        (visibilityFilter === 'shared' && item.workspace_id)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'favorite' && item.favorite === 1) ||
        (statusFilter === 'archive' && (item.archive === 1 || archive.some((note) => note.note_id === item.note_id))) ||
        (statusFilter === 'active' && item.deleted === 0 && item.archive !== 1) ||
        (statusFilter === 'deleted' && item.deleted === 1)

      let matchesDate = true
      if (dateFilter !== 'all') {
        const createdAt = item.created_date ? new Date(item.created_date) : new Date()
        const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24)
        if (dateFilter === '7d') matchesDate = diffDays <= 7
        if (dateFilter === '30d') matchesDate = diffDays <= 30
        if (dateFilter === '90d') matchesDate = diffDays <= 90
      }

      return (
        matchesSearch &&
        matchesWorkspace &&
        matchesFolder &&
        matchesUser &&
        matchesVisibility &&
        matchesStatus &&
        matchesDate
      )
    })

    return [...new Map(base.map((item) => [item.note_id, item])).values()].sort((a, b) => {
      const aTime = new Date(a.created_date || 0).getTime()
      const bTime = new Date(b.created_date || 0).getTime()
      return bTime - aTime
    })
  }, [allEntries, search, workspaceFilter, folderFilter, userFilter, visibilityFilter, statusFilter, dateFilter, archive, currentUserId])

  const hasFilters =
    workspaceFilter !== 'all' ||
    folderFilter !== 'all' ||
    userFilter !== 'all' ||
    dateFilter !== 'all' ||
    visibilityFilter !== 'all' ||
    statusFilter !== 'all'

  const resetFilters = () => {
    setWorkspaceFilter('all')
    setFolderFilter('all')
    setUserFilter('all')
    setDateFilter('all')
    setVisibilityFilter('all')
    setStatusFilter('all')
    clearSearch()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size='sm' variant='ghost'>
            <FiSearch className='text-[20px]' />
          </Button>
        </DialogTrigger>
        <DialogContent className='fixed left-[50%] top-[50%] grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full p-0 border lg:max-w-[620px] max-w-[360px] border-white/[30%] lg:h-[620px] h-[480px] overflow-hidden custom-scrollbar z-50'>
          <div className='flex flex-col h-full'>
            <div className='flex justify-between z-50 items-center px-[20px] sticky top-0 right-0 left-0 bg-background border-b border-white/[20%]'>
              <div className='flex items-center gap-4 w-full py-[18px]'>
                <FiSearch className='text-[20px]' />
                <input
                  type='text'
                  className='w-full bg-background text-white outline-none'
                  placeholder='Search notes, folders, workspaces...'
                  onChange={(e) => setSearch(e.target.value)}
                  value={search}
                  maxLength={80}
                  autoFocus
                  spellCheck={false}
                  autoComplete='off'
                />
              </div>
              <Button
                size='sm'
                variant='ghost'
                className='outline-none border-none ring-0 px-[10px] py-[10px]'
                onClick={() => {
                  resetFilters()
                  setOpen(false)
                }}
              >
                <FiX className='text-[22px]' />
              </Button>
            </div>

            <div className='px-[20px] py-[16px] border-b border-white/[10%]'>
              <div className='flex items-center justify-between gap-3 mb-3'>
                <p className='text-xs uppercase tracking-[0.18em] text-white/50'>Filters</p>
                {hasFilters && (
                  <button
                    type='button'
                    onClick={resetFilters}
                    className='text-xs text-sky-300 hover:text-sky-200'
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <select
                  value={workspaceFilter}
                  onChange={(e) => setWorkspaceFilter(e.target.value)}
                  className='rounded-md border border-white/10 bg-background px-2 py-2 text-xs text-white outline-none'
                >
                  <option value='all'>All workspaces</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.workspace_id} value={workspace.workspace_id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>

                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className='rounded-md border border-white/10 bg-background px-2 py-2 text-xs text-white outline-none'
                >
                  <option value='all'>All folders</option>
                  {folders.map((folder) => (
                    <option key={folder.folder_id} value={folder.folder_id}>
                      {folder.name}
                    </option>
                  ))}
                </select>

                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className='rounded-md border border-white/10 bg-background px-2 py-2 text-xs text-white outline-none'
                >
                  <option value='all'>Created by: all</option>
                  <option value='me'>Created by: me</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className='rounded-md border border-white/10 bg-background px-2 py-2 text-xs text-white outline-none'
                >
                  <option value='all'>Any date</option>
                  <option value='7d'>Last 7 days</option>
                  <option value='30d'>Last 30 days</option>
                  <option value='90d'>Last 90 days</option>
                </select>

                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  className='rounded-md border border-white/10 bg-background px-2 py-2 text-xs text-white outline-none'
                >
                  <option value='all'>All visibility</option>
                  <option value='personal'>Personal</option>
                  <option value='shared'>Shared / workspace</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className='rounded-md border border-white/10 bg-background px-2 py-2 text-xs text-white outline-none'
                >
                  <option value='all'>All status</option>
                  <option value='active'>Active</option>
                  <option value='favorite'>Favorites</option>
                  <option value='archive'>Archive</option>
                  <option value='deleted'>Deleted</option>
                </select>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto custom-scrollbar pt-[16px] pb-[20px]'>
              {!search && !hasFilters ? (
                <p className='px-[20px] text-sm text-white/50'>Search notes, folders, or workspaces.</p>
              ) : (
                <div className='space-y-4'>
                  <RenderWorkspaceItem
                    title='Workspaces'
                    data={filteredWorkspaces}
                    setOpen={setOpen}
                  />
                  <RenderFolderItem
                    title='Folders'
                    data={filteredFolders}
                    setOpen={setOpen}
                  />
                  <RenderNoteItem title='Notes' data={filteredNotes} setOpen={setOpen} />
                </div>
              )}

              {search &&
                filteredWorkspaces.length === 0 &&
                filteredFolders.length === 0 &&
                filteredNotes.length === 0 && (
                  <p className='px-[20px] py-10 text-sm text-white/60'>
                    No results found for <span className='font-semibold text-white'>{search}</span>
                  </p>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SearchNote
