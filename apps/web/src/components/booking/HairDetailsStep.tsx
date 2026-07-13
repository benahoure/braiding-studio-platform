import { AlertTriangle, Info } from 'lucide-react'

import { HAIR_DETAIL_FIELDS, type HairDetails } from './bookingConfig'

// Step 2 — hair details. Schema-driven from HAIR_DETAIL_FIELDS so future
// service-specific questions slot in without rewriting this component.
// Every field is optional: answers are summarized into the appointment notes.

interface HairDetailsStepProps {
  values: HairDetails
  onChange: (field: string, value: string) => void
}

function OptionNote({ tone, text }: { tone: 'info' | 'warning'; text: string }) {
  const isWarning = tone === 'warning'
  return (
    <div
      role={isWarning ? 'alert' : 'note'}
      className={`mt-1.5 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
        isWarning
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-900'
          : 'border-gold/40 bg-gold-pale/25 text-espresso'
      }`}
    >
      {isWarning ? (
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      ) : (
        <Info size={14} className="mt-0.5 shrink-0 text-gold-dark" aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  )
}

export function HairDetailsStep({ values, onChange }: HairDetailsStepProps) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold-pale/30 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-gold-dark">
          Optional Step
        </span>
        <p className="text-sm leading-relaxed text-mocha/70">
          Tell Deb about your hair so she can prepare — or just press Continue to skip. She&rsquo;ll
          confirm the details with you before your visit.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {HAIR_DETAIL_FIELDS.map((field) => {
          const inputId = `hair-${field.id}`
          const value = values[field.id] ?? ''

          if (field.type === 'textarea') {
            return (
              <div key={field.id} className="field sm:col-span-2">
                <label htmlFor={inputId}>{field.label}</label>
                <textarea
                  id={inputId}
                  rows={3}
                  value={value}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) => onChange(field.id, e.target.value)}
                />
                {field.maxLength && (
                  <p className="text-right text-[0.65rem] text-mocha/40">
                    {value.length}/{field.maxLength}
                  </p>
                )}
              </div>
            )
          }

          if (field.type === 'select') {
            const note = field.optionNotes?.[value]
            return (
              <div key={field.id} className="field">
                <label htmlFor={inputId}>{field.label}</label>
                <select id={inputId} value={value} onChange={(e) => onChange(field.id, e.target.value)}>
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {field.helper && <p className="text-[0.7rem] leading-snug text-mocha/50">{field.helper}</p>}
                {note && <OptionNote tone={note.tone} text={note.text} />}
              </div>
            )
          }

          return (
            <div key={field.id} className="field">
              <label htmlFor={inputId}>{field.label}</label>
              <input
                id={inputId}
                type="text"
                value={value}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
