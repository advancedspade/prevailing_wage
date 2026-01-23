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

  const formData = await request.formData()
  const file = formData.get('file') as File
  const ticketId = formData.get('ticketId') as string

  if (!file || !ticketId) {
    return NextResponse.json({ error: 'Missing file or ticketId' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileName = `${ticketId}/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('pdfs')
    .upload(fileName, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('pdfs')
    .getPublicUrl(fileName)

  // Update ticket with PDF URL and change status to completed
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ 
      pdf_url: publicUrl,
      status: 'completed'
    })
    .eq('id', ticketId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    pdfUrl: publicUrl 
  })
}

