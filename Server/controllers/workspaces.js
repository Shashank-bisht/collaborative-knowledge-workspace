import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import dotenv from 'dotenv'

dotenv.config()
const { JWT_SECRET } = process.env

const authenticate = (req, res, callback) => {
  const token = req.cookies?.access_token

  if (!token) {
    res.status(401).json('Not authenticated!')
    return
  }

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) {
      res.status(403).json('Token is not valid!')
      return
    }

    callback(userInfo)
  })
}

const PRESENCE_TTL_MS = 30000
const workspacePresence = new Map()

const cleanupExpiredPresence = () => {
  const now = Date.now()
  for (const [workspaceId, participants] of workspacePresence) {
    for (const [sessionKey, participant] of participants) {
      if (now - participant.last_seen > PRESENCE_TTL_MS) {
        participants.delete(sessionKey)
      }
    }
    if (participants.size === 0) workspacePresence.delete(workspaceId)
  }
}

const presenceCleanupTimer = setInterval(cleanupExpiredPresence, PRESENCE_TTL_MS)
presenceCleanupTimer.unref()

const withWorkspaceAccess = (workspaceId, userId, res, callback) => {
  const q = `SELECT w.workspace_id, w.name, w.created_by,
      COALESCE(wm.role, 'owner') AS role
    FROM workspaces w
    LEFT JOIN workspace_members wm
      ON wm.workspace_id = w.workspace_id AND wm.user_id = ?
    WHERE w.workspace_id = ? AND (w.created_by = ? OR wm.user_id = ?)`

  db.query(q, [userId, workspaceId, userId, userId], (err, data) => {
    if (err) {
      console.error(err)
      return res.status(500).json('Unable to verify workspace access.')
    }
    if (data.length === 0) {
      return res.status(404).json('Workspace not found.')
    }

    callback(data[0])
  })
}

export const getWorkspaces = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const q = `SELECT w.workspace_id, w.name, w.description, w.created_at,
        COALESCE(wm.role, 'owner') AS role
      FROM workspaces w
      LEFT JOIN workspace_members wm
        ON wm.workspace_id = w.workspace_id AND wm.user_id = ?
      WHERE w.created_by = ? OR wm.user_id = ?
      GROUP BY w.workspace_id
      ORDER BY w.created_at DESC`

    db.query(q, [userInfo.user_id, userInfo.user_id, userInfo.user_id], (err, data) => {
      if (err) {
        console.error(err)
        return res.status(500).json('Unable to load workspaces.')
      }

      return res.status(200).json(data)
    })
  })
}

export const getWorkspace = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const q = `SELECT w.workspace_id, w.name, w.description, w.created_at,
        COALESCE(wm.role, 'owner') AS role
      FROM workspaces w
      LEFT JOIN workspace_members wm
        ON wm.workspace_id = w.workspace_id AND wm.user_id = ?
      WHERE w.workspace_id = ? AND (w.created_by = ? OR wm.user_id = ?)`

    db.query(q, [userInfo.user_id, req.params.id, userInfo.user_id, userInfo.user_id], (err, data) => {
      if (err) {
        console.error(err)
        return res.status(500).json('Unable to load workspace details.')
      }

      if (data.length === 0) {
        return res.status(404).json('Workspace not found.')
      }

      return res.status(200).json(data[0])
    })
  })
}

