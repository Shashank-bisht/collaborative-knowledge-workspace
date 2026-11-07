import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { checkAndDeleteImg } from './img.js'

import dotenv from 'dotenv'

dotenv.config()
const { JWT_SECRET } = process.env

const PRESENCE_TTL_MS = 30000
const notePresence = new Map()

const cleanupExpiredPresence = () => {
  const now = Date.now()
  for (const [noteId, participants] of notePresence) {
    for (const [sessionKey, participant] of participants) {
      if (now - participant.last_seen > PRESENCE_TTL_MS) {
        participants.delete(sessionKey)
      }
    }
    if (participants.size === 0) notePresence.delete(noteId)
  }
}

const presenceCleanupTimer = setInterval(cleanupExpiredPresence, PRESENCE_TTL_MS)
presenceCleanupTimer.unref()

const getWorkspaceRole = (workspaceId, userId, callback) => {
  if (!workspaceId) {
    return callback({ role: 'owner' })
  }

  const q = `SELECT COALESCE(wm.role, 'owner') AS role
    FROM workspaces w
    LEFT JOIN workspace_members wm
      ON wm.workspace_id = w.workspace_id AND wm.user_id = ?
    WHERE w.workspace_id = ? AND (w.created_by = ? OR wm.user_id = ?)`

  db.query(q, [userId, workspaceId, userId, userId], (err, data) => {
    if (err) {
      console.error(err)
      return callback(null)
    }

    callback(data?.[0] || null)
  })
}

const ensureWorkspacePermission = (workspaceId, userId, res, callback, allowViewer = false) => {
  if (!workspaceId) {
    return callback('owner')
  }

  getWorkspaceRole(workspaceId, userId, (roleData) => {
    if (!roleData) {
      return res.status(403).json('You do not have access to this workspace.')
    }

    const role = roleData.role || 'owner'
    if (role === 'viewer' && !allowViewer) {
      return res.status(403).json('Viewer role cannot edit or manage notes in this workspace.')
    }

    callback(role)
  })
}

// Get and Add notes
export const getNotes = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const workspaceId = req.query.workspace_id || null
    const q = workspaceId
      ? `SELECT n.note_id, n.name, n.content, n.version, n.created_date, n.deleted, n.archive, n.favorite, n.folder_id, n.workspace_id
        FROM notes n
        WHERE n.workspace_id = ?
          AND EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = n.workspace_id AND wm.user_id = ?
          )
        ORDER BY n.created_date DESC`
      : `SELECT note_id, name, content, version, created_date, deleted, archive, favorite, folder_id, workspace_id FROM notes WHERE user_id = ? ORDER BY created_date DESC`

    const params = workspaceId
      ? [workspaceId, userInfo.user_id]
      : [userInfo.user_id]

    db.query(q, params, (err, data) => {
      if (err) return res.status(403).json('You can view only your notes!')

      return res.status(200).json(data)
    })
  })
}

export const getNote = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const q = `SELECT n.note_id, n.name, n.content, n.version, n.created_date, n.deleted, n.archive, n.favorite, n.folder_id, n.workspace_id,
      COALESCE(wm.role, 'owner') AS workspace_role
      FROM notes n
      LEFT JOIN workspace_members wm
        ON wm.workspace_id = n.workspace_id AND wm.user_id = ?
      WHERE n.note_id = ? AND (
        n.user_id = ? OR EXISTS (
          SELECT 1 FROM workspace_members wm2 WHERE wm2.workspace_id = n.workspace_id AND wm2.user_id = ?
        )
      )`

    db.query(q, [userInfo.user_id, req.params.id, userInfo.user_id, userInfo.user_id], (err, data) => {
      if (err || data.length === 0)
        return res.status(403).json('You can view only your notes!')

      return res.status(200).json(data[0])
    })
  })
}

