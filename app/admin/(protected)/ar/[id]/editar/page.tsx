import ARExperienceEditor from '../../_components/ARExperienceEditor'

export default async function EditarARPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ARExperienceEditor mode="edit" experienceId={id} />
}