export const addWorkspace = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const name = req.body?.name?.trim()

    if (!name) {
      return res.status(400).json('Workspace name is required.')
    }

    const workspaceId = uuidv4()
    const q = `INSERT INTO workspaces (workspace_id, name, description, created_by)
      VALUES (?, ?, ?, ?)`

    db.query(q, [workspaceId, name, req.body?.description || '', userInfo.user_id], (err) => {
      if (err) {
        console.error(err)
        return res.status(500).json('Unable to create workspace.')
      }

      db.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES (?, ?, 'owner')`,
        [workspaceId, userInfo.user_id],
        (memberErr) => {
          if (memberErr) {
            console.error(memberErr)
            return res.status(500).json('Workspace was created but member assignment failed.')
          }

          return res.status(201).json({
            msg: 'Workspace created successfully.',
            workspace_id: workspaceId,
          })
        }
      )
    })
  })
}

export const updateWorkspace = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const name = req.body?.name?.trim()

    if (!name) {
      return res.status(400).json('Workspace name is required.')
    }

    const q = `UPDATE workspaces w
      LEFT JOIN workspace_members wm
        ON wm.workspace_id = w.workspace_id AND wm.user_id = ?
      SET w.name = ?
      WHERE w.workspace_id = ? AND (w.created_by = ? OR wm.role IN ('owner', 'admin'))`

    db.query(q, [userInfo.user_id, name, req.params.id, userInfo.user_id], (err, result) => {
      if (err) {
        console.error(err)
        return res.status(500).json('Unable to update workspace.')
      }

      if (result.affectedRows === 0) {
        return res.status(403).json('You do not have permission to update this workspace.')
      }

      return res.status(200).json({ msg: 'Workspace updated successfully.' })
    })
  })
}

export const deleteWorkspace = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const q = `DELETE FROM workspaces
      WHERE workspace_id = ? AND created_by = ?`

    db.query(q, [req.params.id, userInfo.user_id], (err, result) => {
      if (err) {
        console.error(err)
        return res.status(500).json('Unable to delete workspace.')
      }

      if (result.affectedRows === 0) {
        return res.status(403).json('Only the workspace owner can delete it.')
      }

      return res.status(200).json({ msg: 'Workspace deleted successfully.' })
    })
  })
}

export const getWorkspaceMembers = (req, res) => {
  authenticate(req, res, (userInfo) => {
    withWorkspaceAccess(req.params.id, userInfo.user_id, res, () => {
      const q = `SELECT wm.user_id, u.username, u.email, wm.role, wm.joined_at
        FROM workspace_members wm
        JOIN users u ON u.user_id = wm.user_id
        WHERE wm.workspace_id = ?
        ORDER BY wm.role DESC, u.username ASC`

      db.query(q, [req.params.id], (err, data) => {
        if (err) {
          console.error(err)
          return res.status(500).json('Unable to load workspace members.')
        }

        return res.status(200).json(data)
      })
    })
  })
}

export const addWorkspaceMember = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const identifier = typeof req.body?.user === 'string' ? req.body.user.trim().toLowerCase() : ''
    const role = req.body?.role

    if (!identifier) return res.status(400).json('Enter a username or email.')
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json('Role must be viewer, editor, or admin.')
    }

    withWorkspaceAccess(req.params.id, userInfo.user_id, res, (workspace) => {
      if (!['owner', 'admin'].includes(workspace.role)) {
        return res.status(403).json('You do not have permission to manage workspace members.')
      }

      db.query(
        'SELECT user_id FROM users WHERE username = ? OR email = ?',
        [identifier, identifier],
        (findError, users) => {
          if (findError) {
            return res.status(500).json('Unable to find that user.')
          }
          if (users.length === 0) {
            return res.status(404).json('No registered user matches that value.')
          }

          const invitedUserId = users[0].user_id
          if (invitedUserId === userInfo.user_id) {
            return res.status(400).json('The workspace owner is already a member.')
          }

          db.query(
            `INSERT INTO workspace_members (workspace_id, user_id, role)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE role = VALUES(role)`,
            [req.params.id, invitedUserId, role],
            (saveError) => {
              if (saveError) {
                console.error(saveError)
                return res.status(500).json('Unable to add this workspace member.')
              }

              return res.status(201).json('Workspace member saved.')
            }
          )
        }
      )
    })
  })
}

export const updateWorkspaceMember = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const role = req.body?.role
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json('Role must be viewer, editor, or admin.')
    }

    withWorkspaceAccess(req.params.id, userInfo.user_id, res, (workspace) => {
      if (!['owner', 'admin'].includes(workspace.role)) {
        return res.status(403).json('You do not have permission to change this role.')
      }

      if (req.params.userId === workspace.created_by) {
        return res.status(403).json('The workspace owner role cannot be changed here.')
      }

      db.query(
        'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
        [role, req.params.id, req.params.userId],
        (err, result) => {
          if (err) {
            console.error(err)
            return res.status(500).json('Unable to update workspace member role.')
          }
          if (result.affectedRows === 0) {
            return res.status(404).json('Workspace member not found.')
          }

          return res.status(200).json('Workspace member updated.')
        }
      )
    })
  })
}

export const removeWorkspaceMember = (req, res) => {
  authenticate(req, res, (userInfo) => {
    withWorkspaceAccess(req.params.id, userInfo.user_id, res, (workspace) => {
      if (!['owner', 'admin'].includes(workspace.role)) {
        return res.status(403).json('You do not have permission to remove members.')
      }

      if (req.params.userId === workspace.created_by) {
        return res.status(403).json('The workspace owner cannot be removed.')
      }

      db.query(
        'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
        [req.params.id, req.params.userId],
        (err, result) => {
          if (err) {
            console.error(err)
            return res.status(500).json('Unable to remove workspace member.')
          }
          if (result.affectedRows === 0) {
            return res.status(404).json('Workspace member not found.')
          }

          return res.status(200).json('Workspace member removed.')
        }
      )
    })
  })
}

export const updateWorkspacePresence = (req, res) => {
  authenticate(req, res, (userInfo) => {
    const status = req.body?.status
    const sessionId = req.body?.session_id

    if (
      (status !== 'viewing' && status !== 'editing') ||
      typeof sessionId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(sessionId)
    ) {
      return res.status(400).json('A valid session id and presence status are required.')
    }

    withWorkspaceAccess(req.params.id, userInfo.user_id, res, (workspace) => {
      cleanupExpiredPresence()
      const now = Date.now()
      const presence = workspacePresence.get(req.params.id) || new Map()
      const sessionKey = `${userInfo.user_id}:${sessionId}`

      presence.set(sessionKey, {
        user_id: userInfo.user_id,
        username: workspace.name,
        status,
        last_seen: now,
      })

      workspacePresence.set(req.params.id, presence)
      return res.status(200).json('Presence updated.')
    })
  })
}

export const getWorkspacePresence = (req, res) => {
  authenticate(req, res, (userInfo) => {
    withWorkspaceAccess(req.params.id, userInfo.user_id, res, () => {
      cleanupExpiredPresence()
      const presence = workspacePresence.get(req.params.id)
      if (!presence) return res.status(200).json([])

      const otherParticipants = Array.from(presence.values()).filter(
        (participant) => participant.user_id !== userInfo.user_id
      )

      return res.status(200).json(otherParticipants)
    })
  })
}

export const deleteWorkspacePresence = (req, res) => {
  authenticate(req, res, (userInfo) => {
    withWorkspaceAccess(req.params.id, userInfo.user_id, res, () => {
      const presence = workspacePresence.get(req.params.id)
      const sessionKey = `${userInfo.user_id}:${req.body?.session_id}`
      presence?.delete(sessionKey)
      if (presence?.size === 0) workspacePresence.delete(req.params.id)
      return res.status(200).json('Presence removed.')
    })
  })
}