export const addNote = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const workspaceId = req.body.workspace_id || null
    if (workspaceId) {
      return ensureWorkspacePermission(workspaceId, userInfo.user_id, res, (role) => {
        if (['viewer'].includes(role)) {
          return res.status(403).json('Only editors/admins/owners can create notes in this workspace.')
        }

        const q = 'INSERT INTO notes(`note_id`,`name`, `content`, `folder_id`, `user_id`, `workspace_id`) VALUES (?)'
        const values = [
          uuidv4(),
          req.body.name,
          `${req.body.content}`,
          req.body.folder_id,
          userInfo.user_id,
          workspaceId,
        ]

        if (req.body.name === '') return res.status(403).json('Name cannot be empty!')

        db.query(q, [values], (err, data) => {
          if (err) return res.status(500).json(err)
          return res.status(200).json('Note has been created.')
        })
      })
    }

    const q = 'INSERT INTO notes(`note_id`,`name`, `content`, `folder_id`, `user_id`, `workspace_id`) VALUES (?)'
    const values = [
      uuidv4(),
      req.body.name,
      `${req.body.content}`,
      req.body.folder_id,
      userInfo.user_id,
      null,
    ]

    if (req.body.name === '') return res.status(403).json('Name cannot be empty!')

    db.query(q, [values], (err, data) => {
      if (err) return res.status(500).json(err)
      return res.status(200).json('Note has been created.')
    })
  })
}

// delete note
export const deleteNote = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const q = 'SELECT n.note_id, n.content, n.user_id, n.workspace_id, COALESCE(wm.role, "owner") AS workspace_role FROM notes n LEFT JOIN workspace_members wm ON wm.workspace_id = n.workspace_id AND wm.user_id = ? WHERE n.note_id = ?'

    db.query(q, [userInfo.user_id, noteId], (err, data) => {
      if (err || data.length === 0) return res.status(404).json('Note not found.')

      const note = data[0]
      const isOwner = note.user_id === userInfo.user_id
      const workspaceRole = note.workspace_role || 'owner'

      if (note.workspace_id && !isOwner && ['viewer'].includes(workspaceRole)) {
        return res.status(403).json('You do not have permission to delete this note.')
      }

      if (!note.workspace_id && !isOwner) {
        return res.status(403).json('You do not have permission to delete this note.')
      }

      const deleteQuery = 'DELETE FROM notes WHERE note_id = ? AND (user_id = ? OR workspace_id IS NOT NULL)'
      db.query(deleteQuery, [noteId, userInfo.user_id], (deleteErr, deleteData) => {
        if (deleteErr) return res.status(500).json(deleteErr)
        if (deleteData.affectedRows === 0) return res.status(403).json('You do not have permission to delete this note.')

        try {
          checkAndDeleteImg(note.content ? note.content : '', '')
        } catch (error) {
          console.log(error)
          return res.status(500).json(error)
        }

        return res.status(200).json('Note has been deleted.')
      })
    })
  })
}

