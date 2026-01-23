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

export type TicketStatus = 'pending' | 'prevailing_wage_entered' | 'awaiting_pay' | 'upload_to_dir' | 'completed'

export interface Ticket {
  id: string
  user_id: string
  dir_number: string
  project_title: string
  date_worked: string
  hours_worked: number
  status: TicketStatus
  pdf_url: string | null
  created_at: string
  updated_at: string
  // Joined data
  profile?: Profile
}

// Status display labels
export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'Pending',
  prevailing_wage_entered: 'Prevailing Wage Entered',
  awaiting_pay: 'Awaiting Pay',
  upload_to_dir: 'Upload to DIR',
  completed: 'Completed'
}

// Status colors for UI
export const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  prevailing_wage_entered: 'bg-blue-100 text-blue-800',
  awaiting_pay: 'bg-purple-100 text-purple-800',
  upload_to_dir: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800'
}

