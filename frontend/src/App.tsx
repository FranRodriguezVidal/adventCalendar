import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CalendarDays, CalendarHeart, Eye, EyeOff, Info, Link2, Lock, Mail, MessageSquareText, Pencil, Send, ShieldCheck, Sparkles, Unlock } from 'lucide-react'

type CalendarSummary = {
  id: number
  name: string
  slug: string
  description: string | null
  theme: string
  duration_days: number
  is_published: boolean
  is_demo: boolean
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

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8001'

const generateAccessCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const chars = Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)])
  return `ADV-${chars.join('')}`
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
        actions: { panel: 'Dashboard', publicDemo: 'Public demo', myCalendar: 'My calendar' },
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
        actions: { panel: 'Panel', publicDemo: 'Demo pública', myCalendar: 'Mi calendario' },
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
            <Link to="/calendar" className="btn btn-outline-primary btn-lg">{copy.actions.publicDemo}</Link>
            <Link to="/calendar/access" className="btn btn-outline-primary btn-lg">{copy.actions.myCalendar}</Link>
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

function PublicEntryChooser({ language }: { language: 'es' | 'en' }) {
  const copy = language === 'en'
    ? {
        title: 'Open a calendar',
        subtitle: 'Choose how you want to access the public calendars.',
        publishedByUsers: 'Published by users',
        publicDemo: 'Public demo',
        descriptionUsers: 'Enter your access code and open a personal calendar shared by a user.',
        descriptionDemo: 'Preview the public demo calendars without needing a private link or code.',
        back: 'Back',
      }
    : {
        title: 'Abrir un calendario',
        subtitle: 'Elige cómo quieres acceder a los calendarios públicos.',
        publishedByUsers: 'Publicados por usuarios',
        publicDemo: 'Demo pública',
        descriptionUsers: 'Explora calendarios públicos compartidos por usuarios y accede sin crear una cuenta.',
        descriptionDemo: 'Prueba ejemplos y muestras creadas por la web para ver cómo funciona.',
        back: 'Volver',
      }

  return (
    <div className="calendar-public-shell">
      <div className="calendar-public-card demo-choice-card">
        <p className="eyebrow">{language === 'en' ? 'Public access' : 'Acceso público'}</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>

        <div className="demo-choice-grid">
          <Link to="/calendar/access" className="demo-choice-item">
            <span className="demo-choice-badge">{copy.publishedByUsers}</span>
            <strong>{language === 'en' ? 'Open a user calendar' : 'Abrir calendario de usuario'}</strong>
            <small>{copy.descriptionUsers}</small>
          </Link>

          <Link to="/calendar/demo-publica" className="demo-choice-item demo-choice-item-secondary">
            <span className="demo-choice-badge">{copy.publicDemo}</span>
            <strong>{language === 'en' ? 'Explore demo calendars' : 'Explorar calendarios demo'}</strong>
            <small>{copy.descriptionDemo}</small>
          </Link>
        </div>

        <div className="mt-3">
          <Link to="/" className="btn btn-outline-secondary">{copy.back}</Link>
        </div>
      </div>
    </div>
  )
}

