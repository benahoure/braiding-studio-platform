import type { AppointmentRequest } from '../../types'

// Step 4 — appointment-relevant contact details only. The studio is not a
// mobile service, so no address fields.

const REFERRAL_OPTIONS = [
  { value: '', label: 'How did you hear about us? (optional)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google', label: 'Google' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'friend', label: 'Friend or family' },
  { value: 'other', label: 'Other' },
]

interface ClientInformationStepProps {
  clientName: string
  clientEmail: string
  clientPhone: string
  referralSource: AppointmentRequest['referralSource']
  firstVisit: boolean
  errors: Partial<Record<string, string>>
  onFieldChange: (field: 'clientName' | 'clientEmail' | 'clientPhone', value: string) => void
  onReferralChange: (value: AppointmentRequest['referralSource']) => void
  onFirstVisitChange: (value: boolean) => void
}

// Phone input mask. While typing, only strip invalid characters; once a
// complete US number is present (10 digits, or 11 with the +1 country code —
// the browser-autofill case), normalize it to (469) 344-7689.
function formatPhoneInput(value: string): string {
  const sanitized = value.replace(/[^\d\s()+-.]/g, '').slice(0, 18)
  const digits = sanitized.replace(/\D/g, '')
  const national =
    digits.length === 10 ? digits : digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : null
  if (national) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
  }
  return sanitized
}

export function ClientInformationStep({
  clientName,
  clientEmail,
  clientPhone,
  referralSource,
  firstVisit,
  errors,
  onFieldChange,
  onReferralChange,
  onFirstVisitChange,
}: ClientInformationStepProps) {
  return (
    <div className="grid gap-5">
      <div className="field">
        <label htmlFor="booking-name">Full Name *</label>
        <input
          id="booking-name"
          type="text"
          autoComplete="name"
          value={clientName}
          maxLength={100}
          aria-invalid={Boolean(errors.clientName)}
          aria-describedby={errors.clientName ? 'booking-name-error' : undefined}
          onChange={(e) => onFieldChange('clientName', e.target.value)}
        />
        {errors.clientName && (
          <p id="booking-name-error" className="field-error" role="alert">
            {errors.clientName}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="booking-email">Email Address *</label>
          <input
            id="booking-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={clientEmail}
            aria-invalid={Boolean(errors.clientEmail)}
            aria-describedby={errors.clientEmail ? 'booking-email-error' : undefined}
            onChange={(e) => onFieldChange('clientEmail', e.target.value)}
          />
          {errors.clientEmail && (
            <p id="booking-email-error" className="field-error" role="alert">
              {errors.clientEmail}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="booking-phone">Phone Number *</label>
          <input
            id="booking-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(214) 555-0000"
            value={clientPhone}
            aria-invalid={Boolean(errors.clientPhone)}
            aria-describedby={errors.clientPhone ? 'booking-phone-error' : undefined}
            onChange={(e) => onFieldChange('clientPhone', formatPhoneInput(e.target.value))}
          />
          {errors.clientPhone && (
            <p id="booking-phone-error" className="field-error" role="alert">
              {errors.clientPhone}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="booking-referral">Referral</label>
        <select
          id="booking-referral"
          value={referralSource ?? ''}
          onChange={(e) => onReferralChange(e.target.value as AppointmentRequest['referralSource'])}
        >
          {REFERRAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-border bg-cream p-4">
        <input
          type="checkbox"
          checked={firstVisit}
          onChange={(e) => onFirstVisitChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#BFA14A]"
        />
        <span className="text-sm text-mocha">
          This is my first visit to Braids by Deb
          <span className="mt-0.5 block text-[0.7rem] leading-snug text-mocha/55">
            We&rsquo;ll note it on your appointment so Deb can welcome you properly and plan a few
            extra minutes for your consultation.
          </span>
        </span>
      </label>
    </div>
  )
}
