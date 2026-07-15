import type { AppointmentRequest } from '../../types'
import type { HairDetails, WizardStep } from './bookingConfig'

// Structured wizard state — one reducer instead of a dozen useStates, so back
// navigation and edits always preserve completed fields.

export interface BookingState {
  step: WizardStep
  categoryId: string
  serviceId: string
  lengthLabel: string
  portfolioStyleId: string
  inspiration: string
  hairDetails: HairDetails
  firstVisit: boolean
  preferredDate: string
  preferredTime: string
  calendarMonth: { year: number; month: number }
  clientName: string
  clientEmail: string
  clientPhone: string
  referralSource: AppointmentRequest['referralSource']
  honeypot: string
  policyAccepted: boolean
  // Stripe hold for the exact service+date+time it was created for. A key
  // mismatch means selections changed and a fresh hold is required.
  hold: { appointmentId: string; clientSecret: string; key: string } | null
  errors: Partial<Record<string, string>>
}

export type BookingAction =
  | { type: 'GO_TO_STEP'; step: WizardStep }
  | { type: 'SELECT_CATEGORY'; categoryId: string; clearsService: boolean }
  | { type: 'SELECT_SERVICE'; serviceId: string }
  | { type: 'SET_LENGTH'; lengthLabel: string }
  | { type: 'SET_HAIR_DETAIL'; field: string; value: string }
  | { type: 'SET_FIRST_VISIT'; value: boolean }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIME'; time: string }
  | { type: 'SET_MONTH'; year: number; month: number }
  | { type: 'SET_CLIENT_FIELD'; field: 'clientName' | 'clientEmail' | 'clientPhone' | 'honeypot'; value: string }
  | { type: 'SET_REFERRAL'; value: AppointmentRequest['referralSource'] }
  | { type: 'SET_POLICY'; accepted: boolean }
  | { type: 'SET_HOLD'; hold: BookingState['hold'] }
  | { type: 'SET_ERRORS'; errors: BookingState['errors'] }
  | { type: 'CLEAR_ERROR'; field: string }

export function holdKeyFor(
  state: Pick<BookingState, 'serviceId' | 'lengthLabel' | 'preferredDate' | 'preferredTime'>,
): string {
  // lengthLabel is part of the key: the quoted price lives on the hold's
  // appointment record, so changing length must create a fresh hold.
  return `${state.serviceId}|${state.lengthLabel}|${state.preferredDate}|${state.preferredTime}`
}

function todayLocal(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function initialBookingState(init?: {
  serviceId?: string
  portfolioStyleId?: string
  inspiration?: string
}): BookingState {
  return {
    step: 1,
    categoryId: '',
    serviceId: init?.serviceId ?? '',
    lengthLabel: '',
    portfolioStyleId: init?.portfolioStyleId ?? '',
    inspiration: init?.inspiration ?? '',
    hairDetails: {},
    firstVisit: false,
    preferredDate: '',
    preferredTime: '',
    calendarMonth: todayLocal(),
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    referralSource: '',
    honeypot: '',
    policyAccepted: false,
    hold: null,
    errors: {},
  }
}

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'GO_TO_STEP':
      return { ...state, step: action.step, errors: {} }

    case 'SELECT_CATEGORY':
      return {
        ...state,
        categoryId: action.categoryId,
        // Switching to a category the current service doesn't belong to
        // clears the service and anything downstream of it.
        ...(action.clearsService
          ? { serviceId: '', preferredTime: '', hold: null, policyAccepted: false }
          : {}),
        errors: {},
      }

    case 'SELECT_SERVICE': {
      if (action.serviceId === state.serviceId) return state
      return {
        ...state,
        serviceId: action.serviceId,
        // A different service can have different availability — clear the
        // chosen time (and any payment hold) but keep the date and generic
        // hair details, which apply to any braid service. Length tiers are
        // service-specific, so the previous choice is cleared too.
        lengthLabel: '',
        preferredTime: '',
        hold: null,
        policyAccepted: false,
        errors: {},
      }
    }

    case 'SET_LENGTH': {
      if (action.lengthLabel === state.lengthLabel) return state
      const errors = { ...state.errors }
      delete errors.lengthLabel
      // The hold snapshots the quoted price — a new length needs a new hold.
      return { ...state, lengthLabel: action.lengthLabel, hold: null, policyAccepted: false, errors }
    }

    case 'SET_HAIR_DETAIL':
      return { ...state, hairDetails: { ...state.hairDetails, [action.field]: action.value } }

    case 'SET_FIRST_VISIT':
      return { ...state, firstVisit: action.value }

    case 'SET_DATE': {
      if (action.date === state.preferredDate) return state
      const errors = { ...state.errors }
      delete errors.preferredDate
      delete errors.preferredTime
      // Changing the date invalidates the previously chosen time slot.
      return { ...state, preferredDate: action.date, preferredTime: '', hold: null, policyAccepted: false, errors }
    }

    case 'SET_TIME': {
      const errors = { ...state.errors }
      delete errors.preferredTime
      return { ...state, preferredTime: action.time, hold: null, policyAccepted: false, errors }
    }

    case 'SET_MONTH':
      return {
        ...state,
        calendarMonth: { year: action.year, month: action.month },
        preferredDate: '',
        preferredTime: '',
        hold: null,
        policyAccepted: false,
      }

    case 'SET_CLIENT_FIELD': {
      const errors = { ...state.errors }
      delete errors[action.field]
      return { ...state, [action.field]: action.value, errors }
    }

    case 'SET_REFERRAL':
      return { ...state, referralSource: action.value }

    case 'SET_POLICY':
      return { ...state, policyAccepted: action.accepted }

    case 'SET_HOLD':
      return { ...state, hold: action.hold }

    case 'SET_ERRORS':
      return { ...state, errors: action.errors }

    case 'CLEAR_ERROR': {
      const errors = { ...state.errors }
      delete errors[action.field]
      return { ...state, errors }
    }

    default:
      return state
  }
}
