export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NewDocumentForm from '@/components/NewDocumentForm'
import { uiText } from '@/lib/ui-text'

interface CompanyItem {
  id: string
  name: string
}

interface DocumentItem {
  id: string
  title: string
  file_url: string
  file_path: string
  created_at: string
}

async function deleteDocument(formData: FormData) {
  'use server'

  const documentId = String(formData.get('documentId') || '')
  const filePath = String(formData.get('filePath') || '')
  const companyId = String(formData.get('companyId') || '')

  const supabase = await createClient()

  if (filePath) {
    await supabase.storage.from('company-documents').remove([filePath])
  }

  await supabase.from('company_documents').delete().eq('id', documentId)

  revalidatePath(`/documents/${companyId}`)
}

export default async function CompanyDocumentsPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  const { data: company, error: companyError } = await supabase
    .from('document_companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return (
      <main className="space-y-8">
        <PageHeader
          title={uiText.documents.title}
          subtitle="Could not open company."
        />
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-red-600">
            {companyError?.message || 'Company not found.'}
          </p>
        </div>
      </main>
    )
  }

  const { data: documents, error: documentsError } = await supabase
    .from('company_documents')
    .select('id, title, file_url, file_path, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (documentsError) {
    return (
      <main className="space-y-8">
        <PageHeader
          title={company.name}
          subtitle="Error while loading documents."
        />
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-red-600">{documentsError.message}</p>
        </div>
      </main>
    )
  }

  const companyItem = company as CompanyItem
  const items = (documents ?? []) as DocumentItem[]

  return (
    <main className="space-y-8">
      <PageHeader
        title={companyItem.name}
        subtitle={uiText.documents.companyDocumentsSubtitle}
      />

      {me.role === 'admin' && <NewDocumentForm companyId={companyId} />}

      {items.length ? (
        <div className="space-y-4">
          {items.map((doc) => (
            <div
              key={doc.id}
              className="rounded-[28px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-[#1f1a14]">
                    {doc.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#7b746b]">
                    {uiText.documents.addedOn} {new Date(doc.created_at).toLocaleString('bg-BG')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[18px] border border-[#e7d6a1] bg-white px-4 py-2 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
                  >
                    {uiText.common.open}
                  </a>

                  <a
                    href={doc.file_url}
                    download
                    className="rounded-[18px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
                  >
                    {uiText.common.download}
                  </a>

                  {me.role === 'admin' && (
                    <form action={deleteDocument}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="filePath" value={doc.file_path} />
                      <input type="hidden" name="companyId" value={companyId} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        {uiText.common.delete}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">{uiText.documents.noDocuments}</p>
        </div>
      )}
    </main>
  )
}