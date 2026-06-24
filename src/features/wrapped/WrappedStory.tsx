import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X, RotateCcw, Sparkles } from 'lucide-react'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useCountUp } from '@/lib/useCountUp'
import { formatMoney, formatMoneyCompact, formatDateShort } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { WrappedData } from './wrappedData'

const SLIDE_MS = 4800

interface Slide {
  key: string
  background: string
  content: ReactNode
}

/** Nombre qui s'anime de 0 vers sa valeur à l'apparition du slide. */
function CountUp({ value, format, duration = 1100 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value))
    return () => cancelAnimationFrame(id)
  }, [value])
  return <>{format(useCountUp(v, duration))}</>
}

const intFmt = (n: number) => Math.round(n).toLocaleString('fr-FR')

function buildSlides(d: WrappedData): Slide[] {
  const slides: Slide[] = []

  slides.push({
    key: 'cover',
    background: 'linear-gradient(155deg, #7c5cff 0%, #b06ab3 55%, #ff8a5b 100%)',
    content: (
      <div className="wrap-center">
        <span className="wrap-emoji">✨</span>
        <h1 className="wrap-cover-title">Ton année<br />en argent</h1>
        <span className="wrap-cover-year">{d.year}</span>
        <span className="wrap-hint">Appuie pour avancer →</span>
      </div>
    ),
  })

  slides.push({
    key: 'total',
    background: 'linear-gradient(160deg, #4c2bd9 0%, #7c5cff 100%)',
    content: (
      <div className="wrap-center">
        <span className="wrap-kicker">Cette année, tu as dépensé</span>
        <span className="wrap-big num"><CountUp value={d.totalSpent} format={(n) => formatMoney(n)} /></span>
        <span className="wrap-note">soit ~{formatMoneyCompact(d.avgPerMonth)} par mois</span>
      </div>
    ),
  })

  slides.push({
    key: 'count',
    background: 'linear-gradient(160deg, #0ea5e9 0%, #6366f1 100%)',
    content: (
      <div className="wrap-center">
        <span className="wrap-kicker">Réparti sur</span>
        <span className="wrap-big num"><CountUp value={d.txnCount} format={intFmt} /></span>
        <span className="wrap-note">achats — environ {d.avgPerDay > 0 ? Math.max(1, Math.round(d.txnCount / d.daysElapsed * 7)) : 0} par semaine</span>
      </div>
    ),
  })

  if (d.topCategory) {
    const c = d.topCategory
    slides.push({
      key: 'topcat',
      background: `linear-gradient(160deg, ${c.category?.color ?? '#7c5cff'} 0%, #1b1430 130%)`,
      content: (
        <div className="wrap-center">
          <span className="wrap-kicker">Ton poste n°1</span>
          <span className="wrap-cat-icon"><CategoryIcon icon={c.category?.icon ?? 'circle-dashed'} color="#ffffff" size={68} /></span>
          <span className="wrap-cat-name">{c.category?.name ?? 'À classer'}</span>
          <span className="wrap-big num"><CountUp value={c.amount} format={(n) => formatMoneyCompact(n)} /></span>
          <span className="wrap-note">{Math.round(c.share * 100)} % de toutes tes dépenses</span>
        </div>
      ),
    })
  }

  const podium = d.categories.slice(0, 3)
  if (podium.length >= 2) {
    const max = podium[0].amount || 1
    slides.push({
      key: 'podium',
      background: 'linear-gradient(160deg, #f0517a 0%, #ff8a5b 100%)',
      content: (
        <div className="wrap-block">
          <span className="wrap-kicker">Ton podium des dépenses</span>
          <div className="wrap-bars">
            {podium.map((c, i) => (
              <div key={i} className="wrap-bar-row">
                <span className="wrap-bar-rank">{i + 1}</span>
                <div className="wrap-bar-main">
                  <div className="wrap-bar-top">
                    <span className="wrap-bar-name">{c.category?.name ?? 'À classer'}</span>
                    <span className="wrap-bar-val num">{formatMoneyCompact(c.amount)}</span>
                  </div>
                  <div className="wrap-bar-track">
                    <motion.div
                      className="wrap-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.amount / max) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  if (d.biggestExpense) {
    const b = d.biggestExpense
    slides.push({
      key: 'biggest',
      background: 'linear-gradient(160deg, #1f2937 0%, #111827 100%)',
      content: (
        <div className="wrap-center">
          <span className="wrap-kicker">Ton plus gros achat 💥</span>
          <span className="wrap-cat-name">{b.label}</span>
          <span className="wrap-big num"><CountUp value={b.amount} format={(n) => formatMoney(n)} /></span>
          <span className="wrap-note">le {formatDateShort(b.dateIso)}</span>
        </div>
      ),
    })
  }

  if (d.busiestMonth && d.busiestMonth.total > 0) {
    const max = Math.max(...d.byMonth.map((m) => m.total), 1)
    slides.push({
      key: 'month',
      background: 'linear-gradient(160deg, #18ac6b 0%, #34d399 100%)',
      content: (
        <div className="wrap-block">
          <span className="wrap-kicker">Ton mois record</span>
          <span className="wrap-month-name">{d.busiestMonth.label}</span>
          <span className="wrap-big num"><CountUp value={d.busiestMonth.total} format={(n) => formatMoneyCompact(n)} /></span>
          <div className="wrap-months">
            {d.byMonth.map((m, i) => (
              <div key={i} className="wrap-month-col">
                <motion.div
                  className={`wrap-month-bar ${m.label === d.busiestMonth?.label ? 'is-peak' : ''}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, (m.total / max) * 100)}%` }}
                  transition={{ duration: 0.6, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="wrap-month-label">{m.label.slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  if (d.topMerchant) {
    const m = d.topMerchant
    slides.push({
      key: 'merchant',
      background: 'linear-gradient(160deg, #f59e0b 0%, #ef4444 100%)',
      content: (
        <div className="wrap-center">
          <span className="wrap-kicker">Ton repaire 📍</span>
          <span className="wrap-cat-name">{m.label}</span>
          <span className="wrap-big num"><CountUp value={m.count} format={intFmt} /></span>
          <span className="wrap-note">visites — {formatMoneyCompact(m.total)} au total</span>
        </div>
      ),
    })
  }

  slides.push({
    key: 'summary',
    background: 'linear-gradient(160deg, #7c5cff 0%, #18ac6b 130%)',
    content: (
      <div className="wrap-block">
        <span className="wrap-emoji">🎉</span>
        <h2 className="wrap-summary-title">Ton {d.year} en bref</h2>
        <div className="wrap-summary-grid">
          <div className="wrap-stat"><span className="wrap-stat-val num">{formatMoneyCompact(d.totalSpent)}</span><span className="wrap-stat-key">dépensé</span></div>
          <div className="wrap-stat"><span className="wrap-stat-val num">{intFmt(d.txnCount)}</span><span className="wrap-stat-key">achats</span></div>
          {d.topCategory && <div className="wrap-stat"><span className="wrap-stat-val">{d.topCategory.category?.name ?? '—'}</span><span className="wrap-stat-key">top poste</span></div>}
          {d.busiestMonth && <div className="wrap-stat"><span className="wrap-stat-val">{d.busiestMonth.label}</span><span className="wrap-stat-key">mois record</span></div>}
        </div>
      </div>
    ),
  })

  return slides
}

interface Props {
  data: WrappedData
  onClose: () => void
}

export function WrappedStory({ data, onClose }: Props) {
  const slides = useMemo(() => buildSlides(data), [data])
  const count = slides.length
  const [index, setIndex] = useState(0)
  const isLast = index === count - 1

  // Verrou de défilement + fermeture au clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Défilement automatique (sauf sur le dernier slide).
  useEffect(() => {
    if (isLast) return
    const id = setTimeout(() => setIndex((i) => Math.min(i + 1, count - 1)), SLIDE_MS)
    return () => clearTimeout(id)
  }, [index, isLast, count])

  const go = (dir: 1 | -1) => {
    haptic('selection')
    setIndex((i) => Math.min(Math.max(i + dir, 0), count - 1))
  }

  const onTap = (e: React.MouseEvent) => {
    const x = e.clientX
    if (x < window.innerWidth * 0.3) go(-1)
    else if (!isLast) go(1)
  }

  const slide = slides[index]

  return createPortal(
    <motion.div
      className="wrap-root"
      style={{ background: slide.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose() }}
      onClick={onTap}
      role="dialog"
      aria-modal="true"
    >
      <div className="wrap-progress" onClick={(e) => e.stopPropagation()}>
        {slides.map((s, i) => (
          <div key={s.key} className="wrap-seg">
            <div
              className="wrap-seg-fill"
              style={{
                width: i < index ? '100%' : i === index ? undefined : '0%',
                animation: i === index && !isLast ? `wrapFill ${SLIDE_MS}ms linear forwards` : undefined,
                ...(i === index && isLast ? { width: '100%' } : null),
              }}
            />
          </div>
        ))}
      </div>

      <button className="wrap-close" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Fermer">
        <X size={22} />
      </button>

      <motion.div
        key={slide.key}
        className="wrap-slide"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {slide.content}
      </motion.div>

      {isLast && (
        <button
          className="wrap-replay"
          onClick={(e) => { e.stopPropagation(); haptic('tap'); setIndex(0) }}
        >
          <RotateCcw size={16} /> Rejouer
        </button>
      )}

      <span className="wrap-brand" aria-hidden="true"><Sparkles size={13} /> Bilan</span>
    </motion.div>,
    document.body,
  )
}
