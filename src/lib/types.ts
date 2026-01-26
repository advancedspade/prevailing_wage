export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  salary: number | null
  created_at: string
  updated_at: string
}

export type TicketStatus = 'pending' | 'awaiting_pay' | 'ready_for_dir'

export interface Ticket {
  id: string
  user_id: string
  dir_number: string
  project_title: string
  date_worked: string
  hours_worked: number
  status: TicketStatus
  created_at: string
  updated_at: string
  // Joined data
  profile?: Profile
}

// Status display labels
export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'Pending',
  awaiting_pay: 'Awaiting Pay',
  ready_for_dir: 'Ready for DIR'
}

// Pay period helpers
export interface PayPeriod {
  year: number
  month: number
  period: 1 | 2 // 1 = 1st-15th, 2 = 16th-end
  startDate: Date
  endDate: Date
  label: string
}

export function getPayPeriod(date: Date): PayPeriod {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  if (day <= 15) {
    return {
      year,
      month,
      period: 1,
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month, 15),
      label: formatPayPeriodLabel(year, month, 1)
    }
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      year,
      month,
      period: 2,
      startDate: new Date(year, month, 16),
      endDate: new Date(year, month, lastDay),
      label: formatPayPeriodLabel(year, month, 2)
    }
  }
}

export function formatPayPeriodLabel(year: number, month: number, period: 1 | 2): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const lastDay = new Date(year, month + 1, 0).getDate()

  if (period === 1) {
    return `${monthNames[month]} 1-15, ${year}`
  } else {
    return `${monthNames[month]} 16-${lastDay}, ${year}`
  }
}

export function getPayPeriodKey(year: number, month: number, period: 1 | 2): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${period}`
}

export function parsePayPeriodKey(key: string): { year: number; month: number; period: 1 | 2 } {
  const [year, month, period] = key.split('-')
  return {
    year: parseInt(year),
    month: parseInt(month) - 1,
    period: parseInt(period) as 1 | 2
  }
}

// Employee period status (tracks employee's workflow through a pay period)
export type EmployeePeriodStatus = 'pending' | 'awaiting_pay' | 'ready_for_dir'

export interface EmployeePeriod {
  id: string
  user_id: string
  year: number
  month: number
  period: 1 | 2
  status: EmployeePeriodStatus
  hourly_wage: number | null
  created_at: string
  updated_at: string
  // Joined data
  profile?: Profile
}

// Prevailing wage calculation constants
export const PREVAILING_WAGE_CONSTANTS = {
  BASE_RATE: 76.94,
  FIXED_DEDUCTION: 4.69,
  HOURS_PER_YEAR: 2080,
  ADJUSTMENT_HOURS: 120,
  CAC_RATE: 0.80  // Remit to CAC cost per hour
}

/**
 * Calculate hourly rate from yearly salary
 * hourlyRate = yearlySalary / 2080
 */
export function calculateHourlyRate(yearlySalary: number | null): number | null {
  if (!yearlySalary) return null
  return yearlySalary / PREVAILING_WAGE_CONSTANTS.HOURS_PER_YEAR
}

/**
 * Calculate the adjusted pay amount for a ticket
 * Formula: (76.94 - (hourlyRate + 4.69 + ((120 * hourlyRate) / 2080))) × hoursWorked
 *
 * This calculates the prevailing wage difference - the additional amount owed
 * based on the difference between the prevailing wage rate and the employee's rate
 */
export function calculateAdjustedPay(hoursWorked: number, yearlySalary: number | null): number | null {
  const hourlyRate = calculateHourlyRate(yearlySalary)
  if (hourlyRate === null) return null

  const { BASE_RATE, FIXED_DEDUCTION, HOURS_PER_YEAR, ADJUSTMENT_HOURS } = PREVAILING_WAGE_CONSTANTS

  // Calculate the adjustment factor: (120 * hourlyRate) / 2080
  const adjustmentFactor = (ADJUSTMENT_HOURS * hourlyRate) / HOURS_PER_YEAR

  // Calculate the rate: 76.94 - (hourlyRate + 4.69 + adjustmentFactor)
  const rate = BASE_RATE - (hourlyRate + FIXED_DEDUCTION + adjustmentFactor)

  // Multiply by hours worked
  return rate * hoursWorked
}

/**
 * Calculate the CAC (Remit to CAC) cost
 * Formula: hoursWorked × $0.80
 */
export function calculateCACCost(hoursWorked: number): number {
  return hoursWorked * PREVAILING_WAGE_CONSTANTS.CAC_RATE
}
