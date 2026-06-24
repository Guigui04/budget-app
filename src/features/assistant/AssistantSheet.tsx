import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, X, ArrowUp } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { askAssistant, type ChatMessage } from './assistantClient'

const SUGGESTIONS = [
  'Combien j\'ai dépensé en resto ce mois ?',
  'Combien me reste-t-il d\'ici la fin du mois ?',
  'Sur quoi je dépense le plus ?',
  'Je peux me permettre 300 € ce mois-ci ?',
]

interface Props {
  open: boolean
  onClose: () => void
  context: string
}

export function AssistantSheet({ open, onClose, context }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    haptic('tap')
    const history = messages.slice(-6)
    setMessages((m) => [...m, { role: 'user', content: question }])
    setInput('')
    setBusy(true)
    try {
      const answer = await askAssistant(question, context, history)
      setMessages((m) => [...m, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e instanceof Error ? e.message : 'Une erreur est survenue.' }])
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="assistant-panel"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <div className="assistant-head">
              <span className="assistant-title"><Sparkles size={18} /> Demander à ton budget</span>
              <button className="assistant-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
            </div>

            <div className="assistant-msgs" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="assistant-welcome">
                  <span className="assistant-welcome-icon"><Sparkles size={28} /></span>
                  <p>Pose-moi une question sur ton argent. Je réponds avec tes vraies données.</p>
                  <div className="assistant-suggests">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} className="assistant-suggest" onClick={() => send(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`assistant-bubble ${m.role}`}>{m.content}</div>
              ))}

              {busy && (
                <div className="assistant-bubble assistant typing">
                  <span /><span /><span />
                </div>
              )}
            </div>

            <form
              className="assistant-input"
              onSubmit={(e) => { e.preventDefault(); send(input) }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écris ta question…"
                enterKeyHint="send"
                autoComplete="off"
              />
              <button type="submit" disabled={!input.trim() || busy} aria-label="Envoyer">
                <ArrowUp size={18} />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
