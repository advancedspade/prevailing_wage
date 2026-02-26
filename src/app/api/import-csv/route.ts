import { getAuthUserAndProfile } from '@/lib/auth-db'
import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface ParsedRow {
  ticketNumber: string
  projectTitle: string
  dirNumber: string
  dateWorked: string
  totalHours: number
  people: string[]
}

export async function POST(request: NextRequest) {
  // Check auth
  const { profile } = await getAuthUserAndProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows } = await request.json() as { rows: ParsedRow[] }

  // Get all existing employees by name
  const { rows: existingProfiles } = await query<{ id: string; full_name: string | null }>(
    'SELECT id, full_name FROM public.profiles'
  )

  const profileMap = new Map<string, string>()
  existingProfiles.forEach(p => {
    if (p.full_name) {
      profileMap.set(p.full_name.toLowerCase(), p.id)
    }
  })

  let employeesCreated = 0
  let ticketsCreated = 0

  // Process each row
  for (const row of rows) {
    for (const personName of row.people) {
      const nameLower = personName.toLowerCase()
      let personId = profileMap.get(nameLower)

      // Create employee if doesn't exist
      if (!personId) {
        const newId = crypto.randomUUID()
        const placeholderEmail = `${personName.replace(/\s+/g, '.').toLowerCase()}@placeholder.local`

        try {
          await query(
            `INSERT INTO public.profiles (id, email, full_name, role, salary)
             VALUES ($1, $2, $3, 'user', NULL)`,
            [newId, placeholderEmail, personName]
          )
          personId = newId
          profileMap.set(nameLower, newId)
          employeesCreated++
        } catch (error) {
          console.error('Error creating profile:', error)
          continue
        }
      }

      // Create ticket for this person
      try {
        await query(
          `INSERT INTO public.tickets (user_id, dir_number, project_title, date_worked, hours_worked, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [personId, row.dirNumber, row.projectTitle, row.dateWorked, row.totalHours]
        )
        ticketsCreated++
      } catch (error) {
        console.error('Error creating ticket:', error)
      }
    }
  }

  return NextResponse.json({
    success: true,
    employeesCreated,
    ticketsCreated
  })
}

