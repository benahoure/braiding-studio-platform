import { ArrowLeft, ArrowRight } from 'lucide-react'

// Back / Continue row shared by the wizard steps.

interface BookingNavigationProps {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  loadingLabel?: string
}

export function BookingNavigation({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  nextLoading = false,
  loadingLabel = 'One moment…',
}: BookingNavigationProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline inline-flex min-h-[46px] items-center justify-center gap-2"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </button>
      ) : (
        <span aria-hidden="true" />
      )}

      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className="btn btn-gold inline-flex min-h-[46px] items-center justify-center gap-2 sm:min-w-[220px]"
        >
          {nextLoading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {loadingLabel}
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
