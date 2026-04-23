import { redirect } from 'next/navigation'

export default async function ClienteRedirect({
  searchParams,
}: {
  searchParams: Promise<{ folio?: string }>
}) {
  const { folio } = await searchParams
  if (folio) redirect(`/admin/cliente/${folio}`)
  redirect('/admin')
}
