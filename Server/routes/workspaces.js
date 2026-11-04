import express from 'express'
import {
  getWorkspaces,
  getWorkspace,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMember,
  removeWorkspaceMember,
  getWorkspacePresence,
  updateWorkspacePresence,
  deleteWorkspacePresence,
} from '../controllers/workspaces.js'

const router = express.Router()

router.get('/', getWorkspaces)
router.get('/:id', getWorkspace)
router.get('/:id/members', getWorkspaceMembers)
router.get('/:id/presence', getWorkspacePresence)
router.post('/', addWorkspace)
router.post('/:id/members', addWorkspaceMember)
router.put('/:id', updateWorkspace)
router.put('/:id/members/:userId', updateWorkspaceMember)
router.put('/:id/presence', updateWorkspacePresence)
router.delete('/:id', deleteWorkspace)
router.delete('/:id/members/:userId', removeWorkspaceMember)
router.delete('/:id/presence', deleteWorkspacePresence)

export default router
