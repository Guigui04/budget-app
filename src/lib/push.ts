/**
 * Web Push helpers. The VAPID public key is safe to expose; the private key
 * lives only in Supabase Edge Function secrets. On iOS, push only works once
 * the PWA is installed to the home screen (iOS 16.4+).
 */
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export type PushOutcome = 'granted' | 'denied' | 'unsupported' | 'needs-install' | 'missing-key' | 'save-error'

export interface PushSubscriptionResult {
  outcome: PushOutcome
  subscription?: PushSubscriptionJSON
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return buffer
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 2000)
    })
    const ready = await Promise.race([navigator.serviceWorker.ready, timeout])
    if (ready) return ready
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export async function requestPushSubscription(): Promise<PushSubscriptionResult> {
  if (!pushSupported()) return { outcome: 'unsupported' }
  if (isIos() && !isStandalone()) return { outcome: 'needs-install' }
  if (!vapidPublicKey) return { outcome: 'missing-key' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { outcome: 'denied' }

  const registration = await getServiceWorkerRegistration()
  if (!registration) return { outcome: 'unsupported' }

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
    }))

  return { outcome: 'granted', subscription: subscription.toJSON() }
}

export async function requestPushPermission(): Promise<PushOutcome> {
  const result = await requestPushSubscription()
  return result.outcome
}
