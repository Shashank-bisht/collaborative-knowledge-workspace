import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { checkAndDeleteImg } from './img.js'
import dotenv from 'dotenv'

dotenv.config()
const { JWT_SECRET } = process.env

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
      return res.status(403).json('Viewer role cannot manage folders in this workspace.')
    }

    callback(role)
  })
}

export const getFolders = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const workspaceId = req.query.workspace_id || null
    const q = workspaceId
      ? `SELECT f.folder_id, f.name, f.workspace_id
        FROM folders f
        WHERE f.workspace_id = ?
          AND EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = f.workspace_id AND wm.user_id = ?
          )`
      : 'SELECT folder_id, name, workspace_id FROM folders WHERE `user_id` = ?'

    const params = workspaceId
      ? [workspaceId, userInfo.user_id]
      : [userInfo.user_id]

    db.query(q, params, (err, data) => {
      if (err) return res.status(403).json('Something went wrong!')

      return res.status(200).json(data)
    })
  })
}

// usless function
export const getFolder = (req, res) => {
  const token = req.cookies.access_token

  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')
    const q =
      'SELECT folder_id, name, created_date, workspace_id FROM folders WHERE `folder_id` = ? AND user_id = ?'

    db.query(q, [req.params.id, userInfo.user_id], (err, data) => {
      if (err || data.length === 0)
        return res.status(403).json('You can get only your folders!')

      return res.status(200).json(data[0])
    })
  })
}

export const addFolder = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const workspaceId = req.body.workspace_id || null
    if (workspaceId) {
      return ensureWorkspacePermission(workspaceId, userInfo.user_id, res, (role) => {
        if (['viewer'].includes(role)) {
          return res.status(403).json('Only editors/admins/owners can create folders in this workspace.')
        }

        const q = 'INSERT INTO folders(`folder_id`,`name`, `user_id`, `workspace_id`) VALUES (?)'
        const folderId = uuidv4()
        const values = [folderId, req.body.name, userInfo.user_id, workspaceId]

        if (req.body.name === '') return res.status(403).json('Name is required!')

        db.query(q, [values], (err, data) => {
          if (err) return res.status(500).json('Internal server error')

          return res.status(200).json({ msg: 'Succesfully created.', folder_id: folderId })
        })
      })
    }

    const q = 'INSERT INTO folders(`folder_id`,`name`, `user_id`, `workspace_id`) VALUES (?)'
    const folderId = uuidv4()
    const values = [folderId, req.body.name, userInfo.user_id, null]

    if (req.body.name === '') return res.status(403).json('Name is required!')

    db.query(q, [values], (err, data) => {
      if (err) return res.status(500).json('Internal server error')

      return res.status(200).json({ msg: 'Succesfully created.', folder_id: folderId })
    })
  })
}

export const deleteFolder = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const folderId = req.params.id
    const q = 'SELECT folder_id, name, user_id, workspace_id FROM folders WHERE `folder_id` = ?'

    db.query(q, [folderId], (err, data) => {
      if (err || data.length === 0) return res.status(404).json('Folder not found.')

      const folder = data[0]
      const isOwner = folder.user_id === userInfo.user_id
      if (folder.workspace_id) {
        return ensureWorkspacePermission(folder.workspace_id, userInfo.user_id, res, (role) => {
          if (['viewer'].includes(role)) {
            return res.status(403).json('Viewer role cannot delete this folder.')
          }

          const deleteQuery = 'DELETE FROM folders WHERE `folder_id` = ? AND (`user_id` = ? OR `workspace_id` IS NOT NULL)'
          db.query(deleteQuery, [folderId, userInfo.user_id], (err, data) => {
            if (err) return res.status(403).json('Something went wrong! Try again later.')

            if (data.affectedRows === 0) return res.status(403).json('You do not have permission to delete this folder.')

            return res.status(200).json({ msg: 'Succesfully deleted.' })
          })
        })
      }

      if (!isOwner) return res.status(403).json('You do not have permission to delete this folder.')

      const deleteQuery = 'DELETE FROM folders WHERE `folder_id` = ? AND `user_id` = ?'
      db.query(deleteQuery, [folderId, userInfo.user_id], (err, data) => {
        if (err) return res.status(403).json('Something went wrong! Try again later.')
        return res.status(200).json({ msg: 'Succesfully deleted.' })
      })
    })
  })
}

export const updateFolder = (req, res) => {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json('Not authenticated!')

  jwt.verify(token, JWT_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json('Token is not valid!')

    const folderId = req.params.id
    const q = 'SELECT folder_id, name, user_id, workspace_id FROM folders WHERE `folder_id` = ?'

    db.query(q, [folderId], (err, data) => {
      if (err || data.length === 0) return res.status(404).json('Folder not found.')

      const folder = data[0]
      if (folder.workspace_id) {
        return ensureWorkspacePermission(folder.workspace_id, userInfo.user_id, res, (role) => {
          if (['viewer'].includes(role)) {
            return res.status(403).json('Viewer role cannot rename this folder.')
          }

          const updateQuery = 'UPDATE folders SET `name`=? WHERE `folder_id` = ? AND (`user_id` = ? OR `workspace_id` IS NOT NULL)'
          db.query(updateQuery, [req.body.name, folderId, userInfo.user_id], (err, data) => {
            if (err) return res.status(500).json('Internal server error')
            if (data.affectedRows === 0) return res.status(403).json('You do not have permission to update this folder.')
            return res.status(200).json({ msg: 'Succesfully updated.' })
          })
        })
      }

      if (folder.user_id !== userInfo.user_id) {
        return res.status(403).json('You do not have permission to update this folder.')
      }

      const q = 'UPDATE folders SET `name`=? WHERE `folder_id` = ? AND `user_id` = ?'
      db.query(q, [req.body.name, folderId, userInfo.user_id], (err, data) => {
        if (err) return res.status(500).json('Internal server error')
        return res.status(200).json({ msg: 'Succesfully updated.' })
      })
    })
  })
}
