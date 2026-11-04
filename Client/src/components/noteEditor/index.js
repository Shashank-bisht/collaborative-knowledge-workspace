import React, { useEffect, useState, useContext, useRef } from 'react'
import { Loader2 } from 'lucide-react'

import { LuCalendarDays } from 'react-icons/lu'
import { dateToString } from '../../lib/utils'
import Editable from '../ui/editable'
import useNoteEditor from './editor'
import EditorToolbar from './editor/editorToolbar'
import { EditorTipTap } from './editor/editorTipTap'
import BubbleEditor from './editor/bubbleEditor'
import { NoteMenuList } from './noteMenuLists'
import AddToFolder from './noteMenuLists/menus/addToFolder'
import { AiFillFolder } from 'react-icons/ai'
import { useMediaQuery } from 'react-responsive'
import { NoteEditorMobile } from './mobile'
import SharedNotePresence, {
  useSharedNoteEditing,
} from './sharedNotePresence'
import { useGlobalContext } from '../../api/useGlobalContext'
import {
  xDeleteNotePresence,
  xGetNoteComments,
  xGetNotePresence,
  xUpdateNotePresence,
  xAddNoteComment,
  xDeleteNoteComment,
  xUpdateNoteComment,
} from '../../api/fetch'

const buildReplyTree = (comments = []) => {
  const map = new Map()
  const roots = []

  comments.forEach((comment) => {
    map.set(comment.comment_id, { ...comment, replies: [] })
  })

  comments.forEach((comment) => {
    const node = map.get(comment.comment_id)
    if (comment.parent_comment_id && map.has(comment.parent_comment_id)) {
      map.get(comment.parent_comment_id).replies.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

const countNestedReplies = (node) =>
  node.replies.reduce((total, reply) => total + 1 + countNestedReplies(reply), 0)

export const NoteEditor = ({ folder_id }) => {
  const {
    folders,
    activeBlock,
    setIsActiveNote,
    note,
    shares,
    setNote,
    getNotes,
    getBookmarks,
    onSave,
    isEditable,
    currentUserId,
  } = useContext(useGlobalContext)

  const [isEdit, setIsEdit] = useState(isEditable)
  const [title, setTitle] = useState(note?.name || '')
  const [isError, setIsError] = useState(false)
  const [participants, setParticipants] = useState([])
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const isBigScreen = useMediaQuery({ minWidth: 1024 })
  const [isOpenDialog, setIsOpenDialog] = useState(false)
  const { isEditing, markEditing } = useSharedNoteEditing(isEditable)
  const sessionIdRef = useRef(null)

  let editor = useNoteEditor({ onEdit: markEditing })

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return

    try {
      await xDeleteNoteComment(commentId)
      setComments((prev) => prev.filter((comment) => comment.comment_id !== commentId))
      if (editingCommentId === commentId) {
        setEditingCommentId(null)
        setEditDraft('')
      }
    } catch (error) {
      console.error('Unable to delete note comment.', error)
    }
  }

  const handleEditSave = async (commentId) => {
    if (!editDraft.trim()) return

    try {
      await xUpdateNoteComment(commentId, editDraft.trim())
      setComments((prev) =>
        prev.map((comment) =>
          comment.comment_id === commentId
            ? { ...comment, message: editDraft.trim() }
            : comment
        )
      )
      setEditingCommentId(null)
      setEditDraft('')
    } catch (error) {
      console.error('Unable to update note comment.', error)
    }
  }

  const renderThread = (node, depth = 0) => {
    const replyCount = countNestedReplies(node)
    const isOwner = currentUserId === node.user_id
    const isEditingThis = editingCommentId === node.comment_id

    return (
      <div key={node.comment_id} className='space-y-2'>
        <div
          className='relative rounded-xl border border-white/10 bg-background/60 p-3 shadow-sm shadow-black/10'
          style={{ marginLeft: depth > 0 ? depth * 18 : 0 }}
        >
          {depth > 0 && (
            <div className='absolute -left-3 top-2 h-8 w-px bg-sky-500/60' aria-hidden='true' />
          )}

          <div className='mb-2 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2 text-sm'>
              <span className='font-medium text-white'>{node.username}</span>
              {replyCount > 0 && (
                <span className='rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-200'>
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
            <span className='text-[11px] text-white/45'>
              {new Date(node.created_at).toLocaleString()}
            </span>
          </div>

          {isEditingThis ? (
            <div className='space-y-3'>
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                className='w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-500/60'
              />
              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    setEditingCommentId(null)
                    setEditDraft('')
                  }}
                  className='rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  disabled={!editDraft.trim()}
                  onClick={() => handleEditSave(node.comment_id)}
                  className='rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-sky-500/50'
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className='text-sm leading-6 text-white/80'>{node.message}</p>
          )}

          {!isEditingThis && (
            <div className='mt-3 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setReplyTo(node.comment_id)}
                className='text-xs text-sky-300 hover:text-sky-200'
              >
                Reply
              </button>
              {isOwner && (
                <>
                  <button
                    type='button'
                    onClick={() => {
                      setEditingCommentId(node.comment_id)
                      setEditDraft(node.message)
                    }}
                    className='text-xs text-amber-300 hover:text-amber-200'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDeleteComment(node.comment_id)}
                    className='text-xs text-rose-300 hover:text-rose-200'
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {node.replies?.length ? (
          <div className='space-y-2 border-l border-sky-500/20 pl-3'>
            {node.replies.map((reply) => renderThread(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    )
  }

  useEffect(() => {
    setTitle(note?.name)
    setIsError(false)
  }, [note])

  useEffect(() => {
    if (!note?.note_id) {
      setComments([])
      return
    }

    const fetchComments = async () => {
      try {
        const response = await xGetNoteComments(note.note_id)
        setComments(response)
      } catch (error) {
        setComments([])
      }
    }

    fetchComments()
  }, [note?.note_id])

  useEffect(() => {
    if (!note?.note_id) return

    const sessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
    sessionIdRef.current = sessionId

    const refreshPresence = async () => {
      try {
        await xUpdateNotePresence(note.note_id, isEditable ? 'editing' : 'viewing', sessionId)
        const activeParticipants = await xGetNotePresence(note.note_id)
        setParticipants(activeParticipants)
      } catch (error) {
        console.error('Unable to refresh note presence.', error)
      }
    }

    refreshPresence()
    const interval = setInterval(refreshPresence, 5000)

    return () => {
      clearInterval(interval)
      if (note?.note_id && sessionIdRef.current) {
        xDeleteNotePresence(note.note_id, sessionIdRef.current).catch(() => {})
      }
    }
  }, [note?.note_id, isEditable])

  const handleAddComment = async () => {
    if (!note?.note_id || !commentDraft.trim()) return

    setCommentLoading(true)
    try {
      const payload = {
        message: commentDraft.trim(),
        ...(replyTo ? { parent_comment_id: replyTo } : {}),
      }

      const newComment = await xAddNoteComment(note.note_id, payload.message, payload.parent_comment_id || null)
      setComments((prev) => [...prev, newComment])
      setCommentDraft('')
      setReplyTo(null)
    } catch (error) {
      console.error('Unable to add note comment.', error)
    } finally {
      setCommentLoading(false)
    }
  }

  const folder = folders.find((f) => f.folder_id === note?.folder_id)
  const shareId =
    note?.share_id ||
    shares.find((share) => share.note_id === note?.note_id)?.share_id

  const threadTree = buildReplyTree(comments)

  if (!isBigScreen) return <NoteEditorMobile folder_id={folder_id} />

  return (
    <>
      <div
        className={
          (activeBlock === 'readShare' ? '' : 'lg:w-[calc(100vw-650px)] ') +
          'w-full px-[50px] lg:h-screen h-[calc(100vh-80px)] overflow-y-auto'
        }
      >
        <header className='sticky top-0 bg-background pt-[30px]'>
          <div className='flex justify-between items-center gap-5 mb-[20px] relative'>
            <Editable
              className={`text-[30px] text-white font-semibold w-full border-white/[5%] border-b  ${
                onSave && 'opacity-10 blur-sm'
              } ${isError && 'border-red-500 border-b'}`}
              value={title}
              maxLength={50}
              isEdit={isEditable && isEdit}
              setIsEdit={setIsEdit}
              isEditable={isEditable}
              onChange={(e) => {
                markEditing()
                setTitle(e.target.value)
              }}
              onBlur={async () => {
                note.name = title
                setIsEdit(false)
              }}
              readOnly={!isEditable}
            />
            {onSave && (
              <div className='absolute inset-0 flex justify-center'>
                <div className='flex items-center'>
                  <Loader2 className='animate-spin h-6 w-6 mr-2' />
                  <p>Saving note ....</p>
                </div>
              </div>
            )}
            <NoteMenuList
              data={note}
              getNotes={getNotes}
              getBookmarks={getBookmarks}
              setNote={setNote}
              shares={shares}
              activeBlock={activeBlock}
              setIsActiveNote={setIsActiveNote}
            />
          </div>

          {(shareId || participants.length > 0) && (
            <div className='mb-4'>
              <SharedNotePresence
                shareId={shareId}
                status={isEditing ? 'editing' : 'viewing'}
                participantsOverride={participants}
              />
            </div>
          )}

          <div className='flex flex-col gap-5 justify-center'>
            {!isEditable ? (
              <>
                <div className='flex gap-[10px] mb-5 items-center'>
                  <LuCalendarDays className='text-[20px]' />
                  <p className='font-semibold text-white/[60%] w-[100px] text-[14px]'>
                    Date
                  </p>
                  <p className='font-semibold text-white'>
                    {dateToString({ values: note?.created_date })}
                  </p>
                </div>
              </>
            ) : activeBlock === 'readShare' ||
              activeBlock === 'sharedWithMe' ||
              activeBlock === 'bookmark' ? null : (
              <div className='flex gap-[10px] mb-5  items-center'>
                <AiFillFolder className='text-[20px] text-orange-300' />
                <p className='font-semibold text-white/[60%] w-[100px] text-[14px]'>
                  Folder
                </p>
                <p
                  className='font-semibold text-white cursor-pointer hover:text-white text-[16px]'
                  onClick={() => {
                    setIsOpenDialog(true)
                  }}
                >
                  {folder?.name}
                </p>
              </div>
            )}
          </div>

          {activeBlock === 'bookmark' ||
          (activeBlock === 'sharedWithMe' && !isEditable) ||
          (activeBlock === 'readShare' && !isEditable) ? null : (
            <EditorToolbar editor={editor} isEditable={isEditable} />
          )}
        </header>
        <BubbleEditor editor={editor} />
        <EditorTipTap editor={editor} />

        <div className='mt-8 mb-10 rounded-xl border border-white/10 bg-white/[3%] p-4'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-white'>Threaded replies</h3>
            <span className='rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60'>
              {comments.length}
            </span>
          </div>

          <div className='space-y-4'>
            {threadTree.length === 0 ? (
              <p className='text-sm text-white/50'>No replies yet. Start the discussion.</p>
            ) : (
              threadTree.map((node) => renderThread(node, 0))
            )}
          </div>

          <div className='mt-5 border-t border-white/10 pt-4'>
            {replyTo && (
              <div className='mb-3 flex items-center justify-between rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200'>
                <span>Replying to thread</span>
                <button type='button' className='text-sky-200 hover:text-white' onClick={() => setReplyTo(null)}>
                  Clear
                </button>
              </div>
            )}
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={4}
              placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'}
              className='w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-500/60'
            />
            <div className='mt-3 flex justify-between'>
              <button
                type='button'
                onClick={() => setReplyTo(null)}
                className='rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white'
              >
                Cancel reply
              </button>
              <button
                type='button'
                disabled={commentLoading || !commentDraft.trim()}
                onClick={handleAddComment}
                className='rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-sky-500/50'
              >
                {commentLoading ? 'Posting...' : replyTo ? 'Reply' : 'Post comment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddToFolder
        open={isOpenDialog}
        setOpen={setIsOpenDialog}
        method='move'
      />
    </>
  )
}
