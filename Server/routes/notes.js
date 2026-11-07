import express from 'express'
import {
  getNotes,
  getNote,
  addNote,
  updateNote,
  deleteNote,
  emptyTrash,
  getNotePresence,
  updateNotePresence,
  deleteNotePresence,
  getNoteComments,
  addNoteComment,
  updateNoteComment,
  deleteNoteComment,
} from '../controllers/notes.js'

const router = express.Router()

router.get('/', getNotes)
router.get('/:id', getNote)
router.get('/:id/comments', getNoteComments)
router.get('/:id/presence', getNotePresence)
router.post('/', addNote)
router.post('/:id/comments', addNoteComment)
router.put('/:id', updateNote)
router.put('/:id/presence', updateNotePresence)
router.put('/comments/:commentId', updateNoteComment)
router.delete('/trash', emptyTrash)
router.delete('/:id', deleteNote)
router.delete('/:id/presence', deleteNotePresence)
router.delete('/comments/:commentId', deleteNoteComment)

export default router
