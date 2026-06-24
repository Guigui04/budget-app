import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Mobile bottom sheet with backdrop, drag handle and spring entrance. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Rendu dans <body> via portail : indispensable pour que le `position: fixed`
  // du backdrop soit relatif au viewport, et NON à un ancêtre qui porte un
  // `filter`/`transform` (la coque de page animée) — sinon la fiche se retrouve
  // positionnée en bas du contenu défilable, hors écran sur les pages longues.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            // Glisser vers le bas pour fermer. Le drag ne démarre que depuis la
            // poignée (dragListener=false + pointer down sur la poignée) afin de
            // ne pas interférer avec le défilement du contenu.
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
          >
            <div
              className="sheet-handle-zone"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="sheet-handle" />
            </div>
            {title && <h2 className="sheet-title">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
