export default function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number | string
  tone?: 'default' | 'gold' | 'soft'
}) {
  const toneClass =
    tone === 'gold'
      ? 'bg-gradient-to-br from-[#cfab33] to-[#a88414] text-white border-transparent'
      : tone === 'soft'
      ? 'bg-[#fbf7ee] border-[#efe1bb]'
      : 'bg-white border-[#ece5d8]'

  const labelClass =
    tone === 'gold' ? 'text-white/80' : 'text-[#7b746b]'

  const valueClass =
    tone === 'gold' ? 'text-white' : 'text-[#1f1a14]'

  return (
    <div className={`rounded-[28px] border p-6 shadow-sm ${toneClass}`}>
      <p className={`text-sm ${labelClass}`}>{label}</p>
      <h2 className={`mt-3 text-4xl font-black tracking-tight ${valueClass}`}>
        {value}
      </h2>
    </div>
  )
}