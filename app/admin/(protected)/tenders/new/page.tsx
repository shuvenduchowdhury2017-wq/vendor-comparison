import NewTenderClient from '@/components/NewTenderClient'

export default async function NewTenderPage(props: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const sp = await props.searchParams
  return <NewTenderClient initialProjectId={sp.projectId ?? ''} />
}
