export type TermsRow = {
  id: string
  category: string
  instrument: string
  symbol: string
  margin: string
  spread: string
  tob: string
}
export type LpFile = { name: string; path: string }
export type LpData = {
  name: string
  status: string
  website: string
  contact: string
  email: string
  effective_date: string
  notes: string
  terms: TermsRow[]
  files: LpFile[]
}
export type Lp = LpData & { id: string; version: number; updated_at: string; updated_by: string }
export const categories = ['FX & Precious Metals', 'Equity Index', 'Energy', 'Gold']
export const row = (category = categories[0]): TermsRow => ({ id: crypto.randomUUID(), category, instrument: '', symbol: '', margin: '', spread: '', tob: '' })
export const blankLp = (): LpData => ({ name: '', status: 'Negotiating', website: '', contact: '', email: '', effective_date: '', notes: '', terms: [], files: [] })
export function templateRows(): TermsRow[] {
  const fx = ['USD', 'EUR', 'JPY', 'AUD', 'CAD', 'NZD', 'CHF', 'SGD', 'NOK', 'SEK', 'HUF', 'CZK', 'ZAR', 'XAU', 'PLN', 'CNH', 'XAG', 'XPD', 'XPT', 'HKD', 'TRY', 'MXN']
  const indices = [['S&P 500','SPM/USD'],['Nasdaq','NDM/USD'],['Dow Jones','DJI/USD'],['Dax','GEM/EUR'],['Nikkei','JPU/JPY'],['FTSE 100','UKI/GBP'],['EuroStoxx','STX/EUR'],['CAC 40','FRI/EUR'],['Hang Seng','HSI/HKD'],['S&P Mid Cap 400','SPL/USD'],['Australia 200','AXI/AUD'],['Amsterdam Exchange','NED/EUR'],['Russell 2000','RSI/USD'],['Swiss Market Index','SWI/CHF'],['Singapore 20','SGP/SGD'],['China A 50','CNI/USD'],['China H Shares','CHH/USD'],['Hang Seng Tech','HST/HKD'],['FTSE Taiwan','TWI/USD']]
  return [...fx.map(symbol => ({ ...row(), instrument: symbol, symbol })), ...indices.map(([instrument,symbol]) => ({ ...row('Equity Index'), instrument, symbol })), ...[['Brent (UK Oil)','USO/USD'],['WTI (US Oil)','UKO/USD']].map(([instrument,symbol]) => ({ ...row('Energy'), instrument, symbol })), { ...row('Gold'), instrument: 'Gold Index', symbol: 'GDI/USD' }]
}
export const termKey = (r: TermsRow) => `${r.category.trim().toLowerCase()}|${r.symbol.trim().toUpperCase()}`
export function numberValue(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export function validateLp(data: LpData): string | null {
  if (!data.name.trim()) return 'Enter the LP name.'
  const keys = new Set<string>()
  for (const r of data.terms) {
    if (!r.instrument.trim() || !r.symbol.trim()) return 'Each row needs an instrument and symbol.'
    if (keys.has(termKey(r))) return `Duplicate symbol in category: ${r.symbol}`
    keys.add(termKey(r))
    for (const field of ['margin', 'spread', 'tob'] as const) {
      if (r[field].trim() && numberValue(r[field]) === null) return `Enter a non-negative number for ${r.symbol}: ${field}.`
    }
    if (numberValue(r.margin) !== null && Number(r.margin) > 100) return `Margin must be between 0 and 100: ${r.symbol}`
  }
  return null
}

