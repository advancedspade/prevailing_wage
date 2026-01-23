import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { ticketId } = await request.json()

  if (!ticketId) {
    return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
  }

  // Get ticket data with user profile
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      *,
      profile:profiles(full_name, email, salary)
    `)
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Calculate values
  const hoursWorked = Number(ticket.hours_worked)
  const calculatedHours = hoursWorked * 1.25
  const salary = ticket.profile?.salary || 0
  const totalPay = calculatedHours * salary

  // Generate XML for DIR upload (demo format)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DIRSubmission>
  <Header>
    <SubmissionDate>${new Date().toISOString().split('T')[0]}</SubmissionDate>
    <DIRNumber>${ticket.dir_number}</DIRNumber>
  </Header>
  <Project>
    <Title>${escapeXml(ticket.project_title)}</Title>
  </Project>
  <Employee>
    <Name>${escapeXml(ticket.profile?.full_name || 'Unknown')}</Name>
    <Email>${escapeXml(ticket.profile?.email || '')}</Email>
  </Employee>
  <WorkDetails>
    <DateWorked>${ticket.date_worked}</DateWorked>
    <HoursWorked>${hoursWorked.toFixed(2)}</HoursWorked>
    <CalculatedHours>${calculatedHours.toFixed(2)}</CalculatedHours>
    <HourlyRate>${salary.toFixed(2)}</HourlyRate>
    <TotalPay>${totalPay.toFixed(2)}</TotalPay>
  </WorkDetails>
  <Documentation>
    <PDFUrl>${ticket.pdf_url || ''}</PDFUrl>
  </Documentation>
</DIRSubmission>`

  return NextResponse.json({ 
    success: true, 
    xml,
    ticket: {
      dirNumber: ticket.dir_number,
      projectTitle: ticket.project_title,
      employeeName: ticket.profile?.full_name,
      hoursWorked,
      calculatedHours,
      salary,
      totalPay
    }
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