// update note
export const updateNote = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const q2 = `SELECT n.content, n.user_id, n.workspace_id, COALESCE(wm.role, 'owner') AS workspace_role
      FROM notes n
      LEFT JOIN workspace_members wm
        ON wm.workspace_id = n.workspace_id AND wm.user_id = ?
      WHERE n.note_id = ?`

    db.query(q2, [userInfo.user_id, noteId], (permissionError, noteData) => {
      if (permissionError) {
        console.error(permissionError)
        return res.status(500).json("Internal server error. Can't update note.")
      }
      if (noteData.length === 0) {
        return res.status(404).json('Note not found.')
      }

      const note = noteData[0]
      const isOwner = note.user_id === userInfo.user_id
      const workspaceRole = note.workspace_role || 'owner'

      if (note.workspace_id) {
        if (note.user_id !== userInfo.user_id && ['viewer'].includes(workspaceRole)) {
          return res.status(403).json('You do not have edit access to this note.')
        }
      } else if (!isOwner) {
        return res.status(403).json('You do not have edit access to this note.')
      }

      if (
        !isOwner &&
        note.workspace_id &&
        ['viewer'].includes(workspaceRole)
      ) {
        return res.status(403).json('You do not have edit access to this note.')
      }

      if (
        !isOwner &&
        Object.keys(req.body).some(
          (field) => !['name', 'content', 'version'].includes(field)
        )
      ) {
        return res
          .status(403)
          .json('Editors can update only the note title and content.')
      }

      if (
        req.body.name !== undefined &&
        (typeof req.body.name !== 'string' || req.body.name.trim() === '')
      ) {
        return res.status(400).json('Name cannot be empty.')
      }
      if (
        req.body.content !== undefined &&
        typeof req.body.content !== 'string'
      ) {
        return res.status(400).json('Note content must be text.')
      }

      const changesContent =
        req.body.name !== undefined || req.body.content !== undefined
      const expectedVersion = Number(req.body.version)
      if (
        changesContent &&
        (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
      ) {
        return res
          .status(400)
          .json('A valid note version is required to save title or content.')
      }

      const assignments = []
      const values = []
      if (req.body.name !== undefined) {
        assignments.push('`name` = ?')
        values.push(req.body.name)
      }
      if (req.body.content !== undefined) {
        assignments.push('content = ?')
        values.push(req.body.content)
      }
      if (isOwner && req.body.folder_id !== undefined) {
        assignments.push('folder_id = ?')
        values.push(req.body.folder_id)
      }
      if (isOwner && req.body.archive !== undefined) {
        assignments.push('archive = ?')
        values.push(req.body.archive)
      }
      if (isOwner && req.body.favorite !== undefined) {
        assignments.push('favorite = ?')
        values.push(req.body.favorite)
      }
      if (isOwner && req.body.deleted !== undefined) {
        assignments.push('deleted = ?')
        values.push(req.body.deleted)
      }
      if (changesContent) assignments.push('version = version + 1')

      if (assignments.length === 0) {
        return res.status(400).json('No note changes were provided.')
      }

      const updateQuery = `UPDATE notes SET ${assignments.join(', ')}
        WHERE note_id = ?
          ${changesContent ? 'AND version = ?' : ''}
          AND (user_id = ? OR EXISTS (
            SELECT 1 FROM workspace_members wm2
            WHERE wm2.workspace_id = notes.workspace_id AND wm2.user_id = ?
          ))`

      db.query(
        updateQuery,
        [
          ...values,
          noteId,
          ...(changesContent ? [expectedVersion] : []),
          userInfo.user_id,
          userInfo.user_id,
        ],
        (updateError, result) => {
          if (updateError) {
            console.error(updateError)
            return res
              .status(500)
              .json("Internal server error. Can't update note.")
          }

          const finishUpdate = () => {
            if (
              req.body.content !== undefined &&
              note.content !== req.body.content
            ) {
              try {
                checkAndDeleteImg(
                  note.content || '',
                  req.body.content
                )
              } catch (imageError) {
                console.error(imageError)
                return res
                  .status(500)
                  .json("Internal server error. Can't update note images.")
              }
            }
            return res.status(200).json({
              message: 'Note has been updated.',
              ...(changesContent ? { version: expectedVersion + 1 } : {}),
            })
          }

          if (result.affectedRows > 0) return finishUpdate()

          return res.status(403).json('You no longer have edit access to this note.')
        }
      )
    })
  })
}

export const getNotePresence = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const q = `SELECT n.note_id, n.user_id, n.workspace_id, u.username
      FROM notes n
      JOIN users u ON u.user_id = ?
      WHERE n.note_id = ? AND (
        n.user_id = ? OR EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.workspace_id = n.workspace_id AND wm.user_id = ?
        )
      )`

    db.query(q, [userInfo.user_id, noteId, userInfo.user_id, userInfo.user_id], (err, data) => {
      if (err || data.length === 0) return res.status(404).json('Note not found.')

      cleanupExpiredPresence()
      const presence = notePresence.get(noteId)
      if (!presence) return res.status(200).json([])

      return res.status(200).json(
        Array.from(presence.values()).filter((participant) => participant.user_id !== userInfo.user_id)
      )
    })
  })
}

