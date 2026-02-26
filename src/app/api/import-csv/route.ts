import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows } = await request.json() as { rows: ParsedRow[] }

  // Get all existing employees by name
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')

  const profileMap = new Map<string, string>()
  existingProfiles?.forEach(p => {
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
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: newId,
            email: `${personName.replace(/\s+/g, '.').toLowerCase()}@placeholder.local`,
            full_name: personName,
            role: 'user',
            salary: null
          })

        if (!error) {
          personId = newId
          profileMap.set(nameLower, newId)
          employeesCreated++
        } else {
          console.error('Error creating profile:', error)
          continue
        }
      }

      // Create ticket for this person
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          user_id: personId,
          dir_number: row.dirNumber,
          project_title: row.projectTitle,
          date_worked: row.dateWorked,
          hours_worked: row.totalHours,
          status: 'pending'
        })

      if (!ticketError) {
        ticketsCreated++
      } else {
        console.error('Error creating ticket:', ticketError)
      }
    }
  }

  return NextResponse.json({ 
    success: true, 
    employeesCreated, 
    ticketsCreated 
  })
}

