export const dynamic = 'force-dynamic'


import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import SmaLive from '@/components/SmaLive'


export default async function SmaPage() {
 const supabase = await createClient()


 const {
   data: { user },
 } = await supabase.auth.getUser()


 if (!user) redirect('/login')


 return (
   <main className="space-y-8">
     <PageHeader
       title="SMA"
       subtitle="Track client deals, stages, targets, drawdown and updates."
     />


     <SmaLive />
   </main>
 )
}

