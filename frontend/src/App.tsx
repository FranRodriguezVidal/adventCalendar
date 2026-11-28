import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CalendarDays, CalendarHeart, Eye, EyeOff, Info, Link2, Lock, Mail, MessageSquareText, Pencil, Send, ShieldCheck, Sparkles } from 'lucide-react'

type CustomLayoutBlock = {
  day_number: number
  x: number
  y: number
  w: number
  h: number
}

type CalendarSummary = {
  id: number
  name: string
  slug: string
  description: string | null
  theme: string
  duration_days: number
  is_published: boolean
  is_demo: boolean
  password?: string | null
  is_public_without_code?: boolean
  calendar_background?: 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom'
  calendar_background_image?: string
  custom_layout?: string | null
  mosaic_scale?: number
  door_style?: 'red' | 'ribbon' | 'gold' | 'custom'
  door_image?: string
  background_music?: MusicPresetKey
  background_music_url?: string
}

type CalendarDay = {
  id: number
  calendar_id: number
  day_number: number
  title: string
  content_type: string
  content: string | null
  media_path: string | null
  metadata: Record<string, unknown>
  is_unlocked_by_admin: boolean
  unlock_date: string | null
  position?: number
}

type PublicCalendar = {
  id: number
  name: string
  slug: string
  description: string | null
  theme: string
  duration_days: number
  is_published: boolean
  calendar_background?: 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom'
  calendar_background_image?: string
  custom_layout?: string | null
  mosaic_scale?: number
  door_style?: 'red' | 'ribbon' | 'gold' | 'custom'
  door_image?: string
  background_music?: MusicPresetKey
  background_music_url?: string
}

type PublicDay = {
  id: number
  day_number: number
  title: string
  content_type: string
  content: string | null
  media_path: string | null
  metadata: Record<string, unknown>
  is_unlocked_by_admin: boolean
  unlock_date: string | null
}

type CalendarReminder = {
  id: number
  email: string
  created_at: string
  sent_at: string | null
  sent: boolean
}

type MusicPresetKey = 'none' | 'classic' | 'cozy' | 'lofi' | 'custom'

const MUSIC_PRESETS: Record<Exclude<MusicPresetKey, 'none' | 'custom'>, string> = {
  classic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  cozy: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
}

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8001'

const generateAccessCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const chars = Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)])
  return `ADV-${chars.join('')}`
}

export const resolveCalendarAccessState = (calendarPassword?: string | null, _isPublicWithoutCode?: boolean | null) => {
  const password = (calendarPassword ?? '').trim()
  return {
    password,
    isPublicWithoutCode: Boolean(_isPublicWithoutCode),
  }
}

const getCalendarLayoutClassName = (theme?: string | null) => {
  const normalized = (theme || 'puzzle').toLowerCase()
  return normalized === 'puzzle' || normalized === 'mosaic' ? 'layout-puzzle' : 'layout-default'
}

