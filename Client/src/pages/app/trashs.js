import React, { useEffect, useContext } from 'react'
import { AiFillDelete } from 'react-icons/ai'
import NoteList from '../../components/noteList'
import TrashMenu from '../../components/trash/trashMenu'

import { useGlobalContext } from '../../api/useGlobalContext'

const Trashs = () => {
  const {
    trash,
    note,
    setNote,
    isActiveNote,
    setIsActiveNote,
    activeBlock,
    setActiveBlock,
  } = useContext(useGlobalContext)

  useEffect(() => {
    setActiveBlock('trash')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <NoteList
        icon={<AiFillDelete className='text-rose-400 mr-3 h-6 w-6' />}
        title='Trash'
        array={trash}
        note={note}
        setNote={setNote}
        isActiveNote={isActiveNote}
        setIsActiveNote={setIsActiveNote}
        activeBlock={activeBlock}
      />
      <TrashMenu />
    </>
  )
}

export default Trashs
