import { Check } from 'lucide-react'

import { WIZARD_STEPS, type WizardStep } from './bookingConfig'

// Five-step progress indicator — numbered gold circles with a connecting
// track, safe on narrow screens (labels hide on very small widths).

interface BookingProgressProps {
  currentStep: WizardStep
  // Steps the customer has completed and may jump back to.
  maxReachedStep: WizardStep
  onStepClick: (step: WizardStep) => void
}

export function BookingProgress({ currentStep, maxReachedStep, onStepClick }: BookingProgressProps) {
  const progressPct = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100

  return (
    <nav aria-label="Booking progress" className="px-4 pt-6 sm:px-8">
      <ol className="relative flex items-start justify-between">
        {/* Track */}
        <div
          aria-hidden="true"
          className="absolute left-4 right-4 top-[15px] h-[2px] rounded-full bg-cream-border sm:left-8 sm:right-8"
        />
        <div
          aria-hidden="true"
          className="absolute left-4 top-[15px] h-[2px] rounded-full bg-gold transition-all duration-500 sm:left-8"
          style={{ width: `calc((100% - 2rem) * ${progressPct / 100})` }}
        />

        {WIZARD_STEPS.map((label, index) => {
          const stepNumber = (index + 1) as WizardStep
          const isCurrent = stepNumber === currentStep
          const isDone = stepNumber < currentStep
          const isReachable = stepNumber <= maxReachedStep && stepNumber !== currentStep

          return (
            <li key={label} className="relative z-10 flex flex-col items-center">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepClick(stepNumber)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${stepNumber}: ${label}${isDone ? ' (completed)' : ''}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                  isCurrent
                    ? 'border-gold bg-gold text-espresso shadow-[0_0_0_4px_rgba(191,161,74,0.18)]'
                    : isDone
                      ? 'border-gold bg-gold/90 text-espresso cursor-pointer hover:shadow-[0_0_0_4px_rgba(191,161,74,0.14)]'
                      : 'border-cream-border bg-paper text-mocha/40'
                } ${!isReachable ? 'cursor-default' : ''}`}
              >
                {isDone ? <Check size={14} aria-hidden="true" /> : stepNumber}
              </button>
              <span
                className={`mt-1.5 hidden text-[0.6rem] font-semibold uppercase tracking-[0.08em] sm:block ${
                  isCurrent ? 'text-gold-dark' : isDone ? 'text-espresso/70' : 'text-mocha/40'
                }`}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
      {/* Current step label for small screens */}
      <p className="mt-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold-dark sm:hidden">
        Step {currentStep} of {WIZARD_STEPS.length} — {WIZARD_STEPS[currentStep - 1]}
      </p>
    </nav>
  )
}