export const updateNotePresence = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const status = req.body?.status
    const sessionId = req.body?.session_id

    if ((status !== 'viewing' && status !== 'editing') || typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return res.status(400).json('A valid session id and presence status are required.')
    }

    const q = `SELECT n.note_id, n.user_id, n.workspace_id, u.username
      FROM notes n
      JOIN users u ON u.user_id = ?
      WHERE n.note_id = ? AND (
        n.user_id = ? OR EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.workspace_id = n.workspace_id AND wm.user_id = ?
        )
      )`

    db.query(q, [userInfo.user_id, noteId, userInfo.user_id, userInfo.user_id], (err, data) => {
      if (err || data.length === 0) return res.status(404).json('Note not found.')

      cleanupExpiredPresence()
      const now = Date.now()
      const presence = notePresence.get(noteId) || new Map()
      const sessionKey = `${userInfo.user_id}:${sessionId}`

      presence.set(sessionKey, {
        user_id: userInfo.user_id,
        username: data[0].username,
        status,
        last_seen: now,
      })

      notePresence.set(noteId, presence)
      return res.status(200).json('Presence updated.')
    })
  })
}

export const deleteNotePresence = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const sessionKey = `${userInfo.user_id}:${req.body?.session_id}`
    const presence = notePresence.get(noteId)
    presence?.delete(sessionKey)
    if (presence?.size === 0) notePresence.delete(noteId)
    return res.status(200).json('Presence removed.')
  })
}

const parseMentions = (message = '') => {
  const mentions = [...new Set((message.match(/@([A-Za-z0-9_.-]+)/g) || []).map((match) => match.slice(1)))]
  return mentions
}

const getNoteAccessInfo = (noteId, userId, callback) => {
  const q = `SELECT n.note_id, n.user_id, n.workspace_id, n.name,
      COALESCE(wm.role, 'owner') AS workspace_role
    FROM notes n
    LEFT JOIN workspace_members wm
      ON wm.workspace_id = n.workspace_id AND wm.user_id = ?
    WHERE n.note_id = ?`

  db.query(q, [userId, noteId], (err, data) => {
    if (err) {
      console.error(err)
      return callback(null, 'Unable to load note information.')
    }

    if (!data || data.length === 0) {
      return callback(null, 'Note not found.')
    }

    callback(data[0], null)
  })
}

// Threaded replies only: no mention parsing in the server flow.

export const getNoteComments = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const q = `SELECT c.comment_id, c.note_id, c.user_id, c.parent_comment_id, c.message, c.created_at,
        u.username
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.note_id = ?
      ORDER BY c.created_at ASC`

    db.query(q, [noteId], (dbErr, comments) => {
      if (dbErr) {
        console.error(dbErr)
        return res.status(500).json('Unable to load comments.')
      }

      return res.status(200).json(comments)
    })
  })
}

export const addNoteComment = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const noteId = req.params.id
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    const parentCommentId = req.body?.parent_comment_id || null

    if (!message) return res.status(400).json('Comment message is required.')

    getNoteAccessInfo(noteId, userInfo.user_id, (note, accessError) => {
      if (accessError) return res.status(404).json(accessError)
      if (!note) return res.status(404).json('Note not found.')

      const isOwner = note.user_id === userInfo.user_id
      const workspaceRole = note.workspace_role || 'owner'
      if (note.workspace_id && !isOwner && ['viewer'].includes(workspaceRole)) {
        return res.status(403).json('You do not have access to comment on this note.')
      }

      if (parentCommentId) {
        db.query(
          'SELECT comment_id, note_id FROM comments WHERE comment_id = ? AND note_id = ?',
          [parentCommentId, noteId],
          (parentErr, parentRows) => {
            if (parentErr || parentRows.length === 0) {
              return res.status(400).json('Reply target not found.')
            }

            saveComment()
          }
        )
      } else {
        saveComment()
      }

      function saveComment() {
        const commentId = uuidv4()

        db.query(
          'INSERT INTO comments(comment_id, note_id, user_id, parent_comment_id, message) VALUES (?, ?, ?, ?, ?)',
          [commentId, noteId, userInfo.user_id, parentCommentId, message],
          (insertErr) => {
            if (insertErr) {
              console.error(insertErr)
              return res.status(500).json('Unable to save comment.')
            }

            const q = `SELECT c.comment_id, c.note_id, c.user_id, c.parent_comment_id, c.message, c.created_at, u.username
              FROM comments c
              JOIN users u ON u.user_id = c.user_id
              WHERE c.comment_id = ?`

            db.query(q, [commentId], (commentErr, commentRows) => {
              if (commentErr || commentRows.length === 0) {
                return res.status(500).json('Comment saved but could not be reloaded.')
              }

              return res.status(201).json(commentRows[0])
            })
          }
        )
      }
    })
  })
}

