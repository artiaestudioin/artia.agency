import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase   = await createClient()
  const projectId  = req.nextUrl.searchParams.get('projectId')

  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const { data: files, error } = await supabase
    .from('project_files')
    .select('id, file_url, file_name, file_type, file_size, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ files: files ?? [] })
}