function CalendarAccessPage({ language }: { language: 'es' | 'en' }) {
  const navigate = useNavigate()
  const [accessCode, setAccessCode] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [validatedSlug, setValidatedSlug] = useState<string | null>(null)
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
      setValidatedSlug(response.slug)
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
      navigate(`/calendar/${validatedSlug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveEmailError)
    }
  }

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
            <button type="button" className="btn btn-outline-secondary" onClick={() => setValidatedSlug(null)}>{copy.back}</button>
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
          <Link to="/" className="btn btn-outline-secondary">{copy.back}</Link>
        </div>
      </div>
    </div>
  )
}

function AdminPage({ language, setLanguage }: { language: 'es' | 'en'; setLanguage: (value: 'es' | 'en') => void }) {
  const navigate = useNavigate()
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
        accessCodeHelper: 'The code/password is the same access gate. Turn the public-without-code switch on to keep it open without a code.',
        publicWithoutCode: 'Public without code',
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
        view: 'Ver',
        edit: 'Editar',
        send: 'Enviar',
        cancel: 'Cancelar',
        newCalendar: 'Nuevo',
        newCalendarTitle: 'Crear calendario',
        calendarName: 'Nombre del calendario',
        browserPath: 'Ruta del navegador (slug)',
        accessCode: 'Código de acceso',
        accessCodeHelper: 'El código y la contraseña son lo mismo para entrar al calendario. Si quieres que sea público sin acceso con código, activa el interruptor de público sin código.',
        publicWithoutCode: 'Público sin código',
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
    theme: 'romantic',
    duration_days: 12,
    is_published: false,
    is_public_without_code: true,
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
    calendar_background: 'navidad' | 'flores' | 'minimal'
    calendar_background_image: string
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
          password: newCalendar.is_public_without_code ? '' : newCalendar.password,
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
        is_public_without_code: true,
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
    setCalendarEditorId(calendar.id)
    setEditorSaveState('saved')
    setCalendarEditorDraft({
      name: calendar.name,
      slug: calendar.slug,
      description: calendar.description ?? '',
      password: '',
      theme: calendar.theme || 'romantic',
      duration_days: calendar.duration_days,
      is_published: calendar.is_published,
      is_demo: calendar.is_demo,
      is_public_without_code: false,
      calendar_background: 'navidad',
      calendar_background_image: '',
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

  const openCalendarEditorShare = () => {
    if (!calendarEditorId || !calendarEditorDraft) return

    const currentCalendar = calendars.find((item) => item.id === calendarEditorId) ?? {
      id: calendarEditorId,
      name: calendarEditorDraft.name || 'Calendario',
      slug: calendarEditorDraft.slug,
      description: calendarEditorDraft.description || null,
      theme: calendarEditorDraft.theme,
      duration_days: calendarEditorDraft.duration_days,
      is_published: calendarEditorDraft.is_published,
      is_demo: calendarEditorDraft.is_demo,
    }

    openShareCalendarModal(currentCalendar)
  }

  const saveCalendarEditor = async (draftOverride?: typeof calendarEditorDraft, closeAfterSave = false) => {
    const draft = draftOverride ?? calendarEditorDraft
    if (!calendarEditorId || !draft) return

    setEditorSaveState('saving')

    try {
      await request<CalendarSummary>(`${API_BASE}/api/calendars/${calendarEditorId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...draft,
          password: draft.password || undefined,
          palette: { primary: '#7a1d39', secondary: '#f8d7d7', accent: '#d4af37' },
        }),
      })
      await loadCalendars()
      setEditorSaveState('saved')
      if (closeAfterSave) {
        closeCalendarEditor()
      }
    } catch (err) {
      setEditorSaveState('saved')
      setError(err instanceof Error ? err.message : 'No se pudo guardar el calendario')
    }
  }

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

  const handleToggleDayLock = async (dayId: number, currentlyUnlocked: boolean) => {
    if (!selectedCalendarId) return
    try {
      await request<{ message: string }>(`${API_BASE}/api/days/${dayId}/${currentlyUnlocked ? 'lock' : 'unlock'}`, {
        method: 'POST',
      })
      await loadCalendarDetails(selectedCalendarId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado')
    }
  }

  const handleDeleteDay = async (dayId: number) => {
    if (!selectedCalendarId) return
    try {
      await request<{ message: string }>(`${API_BASE}/api/days/${dayId}`, { method: 'DELETE' })
      await loadCalendarDetails(selectedCalendarId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la puerta')
    }
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

  const openShareCalendarModal = (calendar: CalendarSummary) => {
    setShareCalendar(calendar)
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
    const shareUrl = `${window.location.origin}/calendar/${shareCalendar.slug}`
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
                          if (calendarEditorDraft) {
                            const nextDraft = { ...calendarEditorDraft }
                            void saveCalendarEditor(nextDraft)
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            setIsEditingCalendarTitle(false)
                            if (calendarEditorDraft) {
                              const nextDraft = { ...calendarEditorDraft }
                              void saveCalendarEditor(nextDraft)
                            }
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
                      <button type="button" className={`editor-inline-chip ${calendarEditorDraft.is_public_without_code ? 'success' : ''}`} onClick={() => setEditorSettingsModal('access')} title={calendarEditorDraft.is_public_without_code ? (language === 'en' ? 'Public access without code' : 'Acceso público sin código') : (language === 'en' ? 'Code access' : 'Acceso con código')} aria-label={calendarEditorDraft.is_public_without_code ? (language === 'en' ? 'Edit public access without code' : 'Editar acceso público sin código') : (language === 'en' ? 'Edit access settings' : 'Editar acceso con código')}>
                        {calendarEditorDraft.is_public_without_code ? <Unlock size={14} /> : <Lock size={14} />}
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
                          const nextDraft = { ...calendarEditorDraft, slug: event.target.value }
                          setCalendarEditorDraft(nextDraft)
                          void saveCalendarEditor(nextDraft)
                        }} placeholder={language === 'en' ? 'example-calendar' : 'ejemplo-calendario'} />
                      </label>
                    ) : null}

                    {editorSettingsModal === 'access' ? (
                      <>
                        <div className="d-flex gap-2 flex-wrap mb-3">
                          <button type="button" className={`btn btn-sm ${!calendarEditorDraft.is_public_without_code ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => {
                            const nextDraft = { ...calendarEditorDraft, is_public_without_code: false, password: calendarEditorDraft.password || generateAccessCode() }
                            setCalendarEditorDraft(nextDraft)
                            void saveCalendarEditor(nextDraft)
                          }}>
                    {language === 'en' ? 'With code' : 'Con código'}
                          </button>
                          <button type="button" className={`btn btn-sm ${calendarEditorDraft.is_public_without_code ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => {
                            const nextDraft = { ...calendarEditorDraft, is_public_without_code: true, password: '' }
                            setCalendarEditorDraft(nextDraft)
                            void saveCalendarEditor(nextDraft)
                          }}>
                    {language === 'en' ? 'Public without code' : 'Público sin código'}
                          </button>
                        </div>

                        {!calendarEditorDraft.is_public_without_code ? (
                          <label>
                    {language === 'en' ? 'Calendar password' : 'Contraseña del calendario'}
                            <div className="d-flex gap-2 align-items-center">
                              <div className="flex-grow-1">
                                <PasswordInput value={calendarEditorDraft.password} onChange={(event) => {
                                  const nextDraft = { ...calendarEditorDraft, password: event.target.value }
                                  setCalendarEditorDraft(nextDraft)
                                  void saveCalendarEditor(nextDraft)
                        }} placeholder={language === 'en' ? 'Leave empty to keep the current one' : 'Deja vacío para mantener la actual'} />
                              </div>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
                                const nextDraft = { ...calendarEditorDraft, password: generateAccessCode() }
                                setCalendarEditorDraft(nextDraft)
                                void saveCalendarEditor(nextDraft)
                      }}>{language === 'en' ? 'Generate' : 'Generar'}</button>
                            </div>
                          </label>
                        ) : null}
                      </>
                    ) : null}

                    {editorSettingsModal === 'details' ? (
                      <>
                        <label>
                  {language === 'en' ? 'Description' : 'Descripción'}
                          <textarea value={calendarEditorDraft.description} onChange={(event) => {
                            const nextDraft = { ...calendarEditorDraft, description: event.target.value }
                            setCalendarEditorDraft(nextDraft)
                            void saveCalendarEditor(nextDraft)
                          }} />
                        </label>
                        <label>
                  {language === 'en' ? 'Theme' : 'Tema'}
                          <select value={calendarEditorDraft.theme} onChange={(event) => {
                            const nextDraft = { ...calendarEditorDraft, theme: event.target.value }
                            setCalendarEditorDraft(nextDraft)
                            void saveCalendarEditor(nextDraft)
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
                                const nextDraft = { ...calendarEditorDraft, duration_days: days }
                                setCalendarEditorDraft(nextDraft)
                                void saveCalendarEditor(nextDraft)
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
                                const nextDraft = { ...calendarEditorDraft, duration_days: Number.isFinite(value) ? Math.max(1, Math.min(31, value)) : 1 }
                                setCalendarEditorDraft(nextDraft)
                                void saveCalendarEditor(nextDraft)
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
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary editor-toggle-button"
                  onClick={() => setIsDoorEditorPanelOpen((current) => !current)}
                >
                  {isDoorEditorPanelOpen ? (language === 'en' ? 'Hide editor' : 'Ocultar editor') : (language === 'en' ? 'Open editor' : 'Abrir editor')}
                </button>
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
                          value={calendarEditorDraft?.theme ?? 'week'}
                          onChange={(event) => {
                            const nextTheme = event.target.value
                            setCalendarEditorDraft((current) => {
                              if (!current) return current

                              const presetDays = nextTheme === 'week' ? 7 : nextTheme === 'puzzle' ? 7 : 7

                              return { ...current, theme: nextTheme, duration_days: presetDays }
                            })
                          }}
                        >
                          <option value="week">{language === 'en' ? 'Default' : 'Por defecto'}</option>
                          <option value="puzzle">Puzzle</option>
                          <option value="custom">{language === 'en' ? 'Custom' : 'Personalizado'}</option>
                        </select>
                      </div>

                      <div className="calendar-style-section">
                        <label className="calendar-style-label" htmlFor="calendar-background-select">
                          {language === 'en' ? 'Calendar background' : 'Fondo del calendario'}
                        </label>
                        <select
                          id="calendar-background-select"
                          className="calendar-style-select"
                          value={calendarEditorDraft?.calendar_background ?? 'navidad'}
                          onChange={(event) => {
                            const nextValue = event.target.value as 'navidad' | 'flores' | 'minimal'
                            setCalendarEditorDraft((current) => current ? { ...current, calendar_background: nextValue } : current)
                          }}
                        >
                          <option value="navidad">{language === 'en' ? 'Christmas' : 'Navidad'}</option>
                          <option value="flores">{language === 'en' ? 'Flowers' : 'Flores'}</option>
                          <option value="minimal">{language === 'en' ? 'Minimal' : 'Minimal'}</option>
                        </select>
                      </div>

                      <div className="calendar-style-section">
                        <label className="calendar-style-label" htmlFor="calendar-background-image-input">
                          {language === 'en' ? 'Image background' : 'Imagen de fondo'}
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
                    </div>
                  ) : null}
                </div>

                <div className="glass-card p-3 day-editor-main-panel">
                  <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                    <h4 className="mb-0">{language === 'en' ? 'Calendar' : 'Calendario'}</h4>
                  </div>

                  <div className="door-slot-grid">
                    {Array.from({ length: Math.max(1, calendarEditorDraft?.duration_days ?? 1) }, (_, index) => {
                      const dayNumber = index + 1
                      const existingDay = calendarDays.find((item) => item.day_number === dayNumber)

                      return (
                        <div
                          key={dayNumber}
                          className={`door-slot ${existingDay ? 'filled' : 'empty'} ${editingDayId === existingDay?.id ? 'active' : ''}`}
                        >
                          <button type="button" className="door-slot-button" onClick={() => handleSelectDoorSlot(dayNumber, existingDay)}>
                            <span className="door-slot-number">{dayNumber}</span>
                            <span className="door-slot-label">{existingDay ? (existingDay.title || 'Puerta creada') : 'Vacía'}</span>
                          </button>

                          {existingDay ? (
                            <div className="door-slot-actions" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="btn btn-xs btn-outline-light" onClick={() => handleEditDay(existingDay)}>
                                Editar
                              </button>
                              <button type="button" className="btn btn-xs btn-outline-light" onClick={() => handleToggleDayLock(existingDay.id, existingDay.is_unlocked_by_admin)}>
                                {existingDay.is_unlocked_by_admin ? 'Bloquear' : 'Desbloquear'}
                              </button>
                              <button type="button" className="btn btn-xs btn-outline-light" onClick={() => handleDeleteDay(existingDay.id)}>
                                Eliminar
                              </button>
                            </div>
                          ) : null}
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
                    disabled={newCalendar.is_public_without_code}
                  />
                  </div>
                  <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary create-calendar-generate-button"
                  disabled={newCalendar.is_public_without_code}
                  onClick={() => setNewCalendar({ ...newCalendar, password: generateAccessCode() })}
                  >
                  {adminCopy.generate}
                  </button>
                </div>
                <div className="toggle-row">
                  <span>{adminCopy.publicWithoutCode}</span>
                  <button
                    type="button"
                    className={`toggle-switch ${newCalendar.is_public_without_code ? 'on' : ''}`}
                    aria-label={language === 'en' ? 'Toggle public access without code' : 'Activar acceso público sin código'}
                    onClick={() => {
                      const nextPublicMode = !newCalendar.is_public_without_code
                      setNewCalendar({
                        ...newCalendar,
                        is_public_without_code: nextPublicMode,
                        password: nextPublicMode ? '' : newCalendar.password || generateAccessCode(),
                      })
                    }}
                  >
                    <span className="toggle-knob" />
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
                          disabled={newCalendar.is_public_without_code}
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
                    disabled={newCalendar.is_public_without_code}
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
        calendarView: 'Calendar view',
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
        calendarView: 'Vista de calendario',
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
      <div className="calendar-public-card">
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
  const [calendar, setCalendar] = useState<PublicCalendar | null>(null)
  const [days, setDays] = useState<PublicDay[]>([])
  const [selectedDay, setSelectedDay] = useState<PublicDay | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
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

  const fetchCalendar = async () => {
    if (!slug) return
    setIsLoading(true)
    try {
      const nextCalendar = await request<PublicCalendar>(`${API_BASE}/api/public/calendars/${slug}`)
      const nextDays = await request<PublicDay[]>(`${API_BASE}/api/public/calendars/${slug}/days`)
      setCalendar(nextCalendar)
      setDays(nextDays)
      setLocked(false)
      setSelectedDay(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el calendario'
      if (message.includes('403') || message.includes('No tienes acceso')) {
        setLocked(true)
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

  if (!calendar && !error) {
    return <div className="calendar-public-shell"><div className="calendar-public-card"><p>{language === 'en' ? 'Loading calendar…' : 'Cargando calendario…'}</p></div></div>
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

  return (
    <div className="calendar-public-shell">
      <div className="calendar-public-card">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div>
            <p className="eyebrow">{language === 'en' ? `Calendar: ${calendar?.name ?? 'Advent'}` : `Calendario de ${calendar?.name ?? 'Advent'}`}</p>
            <h1>{calendar?.description || (language === 'en' ? 'A December full of small details' : 'Un diciembre lleno de pequeños detalles')}</h1>
          </div>
          <Link to="/" className="btn btn-outline-primary">{language === 'en' ? 'Back' : 'Volver'}</Link>
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

export default function App() {
  const location = useLocation()
  const [routeLoading, setRouteLoading] = useState(false)
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const previousPathRef = useRef(location.pathname)

  useEffect(() => {
    if (previousPathRef.current === location.pathname) {
      return
    }

    previousPathRef.current = location.pathname
    setRouteLoading(true)

    const timeoutId = window.setTimeout(() => {
      setRouteLoading(false)
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [location.pathname])

  if (routeLoading) {
    return <RouteLoadingScreen language={language} />
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage language={language} setLanguage={setLanguage} />} />
      <Route path="/admin" element={<AdminPage language={language} setLanguage={setLanguage} />} />
      <Route path="/admin/calendario/:calendarId" element={<AdminCalendarDetailPage language={language} />} />
      <Route path="/calendar" element={<PublicEntryChooser language={language} />} />
      <Route path="/calendar/access" element={<CalendarAccessPage language={language} />} />
      <Route path="/calendar/demo-publica" element={<PublicCalendarPage language={language} />} />
      <Route path="/calendar/:slug" element={<PublicCalendarPage language={language} />} />
    </Routes>
  )
}
