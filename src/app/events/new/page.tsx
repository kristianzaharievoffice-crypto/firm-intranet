import Header from '@/components/Header'
import NewEventForm from '@/components/NewEventForm'

export default function NewEventPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-xl mx-auto p-6">
        <NewEventForm />
      </div>
    </main>
  )
}