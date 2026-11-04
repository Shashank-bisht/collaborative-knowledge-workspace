import { createContext, useEffect, useState } from 'react'
import { xGetNotes } from './fetch'
import {
  xGetFolders,
  xGetShares,
  xGetBookmarks,
  xGetSharedWithMe,
  xGetWorkspaces,
} from './fetch'
import { xVerify, xlogin, xLogout, xRegister } from './fetch'

export const useGlobalContext = createContext()

export const AppProvider = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  )

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    localStorage.getItem('selectedWorkspaceId') || null
  )

  const [folders, setFolders] = useState([])

  // fetch single data and distribute into 4 state
  const [notes, setNotes] = useState([])
  const [favorites, setFavorites] = useState([])
  const [trash, setTrash] = useState([])
  const [archive, setArchive] = useState([])

  const [shares, setShares] = useState([])
  const [sharedWithMe, setSharedWithMe] = useState([])
  const [bookmarks, setBookmarks] = useState([])

  // Active
  const [activeBlock, setActiveBlock] = useState(null) // folders, favorites, trash, archive, shared, bookmark, readShare

  const [isActiveNote, setIsActiveNote] = useState(false)
  const [note, setNote] = useState({}) // contain note item

  // Note Editor
  const [onSave, setOnSave] = useState(false)
  const [isEditable, setIsEditable] = useState(false)

  // sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const clearWorkspaceSelection = () => {
    setWorkspaces([])
    setSelectedWorkspaceId(null)
    localStorage.removeItem('selectedWorkspaceId')
  }

  const getNotes = async () => {
    await xGetNotes(setNotes, setFavorites, setArchive, setTrash, selectedWorkspaceId)
  }
  const getFolders = async () => {
    await xGetFolders(setFolders, selectedWorkspaceId)
  }
  const getShares = async () => {
    await xGetShares(setShares)
  }
  const getSharedWithMe = async () => {
    setSharedWithMe(await xGetSharedWithMe())
  }
  const refreshChanger = async () => {
    getFolders()
    getNotes()
    getShares()
    getSharedWithMe()
  }
  const getBookmarks = async () => {
    await xGetBookmarks(setBookmarks)
  }
  const getWorkspacesList = async () => {
    const response = await xGetWorkspaces()
    setWorkspaces(response)

    if (!response.length) {
      clearWorkspaceSelection()
      return
    }

    const availableWorkspaceIds = response.map((workspace) => workspace.workspace_id)

    if (!selectedWorkspaceId || !availableWorkspaceIds.includes(selectedWorkspaceId)) {
      const nextWorkspaceId = response[0]?.workspace_id || null
      setSelectedWorkspaceId(nextWorkspaceId)
      if (nextWorkspaceId) {
        localStorage.setItem('selectedWorkspaceId', nextWorkspaceId)
      } else {
        localStorage.removeItem('selectedWorkspaceId')
      }
    }
  }

  const verify = async () => {
    const success = await xVerify(setCurrentUserId)
    if (!success) {
      clearWorkspaceSelection()
      return
    }

    await getWorkspacesList()
    refreshChanger()
    getBookmarks()
  }
  const login = async (inputs) => {
    clearWorkspaceSelection()
    return await xlogin(setCurrentUserId, inputs)
  }
  const logout = async () => {
    await xLogout(setCurrentUserId)
    clearWorkspaceSelection()
  }
  const register = async (inputs) => {
    return await xRegister(inputs)
  }

  useEffect(() => {
    if (selectedWorkspaceId) {
      localStorage.setItem('selectedWorkspaceId', selectedWorkspaceId)
      refreshChanger()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceId])

  useEffect(() => {
    // not render multiple times with in a second
    let timer = null
    timer = setTimeout(() => {
      verify()
    }, 100)
    localStorage.setItem('user', JSON.stringify(currentUserId))

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  useEffect(() => {
    setIsActiveNote(false)
    setNote({})
    setIsEditable(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlock])

  return (
    <useGlobalContext.Provider
      value={{
        currentUserId,
        setCurrentUserId,

        workspaces,
        setWorkspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,

        notes,
        setNotes,

        shares,
        setShares,

        sharedWithMe,
        setSharedWithMe,

        bookmarks,
        setBookmarks,

        favorites,
        setFavorites,

        trash,
        setTrash,

        archive,
        setArchive,

        folders,
        setFolders,

        activeBlock,
        setActiveBlock,

        isActiveNote,
        setIsActiveNote,

        note,
        setNote,

        onSave,
        setOnSave,

        isEditable,
        setIsEditable,

        isSidebarOpen,
        setIsSidebarOpen,

        getNotes,
        getFolders,
        refreshChanger,
        getShares,
        getSharedWithMe,
        getBookmarks,
        getWorkspacesList,

        verify,
        login,
        register,
        logout,
      }}
    >
      {children}
    </useGlobalContext.Provider>
  )
}