const getCalendarBackgroundStyle = (background?: 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom' | null, backgroundImage?: string | null) => {
  if (background === 'custom' && backgroundImage) {
    return { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  if (background === 'navidad') {
    return { backgroundImage: 'url(/fondo/navidad.avif)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  if (background === 'flores') {
    return { backgroundImage: 'url(/fondo/flores.avif)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  if (background === 'minimal') {
    return { backgroundImage: 'url(/fondo/minimal.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  if (background === 'azul_mate') {
    return { backgroundImage: 'url(/fondo/azul_mate.avif)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  if (background === 'verde_mate') {
    return { backgroundImage: 'url(/fondo/verde_mate.avif)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  if (background === 'rojo_mate') {
    return { backgroundImage: 'url(/fondo/rojo_mate.avif)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }

  return { background: 'linear-gradient(135deg, #fff6df 0%, #fde2e2 48%, #e7f3ff 100%)' }
}

const getMosaicScaleStyle = (_scale?: number | null) => ({
  transform: 'scale(1)',
  transformOrigin: 'top left',
  width: '100%',
  transition: 'transform 0.2s ease',
})

const PUZZLE_DAY_LAYOUT: Record<number, { gridColumn: string; gridRow: string }> = {
  1: { gridColumn: '3 / span 2', gridRow: '1' },
  2: { gridColumn: '7', gridRow: '3' },
  3: { gridColumn: '6', gridRow: '4 / span 2' },
  4: { gridColumn: '3', gridRow: '2' },
  5: { gridColumn: '1', gridRow: '4 / span 2' },
  6: { gridColumn: '1', gridRow: '6 / span 2' },
  7: { gridColumn: '2', gridRow: '1' },
  8: { gridColumn: '3', gridRow: '5' },
  9: { gridColumn: '6 / span 2', gridRow: '2' },
  10: { gridColumn: '7', gridRow: '1' },
  11: { gridColumn: '3 / span 2', gridRow: '4' },
  12: { gridColumn: '4 / span 2', gridRow: '5' },
  13: { gridColumn: '4 / span 2', gridRow: '2' },
  14: { gridColumn: '5', gridRow: '4' },
  15: { gridColumn: '1', gridRow: '1' },
  16: { gridColumn: '2', gridRow: '4' },
  17: { gridColumn: '3 / span 2', gridRow: '6' },
  18: { gridColumn: '5 / span 2', gridRow: '3' },
  19: { gridColumn: '2', gridRow: '5 / span 2' },
  20: { gridColumn: '4', gridRow: '3' },
  21: { gridColumn: '7', gridRow: '5 / span 2' },
  22: { gridColumn: '5 / span 2', gridRow: '1' },
  23: { gridColumn: '7', gridRow: '4' },
  24: { gridColumn: '1 / span 2', gridRow: '2 / span 2' },
  25: { gridColumn: '4 / span 2', gridRow: '7' },
  26: { gridColumn: '5', gridRow: '6' },
  27: { gridColumn: '3', gridRow: '3' },
  28: { gridColumn: '2', gridRow: '7' },
  29: { gridColumn: '3', gridRow: '7' },
  30: { gridColumn: '7', gridRow: '7' },
  31: { gridColumn: '6', gridRow: '6 / span 2' },
}

const buildPuzzleLayout = (totalDays: number): Record<number, { gridColumn: string; gridRow: string }> => {
  const baseLayout = Object.fromEntries(
    Object.entries(PUZZLE_DAY_LAYOUT).map(([day, value]) => [Number(day), value]),
  ) as Record<number, { gridColumn: string; gridRow: string }>

  if (totalDays === 31) {
    return baseLayout
  }

  if (totalDays >= 24 && totalDays <= 30) {
    const compactRangeLayout: Record<number, { gridColumn: string; gridRow: string }> = {
      24: { gridColumn: '1 / span 2', gridRow: '1 / span 2' },
      25: { gridColumn: '3', gridRow: '1' },
      26: { gridColumn: '4', gridRow: '1' },
      27: { gridColumn: '5', gridRow: '1' },
      28: { gridColumn: '6', gridRow: '1' },
      29: { gridColumn: '7', gridRow: '1' },
      30: { gridColumn: '3', gridRow: '2' },
    }

    return compactRangeLayout
  }

  const layout: Record<number, { gridColumn: string; gridRow: string }> = {}
  const allPatternRows: number[][] = [
    [2, 2, 3],
    [3, 2, 2],
    [2, 3, 2],
    [2, 2, 1, 2],
    [1, 2, 2, 2],
    [3, 1, 3],
    [1, 3, 3],
    [2, 1, 2, 2],
  ]

  const buildShuffledDays = () => {
    const values = Array.from({ length: totalDays }, (_, index) => index + 1)

    if (values.includes(24)) {
      const twentyFourIndex = values.indexOf(24)
      values.splice(twentyFourIndex, 1)
    }

    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(((totalDays + index) % 97) / 97 * (index + 1))
      const temp = values[index]
      values[index] = values[swapIndex]
      values[swapIndex] = temp
    }

    return values.filter((day) => day >= 1 && day <= totalDays)
  }

  const orderedDays = buildShuffledDays()
  const rows = allPatternRows.slice(0, Math.ceil(totalDays / 3) + 2)
  const fillRows: number[][] = []
  let remaining = totalDays

  while (remaining > 0) {
    const nextPattern = rows[(remaining + totalDays) % rows.length]
    fillRows.push(nextPattern)
    remaining -= nextPattern.reduce((sum, value) => sum + value, 0)
  }

  const remainingDays = orderedDays.filter((day) => day !== 24)
  const workingRows = fillRows.length > 0 ? fillRows : [[2, 2, 3]]

  let slotCursor = 0
  let rowCursor = 1
  for (const pattern of workingRows) {
    let columnCursor = 1
    for (const span of pattern) {
      if (slotCursor >= remainingDays.length) break
      if (columnCursor === 1 && rowCursor === 1 && totalDays >= 24) {
        columnCursor += 2
        continue
      }

      layout[remainingDays[slotCursor]] = {
        gridColumn: `${columnCursor} / span ${span}`,
        gridRow: `${rowCursor}`,
      }
      slotCursor += 1
      columnCursor += span
    }
    rowCursor += 1
  }

  return layout
}

const getPuzzleDayStyle = (dayNumber: number, totalDays: number = 31) => {
  const layout = buildPuzzleLayout(totalDays)[dayNumber]
  if (!layout) {
    return undefined
  }

  return {
    gridColumn: layout.gridColumn,
    gridRow: layout.gridRow,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const blocksOverlap = (first: CustomLayoutBlock, second: CustomLayoutBlock) => (
  first.x < second.x + second.w &&
  first.x + first.w > second.x &&
  first.y < second.y + second.h &&
  first.y + first.h > second.y
)

const getCustomLayoutCandidate = (
  blocks: CustomLayoutBlock[],
  dayNumber: number,
  nextBlock: CustomLayoutBlock,
): CustomLayoutBlock | null => {
  const target = {
    ...nextBlock,
    x: clamp(nextBlock.x, 0, 7 - nextBlock.w),
    y: clamp(nextBlock.y, 0, 5 - nextBlock.h),
    w: clamp(nextBlock.w, 1, 2),
    h: clamp(nextBlock.h, 1, 2),
  }

  const collisions = blocks.filter((block) => block.day_number !== dayNumber && blocksOverlap(target, block))
  if (collisions.length > 0) {
    return null
  }

  return target
}

const buildDefaultCustomLayoutBlocks = (totalDays: number): CustomLayoutBlock[] => {
  const stageColumns = 7
  const stageRows = 5
  const blocks: CustomLayoutBlock[] = []

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    const columnIndex = (dayNumber - 1) % stageColumns
    const rowIndex = Math.floor((dayNumber - 1) / stageColumns)
    let x = columnIndex
    let y = rowIndex
    let w = 1
    let h = 1

    if (dayNumber === 24) {
      x = 0
      y = 1
      w = 2
      h = 2
    } else if (dayNumber === 31) {
      x = 4
      y = 4
      w = 2
      h = 1
    } else if (dayNumber % 7 === 0) {
      w = 2
    } else if (dayNumber % 5 === 0) {
      h = 2
    } else if (dayNumber % 3 === 0) {
      x = clamp(columnIndex + (columnIndex >= stageColumns - 1 ? -1 : 0), 0, stageColumns - 1)
      w = 2
    }

    if (x + w > stageColumns) {
      x = clamp(stageColumns - w, 0, stageColumns - 1)
    }
    if (y + h > stageRows) {
      y = clamp(stageRows - h, 0, stageRows - 1)
    }

    blocks.push({
      day_number: dayNumber,
      x,
      y,
      w,
      h,
    })
  }

  return blocks
}

const getCustomLayoutBlocks = (value?: string | null, totalDays = 31): CustomLayoutBlock[] => {
  if (!value) {
    return buildDefaultCustomLayoutBlocks(totalDays)
  }

  try {
    const parsed = JSON.parse(value) as unknown
    const blocks = Array.isArray(parsed) ? parsed : []
    if (blocks.length === 0) {
      return buildDefaultCustomLayoutBlocks(totalDays)
    }

    const normalized = blocks
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const candidate = item as Partial<CustomLayoutBlock>
        const dayNumber = Number(candidate.day_number)
        if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > totalDays) return null
        const x = clamp(Number(candidate.x ?? 0), 0, 6)
        const y = clamp(Number(candidate.y ?? 0), 0, 4)
        const w = clamp(Number(candidate.w ?? 1), 1, 2)
        const h = clamp(Number(candidate.h ?? 1), 1, 2)
        return {
          day_number: dayNumber,
          x: clamp(x, 0, 7 - w),
          y: clamp(y, 0, 5 - h),
          w,
          h,
        }
      })
      .filter((item): item is CustomLayoutBlock => Boolean(item))

    if (normalized.length === totalDays) {
      return normalized
    }

    const fallback = buildDefaultCustomLayoutBlocks(totalDays)
    const merged = new Map<number, CustomLayoutBlock>()
    normalized.forEach((block) => merged.set(block.day_number, block))
    fallback.forEach((block) => {
      if (!merged.has(block.day_number)) {
        merged.set(block.day_number, block)
      }
    })
    return Array.from(merged.values()).sort((a, b) => a.day_number - b.day_number)
  } catch {
    return buildDefaultCustomLayoutBlocks(totalDays)
  }
}

const getCustomLayoutStyle = (dayNumber: number, totalDays: number, layoutValue?: string | null) => {
  const blocks = getCustomLayoutBlocks(layoutValue, totalDays)
  const block = blocks.find((item) => item.day_number === dayNumber)
  if (!block) {
    return undefined
  }

  return {
    position: 'absolute' as const,
    left: `${(block.x / 7) * 100}%`,
    top: `${(block.y / 5) * 100}%`,
    width: `${(block.w / 7) * 100}%`,
    height: `${(block.h / 5) * 100}%`,
  }
}

const buildDayMetadata = (draft: {
  message: string
  quote: string
  game: string
  game_description: string
  song_title: string
  song_artist: string
  notes: string
  media_url: string
  mood: string
}) => ({
  message: draft.message.trim(),
  quote: draft.quote.trim(),
  game: draft.game.trim(),
  game_description: draft.game_description.trim(),
  song_title: draft.song_title.trim(),
  song_artist: draft.song_artist.trim(),
  notes: draft.notes.trim(),
  media_url: draft.media_url.trim(),
  mood: draft.mood.trim(),
})

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string): string => {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : ''
}

const isDefaultTemplateCalendar = (calendar: Pick<CalendarSummary, 'is_demo' | 'is_published' | 'slug' | 'name'>): boolean => {
  return calendar.is_demo && !calendar.is_published && (
    calendar.slug.startsWith('demo-ejemplo-') ||
    calendar.name.toLowerCase() === 'demo-ejemplo'
  )
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const errorText = await response.text()
    let message = 'Error en la solicitud'

    if (errorText) {
      try {
        const parsed = JSON.parse(errorText) as { detail?: string; message?: string; error?: string }
        message = parsed.detail || parsed.message || parsed.error || message
      } catch {
        message = errorText
      }
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function copyToClipboard(value: string) {
  if (!value) return
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
  }
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  language = 'es',
}: {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  language?: 'es' | 'en'
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="password-input-shell">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowPassword((current) => !current)}
        aria-label={showPassword ? (language === 'en' ? 'Hide password' : 'Ocultar contraseña') : (language === 'en' ? 'Show password' : 'Mostrar contraseña')}
        disabled={disabled}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

function RouteLoadingScreen({ language = 'es' }: { language?: 'es' | 'en' }) {
  return (
    <div className="route-loading-overlay" aria-live="polite" aria-busy="true">
      <div className="route-loading-card">
        <div className="loading-spinner" />
        <p>{language === 'en' ? 'Loading...' : 'Cargando...'}</p>
      </div>
    </div>
  )
}

function HomePage({ language, setLanguage }: { language: 'es' | 'en'; setLanguage: (value: 'es' | 'en') => void }) {
  const copy = language === 'en'
    ? {
        title: 'Design Advent calendars with personality.',
        lead: 'Manage content, open the demo or enter your calendar with a direct access code.',
        actions: { panel: 'Dashboard', demo: 'Demo', myCalendar: 'My calendar' },
        features: {
          customized: 'Custom calendars',
          access: 'Code access',
          design: 'Emotional design',
        },
        translate: 'ES',
      }
    : {
        title: 'Diseña calendarios de Adviento con personalidad.',
        lead: 'Gestiona el contenido, abre la demo o entra a tu calendario con un código de acceso directo.',
        actions: { panel: 'Panel', demo: 'Demo', myCalendar: 'Mi calendario' },
        features: {
          customized: 'Calendarios personalizados',
          access: 'Acceso con código',
          design: 'Diseño emocional',
        },
        translate: 'EN',
      }

  return (
    <div className="app-shell">
      <header className="hero-banner">
        <div className="hero-content">
          <p className="eyebrow">Advent Calendar</p>
          <h1>{copy.title}</h1>
          <p className="lead">{copy.lead}</p>
          <div className="d-flex gap-3 flex-wrap hero-actions-wrap">
            <button type="button" className="btn btn-outline-primary btn-lg translate-action" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>
              {copy.translate}
            </button>
            <Link to="/admin" className="btn btn-primary btn-lg">{copy.actions.panel}</Link>
            <Link to="/calendar/demo-ejemplo-publica" className="btn btn-primary btn-lg">{copy.actions.demo}</Link>
          </div>
        </div>
        <motion.div className="hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mini-calendar">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((day) => (
              <span key={day} className={day <= 5 ? 'day active' : 'day'}>{day}</span>
            ))}
          </div>
        </motion.div>
      </header>

      <section className="feature-grid">
        <div className="feature-item">
          <CalendarHeart size={28} />
          <h3>{copy.features.customized}</h3>
          <p>{language === 'en'
            ? 'Themes, palettes, dates and content per door without duplicating logic.'
            : 'Temas, paletas, fechas y contenidos por puerta, sin duplicar lógica.'}</p>
        </div>
        <div className="feature-item">
          <ShieldCheck size={28} />
          <h3>{copy.features.access}</h3>
          <p>{language === 'en'
            ? 'People enter via a link and a simple code without creating accounts.'
            : 'La gente entra con un enlace y un código sencillo, sin crear cuentas.'}</p>
        </div>
        <div className="feature-item">
          <Sparkles size={28} />
          <h3>{copy.features.design}</h3>
          <p>{language === 'en'
            ? 'Modern interface for more human, memorable Christmas experiences.'
            : 'Interfaz moderna para experiencias navideñas más humanas y memorables.'}</p>
        </div>
      </section>
    </div>
  )
}

function CalendarAccessPage({ language }: { language: 'es' | 'en' }) {
  const navigate = useNavigate()
  const storageKey = 'advent-calendar-access-flow'
  const [accessCode, setAccessCode] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return ''
      const parsed = JSON.parse(raw) as { accessCode?: string }
      return parsed.accessCode ?? ''
    } catch {
      return ''
    }
  })
  const [email, setEmail] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return ''
      const parsed = JSON.parse(raw) as { email?: string }
      return parsed.email ?? ''
    } catch {
      return ''
    }
  })
  const [error, setError] = useState('')
  const [validatedSlug, setValidatedSlug] = useState<string | null>(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { validatedSlug?: string | null }
      return parsed.validatedSlug ?? null
    } catch {
      return null
    }
  })
  const copy = language === 'en'
    ? {
        valid: 'Access valid',
        almost: 'You are almost there',
        emailPrompt: 'Add your email to receive reminders and access the calendar.',
        emailPlaceholder: 'Email address',
        enterCalendar: 'Enter calendar',
        back: 'Back',
        heading: 'My calendar',
        title: 'Enter your access code',
        subtitle: 'No accounts. Just the calendar link and the code shared with you.',
        codePlaceholder: 'Access code',
        checkCode: 'Check code',
        invalidCode: 'Incorrect code',
        emailRequired: 'Enter an email to continue.',
        saveEmailError: 'Could not save the email',
      }
    : {
        valid: 'Acceso válido',
        almost: 'Ya casi está',
        emailPrompt: 'Introduce tu correo para recibir recordatorios y poder entrar al calendario.',
        emailPlaceholder: 'Correo electrónico',
        enterCalendar: 'Entrar al calendario',
        back: 'Volver',
        heading: 'Mi calendario',
        title: 'Introduce tu código de acceso',
        subtitle: 'Sin cuentas. Solo el enlace del calendario y el código que te compartieron.',
        codePlaceholder: 'Código de acceso',
        checkCode: 'Comprobar código',
        invalidCode: 'Código incorrecto',
        emailRequired: 'Introduce un correo para continuar.',
        saveEmailError: 'No se pudo guardar el correo',
      }

  const persistFlowState = (next: { accessCode?: string; email?: string; validatedSlug?: string | null }) => {
    try {
      const current = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>
      const merged = { ...current, ...next }
      window.sessionStorage.setItem(storageKey, JSON.stringify(merged))
    } catch {
      // Ignore storage errors and keep the flow in memory only.
    }
  }

  const handleAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const response = await request<{ slug: string; message: string }>(`${API_BASE}/api/auth/calendar/access`, {
        method: 'POST',
        body: JSON.stringify({ password: accessCode }),
      })

      await request<{ message: string }>(`${API_BASE}/api/auth/calendar/${response.slug}/login`, {
        method: 'POST',
        body: JSON.stringify({ password: accessCode }),
      })

      setError('')
      const targetSlug = response.slug
      setValidatedSlug(targetSlug)
      persistFlowState({ accessCode, email, validatedSlug: targetSlug })
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidCode)
    }
  }

  const handleReminderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validatedSlug) return

    const cleanedEmail = email.trim()
    if (!cleanedEmail) {
      setError(copy.emailRequired)
      return
    }

    try {
      await request<{ message: string }>(`${API_BASE}/api/public/calendars/${validatedSlug}/reminders`, {
        method: 'POST',
        body: JSON.stringify({ email: cleanedEmail }),
      })
      setError('')
      persistFlowState({ accessCode, email: cleanedEmail, validatedSlug })
      navigate(`/calendar/${validatedSlug}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveEmailError)
    }
  }

  const clearFlowState = () => {
    setValidatedSlug(null)
    setAccessCode('')
    setEmail('')
    setError('')
    try {
      window.sessionStorage.removeItem(storageKey)
    } catch {
      // Ignore storage errors.
    }
  }

  useEffect(() => {
    persistFlowState({ accessCode, email, validatedSlug })
  }, [accessCode, email, validatedSlug])

  if (validatedSlug) {
    return (
      <div className="calendar-public-shell">
        <div className="calendar-public-card text-center">
          <p className="eyebrow">{copy.valid}</p>
          <h1>{copy.almost}</h1>
          <p>{copy.emailPrompt}</p>

          <form onSubmit={handleReminderSubmit} className="password-form">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.emailPlaceholder} />
            {error ? <div className="alert alert-danger">{error}</div> : null}
            <button type="submit" className="btn btn-primary">{copy.enterCalendar}</button>
          </form>

          <div className="mt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={clearFlowState}>{copy.back}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-public-shell">
      <div className="calendar-public-card text-center">
        <p className="eyebrow">{copy.heading}</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>

        <form onSubmit={handleAccess} className="password-form">
          <PasswordInput value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder={copy.codePlaceholder} />
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <button type="submit" className="btn btn-primary">{copy.checkCode}</button>
        </form>

        <div className="mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={clearFlowState}>{copy.back}</button>
        </div>
      </div>
    </div>
  )
}

function AdminPage({ language, setLanguage }: { language: 'es' | 'en'; setLanguage: (value: 'es' | 'en') => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const adminCopy = language === 'en'
    ? {
        translate: 'ES',
        suggestion: 'Suggestions',
        report: 'Report issue',
        panel: 'Panel',
        createCalendar: 'Create calendar',
        total: 'Total',
        published: 'Published',
        draft: 'Draft',
        myCalendars: 'MY CALENDARS',
        existing: 'Existing calendars',
        previous: 'Previous',
        next: 'Next',
        noCalendars: 'No calendars yet.',
        defaultTemplate: 'Default template',
        hide: 'Hide',
        publish: 'Publish',
        export: 'Export',
        import: 'Import',
        duplicate: 'Duplicate',
        delete: 'Delete',
        view: 'View',
        edit: 'Edit',
        send: 'Send',
        cancel: 'Cancel',
        newCalendar: 'New',
        newCalendarTitle: 'Create calendar',
        calendarName: 'Calendar name',
        browserPath: 'Browser path (slug)',
        accessCode: 'Access code',
        accessCodeHelper: 'The calendar is protected by a password. Enter the correct code to access it.',
        generate: 'Generate',
        duration: 'Duration (days)',
        quickDays: 'Quick days',
        shortDescription: 'Short description',
        contact: 'Contact',
        title: 'Title',
        description: 'Description',
        imageOptional: 'Image (optional)',
        attachedFile: 'Attached file',
        sending: 'Sending...',
        sendAction: 'Send',
        changePassword: 'Change password',
        changeEmail: 'Change email',
        home: 'Home',
        logout: 'Log out',
        currentEmail: 'Current email',
        noEmailSaved: 'No email saved',
        emailHelp: 'If you want to change the password, use the password change section. To change the email, just type the new email and save.',
        newEmail: 'New email',
        save: 'Save',
        emailLabel: 'Email',
        passwordHelp: 'Type your current password and then your new password twice.',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm new password',
        login: 'Log in',
        register: 'Register',
        name: 'Name',
        password: 'Password',
        adminNamePlaceholder: 'Your name',
        accountTitle: 'Admin access',
        accessSubtitle: 'Access your calendars and manage them securely.',
        email: 'Email',
        editor: 'Editor',
        calendarType: 'Calendar type',
        calendarTypeWeek: '7 days of the week',
        calendarTypeCountdown: 'Countdown',
        durationLabel: 'Duration',
        openEditor: 'Open editor',
        closeEditor: 'Close editor',
        open: 'Open',
        close: 'Close',
      }
    : {
        translate: 'EN',
        suggestion: 'Sugerencias',
        report: 'Reportar error',
        panel: 'Panel',
        createCalendar: 'Crear calendario',
        total: 'Total',
        published: 'Publicado',
        draft: 'Borrador',
        myCalendars: 'MIS CALENDARIOS',
        existing: 'Calendarios existentes',
        previous: 'Anterior',
        next: 'Siguiente',
        noCalendars: 'No hay calendarios todavía.',
        defaultTemplate: 'Plantilla por defecto',
        hide: 'Ocultar',
        publish: 'Publicar',
        export: 'Exportar',
        import: 'Importar',
        duplicate: 'Duplicar',
        delete: 'Eliminar',
        view: 'Ver contenido',
        edit: 'Editar',
        send: 'Enviar',
        cancel: 'Cancelar',
        newCalendar: 'Nuevo',
        newCalendarTitle: 'Crear calendario',
        calendarName: 'Nombre del calendario',
        browserPath: 'Ruta del navegador (slug)',
        accessCode: 'Código de acceso',
        accessCodeHelper: 'El calendario está protegido por una contraseña. Debe introducirse el código correcto para acceder.',
        generate: 'Generar',
        duration: 'Duración (días)',
        quickDays: 'Acceso rápido',
        shortDescription: 'Descripción breve',
        contact: 'Contacto',
        title: 'Título',
        description: 'Descripción',
        imageOptional: 'Imagen (opcional)',
        attachedFile: 'Archivo adjunto',
        sending: 'Enviando...',
        sendAction: 'Enviar',
        changePassword: 'Cambiar contraseña',
        changeEmail: 'Cambiar correo',
        home: 'Ir al inicio',
        logout: 'Cerrar sesión',
        currentEmail: 'Correo actual',
        noEmailSaved: 'Sin correo guardado',
        emailHelp: 'Si quieres cambiar la contraseña, usa el apartado de cambiar contraseña. Para cambiar el correo solo necesitas escribir el nuevo correo y guardar.',
        newEmail: 'Nuevo correo',
        save: 'Guardar',
        emailLabel: 'Correo',
        passwordHelp: 'Escribe tu contraseña actual y luego tu nueva contraseña dos veces.',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar nueva contraseña',
        login: 'Iniciar sesión',
        register: 'Registrarse',
        name: 'Nombre',
        password: 'Contraseña',
        adminNamePlaceholder: 'Tu nombre',
        accountTitle: 'Acceso de administrador',
        accessSubtitle: 'Accede a tus calendarios y gestionalos de forma segura.',
        email: 'Correo',
        editor: 'Editor',
        calendarType: 'Tipo de calendario',
        calendarTypeWeek: '7 días de la semana',
        calendarTypeCountdown: 'Cuenta atrás',
        durationLabel: 'Duración',
        openEditor: 'Abrir editor',
        closeEditor: 'Cerrar editor',
        open: 'Abrir',
        close: 'Cerrar',
      }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'register'>('login')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [hasCheckedSession, setHasCheckedSession] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [calendarMenuOpenId, setCalendarMenuOpenId] = useState<number | null>(null)
  const [isCreateCalendarOpen, setIsCreateCalendarOpen] = useState(false)
  const [profileModal, setProfileModal] = useState<'password' | 'email' | null>(null)
  const [profileDraft, setProfileDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    currentEmail: '',
    newEmail: '',
    confirmEmail: '',
  })
  const [currentAdminName, setCurrentAdminName] = useState('ANONIMX')
  const [currentAdminEmail, setCurrentAdminEmail] = useState('')
  const [calendarCarouselIndex, setCalendarCarouselIndex] = useState(0)
  const [calendarPage, setCalendarPage] = useState(0)
  const [calendars, setCalendars] = useState<CalendarSummary[]>([])
  const [reminderEmails, setReminderEmails] = useState<CalendarReminder[]>([])
  const [newCalendar, setNewCalendar] = useState({
    name: 'Nuevo calendario',
    slug: 'nuevo-calendario',
    description: 'Un regalo especial para la familia.',
    password: generateAccessCode(),
    theme: 'puzzle',
    duration_days: 12,
    is_published: false,
    is_public_without_code: false,
    calendar_background: 'rojo_mate' as 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom',
  })
  const [feedbackModal, setFeedbackModal] = useState<'suggestion' | 'report' | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState({
    title: '',
    description: '',
    imageData: '',
    imageName: '',
  })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [createInfoModal, setCreateInfoModal] = useState<'slug' | 'access' | null>(null)
  const [dayHelpModal, setDayHelpModal] = useState(false)
  const [shareCalendar, setShareCalendar] = useState<CalendarSummary | null>(null)
  const [shareDraft, setShareDraft] = useState({
    name: '',
    text: 'Hola, este es un regalo para ti. ¡Disfruta del calendario!',
  })
  const [editorSettingsModal, setEditorSettingsModal] = useState<'slug' | 'access' | 'details' | 'reminders' | 'days' | null>(null)

  useEffect(() => {
    const shouldLockScroll = isCreateCalendarOpen || Boolean(feedbackModal) || Boolean(createInfoModal) || Boolean(shareCalendar) || Boolean(editorSettingsModal) || dayHelpModal
    document.body.style.overflow = shouldLockScroll ? 'hidden' : ''
    document.body.style.touchAction = shouldLockScroll ? 'manipulation' : ''
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isCreateCalendarOpen, feedbackModal, createInfoModal, shareCalendar, editorSettingsModal, dayHelpModal])

  const submitFeedback = async () => {
    if (!feedbackModal || isSubmittingFeedback) return

    try {
      setIsSubmittingFeedback(true)
      setFeedbackStatus(null)
      const title = feedbackDraft.title.trim()
      const description = feedbackDraft.description.trim()
      if (title.length < 3 || title.length > 120) {
        throw new Error('El título debe tener entre 3 y 120 caracteres.')
      }
      if (description.length < 10 || description.length > 4000) {
        throw new Error('La descripción debe tener entre 10 y 4000 caracteres.')
      }

      const blockedPatterns = ['<script', 'javascript:', 'onerror=', 'drop table', 'select * from', 'rm -rf', 'curl ', 'wget ', 'bash -c', 'powershell', 'eval(', 'exec(']
      const combinedText = `${title}\n${description}\n${feedbackDraft.imageName || ''}`.toLowerCase()
      if (blockedPatterns.some((pattern) => combinedText.includes(pattern))) {
        throw new Error('El mensaje incluye contenido no permitido para proteger la aplicación.')
      }

      const result = await request<{ message: string; code: string }>(`${API_BASE}/api/auth/admin/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          type: feedbackModal === 'suggestion' ? 'suggestion' : 'report',
          title,
          description,
          image_name: feedbackDraft.imageName || '',
          image_data: feedbackDraft.imageData || '',
        }),
      })

      setFeedbackStatus({ type: 'success', message: `${result.message} Código: ${result.code}` })
      setFeedbackDraft({ title: '', description: '', imageData: '', imageName: '' })
      setFeedbackModal(null)
    } catch (err) {
      setFeedbackStatus({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo enviar el mensaje.' })
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleFeedbackImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFeedbackStatus({ type: 'error', message: 'Adjunta solo imágenes válidas.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFeedbackDraft((current) => ({
        ...current,
        imageName: file.name,
        imageData: typeof reader.result === 'string' ? reader.result : '',
      }))
    }
    reader.readAsDataURL(file)
  }

  const loadCalendars = async () => {
    try {
      const data = await request<CalendarSummary[]>(`${API_BASE}/api/calendars`)
      setCalendars(data)
      setIsLoggedIn(true)
      setHasCheckedSession(true)
      if (data.length > 0) {
        const first = data[0]
        await loadCalendarDetails(first.id)
      }
    } catch {
      setIsLoggedIn(false)
      setHasCheckedSession(true)
      setCalendars([])
      setCalendarDays([])
      setCurrentAdminName('ANONIMX')
      setCurrentAdminEmail('')
    }
  }

  const fetchProfile = async () => {
    try {
      const admin = await request<{ name?: string; email?: string }>(`${API_BASE}/api/auth/admin/me`)
      setCurrentAdminName(getDisplayAdminName(admin.name))
      setCurrentAdminEmail((previousEmail) => admin.email || previousEmail || '')
    } catch {
      setCurrentAdminName('ANONIMX')
      setCurrentAdminEmail('')
    }
  }

  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const lastSavedEditorDraftRef = useRef<string | null>(null)
  const AUTOSAVE_DELAY_MS = 30000

  const serializeEditorDraft = (draft: { name: string; slug: string; description: string; password: string; theme: string; duration_days: number; is_published: boolean; is_demo: boolean; is_public_without_code: boolean; calendar_background: 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom'; calendar_background_image: string; custom_layout: string; mosaic_scale: number; door_style: 'red' | 'ribbon' | 'gold' | 'custom'; door_image: string; background_music: MusicPresetKey; background_music_url: string } | null) => {
    if (!draft) return null

    return JSON.stringify({
      name: draft.name,
      slug: draft.slug,
      description: draft.description,
      password: draft.password,
      theme: draft.theme,
      duration_days: draft.duration_days,
      is_published: draft.is_published,
      is_demo: draft.is_demo,
      is_public_without_code: draft.is_public_without_code,
      calendar_background: draft.calendar_background,
      calendar_background_image: draft.calendar_background_image,
      custom_layout: draft.custom_layout,
      mosaic_scale: draft.mosaic_scale,
      door_style: draft.door_style,
      door_image: draft.door_image,
      background_music: draft.background_music,
      background_music_url: draft.background_music_url,
    })
  }

  const displayedCalendar = calendars[calendarCarouselIndex] ?? null
  const totalCalendarsLabel = `${calendars.length}`
  const publishedCalendarsCount = calendars.filter((calendar) => calendar.is_published).length
  const draftCalendarsCount = calendars.filter((calendar) => !calendar.is_published).length
  const pageSize = 10
  const totalCalendarPages = Math.max(1, Math.ceil(calendars.length / pageSize))
  const visibleCalendarPage = calendars.slice(calendarPage * pageSize, (calendarPage + 1) * pageSize)

  useEffect(() => {
    if (calendars.length === 0) {
      setCalendarCarouselIndex(0)
      setCalendarPage(0)
      return
    }
    if (calendarCarouselIndex >= calendars.length) {
      setCalendarCarouselIndex(0)
    }
    if (calendarPage >= totalCalendarPages) {
      setCalendarPage(0)
    }
  }, [calendarCarouselIndex, calendarPage, calendars, totalCalendarPages])
  const [editingDayId, setEditingDayId] = useState<number | null>(null)
  const [calendarEditorId, setCalendarEditorId] = useState<number | null>(null)
  const [isEditingCalendarTitle, setIsEditingCalendarTitle] = useState(false)
  const [isDoorEditorPanelOpen, setIsDoorEditorPanelOpen] = useState(true)
  const [isDoorEditorModalOpen, setIsDoorEditorModalOpen] = useState(false)
  const [editorSaveState, setEditorSaveState] = useState<'saving' | 'saved'>('saved')
  const [calendarEditorDraft, setCalendarEditorDraft] = useState<{
    name: string
    slug: string
    description: string
    password: string
    theme: string
    duration_days: number
    is_published: boolean
    is_demo: boolean
    is_public_without_code: boolean
    calendar_background: 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom'
    calendar_background_image: string
    custom_layout: string
    mosaic_scale: number
    door_style: 'red' | 'ribbon' | 'gold' | 'custom'
    door_image: string
    background_music: MusicPresetKey
    background_music_url: string
  } | null>(null)
  const customLayoutBoardRef = useRef<HTMLDivElement | null>(null)
  const customLayoutDragRef = useRef<{
    dayNumber: number
    mode: 'move' | 'resize'
    startX: number
    startY: number
    initialBlock: CustomLayoutBlock
    boardWidth: number
    boardHeight: number
  } | null>(null)

  const [dayDraft, setDayDraft] = useState({
    day_number: 1,
    title: 'Un detalle especial',
    content: '¡Hoy te espera una sorpresa!',
    message: 'Hoy te toca un mini detalle para sonreír.',
    quote: 'La mejor parte del día es la que compartes.',
    game: 'Juego del día',
    game_description: 'Una pequeña sorpresa o reto para hacer juntos.',
    song_title: 'Tema del día',
    song_artist: 'Artista',
    notes: 'Añade un recuerdo o un detalle especial.',
    media_url: '',
    mood: 'feliz',
    content_type: 'message',
    is_unlocked_by_admin: false,
    unlock_date: '',
  })

  const buildEmptyDayDraft = (dayNumber = 1) => ({
    day_number: dayNumber,
    title: 'Un detalle especial',
    content: '¡Hoy te espera una sorpresa!',
    message: 'Hoy te toca un mini detalle para sonreír.',
    quote: 'La mejor parte del día es la que compartes.',
    game: 'Juego del día',
    game_description: 'Una pequeña sorpresa o reto para hacer juntos.',
    song_title: 'Tema del día',
    song_artist: 'Artista',
    notes: 'Añade un recuerdo o un detalle especial.',
    media_url: '',
    mood: 'feliz',
    content_type: 'message',
    is_unlocked_by_admin: false,
    unlock_date: '',
  })

  const resetDayDraft = () => {
    setDayDraft(buildEmptyDayDraft(1))
    setEditingDayId(null)
    setIsDoorEditorModalOpen(false)
  }

  const loadCalendarDetails = async (calendarId: number) => {
    const results = await Promise.all([
      request<CalendarSummary>(`${API_BASE}/api/calendars/${calendarId}`),
      request<CalendarDay[]>(`${API_BASE}/api/calendars/${calendarId}/days`),
      request<{ total_days: number; opened_count: number; published: boolean; demo: boolean }>(`${API_BASE}/api/calendars/${calendarId}/stats`),
      request<CalendarReminder[]>(`${API_BASE}/api/calendars/${calendarId}/reminders`),
    ])
    const days = results[1] as CalendarDay[]
    const reminders = results[3] as CalendarReminder[]
    setSelectedCalendarId(calendarId)
    setCalendarDays(days)
    setReminderEmails(reminders)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const normalizedEmail = email.trim().toLowerCase()
      await request<{ message: string }>(`${API_BASE}/api/auth/admin/login`, {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      setError('')
      setInfoMessage('')
      setCurrentAdminEmail(normalizedEmail)
      await loadCalendars()
      await fetchProfile()
    } catch (err) {
      setInfoMessage('')
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    }
  }

  const handleProfileLogout = async () => {
    try {
      await request(`${API_BASE}/api/auth/admin/logout`, { method: 'POST' })
    } catch {
      // No-op: the local session is cleared anyway.
    }

    setIsLoggedIn(false)
    setHasCheckedSession(true)
    setProfileMenuOpen(false)
    setCurrentAdminName('ANONIMX')
    setCurrentAdminEmail('')
  }

  const handleAdminRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const result = await request<{ message: string }>(`${API_BASE}/api/auth/admin/register`, {
        method: 'POST',
        body: JSON.stringify({ name: adminName || 'ANONIMX', email, password }),
      })
      const registeredName = (adminName || 'ANONIMX').trim() || 'ANONIMX'
      setError('')
      setInfoMessage(result.message)
      setCurrentAdminName(getDisplayAdminName(registeredName))
      setCurrentAdminEmail(email.trim().toLowerCase())
      setAdminAuthMode('login')
      setEmail('')
      setPassword('')
      setAdminName('')
      await fetchProfile()
    } catch (err) {
      setInfoMessage('')
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta de administrador')
    }
  }

  const handleCreateCalendar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const created = await request<CalendarSummary>(`${API_BASE}/api/calendars`, {
        method: 'POST',
        body: JSON.stringify({
          ...newCalendar,
          is_published: false,
          password: newCalendar.password,
          is_public_without_code: false,
          palette: { primary: '#7a1d39', secondary: '#f8d7d7', accent: '#d4af37' },
        }),
      })
      setNewCalendar({
        name: 'Nuevo calendario',
        slug: 'nuevo-calendario',
        description: 'Un regalo especial para la familia.',
        password: generateAccessCode(),
        theme: 'romantic',
        duration_days: 12,
        is_published: false,
        is_public_without_code: false,
        calendar_background: 'rojo_mate',
      })
      setIsCreateCalendarOpen(false)
      await loadCalendars()
      if (created?.id) {
        await loadCalendarDetails(created.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el calendario')
    }
  }

  const openCalendarEditor = async (calendar: CalendarSummary) => {
    const { password } = resolveCalendarAccessState(calendar.password, calendar.is_public_without_code)
    setCalendarEditorId(calendar.id)
    setEditorSaveState('saved')
    setCalendarEditorDraft({
      name: calendar.name,
      slug: calendar.slug,
      description: calendar.description ?? '',
      password,
      theme: calendar.theme || 'puzzle',
      duration_days: calendar.duration_days,
      is_published: calendar.is_published,
      is_demo: calendar.is_demo,
      is_public_without_code: false,
      calendar_background: calendar.calendar_background ?? 'rojo_mate',
      calendar_background_image: calendar.calendar_background_image ?? '',
      custom_layout: calendar.custom_layout ?? JSON.stringify(buildDefaultCustomLayoutBlocks(calendar.duration_days)),
      mosaic_scale: calendar.mosaic_scale ?? 1,
      door_style: calendar.door_style ?? 'red',
      door_image: calendar.door_image ?? '',
      background_music: calendar.background_music ?? 'none',
      background_music_url: calendar.background_music_url ?? '',
    })
    setIsEditingCalendarTitle(false)
    setSelectedCalendarId(calendar.id)
    setError('')
    await loadCalendarDetails(calendar.id)
  }

  const closeCalendarEditor = () => {
    setCalendarEditorId(null)
    setCalendarEditorDraft(null)
    setEditorSaveState('saved')
    setIsEditingCalendarTitle(false)
  }

  const handleCustomLayoutPointerDown = (event: React.PointerEvent<HTMLElement>, dayNumber: number, mode: 'move' | 'resize') => {
    if (!calendarEditorDraft || mode === 'resize') return

    const boardElement = customLayoutBoardRef.current
    if (!boardElement) return

    const boardRect = boardElement.getBoundingClientRect()
    const currentBlocks = getCustomLayoutBlocks(calendarEditorDraft.custom_layout, calendarEditorDraft.duration_days)
    const currentBlock = currentBlocks.find((item) => item.day_number === dayNumber)
    if (!currentBlock) return

    customLayoutDragRef.current = {
      dayNumber,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialBlock: { ...currentBlock },
      boardWidth: Math.max(boardRect.width, 1),
      boardHeight: Math.max(boardRect.height, 1),
    }
    event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = customLayoutDragRef.current
      if (!dragState || !calendarEditorDraft) return

      const offsetColumns = (event.clientX - dragState.startX) / dragState.boardWidth * 7
      const offsetRows = (event.clientY - dragState.startY) / dragState.boardHeight * 5
      const deltaX = Math.round(offsetColumns)
      const deltaY = Math.round(offsetRows)

      setCalendarEditorDraft((current) => {
        if (!current) return current

        const nextBlocks = getCustomLayoutBlocks(current.custom_layout, current.duration_days)
        const currentBlock = nextBlocks.find((item) => item.day_number === dragState.dayNumber) ?? dragState.initialBlock

        const updatedBlock = { ...currentBlock }
        if (dragState.mode === 'move') {
          updatedBlock.x = clamp(dragState.initialBlock.x + deltaX, 0, 7 - dragState.initialBlock.w)
          updatedBlock.y = clamp(dragState.initialBlock.y + deltaY, 0, 5 - dragState.initialBlock.h)
        } else {
          updatedBlock.w = clamp(dragState.initialBlock.w + deltaX, 1, 7 - dragState.initialBlock.x)
          updatedBlock.h = clamp(dragState.initialBlock.h + deltaY, 1, 5 - dragState.initialBlock.y)
        }

        const candidate = getCustomLayoutCandidate(
          nextBlocks,
          dragState.dayNumber,
          updatedBlock,
        )

        if (!candidate) {
          return current
        }

        const resolvedBlocks = nextBlocks.map((block) => block.day_number === dragState.dayNumber ? candidate : block)
        return {
          ...current,
          custom_layout: JSON.stringify(resolvedBlocks),
        }
      })
    }

    const handlePointerUp = () => {
      customLayoutDragRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [calendarEditorDraft])

  useEffect(() => {
    if (!calendarEditorDraft || calendarEditorDraft.theme !== 'custom') {
      customLayoutDragRef.current = null
    }
  }, [calendarEditorDraft])

  useEffect(() => {
    if (!calendarEditorDraft || calendarEditorDraft.theme !== 'custom') return

    const hasLayout = Boolean(calendarEditorDraft.custom_layout)
    if (!hasLayout) {
      setCalendarEditorDraft((current) => current ? {
        ...current,
        custom_layout: JSON.stringify(buildDefaultCustomLayoutBlocks(current.duration_days)),
      } : current)
    }
  }, [calendarEditorDraft])

  useEffect(() => {
    if (!calendarEditorDraft || calendarEditorDraft.theme !== 'custom') return

    const blocks = getCustomLayoutBlocks(calendarEditorDraft.custom_layout, calendarEditorDraft.duration_days)
    if (blocks.length !== calendarEditorDraft.duration_days) {
      setCalendarEditorDraft((current) => current ? {
        ...current,
        custom_layout: JSON.stringify(buildDefaultCustomLayoutBlocks(current.duration_days)),
      } : current)
    }
  }, [calendarEditorDraft])

  useEffect(() => {
    const routeState = location.state as { returnToEditor?: boolean; calendarId?: number; returnToRoute?: string } | null
    if (!routeState?.returnToEditor || !routeState.calendarId) {
      return
    }

    const targetCalendar = calendars.find((calendar) => calendar.id === routeState.calendarId)
    if (!targetCalendar) {
      return
    }

    void openCalendarEditor(targetCalendar)
  }, [calendars, location.state])

  const resolvePublicCalendarSlug = (calendarLike?: Pick<CalendarSummary, 'slug' | 'id'> | null) => {
    if (!calendarLike) return null

    const inEditor = calendarEditorId !== null && calendarEditorId === calendarLike.id && calendarEditorDraft
    const draftSlug = inEditor ? calendarEditorDraft.slug.trim() : ''
    const persistedSlug = (calendarLike.slug ?? '').trim()

    if (draftSlug && inEditor) return draftSlug
    if (persistedSlug) return persistedSlug
    return null
  }

  const getCalendarPublicRoute = (calendarLike?: Pick<CalendarSummary, 'slug' | 'id'> | null) => {
    const slug = resolvePublicCalendarSlug(calendarLike)
    if (slug) {
      return `/calendar/${slug}`
    }

    if (!calendarLike) return '/admin'
    return `/admin/calendario/${calendarLike.id}`
  }

  const getCalendarPreviewTarget = async () => {
    const currentCalendar = getEditorCalendarSnapshot() ?? (
      calendarEditorId !== null
        ? calendars.find((item) => item.id === calendarEditorId) ?? null
        : selectedCalendarId !== null
          ? calendars.find((item) => item.id === selectedCalendarId) ?? null
          : null
    )

    if (!currentCalendar) return null

    if (calendarEditorId !== null && calendarEditorId === currentCalendar.id && calendarEditorDraft) {
      const savedCalendar = calendars.find((item) => item.id === calendarEditorId)
      const draftSlug = (calendarEditorDraft.slug || '').trim()
      const savedSlug = (savedCalendar?.slug || '').trim()
      const hasDraftSlugChange = draftSlug.length > 0 && draftSlug !== savedSlug
      const hasDraftContentChange = savedCalendar !== undefined && (
        savedCalendar.name !== calendarEditorDraft.name ||
        savedSlug !== draftSlug ||
        (savedCalendar.description ?? '') !== (calendarEditorDraft.description ?? '') ||
        (savedCalendar.theme ?? 'romantic') !== (calendarEditorDraft.theme ?? 'romantic') ||
        (savedCalendar.duration_days ?? 24) !== (calendarEditorDraft.duration_days ?? 24) ||
        savedCalendar.is_published !== calendarEditorDraft.is_published ||
        (savedCalendar.calendar_background ?? 'rojo_mate') !== (calendarEditorDraft.calendar_background ?? 'rojo_mate') ||
        (savedCalendar.calendar_background_image ?? '') !== (calendarEditorDraft.calendar_background_image ?? '') ||
        (savedCalendar.custom_layout ?? '') !== (calendarEditorDraft.custom_layout ?? '') ||
        (savedCalendar.mosaic_scale ?? 1) !== (calendarEditorDraft.mosaic_scale ?? 1) ||
        (savedCalendar.door_style ?? 'red') !== (calendarEditorDraft.door_style ?? 'red') ||
        (savedCalendar.door_image ?? '') !== (calendarEditorDraft.door_image ?? '') ||
        (savedCalendar.background_music ?? 'none') !== (calendarEditorDraft.background_music ?? 'none') ||
        (savedCalendar.background_music_url ?? '') !== (calendarEditorDraft.background_music_url ?? '')
      )

      if (hasDraftSlugChange || hasDraftContentChange) {
        const updatedCalendar = await saveCalendarEditor({ ...calendarEditorDraft })
        if (updatedCalendar) {
          return {
            ...currentCalendar,
            ...updatedCalendar,
            slug: updatedCalendar.slug.trim() || currentCalendar.slug,
            name: updatedCalendar.name || currentCalendar.name,
            description: updatedCalendar.description ?? currentCalendar.description ?? null,
            theme: updatedCalendar.theme || currentCalendar.theme,
            duration_days: updatedCalendar.duration_days || currentCalendar.duration_days,
            is_published: updatedCalendar.is_published,
            is_demo: updatedCalendar.is_demo,
          } satisfies CalendarSummary
        }
      }
    }

    return getEditorCalendarSnapshot() ?? currentCalendar
  }

  const getPublicCalendarShareUrl = (calendarLike?: Pick<CalendarSummary, 'slug' | 'id'> | null) => {
    const slug = resolvePublicCalendarSlug(calendarLike)
    if (!slug) return null
    return `${window.location.origin}/calendar/${slug}`
  }

  const getEditorCalendarSnapshot = () => {
    if (!calendarEditorId || !calendarEditorDraft) return null

    const existing = calendars.find((item) => item.id === calendarEditorId)
    return {
      ...(existing ?? {
        id: calendarEditorId,
        name: calendarEditorDraft.name || 'Calendario',
        slug: calendarEditorDraft.slug,
        description: calendarEditorDraft.description || null,
        theme: calendarEditorDraft.theme || 'puzzle',
        duration_days: calendarEditorDraft.duration_days,
        is_published: calendarEditorDraft.is_published,
        is_demo: calendarEditorDraft.is_demo,
      }),
      id: calendarEditorId,
      name: calendarEditorDraft.name || existing?.name || 'Calendario',
      slug: (calendarEditorDraft.slug || existing?.slug || '').trim(),
      description: calendarEditorDraft.description || existing?.description || null,
      theme: calendarEditorDraft.theme || existing?.theme || 'puzzle',
      duration_days: Number.isFinite(calendarEditorDraft.duration_days) ? calendarEditorDraft.duration_days : (existing?.duration_days ?? 24),
      is_published: calendarEditorDraft.is_published,
      is_demo: calendarEditorDraft.is_demo ?? existing?.is_demo ?? false,
      calendar_background: calendarEditorDraft.calendar_background ?? existing?.calendar_background ?? 'rojo_mate',
      calendar_background_image: calendarEditorDraft.calendar_background_image || existing?.calendar_background_image || '',
      custom_layout: calendarEditorDraft.custom_layout || existing?.custom_layout || JSON.stringify(buildDefaultCustomLayoutBlocks(calendarEditorDraft.duration_days)),
      mosaic_scale: calendarEditorDraft.mosaic_scale ?? existing?.mosaic_scale ?? 1,
      door_style: calendarEditorDraft.door_style ?? existing?.door_style ?? 'red',
      door_image: calendarEditorDraft.door_image || existing?.door_image || '',
      background_music: calendarEditorDraft.background_music ?? existing?.background_music ?? 'none',
      background_music_url: calendarEditorDraft.background_music_url || existing?.background_music_url || '',
    } satisfies CalendarSummary
  }

  const openCalendarEditorShare = () => {
    const currentCalendar = getEditorCalendarSnapshot()
    if (!currentCalendar) return
    openShareCalendarModal(currentCalendar)
  }

  const saveCalendarEditor = async (draftOverride?: typeof calendarEditorDraft, closeAfterSave = false): Promise<CalendarSummary | null> => {
    const draft = draftOverride ?? calendarEditorDraft
    if (!calendarEditorId || !draft) return null

    const normalizedPassword = (draft.password || '').trim()
    const stabilizedDraft = {
      ...draft,
      password: normalizedPassword,
      is_public_without_code: false,
    }

    const draftSignature = serializeEditorDraft(stabilizedDraft)
    if (draftSignature === lastSavedEditorDraftRef.current) {
      setEditorSaveState('saved')
      return null
    }

    setEditorSaveState('saving')

    try {
      const updatedCalendar = await request<CalendarSummary>(`${API_BASE}/api/calendars/${calendarEditorId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...stabilizedDraft,
          is_public_without_code: false,
          password: normalizedPassword || undefined,
          palette: { primary: '#7a1d39', secondary: '#f8d7d7', accent: '#d4af37' },
        }),
      })

      setCalendars((current) => current.some((item) => item.id === calendarEditorId)
        ? current.map((item) => (item.id === calendarEditorId ? { ...item, ...updatedCalendar } : item))
        : [...current, updatedCalendar])

      setCalendarEditorDraft((current) => current ? {
        ...current,
        name: updatedCalendar.name,
        slug: updatedCalendar.slug,
        description: updatedCalendar.description ?? '',
        password: updatedCalendar.password ?? current.password ?? '',
        is_public_without_code: false,
        theme: updatedCalendar.theme,
        duration_days: updatedCalendar.duration_days,
        is_published: updatedCalendar.is_published,
        is_demo: updatedCalendar.is_demo,
        calendar_background: updatedCalendar.calendar_background ?? current.calendar_background,
        calendar_background_image: updatedCalendar.calendar_background_image ?? current.calendar_background_image,
        custom_layout: updatedCalendar.custom_layout ?? current.custom_layout ?? JSON.stringify(buildDefaultCustomLayoutBlocks(updatedCalendar.duration_days)),
        mosaic_scale: updatedCalendar.mosaic_scale ?? current.mosaic_scale ?? 1,
        door_style: updatedCalendar.door_style ?? current.door_style,
        door_image: updatedCalendar.door_image ?? current.door_image,
        background_music: updatedCalendar.background_music ?? current.background_music,
        background_music_url: updatedCalendar.background_music_url ?? current.background_music_url,
      } : current)

      lastSavedEditorDraftRef.current = draftSignature

      if (shareCalendar && shareCalendar.id === calendarEditorId) {
        setShareCalendar((current) => current ? { ...current, ...updatedCalendar } : current)
      }

      await loadCalendars()
      setEditorSaveState('saved')
      if (closeAfterSave) {
        closeCalendarEditor()
      }
      return updatedCalendar
    } catch (err) {
      setEditorSaveState('saved')
      setError(err instanceof Error ? err.message : 'No se pudo guardar el calendario')
      return null
    }
  }

  useEffect(() => {
    if (!calendarEditorId || !calendarEditorDraft) {
      lastSavedEditorDraftRef.current = null
      return
    }

    const currentDraftSignature = serializeEditorDraft(calendarEditorDraft)
    if (currentDraftSignature === lastSavedEditorDraftRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      void saveCalendarEditor({ ...calendarEditorDraft })
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [calendarEditorId, calendarEditorDraft])

  const handleDuplicate = async (calendarId: number) => {
    try {
      await request<{ message: string }>(`${API_BASE}/api/calendars/${calendarId}/duplicate`, { method: 'POST' })
      await loadCalendars()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo duplicar')
    }
  }

  const handleDelete = async (calendarId: number) => {
    try {
      await request<{ message: string }>(`${API_BASE}/api/calendars/${calendarId}`, { method: 'DELETE' })
      await loadCalendars()
      if (selectedCalendarId === calendarId) {
        setCalendarDays([])
        setSelectedCalendarId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  const [profilePasswordValidated, setProfilePasswordValidated] = useState(false)
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const getDisplayAdminName = (name?: string | null) => {
    const normalized = (name || 'ANONIMX').trim() || 'ANONIMX'
    return normalized === 'Administrador' ? 'ANONIMX' : normalized
  }

  const updateAdminProfile = async () => {
    try {
      setProfileStatus(null)

      if (profileModal === 'password') {
        if (!profilePasswordValidated) {
          throw new Error('Primero valida tu contraseña actual')
        }
        if (!profileDraft.newPassword || profileDraft.newPassword.length < 6) {
          throw new Error('La nueva contraseña debe tener al menos 6 caracteres')
        }
        if (profileDraft.newPassword !== profileDraft.confirmPassword) {
          throw new Error('Las contraseñas nuevas no coinciden')
        }

        await request<{ message: string }>(`${API_BASE}/api/auth/admin/change-password`, {
          method: 'POST',
          body: JSON.stringify({
            current_password: profileDraft.currentPassword,
            new_password: profileDraft.newPassword,
            confirm_password: profileDraft.confirmPassword,
          }),
        })
        setProfileStatus({ type: 'success', message: 'Contraseña actualizada correctamente. Las contraseñas coinciden y se ha guardado con éxito.' })
      }

      if (profileModal === 'email') {
        const nextEmail = profileDraft.newEmail.trim().toLowerCase()
        if (!nextEmail || !nextEmail.includes('@')) {
          throw new Error('Introduce un correo válido')
        }
        if (nextEmail === currentAdminEmail.trim().toLowerCase()) {
          throw new Error('Introduce un correo distinto al actual')
        }

        await request<{ message: string }>(`${API_BASE}/api/auth/admin/change-email`, {
          method: 'POST',
          body: JSON.stringify({
            email: nextEmail,
          }),
        })
        setProfileStatus({ type: 'success', message: 'Correo actualizado correctamente. El nuevo correo se ha guardado con éxito.' })
      }

      setProfileDraft({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        currentEmail: '',
        newEmail: '',
        confirmEmail: '',
      })
      setProfilePasswordValidated(false)
      setProfileMenuOpen(false)
      await fetchProfile()
      setError('')
      setInfoMessage('')
    } catch (err) {
      setProfileStatus({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo actualizar el perfil' })
      setError('')
      setInfoMessage('')
    }
  }

  const openProfileModal = (mode: 'password' | 'email') => {
    setProfileModal(mode)
    setProfilePasswordValidated(false)
    setProfileStatus(null)
    setProfileDraft({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      currentEmail: currentAdminEmail,
      newEmail: '',
      confirmEmail: '',
    })
    setProfileMenuOpen(false)
    setError('')
    setInfoMessage('')
  }

  const closeProfileModal = () => {
    setProfileModal(null)
    setProfileStatus(null)
    setProfilePasswordValidated(false)
    setError('')
    setInfoMessage('')
  }

  const validateCurrentPassword = async () => {
    try {
      if (!profileDraft.currentPassword.trim()) {
        throw new Error('Introduce tu contraseña actual')
      }

      await request<{ message: string }>(`${API_BASE}/api/auth/admin/verify-password`, {
        method: 'POST',
        body: JSON.stringify({
          current_password: profileDraft.currentPassword,
        }),
      })

      setProfilePasswordValidated(true)
      setProfileStatus({ type: 'success', message: 'Contraseña actual correcta. Ya puedes introducir la nueva contraseña y repetirla.' })
      setInfoMessage('')
      setError('')
    } catch (err) {
      setProfilePasswordValidated(false)
      setProfileStatus({ type: 'error', message: err instanceof Error ? err.message : 'La contraseña actual no es correcta' })
      setInfoMessage('')
      setError('')
    }
  }

  const handleSelectDoorSlot = (dayNumber: number, existingDay?: CalendarDay) => {
    if (existingDay) {
      handleEditDay(existingDay)
      return
    }

    setEditingDayId(null)
    setDayDraft(buildEmptyDayDraft(dayNumber))
    setIsDoorEditorModalOpen(true)
    setError('')
  }

  const handleCreateDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCalendarId) {
      setError('Selecciona un calendario antes de crear una puerta.')
      return
    }

    try {
      const payload = {
        ...dayDraft,
        unlock_date: dayDraft.unlock_date || null,
        metadata: buildDayMetadata(dayDraft),
      }

      if (editingDayId !== null) {
        await request<CalendarDay>(`${API_BASE}/api/days/${editingDayId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await request<CalendarDay>(`${API_BASE}/api/calendars/${selectedCalendarId}/days`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      resetDayDraft()
      await loadCalendarDetails(selectedCalendarId)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la puerta')
    }
  }

  const handleEditDay = (day: CalendarDay) => {
    setEditingDayId(day.id)
    setDayDraft({
      day_number: day.day_number,
      title: day.title,
      content: day.content ?? '',
      message: getMetadataValue(day.metadata, 'message'),
      quote: getMetadataValue(day.metadata, 'quote'),
      game: getMetadataValue(day.metadata, 'game'),
      game_description: getMetadataValue(day.metadata, 'game_description'),
      song_title: getMetadataValue(day.metadata, 'song_title'),
      song_artist: getMetadataValue(day.metadata, 'song_artist'),
      notes: getMetadataValue(day.metadata, 'notes'),
      media_url: getMetadataValue(day.metadata, 'media_url'),
      mood: getMetadataValue(day.metadata, 'mood'),
      content_type: day.content_type,
      is_unlocked_by_admin: day.is_unlocked_by_admin,
      unlock_date: day.unlock_date ? new Date(day.unlock_date).toISOString().slice(0, 10) : '',
    })
    setIsDoorEditorModalOpen(true)
    setError('')
  }

  const handleSendReminderEmails = async (calendarId: number) => {
    try {
      const result = await request<{ count: number; message: string; emails: string[] }>(`${API_BASE}/api/calendars/${calendarId}/reminders/send`, {
        method: 'POST',
      })
      await loadCalendarDetails(calendarId)
      if (result.count === 0) {
        setError('')
        return
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron enviar los recordatorios')
    }
  }

  const persistEditorDraftIfDirty = async () => {
    if (calendarEditorId === null || !calendarEditorDraft) return

    const existing = calendars.find((item) => item.id === calendarEditorId)
    if (!existing) return

    const isDirty = (
      existing.name !== calendarEditorDraft.name ||
      existing.slug !== (calendarEditorDraft.slug || '').trim() ||
      (existing.description ?? '') !== (calendarEditorDraft.description ?? '') ||
      (existing.theme ?? 'romantic') !== (calendarEditorDraft.theme ?? 'romantic') ||
      (existing.duration_days ?? 24) !== (calendarEditorDraft.duration_days ?? 24) ||
      existing.is_published !== calendarEditorDraft.is_published ||
      (existing.is_demo ?? false) !== (calendarEditorDraft.is_demo ?? false)
    )

    if (isDirty) {
      await saveCalendarEditor({ ...calendarEditorDraft })
    }
  }

  const openShareCalendarModal = (calendar: CalendarSummary) => {
    const calendarSnapshot = calendarEditorId === calendar.id ? getEditorCalendarSnapshot() ?? calendar : calendar
    setShareCalendar(calendarSnapshot)
    setShareDraft({
      name: '',
      text: 'Hola, este es un regalo para ti.',
    })
  }

  const closeShareCalendarModal = () => {
    setShareCalendar(null)
    setShareDraft({ name: '', text: 'Hola, este es un regalo para ti.' })
  }

  const copyShareMessage = async () => {
    if (!shareCalendar) return
    if (calendarEditorId === shareCalendar.id && calendarEditorDraft) {
      await persistEditorDraftIfDirty()
    }
    const shareUrl = getPublicCalendarShareUrl(shareCalendar)
    if (!shareUrl) return
    const greeting = shareDraft.name ? `Hola, ${shareDraft.name}` : 'Hola'
    const message = `${greeting}\n\n${shareDraft.text.trim() || 'Este es un regalo para ti.'}\n\n${shareUrl}`
    await copyToClipboard(message)
  }

  const handleTogglePublish = async (calendarId: number, published: boolean) => {
    const current = calendars.find((item) => item.id === calendarId)
    if (!current) return

    try {
      await request<{ message: string }>(`${API_BASE}/api/calendars/${calendarId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: current.name,
          slug: current.slug,
          description: current.description || '',
          password: 'secret123',
          theme: current.theme || 'romantic',
          palette: { primary: '#7a1d39', secondary: '#f8d7d7', accent: '#d4af37' },
          duration_days: current.duration_days,
          is_published: !published,
          is_demo: current.is_demo,
        }),
      })
      await loadCalendars()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la visibilidad')
    }
  }

  const handleExport = async (calendarId: number) => {
    try {
      const payload = await request<Record<string, unknown>>(`${API_BASE}/api/calendars/${calendarId}/export`)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `calendar-${calendarId}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar la configuración')
    }
  }

  const handleImport = async (calendarId: number, file: File | null) => {
    if (!file) return
    try {
      const content = await file.text()
      const payload = JSON.parse(content)
      await request<{ message: string }>(`${API_BASE}/api/calendars/${calendarId}/import`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await loadCalendars()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el archivo')
    }
  }

  useEffect(() => {
    void loadCalendars()
    void fetchProfile()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target || !target.closest('[data-profile-menu]')) {
        setProfileMenuOpen(false)
      }
      if (!target || !target.closest('[data-calendar-menu]')) {
        setCalendarMenuOpenId(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (!hasCheckedSession || isLoggedIn === null) {
    return <RouteLoadingScreen language={language} />
  }

  if (!isLoggedIn) {
    return (
      <div className="auth-shell">
        <div className="container">
          <div className="row justify-content-center">
            <div className="auth-card-panel">
              <div className="glass-card p-4 p-md-5">
                <p className="eyebrow">Admin</p>
                <h1>{language === 'en' ? 'Administration panel' : 'Panel de administración'}</h1>
                <p className="text-muted">{language === 'en' ? 'Access to manage content, doors and calendars.' : 'Accede para gestionar contenidos, puertas y calendarios.'}</p>

                <div className="btn-group w-100 mb-3" role="tablist" aria-label={language === 'en' ? 'Access mode' : 'Modo de acceso'}>
                  <button
                    type="button"
                    className={`btn ${adminAuthMode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setAdminAuthMode('login')
                      setError('')
                      setInfoMessage('')
                    }}
                  >
                    {language === 'en' ? 'Log in' : 'Iniciar sesión'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${adminAuthMode === 'register' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setAdminAuthMode('register')
                      setError('')
                      setInfoMessage('')
                    }}
                  >
                    {language === 'en' ? 'Create account' : 'Crear cuenta'}
                  </button>
                </div>

                <form onSubmit={adminAuthMode === 'login' ? handleLogin : handleAdminRegister} className="admin-form">
                  {adminAuthMode === 'register' ? (
                    <label>
                      {language === 'en' ? adminCopy.name : 'Nombre'}
                      <input type="text" value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder={language === 'en' ? 'Your name' : 'Tu nombre'} />
                    </label>
                  ) : null}
                  <label>
                    {language === 'en' ? adminCopy.email : 'Email'}
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </label>
                  <label>
                    {language === 'en' ? adminCopy.password : 'Contraseña'}
                    <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} language={language} />
                  </label>
                  {infoMessage ? <div className="alert alert-success">{infoMessage}</div> : null}
                  {error ? <div className="alert alert-danger">{error}</div> : null}
                  <button type="submit" className="btn btn-primary w-100">
                    {adminAuthMode === 'login' ? (language === 'en' ? adminCopy.login : 'Entrar') : (language === 'en' ? adminCopy.register : 'Crear cuenta')}
                  </button>
                </form>

                <div className="login-footer">
                  <Link to="/" className="btn btn-outline-primary w-100">{language === 'en' ? 'Back home' : 'Volver al inicio'}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4 admin-dashboard">
      {calendarEditorDraft && calendarEditorId !== null ? (
        <div className="calendar-editor-overlay" onClick={closeCalendarEditor}>
          <div className="calendar-editor-modal calendar-editor-fullpage" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row editor-header-row">
              <div className="editor-header-top">
                <div className="editor-title-cluster">
                  <p className="eyebrow">{language === 'en' ? 'Calendar' : 'Calendario'}</p>
                  <div className="editor-title-inline">
                    {isEditingCalendarTitle ? (
                      <input
                        className="editor-title-input"
                        value={calendarEditorDraft.name}
                        onChange={(event) => setCalendarEditorDraft({ ...calendarEditorDraft, name: event.target.value })}
                        onBlur={() => {
                          setIsEditingCalendarTitle(false)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            setIsEditingCalendarTitle(false)
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <h3>{calendarEditorDraft.name || (language === 'en' ? 'Untitled' : 'Sin nombre')}</h3>
                    )}

                    <div className="editor-inline-meta">
                      <button type="button" className="editor-inline-action editor-inline-name-button" onClick={() => setIsEditingCalendarTitle(true)} title={language === 'en' ? 'Edit name' : 'Editar nombre'} aria-label={language === 'en' ? 'Edit calendar name' : 'Editar nombre del calendario'}>
                        <Pencil size={14} />
                        <span>{language === 'en' ? 'Name' : 'Nombre'}</span>
                      </button>
                      <button type="button" className="editor-inline-chip" onClick={() => setEditorSettingsModal('slug')} title={language === 'en' ? 'Edit slug' : 'Editar slug'} aria-label={language === 'en' ? 'Edit calendar slug' : 'Editar slug del calendario'}>
                        <Link2 size={14} />
                        <span>Slug</span>
                      </button>
                      <button type="button" className="editor-inline-chip" onClick={() => setEditorSettingsModal('access')} title={language === 'en' ? 'Edit access settings' : 'Editar acceso con código'} aria-label={language === 'en' ? 'Edit access settings' : 'Editar acceso con código'}>
                        <Lock size={14} />
                        <span>{language === 'en' ? 'Access' : 'Acceso'}</span>
                      </button>
                      <button type="button" className="editor-inline-chip" onClick={() => setEditorSettingsModal('days')} title={language === 'en' ? 'Edit number of days' : 'Editar número de días'} aria-label={language === 'en' ? 'Edit calendar day count' : 'Editar número de días del calendario'}>
                        <CalendarDays size={14} />
                        <span>{language === 'en' ? 'Days' : 'Días'}</span>
                      </button>
                      <button type="button" className="editor-inline-chip" onClick={() => setEditorSettingsModal('reminders')} title={language === 'en' ? 'View reminders' : 'Ver recordatorios'} aria-label={language === 'en' ? 'View reminders' : 'Ver recordatorios'}>
                        <Mail size={14} />
                        <span>{language === 'en' ? 'Reminder' : 'Recordatorio'}</span>
                      </button>
                      <button type="button" className="editor-inline-chip" onClick={() => setEditorSettingsModal('details')} title={language === 'en' ? 'Edit description and theme' : 'Editar descripción y tema'} aria-label={language === 'en' ? 'Edit description and theme' : 'Editar descripción y tema'}>
                        <Info size={14} />
                        <span>{language === 'en' ? 'Details' : 'Detalles'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="editor-header-actions">
                  <button type="button" className="btn btn-sm editor-save-button" onClick={() => { void saveCalendarEditor() }} title={language === 'en' ? 'Auto-save' : 'Guardado automático'} disabled={editorSaveState === 'saving'}>
                    <span className="save-indicator" aria-hidden="true" />
                    {editorSaveState === 'saving' ? (language === 'en' ? 'Saving...' : 'Guardando...') : (language === 'en' ? 'Auto-save' : 'Guardado automático')}
                  </button>
                  <label className="editor-publish-toggle">
                    <input
                      type="checkbox"
                      checked={calendarEditorDraft.is_published}
                      onChange={(event) => {
                        const nextDraft = { ...calendarEditorDraft, is_published: event.target.checked }
                        setCalendarEditorDraft(nextDraft)
                        void saveCalendarEditor(nextDraft)
                      }}
                    />
                    <span>{calendarEditorDraft.is_published ? (language === 'en' ? 'Published' : 'Publicado') : (language === 'en' ? 'Draft' : 'Borrador')}</span>
                  </label>
                  <button type="button" className="btn btn-sm btn-primary send-button" onClick={openCalendarEditorShare} title={language === 'en' ? 'Share calendar' : 'Compartir calendario'}>
                    <Send size={14} />
                    <span>{language === 'en' ? 'Share' : 'Compartir'}</span>
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeCalendarEditor}>{language === 'en' ? 'Back' : 'Volver'}</button>
                </div>
              </div>
            </div>

            {editorSettingsModal ? (
              <div className="calendar-create-modal-backdrop" onClick={() => setEditorSettingsModal(null)}>
                <div className="calendar-create-modal" onClick={(event) => event.stopPropagation()}>
                  <div className="modal-header-row">
                    <div>
              <p className="eyebrow">{language === 'en' ? 'Calendar' : 'Calendario'}</p>
                      <h3>
                {editorSettingsModal === 'slug' && (language === 'en' ? 'Edit slug' : 'Editar slug')}
                {editorSettingsModal === 'access' && (language === 'en' ? 'Calendar access' : 'Acceso del calendario')}
                {editorSettingsModal === 'details' && (language === 'en' ? 'Description and theme' : 'Descripción y tema')}
                {editorSettingsModal === 'reminders' && (language === 'en' ? 'Reminders' : 'Recordatorios')}
                {editorSettingsModal === 'days' && (language === 'en' ? 'Number of days' : 'Número de días')}
                      </h3>
                    </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditorSettingsModal(null)}>{language === 'en' ? 'Close' : 'Cerrar'}</button>
                  </div>

                  <div className="admin-form">
                    {editorSettingsModal === 'slug' ? (
                      <label>
                Slug
                        <input value={calendarEditorDraft.slug} onChange={(event) => {
                          setCalendarEditorDraft({ ...calendarEditorDraft, slug: event.target.value })
                        }} placeholder={language === 'en' ? 'example-calendar' : 'ejemplo-calendario'} />
                      </label>
                    ) : null}

                    {editorSettingsModal === 'access' ? (
                      <label>
                        {language === 'en' ? 'Calendar password' : 'Contraseña del calendario'}
                        <div className="d-flex gap-2 align-items-center">
                          <div className="flex-grow-1">
                            <PasswordInput
                              value={calendarEditorDraft.password || ''}
                              onChange={(event) => {
                                setCalendarEditorDraft({ ...calendarEditorDraft, password: event.target.value })
                              }}
                              placeholder={language === 'en' ? 'Current password' : 'Contraseña actual'}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setCalendarEditorDraft({ ...calendarEditorDraft, is_public_without_code: false, password: generateAccessCode() })
                            }}
                          >
                            {language === 'en' ? 'Generate' : 'Generar'}
                          </button>
                        </div>
                      </label>
                    ) : null}

                    {editorSettingsModal === 'details' ? (
                      <>
                        <label>
                  {language === 'en' ? 'Description' : 'Descripción'}
                          <textarea value={calendarEditorDraft.description} onChange={(event) => {
                            setCalendarEditorDraft({ ...calendarEditorDraft, description: event.target.value })
                          }} />
                        </label>
                        <label>
                  {language === 'en' ? 'Theme' : 'Tema'}
                          <select value={calendarEditorDraft.theme} onChange={(event) => {
                            setCalendarEditorDraft({ ...calendarEditorDraft, theme: event.target.value })
                          }}>
                    <option value="romantic">{language === 'en' ? 'Romantic' : 'Romántico'}</option>
                    <option value="winter">{language === 'en' ? 'Winter' : 'Invierno'}</option>
                    <option value="cozy">{language === 'en' ? 'Cozy' : 'Cálido'}</option>
                    <option value="modern">{language === 'en' ? 'Modern' : 'Moderno'}</option>
                          </select>
                        </label>
                      </>
                    ) : null}

                    {editorSettingsModal === 'days' ? (
                      <>
                        <div className="d-flex gap-2 flex-wrap mb-3">
                          {[7, 14, 24, 31].map((days) => (
                            <button
                              key={days}
                              type="button"
                              className={`btn btn-sm ${calendarEditorDraft.duration_days === days ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => {
                                setCalendarEditorDraft({ ...calendarEditorDraft, duration_days: days })
                              }}
                            >
                      {days} {language === 'en' ? 'days' : 'días'}
                            </button>
                          ))}
                        </div>

                        <label>
                  {language === 'en' ? 'Number of days' : 'Número de días'}
                          <div className="field-help-row">
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={calendarEditorDraft.duration_days}
                              onChange={(event) => {
                                const value = Number(event.target.value)
                                setCalendarEditorDraft({
                                  ...calendarEditorDraft,
                                  duration_days: Number.isFinite(value) ? Math.max(1, Math.min(31, value)) : 1,
                                })
                              }}
                            />
                      <button type="button" className="field-help-icon" onClick={() => setDayHelpModal(true)} aria-label={language === 'en' ? 'Help about calendar days' : 'Ayuda sobre días del calendario'}>
                              <Info size={14} />
                              </button>
                          </div>
                        </label>
                      </>
                    ) : null}

                    {editorSettingsModal === 'reminders' ? (
                      <div className="share-panel">
                        <div className="share-panel-header">
                  <span>{language === 'en' ? 'Reminders' : 'Recordatorios'}</span>
                        </div>
                        <div className="share-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{reminderEmails.length} {language === 'en' ? 'saved' : 'guardados'}</strong>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { void handleSendReminderEmails(calendarEditorId) }} disabled={reminderEmails.length === 0}>
                    {language === 'en' ? 'Send pending' : 'Enviar pendientes'}
                          </button>
                        </div>
                        {reminderEmails.length === 0 ? (
                  <p className="text-muted mb-0">{language === 'en' ? 'There are no saved emails for this calendar yet.' : 'Todavía no hay correos guardados para este calendario.'}</p>
                        ) : (
                          <ul className="reminder-list">
                            {reminderEmails.map((item) => (
                              <li key={item.id} className="reminder-item">
                                <div>
                                  <strong>{item.email}</strong>
                          <small>{new Date(item.created_at).toLocaleString(language === 'en' ? 'en-US' : 'es-ES')}</small>
                                </div>
                                <span className={`reminder-badge ${item.sent ? 'sent' : 'pending'}`}>
                          {item.sent ? (language === 'en' ? 'Sent' : 'Enviado') : (language === 'en' ? 'Pending' : 'Pendiente')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="calendar-create-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setEditorSettingsModal(null)}>{language === 'en' ? 'Cancel' : 'Cancelar'}</button>
                    <button type="button" className="btn btn-primary" onClick={() => {
                      if (calendarEditorDraft) {
                        void saveCalendarEditor({ ...calendarEditorDraft })
                      }
                      setEditorSettingsModal(null)
            }}>{editorSettingsModal === 'slug' ? (language === 'en' ? 'Save slug' : 'Guardar slug') : editorSettingsModal === 'access' ? (language === 'en' ? 'Save access' : 'Guardar acceso') : editorSettingsModal === 'details' ? (language === 'en' ? 'Save changes' : 'Guardar cambios') : editorSettingsModal === 'days' ? (language === 'en' ? 'Save days' : 'Guardar días') : (language === 'en' ? 'Close' : 'Cerrar')}</button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="admin-form">
              <div className="calendar-editor-toolbar">
                <div className="calendar-editor-toolbar-row">
                  <div className="calendar-editor-toolbar-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary editor-toggle-button"
                      onClick={() => setIsDoorEditorPanelOpen((current) => !current)}
                    >
                      {isDoorEditorPanelOpen ? (language === 'en' ? 'Hide editor' : 'Ocultar editor') : (language === 'en' ? 'Open editor' : 'Abrir editor')}
                    </button>
                  </div>

                  <div className="calendar-editor-toolbar-right">
                    <div className="calendar-editor-hint">
                      <span className="calendar-editor-hint-dot" />
                      {language === 'en' ? 'Click each door to add or edit it.' : 'Pulsa cada puerta para añadirla o editarla.'}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary editor-preview-button"
                      onClick={async () => {
                        const currentCalendar = await getCalendarPreviewTarget()
                        if (!currentCalendar) return

                        const targetUrl = getCalendarPublicRoute(currentCalendar)
                        if (!targetUrl) return
                        navigate(targetUrl, {
                          state: {
                            fromEditor: true,
                            calendarId: currentCalendar.id,
                            returnToEditor: true,
                            returnToRoute: '/admin',
                          },
                        })
                      }}
                    >
                      {language === 'en' ? 'Preview' : 'Vista previa'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`calendar-editor-day-grid ${isDoorEditorPanelOpen ? 'panel-open' : 'panel-closed'}`}>
                <div className={`glass-card p-3 door-editor-side-panel ${isDoorEditorPanelOpen ? 'panel-visible' : 'panel-hidden'}`}>
                  <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                    <h4 className="mb-0">{language === 'en' ? adminCopy.editor : 'Editor'}</h4>
                  </div>

                  {isDoorEditorPanelOpen ? (
                    <div className="calendar-style-picker">
                      <div className="calendar-style-section">
                        <label className="calendar-style-label" htmlFor="calendar-style-select">
                          {language === 'en' ? 'Calendar type' : 'Tipo de calendario'}
                        </label>
                        <select
                          id="calendar-style-select"
                          className="calendar-style-select"
                          value={calendarEditorDraft?.theme ?? 'puzzle'}
                          onChange={(event) => {
                            const nextTheme = event.target.value
                            setCalendarEditorDraft((current) => {
                              if (!current) return current

                              return {
                                ...current,
                                theme: nextTheme,
                                duration_days: current.duration_days,
                                custom_layout: current.custom_layout || JSON.stringify(buildDefaultCustomLayoutBlocks(current.duration_days)),
                              }
                            })
                          }}
                        >
                          <option value="puzzle">{language === 'en' ? 'Puzzle / Mosaic' : 'Puzzle / Mosaico'}</option>
                          <option value="week">{language === 'en' ? 'Default grid' : 'Cuadrícula por defecto'}</option>
                        </select>
                      </div>

                      <div className="calendar-style-section">
                        <label className="calendar-style-label" htmlFor="calendar-background-select">
                          {language === 'en' ? 'Calendar background' : 'Fondo del calendario'}
                        </label>
                        <select
                          id="calendar-background-select"
                          className="calendar-style-select"
                          value={calendarEditorDraft?.calendar_background ?? 'rojo_mate'}
                          onChange={(event) => {
                            const nextValue = event.target.value as 'navidad' | 'flores' | 'minimal' | 'azul_mate' | 'verde_mate' | 'rojo_mate' | 'custom'
                            setCalendarEditorDraft((current) => current ? { ...current, calendar_background: nextValue } : current)
                          }}
                        >
                          <option value="navidad">{language === 'en' ? 'Christmas' : 'Navidad'}</option>
                          <option value="flores">{language === 'en' ? 'Flowers' : 'Flores'}</option>
                          <option value="minimal">{language === 'en' ? 'Minimal' : 'Minimal'}</option>
                          <option value="azul_mate">Azul mate</option>
                          <option value="verde_mate">Verde mate</option>
                          <option value="rojo_mate">Rojo mate</option>
                          <option value="custom">{language === 'en' ? 'Custom background' : 'Personalizado'}</option>
                        </select>
                      </div>

                      {calendarEditorDraft?.calendar_background === 'custom' ? (
                        <div className="calendar-style-section">
                          <label className="calendar-style-label" htmlFor="calendar-background-image-input">
                            {language === 'en' ? 'Custom image' : 'Imagen personalizada'}
                          </label>
                          <input
                            id="calendar-background-image-input"
                            type="file"
                            accept="image/*"
                            className="calendar-style-input"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (!file) return

                              const reader = new FileReader()
                              reader.onload = () => {
                                const nextValue = typeof reader.result === 'string' ? reader.result : ''
                                setCalendarEditorDraft((current) => current ? { ...current, calendar_background_image: nextValue } : current)
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                        </div>
                      ) : null}

                      {calendarEditorDraft?.door_style === 'custom' ? (
                        <div className="calendar-style-section">
                          <input
                            id="door-image-input"
                            type="file"
                            accept="image/*"
                            className="calendar-style-input"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (!file) return

                              const reader = new FileReader()
                              reader.onload = () => {
                                const nextValue = typeof reader.result === 'string' ? reader.result : ''
                                setCalendarEditorDraft((current) => current ? { ...current, door_image: nextValue } : current)
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div
                  className="glass-card p-3 day-editor-main-panel"
                  style={getCalendarBackgroundStyle(
                    calendarEditorDraft?.calendar_background,
                    calendarEditorDraft?.calendar_background_image,
                  )}
                >
                  <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                    <h4 className="mb-0">{language === 'en' ? 'Calendar' : 'Calendario'}</h4>
                  </div>

                  <div
                    ref={customLayoutBoardRef}
                    className={`door-slot-grid ${calendarEditorDraft?.theme === 'puzzle' || calendarEditorDraft?.theme === 'mosaic' || calendarEditorDraft?.theme === 'custom' ? 'layout-puzzle' : 'layout-default'}`}
                    style={
                      calendarEditorDraft?.theme === 'puzzle' || calendarEditorDraft?.theme === 'mosaic' || calendarEditorDraft?.theme === 'custom'
                        ? {
                            position: 'relative',
                            minHeight: '420px',
                            overflow: 'hidden',
                          }
                        : undefined
                    }
                  >
                    {Array.from({ length: Math.max(1, calendarEditorDraft?.duration_days ?? 1) }, (_, index) => {
                      const dayNumber = index + 1
                      const existingDay = calendarDays.find((item) => item.day_number === dayNumber)
                      const isPuzzleLayout = calendarEditorDraft?.theme === 'puzzle' || calendarEditorDraft?.theme === 'mosaic'
                      const isCustomLayout = calendarEditorDraft?.theme === 'custom'

                      return (
                        <div
                          key={dayNumber}
                          className={`door-slot ${existingDay ? 'filled' : 'empty'} ${editingDayId === existingDay?.id ? 'active' : ''}`}
                          style={
                            isPuzzleLayout
                              ? getPuzzleDayStyle(dayNumber, calendarEditorDraft?.duration_days ?? 1)
                              : isCustomLayout
                                ? {
                                    ...getCustomLayoutStyle(dayNumber, calendarEditorDraft?.duration_days ?? 1, calendarEditorDraft?.custom_layout),
                                    position: 'absolute',
                                    cursor: 'grab',
                                  }
                                : undefined
                          }
                          onPointerDown={(event) => handleCustomLayoutPointerDown(event, dayNumber, 'move')}
                        >
                          <button type="button" className="door-slot-button" onClick={() => handleSelectDoorSlot(dayNumber, existingDay)}>
                            <span className="door-slot-number">{dayNumber}</span>
                            <span className="door-slot-label">{existingDay ? 'Editado' : 'Vacío'}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}

      {profileModal ? (
        <div className="profile-modal-backdrop" onClick={closeProfileModal}>
          <div className="profile-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="profile-modal-header">
              <div>
                <p className="eyebrow">Perfil</p>
                <h3>{profileModal === 'password' ? 'Cambiar contraseña' : 'Cambiar correo'}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeProfileModal}>Cerrar</button>
            </div>

            {profileModal === 'password' ? (
              <div className="admin-form">
                <label>
                  Contraseña actual
                  <PasswordInput value={profileDraft.currentPassword} onChange={(event) => setProfileDraft({ ...profileDraft, currentPassword: event.target.value })} placeholder="Introduce tu contraseña actual" />
                </label>
                <div className="profile-password-actions">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { void validateCurrentPassword() }}>
                    Comprobar contraseña
                  </button>
                </div>
                {profilePasswordValidated ? (
                  <>
                    <label>
                      Nueva contraseña
                      <PasswordInput value={profileDraft.newPassword} onChange={(event) => setProfileDraft({ ...profileDraft, newPassword: event.target.value })} placeholder="Mínimo 6 caracteres" />
                    </label>
                    <label>
                      Repetir nueva contraseña
                      <PasswordInput value={profileDraft.confirmPassword} onChange={(event) => setProfileDraft({ ...profileDraft, confirmPassword: event.target.value })} placeholder="Repite la nueva contraseña" />
                    </label>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="admin-form">
                <div className="profile-current-email-box">
                  <span>Correo actual</span>
                  <strong>{currentAdminEmail || 'Sin correo guardado'}</strong>
                </div>

                <p className="profile-help-text">
                  Si quieres cambiar la contraseña, usa el apartado de cambiar contraseña. Para cambiar el correo solo necesitas escribir el nuevo correo y guardar.
                </p>

                <label>
                  Nuevo correo
                  <input type="email" value={profileDraft.newEmail} onChange={(event) => setProfileDraft({ ...profileDraft, newEmail: event.target.value })} placeholder={currentAdminEmail || 'nuevo@correo.com'} />
                </label>

                <div className="profile-password-actions">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openProfileModal('password')}>
                    Cambiar contraseña
                  </button>
                </div>
              </div>
            )}

            {profileStatus ? (
              <div className={`alert ${profileStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                {profileStatus.message}
              </div>
            ) : null}

            <div className="profile-modal-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={closeProfileModal}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { void updateAdminProfile() }}
                disabled={profileModal === 'password' && !profilePasswordValidated}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h1>{adminCopy.panel}</h1>
        </div>

        <div className="panel-header-actions">
        <button type="button" className="btn btn-outline-primary btn-sm translate-action" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>
          {adminCopy.translate}
        </button>
          <div className="panel-feedback-actions">
            <button type="button" className="panel-feedback-button suggestion" onClick={() => { setFeedbackModal('suggestion'); setFeedbackStatus(null); }}>
              <MessageSquareText size={14} />
            <span>{adminCopy.suggestion}</span>
            </button>
            <button type="button" className="panel-feedback-button error" onClick={() => { setFeedbackModal('report'); setFeedbackStatus(null); }}>
              <AlertTriangle size={14} />
            <span>{adminCopy.report}</span>
            </button>
          </div>

          <div className="profile-menu-wrapper" data-profile-menu>
            <button type="button" className="profile-menu-button" onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="profile-avatar">{(getDisplayAdminName(currentAdminName).charAt(0) || 'A').toUpperCase()}</span>
              <span className="profile-meta">
                <strong>{getDisplayAdminName(currentAdminName)}</strong>
                <small>{currentAdminEmail || (language === 'en' ? 'Active account' : 'Cuenta activa')}</small>
              </span>
            </button>

            {profileMenuOpen ? (
              <div className="profile-dropdown">
                <button type="button" className="profile-menu-item" onClick={() => openProfileModal('password')}>{adminCopy.changePassword}</button>
                <button type="button" className="profile-menu-item" onClick={() => openProfileModal('email')}>{adminCopy.changeEmail}</button>
                <Link to="/" className="profile-menu-item profile-link" onClick={() => setProfileMenuOpen(false)}>{adminCopy.home}</Link>
                <button type="button" className="profile-menu-item danger" onClick={() => { void handleProfileLogout() }}>{adminCopy.logout}</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dashboard-summary-stack">
        <div className="dashboard-create-row">
          <button type="button" className="btn btn-primary create-calendar-button" onClick={() => setIsCreateCalendarOpen(true)}>
            <span className="create-calendar-button-icon">＋</span>
            <span>{adminCopy.createCalendar}</span>
          </button>

          <div className="dashboard-summary-cards">
            <div className="calendar-total-count">
              <span className="calendar-total-count-label">{adminCopy.total}</span>
              <strong>{totalCalendarsLabel}</strong>
            </div>
            <div className="calendar-total-count soft">
              <span className="calendar-total-count-label">{adminCopy.published}</span>
              <strong>{publishedCalendarsCount}</strong>
            </div>
            <div className="calendar-total-count soft">
              <span className="calendar-total-count-label">{adminCopy.draft}</span>
              <strong>{draftCalendarsCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {feedbackStatus ? (
        <div className={`alert ${feedbackStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedbackStatus.message}
        </div>
      ) : null}

      <div className="dashboard-list-heading">{adminCopy.myCalendars}</div>

      {isCreateCalendarOpen ? (
        <div className="calendar-create-modal-backdrop" onClick={() => setIsCreateCalendarOpen(false)}>
          <div className="calendar-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <p className="eyebrow">{adminCopy.newCalendar}</p>
                <h3>{adminCopy.newCalendarTitle}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setIsCreateCalendarOpen(false)}>{adminCopy.close}</button>
            </div>

            <form onSubmit={handleCreateCalendar} className="admin-form create-calendar-form">
              <div className="field-grid">
                <label>
                  {adminCopy.calendarName}
                  <input value={newCalendar.name} onChange={(event) => setNewCalendar({ ...newCalendar, name: event.target.value })} placeholder={language === 'en' ? 'Ex: Christmas Calendar' : 'Ej: Calendario de Navidad'} />
                </label>
                <label className="slug-field">
                  <span className="label-with-info">
                    <span>{adminCopy.browserPath}</span>
                    <button type="button" className="inline-info-button" aria-label={language === 'en' ? 'About slug' : 'Sobre el slug'} title={language === 'en' ? 'The slug is the browser path for your calendar, such as /calendar/christmas' : 'El slug es la ruta del navegador del calendario, por ejemplo /calendar/navidad'} onClick={() => setCreateInfoModal('slug')}>
                      <Info size={15} />
                    </button>
                  </span>
                  <input value={newCalendar.slug} onChange={(event) => setNewCalendar({ ...newCalendar, slug: event.target.value })} placeholder={language === 'en' ? 'ex: christmas-calendar' : 'ej: calendario-navidad'} />
                </label>
              </div>

              <label>
                <span className="label-with-info">
                  <span>{adminCopy.accessCode}</span>
                  <button type="button" className="inline-info-button" aria-label={language === 'en' ? 'About access' : 'Sobre el acceso'} title={adminCopy.accessCodeHelper} onClick={() => setCreateInfoModal('access')}>
                    <Info size={15} />
                  </button>
                </span>
                <div className="create-calendar-access-row">
                  <div className="create-calendar-access-input">
                  <PasswordInput
                    value={newCalendar.password}
                    onChange={(event) => setNewCalendar({ ...newCalendar, password: event.target.value })}
                    placeholder={language === 'en' ? 'Ex: ADV-ABCD1234' : 'Ej: ADV-ABCD1234'}
                  />
                  </div>
                  <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary create-calendar-generate-button"
                  onClick={() => setNewCalendar({ ...newCalendar, password: generateAccessCode() })}
                  >
                  {adminCopy.generate}
                  </button>
                </div>
                <small className="form-help-text">{adminCopy.accessCodeHelper}</small>
              </label>

              <div className="field-grid">
                <label>
                  <span className="label-stack">
                    <span>{adminCopy.duration}</span>
                    <span className="quick-duration-group">
                      {[7, 14, 24, 31].map((days) => (
                        <button
                          key={days}
                          type="button"
                          className={`quick-duration-button ${newCalendar.duration_days === days ? 'active' : ''}`}
                          onClick={() => setNewCalendar({ ...newCalendar, duration_days: days })}
                        >
                          {days}
                        </button>
                      ))}
                    </span>
                    <small className="form-help-text">
                      {language === 'en' ? 'Choose how many days you want.' : 'Escoge a tu manera los días que quieres elegir.'}
                    </small>
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={newCalendar.duration_days}
                    onChange={(event) => setNewCalendar({ ...newCalendar, duration_days: Number(event.target.value) })}
                  />
                </label>
                <label>
                  {adminCopy.shortDescription}
                  <input value={newCalendar.description} onChange={(event) => setNewCalendar({ ...newCalendar, description: event.target.value })} placeholder={language === 'en' ? 'A surprise to share' : 'Una sorpresa para compartir'} />
                </label>
              </div>

              {error ? <div className="alert alert-danger">{error}</div> : null}

              <div className="calendar-create-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setIsCreateCalendarOpen(false)}>{adminCopy.cancel}</button>
                <button type="submit" className="btn btn-primary create-calendar-submit-button">{adminCopy.newCalendarTitle}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {createInfoModal ? (
        <div className="calendar-create-modal-backdrop" onClick={() => setCreateInfoModal(null)}>
          <div className="modal-card compact-help-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row compact-header">
              <div>
                <p className="eyebrow">{language === 'en' ? 'Info' : 'Información'}</p>
                <h3>{createInfoModal === 'slug' ? (language === 'en' ? 'What is the slug?' : '¿Qué es el slug?') : (language === 'en' ? 'Access settings' : 'Configuración de acceso')}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCreateInfoModal(null)}>{adminCopy.close}</button>
            </div>

            <p className="help-modal-copy">
              {createInfoModal === 'slug'
                ? (language === 'en'
                  ? 'The slug is the public URL segment that identifies your calendar. Example: /calendar/christmas-calendar. It should be short, memorable and easy to share.'
                  : 'El slug es el fragmento de la URL pública que identifica tu calendario. Ejemplo: /calendar/calendario-navidad. Debe ser corto, fácil de recordar y compartir.')
                : (language === 'en'
                  ? 'The access code and password are the same concept: they protect entry to the calendar. If you turn on “public without code”, the calendar will be visible without requiring a code, but it is still controlled by the same public access logic.'
                  : 'El código de acceso y la contraseña son lo mismo: protegen la entrada al calendario. Si activas “público sin código”, el calendario será visible sin pedir un código, aunque sigue controlado por la misma lógica de acceso público.')}
            </p>
          </div>
        </div>
      ) : null}

      {dayHelpModal ? (
        <div className="calendar-create-modal-backdrop" onClick={() => setDayHelpModal(false)}>
          <div className="modal-card compact-help-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row compact-header">
              <div>
                <p className="eyebrow">Información</p>
                <h3>Editar días</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDayHelpModal(false)}>Cerrar</button>
            </div>

            <p className="help-modal-copy">
              Puedes ajustar el número de días con la rueda del ratón o con las flechas del campo, o escribirlo directamente si prefieres. Así puedes elegir un valor exacto como 7, 14, 24 o 31 días.
            </p>
          </div>
        </div>
      ) : null}

      {feedbackModal ? (
        <div className="calendar-create-modal-backdrop" onClick={() => setFeedbackModal(null)}>
          <div className="calendar-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <p className="eyebrow">{adminCopy.contact}</p>
                <h3>{feedbackModal === 'suggestion' ? adminCopy.suggestion : adminCopy.report}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFeedbackModal(null)}>{adminCopy.close}</button>
            </div>

            <div className="admin-form">
              <label>
                {adminCopy.title}
                <input value={feedbackDraft.title} onChange={(event) => setFeedbackDraft({ ...feedbackDraft, title: event.target.value })} placeholder={feedbackModal === 'suggestion' ? (language === 'en' ? 'Ex: Improve the editing view' : 'Ej: Mejorar la vista de edición') : (language === 'en' ? 'Ex: Error opening a calendar' : 'Ej: Error al abrir un calendario')} />
              </label>

              <label>
                {adminCopy.description}
                <textarea value={feedbackDraft.description} onChange={(event) => setFeedbackDraft({ ...feedbackDraft, description: event.target.value })} placeholder={language === 'en' ? 'Explain in detail what happened, what you expected, and how to reproduce it.' : 'Explica detalladamente lo que ocurre, qué esperabas y cómo reproducirlo.'} />
              </label>

              <label>
                {adminCopy.imageOptional}
                <input type="file" accept="image/*" onChange={handleFeedbackImage} />
              </label>

              {feedbackDraft.imageName ? (
                <div className="profile-current-email-box">
                  <span>{adminCopy.attachedFile}</span>
                  <strong>{feedbackDraft.imageName}</strong>
                </div>
              ) : null}

              {feedbackStatus ? (
                <div className={`alert ${feedbackStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                  {feedbackStatus.message}
                </div>
              ) : null}

              <div className="calendar-create-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setFeedbackModal(null)} disabled={isSubmittingFeedback}>{adminCopy.cancel}</button>
                <button type="button" className="btn btn-primary" onClick={() => { void submitFeedback() }} disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? adminCopy.sending : adminCopy.sendAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDoorEditorModalOpen ? (
        <div className="calendar-create-modal-backdrop" onClick={resetDayDraft}>
          <div className="calendar-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <p className="eyebrow">Puerta</p>
                <h3>{editingDayId !== null ? 'Editar puerta' : 'Crear puerta'}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetDayDraft}>Cerrar</button>
            </div>

            <form onSubmit={handleCreateDay} className="admin-form compact-form">
              <label>
                Día
                <input type="number" min={1} max={Math.max(1, calendarEditorDraft?.duration_days ?? 31)} value={dayDraft.day_number} onChange={(event) => setDayDraft({ ...dayDraft, day_number: Number(event.target.value) })} />
              </label>
              <label>
                Título
                <input value={dayDraft.title} onChange={(event) => setDayDraft({ ...dayDraft, title: event.target.value })} />
              </label>
              <label>
                Mensaje principal
                <textarea value={dayDraft.content} onChange={(event) => setDayDraft({ ...dayDraft, content: event.target.value })} />
              </label>
              <div className="field-grid">
                <label>
                  Mensaje extra
                  <input value={dayDraft.message} onChange={(event) => setDayDraft({ ...dayDraft, message: event.target.value })} />
                </label>
                <label>
                  Frase / detalle
                  <input value={dayDraft.quote} onChange={(event) => setDayDraft({ ...dayDraft, quote: event.target.value })} />
                </label>
                <label>
                  Juego
                  <input value={dayDraft.game} onChange={(event) => setDayDraft({ ...dayDraft, game: event.target.value })} />
                </label>
                <label>
                  Descripción del juego
                  <input value={dayDraft.game_description} onChange={(event) => setDayDraft({ ...dayDraft, game_description: event.target.value })} />
                </label>
                <label>
                  Canción
                  <input value={dayDraft.song_title} onChange={(event) => setDayDraft({ ...dayDraft, song_title: event.target.value })} />
                </label>
                <label>
                  Artista / playlist
                  <input value={dayDraft.song_artist} onChange={(event) => setDayDraft({ ...dayDraft, song_artist: event.target.value })} />
                </label>
                <label>
                  Enlace multimedia
                  <input value={dayDraft.media_url} onChange={(event) => setDayDraft({ ...dayDraft, media_url: event.target.value })} />
                </label>
                <label>
                  Estado emocional
                  <input value={dayDraft.mood} onChange={(event) => setDayDraft({ ...dayDraft, mood: event.target.value })} />
                </label>
              </div>
              <label>
                Notas del día
                <textarea value={dayDraft.notes} onChange={(event) => setDayDraft({ ...dayDraft, notes: event.target.value })} />
              </label>
              <label>
                Tipo
                <select value={dayDraft.content_type} onChange={(event) => setDayDraft({ ...dayDraft, content_type: event.target.value })}>
                  <option value="message">Mensaje</option>
                  <option value="image">Imagen</option>
                  <option value="video">Video</option>
                  <option value="activity">Actividad</option>
                </select>
              </label>
              <label>
                Fecha de desbloqueo
                <input type="date" value={dayDraft.unlock_date} onChange={(event) => setDayDraft({ ...dayDraft, unlock_date: event.target.value })} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={dayDraft.is_unlocked_by_admin} onChange={(event) => setDayDraft({ ...dayDraft, is_unlocked_by_admin: event.target.checked })} />
                Desbloquear manualmente
              </label>

              <div className="calendar-create-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={resetDayDraft}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingDayId !== null ? 'Guardar puerta' : 'Añadir puerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {shareCalendar ? (
        <div className="calendar-create-modal-backdrop" onClick={closeShareCalendarModal}>
          <div className="calendar-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <p className="eyebrow">Calendario</p>
                <h3>Enviar {shareCalendar.name}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeShareCalendarModal}>Cerrar</button>
            </div>

            <div className="admin-form">
              <label>
                Nombre
                <input value={shareDraft.name} onChange={(event) => setShareDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej: Marcos" />
              </label>

              <label>
                Texto descriptivo
                <textarea value={shareDraft.text} onChange={(event) => setShareDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Hola, este es un regalo para ti." />
              </label>

              <div className="share-field">
                <label>Enlace del calendario</label>
                <div className="share-row">
                  <input value={`${window.location.origin}/calendar/${shareCalendar.slug}`} readOnly />
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { void copyToClipboard(`${window.location.origin}/calendar/${shareCalendar.slug}`) }}>Copiar</button>
                </div>
              </div>

              <div className="share-field">
                <label>Mensaje listo para enviar</label>
                <textarea
                  readOnly
                  value={`${shareDraft.name ? `Hola, ${shareDraft.name}` : 'Hola'}\n\n${shareDraft.text.trim() || 'Este es un regalo para ti.'}\n\n${window.location.origin}/calendar/${shareCalendar.slug}`}
                />
              </div>
            </div>

            <div className="calendar-create-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={closeShareCalendarModal}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={() => { void copyShareMessage() }}>Copiar mensaje</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="dashboard-section-title">{adminCopy.existing}</div>

      <div className="row g-4">

        <div className="col-lg-12">
          <div className="d-flex flex-column gap-4">
            <div className="glass-card p-4">
              <div className="calendar-carousel-header">
                {calendars.length > 1 ? (
                  <div className="calendar-carousel-nav">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCalendarCarouselIndex((current) => (current === 0 ? calendars.length - 1 : current - 1))} aria-label={language === 'en' ? 'Previous calendar' : 'Calendario anterior'}>{language === 'en' ? 'Previous' : 'Anterior'}</button>
                    <span>{calendarCarouselIndex + 1} / {calendars.length}</span>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCalendarCarouselIndex((current) => (current + 1) % calendars.length)} aria-label={language === 'en' ? 'Next calendar' : 'Siguiente calendario'}>{language === 'en' ? 'Next' : 'Siguiente'}</button>
                  </div>
                ) : null}
              </div>

              {calendars.length === 0 ? (
                  <p className="text-muted">{adminCopy.noCalendars}</p>
              ) : displayedCalendar ? (
                <div className="calendar-item selected dashboard-carousel-item">
                  <div className="calendar-card-header">
                    <div className="calendar-card-copy">
                      <div className="calendar-meta-row">
                        <span className={`calendar-meta ${displayedCalendar.is_published ? 'published' : 'draft'}`}>
                          {displayedCalendar.is_published ? 'Publicado' : 'Borrador'}
                        </span>
                        {isDefaultTemplateCalendar(displayedCalendar) ? (
                          <span className="calendar-tag template-tag">Plantilla por defecto</span>
                        ) : null}
                      </div>
                      <h4>{displayedCalendar.name}</h4>
                    </div>

                    <div className="calendar-card-menu" data-calendar-menu>
                      <button
                        type="button"
                        className="calendar-more-button"
                        aria-label={language === 'en' ? 'More options' : 'Más opciones'}
                        onClick={() => setCalendarMenuOpenId((current) => current === displayedCalendar.id ? null : displayedCalendar.id)}
                      >
                        ⋯
                      </button>

                      {calendarMenuOpenId === displayedCalendar.id ? (
                        <div className="calendar-menu-popover">
                          <button type="button" onClick={() => navigate(`/admin/calendario/${displayedCalendar.id}`)}>{adminCopy.view}</button>
                          <button type="button" onClick={() => { void handleTogglePublish(displayedCalendar.id, displayedCalendar.is_published) }}>
                            {displayedCalendar.is_published ? adminCopy.hide : adminCopy.publish}
                          </button>
                          <button type="button" onClick={() => { void handleExport(displayedCalendar.id) }}>{adminCopy.export}</button>
                          <label className="calendar-menu-import">
                            {adminCopy.import}
                            <input type="file" accept="application/json" onChange={(event) => { void handleImport(displayedCalendar.id, event.target.files?.[0] ?? null) }} />
                          </label>
                          <button type="button" onClick={() => handleDuplicate(displayedCalendar.id)}>{adminCopy.duplicate}</button>
                          <button type="button" className="danger" onClick={() => handleDelete(displayedCalendar.id)}>{adminCopy.delete}</button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="calendar-card-meta">
                    <p>{displayedCalendar.description || (language === 'en' ? 'No description' : 'Sin descripción')}</p>
                    <small>{displayedCalendar.slug} · {displayedCalendar.duration_days} {language === 'en' ? 'days' : 'días'}</small>
                    <div className="calendar-card-extra-info">
                      <span className={`calendar-status-badge ${displayedCalendar.is_published ? 'published' : 'draft'}`}>
                        {displayedCalendar.is_published ? adminCopy.published : adminCopy.draft}
                      </span>
                      <span className="calendar-theme-badge">{language === 'en' ? 'Theme:' : 'Tema:'} {displayedCalendar.theme || (language === 'en' ? 'romantic' : 'romántico')}</span>
                    </div>
                  </div>

                  <div className="calendar-card-actions">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/admin/calendario/${displayedCalendar.id}`)}>{adminCopy.view}</button>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { void openCalendarEditor(displayedCalendar) }}>{adminCopy.edit}</button>
                    <button type="button" className="btn btn-sm btn-primary send-button" onClick={() => openShareCalendarModal(displayedCalendar)} title={adminCopy.send}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              {calendars.length > 1 ? (
                <div className="calendar-mini-list-wrap">
                  {calendars.length > 10 ? (
                    <div className="calendar-mini-pagination">
                      <button
                        type="button"
                        className="calendar-mini-page-button"
                        onClick={() => setCalendarPage((current) => Math.max(0, current - 1))}
                        disabled={calendarPage === 0}
                        aria-label={language === 'en' ? 'Previous calendars' : 'Calendarios anteriores'}
                      >
                        ‹
                      </button>
                      <span className="calendar-mini-page-indicator">{calendarPage + 1}/{totalCalendarPages}</span>
                      <button
                        type="button"
                        className="calendar-mini-page-button"
                        onClick={() => setCalendarPage((current) => Math.min(totalCalendarPages - 1, current + 1))}
                        disabled={calendarPage >= totalCalendarPages - 1}
                        aria-label={language === 'en' ? 'Next calendars' : 'Calendarios siguientes'}
                      >
                        ›
                      </button>
                    </div>
                  ) : null}

                  <div className={`calendar-mini-list ${calendars.length > 5 ? 'calendar-mini-list-compact' : ''}`}>
                    {visibleCalendarPage.map((calendar, index) => {
                      const globalIndex = calendarPage * pageSize + index
                      return (
                        <button
                          type="button"
                          key={calendar.id}
                          className={`calendar-mini-card ${calendarCarouselIndex === globalIndex ? 'active' : ''}`}
                          onClick={() => {
                            setCalendarCarouselIndex(globalIndex)
                            setSelectedCalendarId(calendar.id)
                            void loadCalendarDetails(calendar.id)
                          }}
                        >
                          <span>{globalIndex + 1}</span>
                          <strong>{calendar.name}</strong>
                          {isDefaultTemplateCalendar(calendar) ? <em className="calendar-mini-tag">Demo</em> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function AdminCalendarDetailPage({ language }: { language: 'es' | 'en' }) {
  const { calendarId } = useParams<{ calendarId: string }>()
  const [calendar, setCalendar] = useState<CalendarSummary | null>(null)
  const [days, setDays] = useState<CalendarDay[]>([])
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const copy = language === 'en'
    ? {
        calendar: 'Calendar',
        invalid: 'Invalid calendar',
        failedOpen: 'Could not open the calendar',
        backToPanel: 'Back to panel',
        loading: 'Loading calendar…',
        calendarView: 'Calendar view with content',
        noDescription: 'No description',
        published: 'Published',
        draft: 'Draft',
        defaultTemplate: 'Default template',
        locked: 'Locked',
        day: 'Day',
        close: 'Close',
        unavailable: 'This content is not available yet.',
        extraMessage: 'Extra message',
        game: 'Game',
        song: 'Song',
        notes: 'Notes',
        link: 'Link',
        viewDetail: 'View detail',
      }
    : {
        calendar: 'Calendario',
        invalid: 'Calendario no válido',
        failedOpen: 'No se pudo abrir',
        backToPanel: 'Volver al panel',
        loading: 'Cargando calendario…',
        calendarView: 'Vista de calendario con contenidos',
        noDescription: 'Sin descripción',
        published: 'Publicado',
        draft: 'Borrador',
        defaultTemplate: 'Plantilla por defecto',
        locked: 'Bloqueado',
        day: 'Día',
        close: 'Cerrar',
        unavailable: 'Este contenido aún no está disponible.',
        extraMessage: 'Mensaje extra',
        game: 'Juego',
        song: 'Canción',
        notes: 'Notas',
        link: 'Enlace',
        viewDetail: 'Ver detalle',
      }

  useEffect(() => {
    const fetchCalendar = async () => {
      if (!calendarId) return

      setIsLoading(true)

      try {
        const id = Number(calendarId)
        if (!Number.isFinite(id)) {
          setError(copy.invalid)
          return
        }

        const [nextCalendar, nextDays] = await Promise.all([
          request<CalendarSummary>(`${API_BASE}/api/calendars/${id}`),
          request<CalendarDay[]>(`${API_BASE}/api/calendars/${id}/days`),
        ])

        setCalendar(nextCalendar)
        setDays(nextDays)
        setSelectedDay(null)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchCalendar()
  }, [calendarId, copy.invalid])

  const backgroundStyle = getCalendarBackgroundStyle(calendar?.calendar_background, calendar?.calendar_background_image)

  if (isLoading) {
    return <RouteLoadingScreen language={language} />
  }

  if (error) {
    return (
      <div className="calendar-public-shell">
        <div className="calendar-public-card text-center">
          <p className="eyebrow">{copy.calendar}</p>
          <h1>{copy.failedOpen}</h1>
          <p>{error}</p>
          <Link to="/admin" className="btn btn-primary">{copy.backToPanel}</Link>
        </div>
      </div>
    )
  }

  if (!calendar) {
    return (
      <div className="calendar-public-shell">
        <div className="calendar-public-card"><p>{copy.loading}</p></div>
      </div>
    )
  }

  return (
    <div className="calendar-public-shell">
      <div className="calendar-public-card" style={backgroundStyle}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div>
            <p className="eyebrow">{copy.calendarView}</p>
            <h1>{calendar.name}</h1>
            <p>{calendar.description || copy.noDescription}</p>
          </div>
          <Link to="/admin" className="btn btn-outline-primary">{copy.backToPanel}</Link>
        </div>

        <div className="calendar-meta-row mb-3">
          <span className="calendar-meta">{calendar.is_published ? copy.published : copy.draft}</span>
          {isDefaultTemplateCalendar(calendar) ? (
            <span className="calendar-tag template-tag">{copy.defaultTemplate}</span>
          ) : null}
        </div>

        <div className="doors-grid">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              className={`door-card ${day.content ? 'unlocked' : 'locked'}`}
              onClick={() => day.content && setSelectedDay(day)}
            >
              <span>{day.day_number}</span>
              <small>{day.content ? day.title : copy.locked}</small>
            </button>
          ))}
        </div>

        {selectedDay ? (
          <div className="door-detail">
            <div className="door-detail-header">
              <div>
                <p className="eyebrow">{copy.day} {selectedDay.day_number}</p>
                <h3>{selectedDay.title}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedDay(null)}>{copy.close}</button>
            </div>

            <div className="door-content-stack">
              <p className="door-message">{selectedDay.content || copy.unavailable}</p>

              {getMetadataValue(selectedDay.metadata, 'message') ? (
                <div className="day-meta-block">
                  <strong>{copy.extraMessage}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'message')}</p>
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'quote') ? (
                <blockquote className="day-quote">“{getMetadataValue(selectedDay.metadata, 'quote')}”</blockquote>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'game') || getMetadataValue(selectedDay.metadata, 'game_description') ? (
                <div className="day-meta-block">
                  <strong>{copy.game}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'game')}</p>
                  {getMetadataValue(selectedDay.metadata, 'game_description') ? (
                    <small>{getMetadataValue(selectedDay.metadata, 'game_description')}</small>
                  ) : null}
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'song_title') || getMetadataValue(selectedDay.metadata, 'song_artist') ? (
                <div className="day-meta-block">
                  <strong>{copy.song}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'song_title')}</p>
                  {getMetadataValue(selectedDay.metadata, 'song_artist') ? (
                    <small>{getMetadataValue(selectedDay.metadata, 'song_artist')}</small>
                  ) : null}
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'notes') ? (
                <div className="day-meta-block">
                  <strong>{copy.notes}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'notes')}</p>
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'media_url') ? (
                <div className="day-meta-block">
                  <strong>{copy.link}</strong>
                  <a href={getMetadataValue(selectedDay.metadata, 'media_url')} target="_blank" rel="noreferrer">
                    {copy.viewDetail}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PublicCalendarPage({ language }: { language: 'es' | 'en' }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [calendar, setCalendar] = useState<PublicCalendar | null>(null)
  const [days, setDays] = useState<PublicDay[]>([])
  const [selectedDay, setSelectedDay] = useState<PublicDay | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const copy = language === 'en'
    ? {
        day: 'Day',
        close: 'Close',
        unavailable: 'This content is not available yet.',
        locked: 'Locked',
        extraMessage: 'Extra message',
        game: 'Game',
        song: 'Song',
        notes: 'Notes',
        link: 'Link',
        viewDetail: 'View detail',
        incorrectPassword: 'Incorrect password',
      }
    : {
        day: 'Día',
        close: 'Cerrar',
        unavailable: 'Este contenido aún no está disponible.',
        locked: 'Bloqueado',
        extraMessage: 'Mensaje extra',
        game: 'Juego',
        song: 'Canción',
        notes: 'Notas',
        link: 'Enlace',
        viewDetail: 'Ver detalle',
        incorrectPassword: 'Contraseña incorrecta',
      }

  const backgroundStyle = getCalendarBackgroundStyle(calendar?.calendar_background, calendar?.calendar_background_image)

  const doorsGridClassName = getCalendarLayoutClassName(calendar?.theme ?? 'puzzle')

  const doorStyle = calendar?.door_style === 'custom' && calendar.door_image
    ? { backgroundImage: `url(${calendar.door_image})`, backgroundSize: 'cover', backgroundPosition: 'center', color: '#fff' }
    : calendar?.door_style === 'gold'
      ? { background: 'linear-gradient(135deg, #8a6500 0%, #d6b14d 100%)' }
      : calendar?.door_style === 'ribbon'
        ? { background: 'linear-gradient(135deg, #9a2c52 0%, #d17d9e 100%)' }
        : { background: 'linear-gradient(135deg, #7a1d39 0%, #a44a52 100%)' }

  const getPublicDoorStyle = (day: PublicDay) => {
    const isFilled = Boolean(day.content)

    if (!isFilled) {
      return {
        background: 'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(248, 228, 233, 0.9))',
        color: '#7a1d39',
        border: '1px solid rgba(122, 29, 57, 0.14)',
        ...(calendar?.theme === 'puzzle' || calendar?.theme === 'mosaic' ? getPuzzleDayStyle(day.day_number, calendar?.duration_days ?? 1) : {}),
      }
    }

    return {
      ...doorStyle,
      ...(calendar?.theme === 'puzzle' || calendar?.theme === 'mosaic' ? getPuzzleDayStyle(day.day_number, calendar?.duration_days ?? 1) : {}),
    }
  }

  const handleBackFromPublicCalendar = () => {
    const routeState = location.state as {
      fromEditor?: boolean;
      calendarId?: number;
      returnToEditor?: boolean;
      returnToRoute?: string;
    } | null

    const editorCalendarId = routeState?.calendarId ?? (
      calendar && typeof calendar.id === 'number' ? calendar.id : null
    )
    const defaultRoute = routeState?.fromEditor || routeState?.returnToEditor ? '/admin' : '/'
    const targetRoute = routeState?.returnToRoute ?? defaultRoute

    if (routeState?.fromEditor || routeState?.returnToEditor) {
      if (editorCalendarId && targetRoute === '/admin') {
        navigate('/admin', {
          replace: true,
          state: {
            returnToEditor: true,
            calendarId: editorCalendarId,
          },
        })
        return
      }

      if (editorCalendarId && targetRoute !== '/admin') {
        navigate(targetRoute, {
          replace: true,
          state: {
            returnToEditor: true,
            calendarId: editorCalendarId,
          },
        })
        return
      }

      navigate('/admin', { replace: true })
      return
    }

    if (editorCalendarId) {
      navigate(targetRoute, {
        replace: true,
        state: {
          returnToEditor: true,
          calendarId: editorCalendarId,
        },
      })
      return
    }

    navigate('/', { replace: true })
  }

  const musicSrc = calendar?.background_music === 'custom'
    ? calendar.background_music_url
    : calendar?.background_music && calendar.background_music !== 'none'
      ? MUSIC_PRESETS[calendar.background_music as 'classic' | 'cozy' | 'lofi']
      : ''

  const fetchCalendar = async () => {
    if (!slug) return
    setIsLoading(true)
    setNotFound(false)
    try {
      const nextCalendar = await request<PublicCalendar>(`${API_BASE}/api/public/calendars/${slug}`)
      const nextDays = await request<PublicDay[]>(`${API_BASE}/api/public/calendars/${slug}/days`)
      setCalendar(nextCalendar)
      setDays(nextDays)
      setLocked(false)
      setSelectedDay(null)
      setError('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el calendario'
      const isAccessBlocked = /403|No tienes acceso|no está publicado|Acceso protegido|Contraseña incorrecta|Introduce la contraseña/i.test(message)
      const isMissingCalendar = /404|Calendario no encontrado|no existe|not found|No se encontró|no está disponible/i.test(message)

      if (isAccessBlocked) {
        navigate('/calendar/access', { replace: true, state: { slug } })
        return
      }

      if (isMissingCalendar) {
        setNotFound(true)
        setError(message)
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchCalendar()
  }, [slug])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!slug) return
    try {
      await request<{ message: string }>(`${API_BASE}/api/auth/calendar/${slug}/login`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      setError('')
      setLocked(false)
      await fetchCalendar()
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.incorrectPassword)
    }
  }

  if (isLoading) {
    return <RouteLoadingScreen language={language} />
  }

  if (notFound) {
    return (
      <div className="calendar-public-shell">
        <div className="calendar-public-card text-center">
          <p className="eyebrow">{language === 'en' ? 'Calendar not found' : 'Calendario no encontrado'}</p>
          <h1>{language === 'en' ? 'This calendar does not exist' : 'Este calendario no existe'}</h1>
          <p>
            {language === 'en'
              ? 'Please go back home and let the person who sent it know there may have been an error.'
              : 'Pulsa para ir a inicio y avisa a la persona que te lo ha enviado si ha habido un error.'}
          </p>
          <Link to="/" className="btn btn-primary">{language === 'en' ? 'Go home' : 'Ir a inicio'}</Link>
          {error ? <div className="alert alert-danger mt-3">{error}</div> : null}
        </div>
      </div>
    )
  }

  if (locked) {
    return (
      <div className="calendar-public-shell">
        <div className="calendar-public-card text-center">
          <p className="eyebrow">{language === 'en' ? 'Protected access' : 'Acceso protegido'}</p>
          <h1>{slug}</h1>
          <p>{language === 'en' ? 'Enter the password to open this calendar.' : 'Introduce la contraseña para abrir este calendario.'}</p>
          <form onSubmit={handleLogin} className="password-form">
            <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder={language === 'en' ? 'Password' : 'Contraseña'} language={language} />
            {error ? <div className="alert alert-danger">{error}</div> : null}
            <button type="submit" className="btn btn-primary">{language === 'en' ? 'Enter' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    )
  }

  if (!calendar && !error) {
    return <div className="calendar-public-shell"><div className="calendar-public-card"><p>{language === 'en' ? 'Loading calendar…' : 'Cargando calendario…'}</p></div></div>
  }

  return (
    <div className="calendar-public-shell">
      {musicSrc ? <audio autoPlay loop src={musicSrc} /> : null}
      <div className="calendar-public-card" style={backgroundStyle}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div>
            <p className="eyebrow">{language === 'en' ? `Calendar: ${calendar?.name ?? 'Advent'}` : `Calendario de ${calendar?.name ?? 'Advent'}`}</p>
            <h1>{calendar?.description || (language === 'en' ? 'A December full of small details' : 'Un diciembre lleno de pequeños detalles')}</h1>
          </div>
          <button type="button" className="btn btn-outline-primary" onClick={handleBackFromPublicCalendar}>
            {location.state && (location.state as { fromEditor?: boolean }).fromEditor
              ? (language === 'en' ? 'Back to editor' : 'Volver al editor')
              : (language === 'en' ? 'Back' : 'Volver')}
          </button>
        </div>

        <div className={calendar?.theme === 'puzzle' || calendar?.theme === 'mosaic' || calendar?.theme === 'custom' ? 'door-slot-grid layout-puzzle' : `doors-grid ${doorsGridClassName}`}>
          {days.map((day) => {
            const isPuzzleLayout = calendar?.theme === 'puzzle' || calendar?.theme === 'mosaic'
            const isCustomLayout = calendar?.theme === 'custom'

            if (isPuzzleLayout || isCustomLayout) {
              return (
                <div
                  key={day.id}
                  className={`door-slot ${day.content ? 'filled' : 'empty'}`}
                  style={
                    isCustomLayout
                      ? {
                          ...getPublicDoorStyle(day),
                          ...getCustomLayoutStyle(day.day_number, calendar?.duration_days ?? 1, calendar?.custom_layout ?? undefined),
                          position: 'relative',
                          ...getMosaicScaleStyle(calendar?.mosaic_scale),
                        }
                      : getPublicDoorStyle(day)
                  }
                >
                  <button type="button" className="door-slot-button" onClick={() => day.content && setSelectedDay(day)}>
                    <span className="door-slot-number">{day.day_number}</span>
                    <span className="door-slot-label">{day.content ? day.title : copy.locked}</span>
                  </button>
                </div>
              )
            }

            return (
              <button
                key={day.id}
                type="button"
                className={`door-card ${day.content ? 'unlocked' : 'locked'}`}
                style={getPublicDoorStyle(day)}
                onClick={() => day.content && setSelectedDay(day)}
              >
                <span>{day.day_number}</span>
                <small>{day.content ? day.title : copy.locked}</small>
              </button>
            )
          })}
        </div>

        {selectedDay ? (
          <div className="door-detail">
            <div className="door-detail-header">
              <div>
                <p className="eyebrow">{copy.day} {selectedDay.day_number}</p>
                <h3>{selectedDay.title}</h3>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedDay(null)}>{copy.close}</button>
            </div>

            <div className="door-content-stack">
              <p className="door-message">{selectedDay.content || copy.unavailable}</p>

              {getMetadataValue(selectedDay.metadata, 'message') ? (
                <div className="day-meta-block">
                  <strong>{copy.extraMessage}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'message')}</p>
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'quote') ? (
                <blockquote className="day-quote">“{getMetadataValue(selectedDay.metadata, 'quote')}”</blockquote>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'game') || getMetadataValue(selectedDay.metadata, 'game_description') ? (
                <div className="day-meta-block">
                  <strong>{copy.game}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'game')}</p>
                  {getMetadataValue(selectedDay.metadata, 'game_description') ? (
                    <small>{getMetadataValue(selectedDay.metadata, 'game_description')}</small>
                  ) : null}
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'song_title') || getMetadataValue(selectedDay.metadata, 'song_artist') ? (
                <div className="day-meta-block">
                  <strong>{copy.song}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'song_title')}</p>
                  {getMetadataValue(selectedDay.metadata, 'song_artist') ? (
                    <small>{getMetadataValue(selectedDay.metadata, 'song_artist')}</small>
                  ) : null}
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'notes') ? (
                <div className="day-meta-block">
                  <strong>{copy.notes}</strong>
                  <p>{getMetadataValue(selectedDay.metadata, 'notes')}</p>
                </div>
              ) : null}

              {getMetadataValue(selectedDay.metadata, 'media_url') ? (
                <div className="day-meta-block">
                  <strong>{copy.link}</strong>
                  <a href={getMetadataValue(selectedDay.metadata, 'media_url')} target="_blank" rel="noreferrer">
                    {copy.viewDetail}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function App() {
  //const location = useLocation()
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  return (
    <Routes>
      <Route path="/" element={<HomePage language={language} setLanguage={setLanguage} />} />
      <Route path="/admin" element={<AdminPage language={language} setLanguage={setLanguage} />} />
      <Route path="/admin/calendario/:calendarId" element={<AdminCalendarDetailPage language={language} />} />
      <Route path="/calendar" element={<Navigate to="/calendar/access" replace />} />
      <Route path="/calendar/access" element={<CalendarAccessPage language={language} />} />
      <Route path="/calendar/demo-ejemplo-publica" element={<PublicCalendarPage language={language} />} />
      <Route path="/calendar/demo-publica" element={<Navigate to="/calendar/demo-ejemplo-publica" replace />} />
      <Route path="/calendar/:slug" element={<PublicCalendarPage language={language} />} />
    </Routes>
  )
}
