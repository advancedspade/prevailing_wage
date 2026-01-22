export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export type TicketStatus = 'pending' | 'in_review' | 'approved' | 'rejected'

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

