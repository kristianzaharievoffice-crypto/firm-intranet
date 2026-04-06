import Link from 'next/link'

export default function HomePage() {
return (
<main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
<div className="bg-white rounded-2xl shadow-lg p-8 max-w-xl w-full text-center">
<h1 className="text-3xl font-bold mb-4">Фирмена вътрешна мрежа</h1>
<p className="text-gray-600 mb-6">
Първа работеща версия: вход, роли, стена и админ преглед.
</p>
<div className="flex gap-4 justify-center">
<Link href="/login" className="px-4 py-2 rounded-xl bg-black text-white">
Вход
</Link>
<Link href="/wall" className="px-4 py-2 rounded-xl border border-gray-300">
Моята стена
</Link>
</div>
</div>
</main>
)
}