export const updateNoteComment = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const commentId = req.params.commentId
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message) return res.status(400).json('Comment message is required.')

    db.query(
      'SELECT user_id FROM comments WHERE comment_id = ?',
      [commentId],
      (selectErr, rows) => {
        if (selectErr || rows.length === 0) {
          return res.status(404).json('Comment not found.')
        }

        if (rows[0].user_id !== userInfo.user_id) {
          return res.status(403).json('You can only edit your own comment.')
        }

        db.query(
          'UPDATE comments SET message = ? WHERE comment_id = ?',
          [message, commentId],
          (updateErr) => {
            if (updateErr) {
              console.error(updateErr)
              return res.status(500).json('Unable to update comment.')
            }

            return res.status(200).json({ message: 'Comment updated.' })
          }
        )
      }
    )
  })
}

export const deleteNoteComment = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const commentId = req.params.commentId
    db.query(
      'SELECT user_id, note_id FROM comments WHERE comment_id = ?',
      [commentId],
      (selectErr, rows) => {
        if (selectErr || rows.length === 0) {
          return res.status(404).json('Comment not found.')
        }

        const comment = rows[0]
        if (comment.user_id !== userInfo.user_id) {
          return res.status(403).json('You can only delete your own comment.')
        }

        db.query('DELETE FROM comments WHERE comment_id = ?', [commentId], (deleteErr) => {
          if (deleteErr) {
            console.error(deleteErr)
            return res.status(500).json('Unable to delete comment.')
          }

          return res.status(200).json({ message: 'Comment deleted.' })
        })
      }
    )
  })
}

export const emptyTrash = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const workspaceId = req.query.workspace_id || null

    const baseQuery = `
      SELECT n.note_id, n.content, n.user_id, n.workspace_id, COALESCE(wm.role, 'owner') AS workspace_role
      FROM notes n
      LEFT JOIN workspace_members wm
        ON wm.workspace_id = n.workspace_id AND wm.user_id = ?
      WHERE n.deleted = 1 AND (
        n.user_id = ? OR EXISTS (
          SELECT 1 FROM workspace_members wm2
          WHERE wm2.workspace_id = n.workspace_id AND wm2.user_id = ?
        )
      )
    `

    const params = [userInfo.user_id, userInfo.user_id, userInfo.user_id]
    const finalQuery = workspaceId ? `${baseQuery} AND n.workspace_id = ?` : baseQuery
    if (workspaceId) params.push(workspaceId)

    db.query(finalQuery, params, (fetchErr, rows) => {
      if (fetchErr) {
        console.error(fetchErr)
        return res.status(500).json('Unable to load trash items.')
      }

      if (!rows || rows.length === 0) {
        return res.status(200).json({ deleted: 0, message: 'Trash is already empty.' })
      }

      const deletableIds = rows
        .filter((note) => {
          if (!note.workspace_id) return note.user_id === userInfo.user_id
          const isOwner = note.user_id === userInfo.user_id
          const role = note.workspace_role || 'owner'
          if (isOwner) return true
          return !['viewer'].includes(role)
        })
        .map((note) => note.note_id)

      if (deletableIds.length === 0) {
        return res.status(403).json('You do not have permission to clear trash in this workspace.')
      }

      const placeholder = deletableIds.map(() => '?').join(', ')
      const deleteQuery = `DELETE FROM notes WHERE note_id IN (${placeholder})`

      db.query(deleteQuery, deletableIds, (deleteErr, result) => {
        if (deleteErr) {
          console.error(deleteErr)
          return res.status(500).json('Unable to clear trash.')
        }

        deletableIds.forEach((noteId) => {
          const note = rows.find((row) => row.note_id === noteId)
          if (note?.content) {
            try {
              checkAndDeleteImg(note.content, '')
            } catch (imageError) {
              console.error(imageError)
            }
          }
        })

        return res.status(200).json({
          deleted: result?.affectedRows || 0,
          message: 'Trash cleared successfully.',
        })
      })
    })
  })
}
