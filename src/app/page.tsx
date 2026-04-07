import LoginForm from '@/components/LoginForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">RCX NETWORK</h1>
            <p className="text-gray-500 mt-2">
              Вътрешна система за комуникация и отчетност
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  )
}