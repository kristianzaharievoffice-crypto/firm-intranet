'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { blankLp, categories, Lp, LpData, numberValue, row, templateRows, termKey, TermsRow, validateLp } from '@/lib/lps'

const box = 'rounded-[28px] border border-[#ece5d8] bg-white p-5 shadow-sm'
const input = 'w-full rounded-xl border border-[#ece5d8] bg-[#fcfbf8] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#c9a227]'
const button = 'rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const secondary = 'rounded-xl border border-[#ece5d8] px-4 py-2 text-sm font-semibold disabled:opacity-50'
type History = { id: string; version: number; changed_by: string; changed_at: string; snapshot: Lp }
const displayDate = (s: string) => new Date(s).toLocaleString('bg-BG')

export default function LpsWorkspace({ requestedId }: { requestedId: string | null }) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Lp[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [selected, setSelected] = useState<string[]>([])
  const [compare, setCompare] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [original, setOriginal] = useState<Lp | null>(null)
  const [draft, setDraft] = useState<LpData>(blankLp)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [history, setHistory] = useState<History[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [snapshot, setSnapshot] = useState<History | null>(null)
  const historyRequest = useRef(0)

  useEffect(() => { setActive(requestedId); setCompare(false) }, [requestedId])

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from('liquidity_providers').select('*').order('updated_at', { ascending: false })
    if (fetchError) { setError(`Cannot load LP's: ${fetchError.message}`); setLoading(false); return }
    setItems((data ?? []) as Lp[])
    setLoading(false)
    const { data: profiles } = await supabase.from('profiles').select('id,full_name')
    setNames(Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name || 'Employee'])))
  }, [supabase])

  useEffect(() => {
    void load()
    const channel = supabase.channel('lp-workspace').on('postgres_changes', { event: '*', schema: 'public', table: 'liquidity_providers' }, () => { void load() }).subscribe()
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { clearInterval(interval); void supabase.removeChannel(channel) }
  }, [supabase, load])

  useEffect(() => {
    if (!editing || !dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editing, dirty])

  const current = items.find(i => i.id === active)
  const visible = items.filter(i => (status === 'All' || i.status === status) && `${i.name} ${i.contact} ${i.email}`.toLowerCase().includes(query.toLowerCase()))
  const chosen = items.filter(i => selected.includes(i.id))
  const comparisonRows = Array.from(new Map(chosen.flatMap(i => i.terms).map(r => [termKey(r), r])).values()).sort((a,b) => termKey(a).localeCompare(termKey(b)))
  const update = (patch: Partial<LpData>) => { setDirty(true); setDraft(d => ({ ...d, ...patch })) }
  const updateRow = (index: number, patch: Partial<TermsRow>) => update({ terms: draft.terms.map((r,i) => i === index ? { ...r, ...patch } : r) })
  const start = (lp: Lp | null) => {
    setError(''); setNotice(''); setOriginal(lp); setDraft(lp ? structuredClone({ ...lp, effective_date: lp.effective_date || '' }) : blankLp()); setDirty(false); setEditing(true); setCompare(false)
  }
  const cancel = () => { if (!dirty || window.confirm('Discard unsaved changes?')) { setEditing(false); setDirty(false); setError('') } }
  const save = async () => {
    const message = validateLp(draft)
    if (message) { setError(message); return }
    setBusy(true); setError('')
    try {
      // Normalize numeric strings to the same decimal representation accepted by SQL.
      const terms = draft.terms.map(r => ({ ...r, symbol: r.symbol.trim().toUpperCase(), ...Object.fromEntries((['margin','spread','tob'] as const).map(f => [f, r[f].trim() ? String(Number(r[f])) : ''])) }))
      const { data, error: saveError } = await supabase.rpc('save_liquidity_provider', { p_id: original?.id ?? null, p_version: original?.version ?? null, p_data: { ...draft, terms } })
      if (saveError) throw saveError
      setActive(data as string); setEditing(false); setDirty(false); setNotice('LP saved. Notifications sent to other employees.'); await load()
    } catch (e) { setError(e instanceof Error ? e.message : (e as { message?: string }).message || 'Save failed. Try again.') }
    finally { setBusy(false) }
  }
  const upload = async (files: File[]) => {
    if (!files?.length) return
    setBusy(true); setError('')
    const added: LpData['files'] = []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again.')
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: maximum size is 20 MB.`)
        const path = `${user.id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: uploadError } = await supabase.storage.from('lp-files').upload(path, file)
        if (uploadError) throw uploadError
        added.push({ name: file.name, path })
      }
    } catch (e) { setError((e as { message?: string }).message || 'Upload failed.') }
    finally { if (added.length) update({ files: [...draft.files, ...added] }); setBusy(false) }
  }
  const openFile = async (path: string) => {
    // Open immediately to avoid popup blockers after the asynchronous signing request.
    const tab = window.open('about:blank', '_blank')
    if (tab) tab.opener = null
    const { data, error: fileError } = await supabase.storage.from('lp-files').createSignedUrl(path, 60)
    if (fileError || !data) { tab?.close(); setError(fileError?.message || 'Cannot open file.'); return }
    if (tab) tab.location.href = data.signedUrl
    else setError('Allow popups for this site to open attachments.')
  }
  const showHistory = async (id: string) => {
    const request = ++historyRequest.current
    setHistory([]); setSnapshot(null); setHistoryLoading(true)
    const { data, error: historyError } = await supabase.from('lp_history').select('*').eq('lp_id',id).order('version', { ascending: false })
    if (request !== historyRequest.current) return
    setHistoryLoading(false)
    if (historyError) setError(historyError.message)
    else setHistory((data ?? []) as History[])
  }
  const view = (id: string) => { setActive(id); setCompare(false); setHistory([]); setSnapshot(null); setHistoryLoading(false); historyRequest.current++ }
  const filesView = (lp: LpData) => <div className="flex flex-wrap gap-2">{lp.files.map(f => <button key={f.path} type="button" className={secondary} onClick={() => void openFile(f.path)}>{f.name} ↗</button>)}</div>
  const termsView = (lp: LpData) => <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr>{['Category','Instrument','Symbol','Margin Rate (%)','Spread','TOB'].map(h => <th className="border-b p-3" key={h}>{h}</th>)}</tr></thead><tbody>{lp.terms.map((r,i) => <tr key={r.id || i}>{[r.category,r.instrument,r.symbol,r.margin === '' ? '—' : `${r.margin}%`,r.spread || '—',r.tob || '—'].map((v,j) => <td key={j} className="border-b border-[#ece5d8] p-3">{v}</td>)}</tr>)}</tbody></table>{!lp.terms.length && <p className="py-4">No terms entered.</p>}</div>

  return <div className="space-y-5 text-[#433b32]">
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" className="ml-3 underline" onClick={() => { setError(''); void load() }}>Retry loading</button></div>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {!editing && <>
      <div className="grid gap-3 sm:grid-cols-3">{[['Total LPs',items.length],['Active',items.filter(i => i.status === 'Active').length],['In negotiations',items.filter(i => i.status === 'Negotiating').length]].map(([label,value]) => <div key={label} className={box}><p className="text-sm text-[#7b746b]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div>
      <div className={`${box} flex flex-wrap items-center gap-3`}>
        <input aria-label="Search LPs" placeholder="Search providers or contacts…" className={`${input} sm:max-w-xs`} value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="Filter by status" className={`${input} sm:max-w-44`} value={status} onChange={e => setStatus(e.target.value)}>{['All','Negotiating','Active','Archived'].map(s => <option key={s}>{s}</option>)}</select>
        <button type="button" className={button} onClick={() => start(null)}>+ Add LP</button>
        <button type="button" className={secondary} disabled={chosen.length < 2} onClick={() => { setCompare(true); setActive(null) }}>Compare ({chosen.length})</button>
      </div>
      {loading ? <p>Loading LPs…</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(lp => <div key={lp.id} className={box}>
        <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${lp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-[#fbf3dc] text-[#8a6b11]'}`}>{lp.status}</span><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(lp.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids,lp.id] : ids.filter(id => id !== lp.id))} />Compare</label></div>
        <button type="button" className="mt-3 text-left text-xl font-black hover:underline" onClick={() => view(lp.id)}>{lp.name}</button>
        <p className="mt-2 text-sm">{lp.terms.length} instruments · v{lp.version}</p><p className="mt-1 text-xs text-[#7b746b]">Updated {displayDate(lp.updated_at)} · {names[lp.updated_by] || 'Employee'}</p>
        <div className="mt-4 flex gap-2"><button type="button" className={secondary} onClick={() => view(lp.id)}>Details</button><button type="button" className={secondary} onClick={() => start(lp)}>Edit</button></div>
      </div>)}</div>}
      {!loading && !visible.length && <div className={box}>No matching providers. Add your first LP or adjust the filters.</div>}
    </>}

    {editing && <form className={`${box} space-y-5`} onSubmit={e => { e.preventDefault(); void save() }}>
      <h2 className="text-2xl font-black">{original ? `Edit ${original.name}` : 'New liquidity provider'}</h2>
      {original && items.find(i => i.id === original.id)?.version !== original.version && <p role="alert" className="text-red-700">A newer version is available. Copy any unsaved changes, close this editor, and reopen the LP.</p>}
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(['name','website','contact','email','effective_date'] as const).map(f => <label key={f} className="space-y-1 text-sm"><span>{{name:'LP name *',website:'Website',contact:'Contact person',email:'Email',effective_date:'Terms effective from'}[f]}</span><input required={f === 'name'} maxLength={f === 'name' ? 200 : 500} type={f === 'email' ? 'email' : f === 'effective_date' ? 'date' : 'text'} className={input} value={draft[f]} onChange={e => update({[f]:e.target.value})} /></label>)}
          <label className="space-y-1 text-sm"><span>Status</span><select className={input} value={draft.status} onChange={e => update({status:e.target.value})}>{['Negotiating','Active','Archived'].map(s => <option key={s}>{s}</option>)}</select></label>
        </div>
        <label className="block space-y-1 text-sm"><span>Notes / offer conditions / units</span><textarea className={input} rows={3} value={draft.notes} onChange={e => update({notes:e.target.value})} /></label>
        <div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold">Trading conditions</h3><button type="button" className={secondary} onClick={() => update({terms:[...draft.terms,row()]})}>+ Add instrument</button><button type="button" className={secondary} onClick={() => { const keys = new Set(draft.terms.map(termKey)); update({terms:[...draft.terms,...templateRows().filter(r => !keys.has(termKey(r)))]}) }}>Add instruments from screenshots</button></div>
        <p className="text-sm text-[#7b746b]">Enter only the negotiated values. Empty means no data; 0 is a valid value. Template values are blank. FX currencies are separate rows so providers can be compared.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr>{['Category','Instrument','Symbol','Margin Rate (%)','Spread','TOB',''].map((h,i) => <th key={i} className="p-2">{h}</th>)}</tr></thead><tbody>{draft.terms.map((r,i) => <tr key={r.id}>
          <td className="p-1"><select aria-label={`Category row ${i+1}`} className={input} value={r.category} onChange={e => updateRow(i,{category:e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></td>
          {(['instrument','symbol','margin','spread','tob'] as const).map(f => <td key={f} className="p-1"><input aria-label={`${f} row ${i+1}`} className={input} type={f === 'instrument' || f === 'symbol' ? 'text' : 'number'} min="0" max={f === 'margin' ? '100' : undefined} step="any" value={r[f]} onChange={e => updateRow(i,{[f]:e.target.value})} /></td>)}
          <td className="p-1"><button type="button" aria-label={`Remove row ${i+1}`} className="px-2 text-red-700" onClick={() => update({terms:draft.terms.filter((_,n) => n !== i)})}>Remove</button></td>
        </tr>)}</tbody></table></div>
        <div className="space-y-3"><label className="block text-sm">Attach offer / contract (PDF, PNG, JPG, XLSX, DOCX, CSV; up to 20 MB per file)<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx,.csv" className="mt-2 block max-w-full text-sm" onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = '' }} /></label>
          {draft.files.map((f,i) => <div key={f.path} className="flex flex-wrap items-center gap-3"><span className="text-sm">{f.name}</span><button type="button" className="text-sm text-red-700" onClick={() => update({files:draft.files.filter((_,n) => n !== i)})}>Remove from this version</button></div>)}
        </div>
      </fieldset>
      <div className="flex gap-3"><button disabled={busy} className={button} type="submit">{busy ? 'Working…' : 'Save LP'}</button><button disabled={busy} className={secondary} type="button" onClick={cancel}>Cancel</button></div>
    </form>}

    {!editing && compare && <section className={`${box} space-y-4`}><h2 className="text-2xl font-black">Compare providers</h2>
      <p className="text-sm text-[#7b746b]">Matched by category and symbol. Lower margin / spread is highlighted; higher TOB is highlighted. Verify equivalent offers and units. Missing data is excluded. Ties are highlighted equally; at least two values are required.</p>
      {chosen.length < 2 ? <p>Select at least two providers.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr><th className="p-3">Instrument / Metric</th>{chosen.map(lp => <th key={lp.id} className="p-3">{lp.name}<div className="font-normal text-xs">{lp.status} · {lp.effective_date || 'No effective date'}</div></th>)}</tr></thead><tbody>{comparisonRows.flatMap(r => (['margin','spread','tob'] as const).map(metric => {
        const values = chosen.map(lp => numberValue(lp.terms.find(t => termKey(t) === termKey(r))?.[metric] ?? ''))
        const available = values.filter((n): n is number => n !== null)
        const best = available.length >= 2 ? (metric === 'tob' ? Math.max(...available) : Math.min(...available)) : null
        return <tr key={`${termKey(r)}|${metric}`}><th className="border-b border-[#ece5d8] p-3 font-normal"><div className="font-semibold">{r.instrument} · {r.symbol}</div><div className="text-xs text-[#7b746b]">{r.category} · {metric === 'margin' ? 'Margin Rate (%)' : metric === 'tob' ? 'TOB' : 'Spread'}</div></th>{chosen.map((lp,i) => <td key={lp.id} className={`border-b border-[#ece5d8] p-3 ${values[i] !== null && values[i] === best ? 'bg-green-50 font-bold text-green-800' : ''}`}>{values[i] === null ? 'No data' : `${values[i]}${metric === 'margin' ? '%' : ''}`}{values[i] !== null && values[i] === best && <span className="ml-2 text-xs">✓</span>}</td>)}</tr>
      }))}</tbody></table>{!comparisonRows.length && <p>No instruments entered for the selected providers.</p>}</div>}
    </section>}

    {!editing && !compare && current && <section className={`${box} space-y-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">{current.name}</h2><div className="flex gap-2"><button type="button" className={button} onClick={() => start(current)}>Edit LP</button><button type="button" className={secondary} onClick={() => void showHistory(current.id)}>History</button></div></div>
      <div className="grid gap-3 text-sm sm:grid-cols-2"><p>Status: {current.status}</p><p>Terms effective from: {current.effective_date || '—'}</p><p>Website: {current.website || '—'}</p><p>Contact: {current.contact || '—'}</p><p>Email: {current.email || '—'}</p><p>Updated: {displayDate(current.updated_at)} · {names[current.updated_by] || 'Employee'} · v{current.version}</p></div>
      {current.notes && <p className="whitespace-pre-wrap text-sm">{current.notes}</p>}{filesView(current)}{termsView(current)}
      {historyLoading && <p>Loading history…</p>}
      {history.length > 0 && <div className="space-y-3 border-t border-[#ece5d8] pt-4"><h3 className="text-lg font-bold">Version history</h3><div className="flex flex-wrap gap-2">{history.map(h => <button type="button" key={h.id} className={secondary} onClick={() => setSnapshot(h)}>v{h.version} · {displayDate(h.changed_at)} · {names[h.changed_by] || 'Employee'}</button>)}</div></div>}
      {snapshot && <div className="space-y-4 rounded-xl bg-[#fcfbf8] p-4"><h3 className="font-bold">Version {snapshot.version} · {snapshot.snapshot.name}</h3><p className="text-sm">{snapshot.snapshot.status} · Effective: {snapshot.snapshot.effective_date || '—'}</p><p className="text-sm">{snapshot.snapshot.website} · {snapshot.snapshot.contact} · {snapshot.snapshot.email}</p><p className="whitespace-pre-wrap text-sm">{snapshot.snapshot.notes}</p>{filesView(snapshot.snapshot)}{termsView(snapshot.snapshot)}</div>}
    </section>}
  </div>
}

