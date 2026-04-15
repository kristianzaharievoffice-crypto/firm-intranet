export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NewCompanyForm from '@/components/NewCompanyForm'
import { uiText } from '@/lib/ui-text'

interface CompanyItem {
  id: string
  name: string
  created_at: string
}

async function deleteCompany(formData: FormData) {
  'use server'

  const companyId = String(formData.get('companyId') || '')
  const supabase = await createClient()

  await supabase.from('document_companies').delete().eq('id', companyId)

  revalidatePath('/documents')
}

export default async function DocumentsPage() {
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

  const { data: companies, error } = await supabase
    .from('document_companies')
    .select('id, name, created_at')
    .order('name', { ascending: true })

  if (error) {
    return (
      <main className="space-y-8">
        <PageHeader
          title={uiText.documents.title}
          subtitle={uiText.documents.subtitle}
        />
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-red-600">Error: {error.message}</p>
        </div>
      </main>
    )
  }

  const items = (companies ?? []) as CompanyItem[]

  return (
    <main className="space-y-8">
      <PageHeader
        title={uiText.documents.title}
        subtitle={uiText.documents.subtitle}
      />

      {me.role === 'admin' && <NewCompanyForm />}

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((company) => (
            <div
              key={company.id}
              className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <Link href={`/documents/${company.id}`} className="block">
                <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
                  {company.name}
                </h2>
                <p className="mt-2 text-sm text-[#7b746b]">
                  {uiText.documents.openSection}
                </p>
              </Link>

              {me.role === 'admin' && (
                <form action={deleteCompany} className="mt-4">
                  <input type="hidden" name="companyId" value={company.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    {uiText.documents.deleteCompany}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">{uiText.documents.noCompanies}</p>
        </div>
      )}
    </main>
  )
}