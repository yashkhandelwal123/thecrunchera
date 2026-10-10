import { useEffect, useState } from 'react';
import { fetchApi, readApiJson } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ShippingPlan, ShippingRate } from '@shared/shipping';

export default function ShippingPlanner({ order, onChanged }: { order: { id: string; shiprocketShipmentId: string | null }; onChanged: () => void }) {
  const [plan, setPlan] = useState<ShippingPlan | null>(null);
  const [form, setForm] = useState({ weightKg: '', lengthCm: '', breadthCm: '', heightCm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [awb, setAwb] = useState('');
  const [selected, setSelected] = useState<ShippingRate | null>(null);
  const [dirty, setDirty] = useState(false);
  const api = async (path: string, body?: unknown) => {
    const response = await fetchApi(`/api/admin/orders/${order.id}/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await readApiJson(response);
    if (!response.ok) throw new Error(data.error || 'Shipping request failed. Refresh and try again.');
    return data;
  };
  useEffect(() => {
    let active = true;
    api('shipping-plan').then(data => {
      if (!active || !data) return;
      setPlan(data);
      setForm({ weightKg: String(data.parcel.weightKg), lengthCm: String(data.parcel.lengthCm), breadthCm: String(data.parcel.breadthCm), heightCm: String(data.parcel.heightCm) });
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [order.id]);
  const prepare = async () => {
    setBusy(true); setError(''); setSelected(null);
    try { setPlan(await api('shipping-plan', { ...form, shippingMode: 'Surface' })); setDirty(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare shipment.'); }
    finally { setBusy(false); }
  };
  const mutate = async (path: string, body: unknown) => {
    setBusy(true); setError('');
    try { await api(path, body); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Shipment action failed. Check the provider dashboard before retrying.'); setSelected(null); }
    finally { setBusy(false); }
  };
  const expired = !plan || Date.parse(plan.expiresAt) <= Date.now();
  return <section className="mt-5 border-t pt-5 space-y-5" aria-label="Shipment preparation and rates">
    <div><h3 className="text-xl font-semibold">1. Prepare shipment & compare rates</h3><p className="text-base text-muted-foreground">Admin only. Enter the complete packed box measurements. Preparation does not book a courier or change the customer's shipping charge.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{([['weightKg', 'Packed weight (kg)'], ['lengthCm', 'Length (cm)'], ['breadthCm', 'Breadth (cm)'], ['heightCm', 'Height (cm)']] as const).map(([key, label]) => <label key={key} className="space-y-2 text-base">{label}<Input type="number" min="0.01" step="0.01" value={form[key]} disabled={busy} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setDirty(true); setSelected(null); }} /></label>)}</div>
    <Button disabled={busy || Object.values(form).some(v => !Number.isFinite(Number(v)) || Number(v) <= 0)} onClick={prepare}>{busy ? 'Please wait…' : 'Save preparation & compare rates'}</Button>
    {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
    {plan && <>
      <p className="text-sm">Preparation saved. Estimates valid until {new Date(plan.expiresAt).toLocaleTimeString()}. Final carrier charges can change after weighing; tax treatment may differ by provider.</p>
      {plan.warnings.map((warning, i) => <p key={i} className="rounded-md bg-amber-50 text-amber-900 p-3" role="status">{warning}</p>)}
      {(expired || dirty) && <p role="status">Refresh rates after changing measurements or when estimates expire.</p>}
      {!!plan.archivedShiprocketIds?.length && <p className="text-sm break-all">Cancelled Shiprocket references: {plan.archivedShiprocketIds.join(', ')}</p>}
      <h3 className="text-xl font-semibold">2. Choose & book when ready</h3>
      <div className="grid md:grid-cols-2 gap-3">{plan.rates.map(rate => <div key={rate.id} className="border rounded-lg p-4 space-y-2">
        <p className="font-semibold">{rate.service} <span className="text-sm font-normal">via {rate.provider === 'shiprocket' ? 'Shiprocket' : 'Delhivery One'}</span></p>
        <p className="text-2xl font-bold tabular-nums">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rate.amount)}</p>
        <p>{rate.chargeableWeightKg} kg billable estimate{rate.estimatedDays ? ` · ${rate.estimatedDays} days estimated` : ''}</p>
        <p className="text-sm text-muted-foreground">{rate.taxNote}</p>
        <Button variant="outline" disabled={busy || expired || dirty || (rate.provider === 'delhivery' && !!order.shiprocketShipmentId)} onClick={() => setSelected(rate)}>{rate.provider === 'shiprocket' && !order.shiprocketShipmentId ? 'Choose & create Shiprocket draft' : 'Choose courier'}</Button>
      </div>)}</div>
      {selected && <div className="rounded-lg border-2 border-primary p-4 space-y-3" role="status">
        <p className="font-semibold">Confirm {selected.service}</p>
        <p>{selected.provider === 'shiprocket' && !order.shiprocketShipmentId ? 'This creates a Shiprocket draft only. Reopen preparation and compare rates to assign the courier afterward, or assign it in Shiprocket.' : 'This books/assigns the courier and generates an AWB. Carrier account charges may apply. Tracking emails will be sent; pickup is arranged separately.'}</p>
        <div className="flex flex-wrap gap-3"><Button disabled={busy || dirty || expired} onClick={() => mutate(selected.provider === 'delhivery' ? 'create-delhivery-shipment' : order.shiprocketShipmentId ? 'assign-courier' : 'create-shipment', { ...plan.parcel, planId: plan.id, rateId: selected.id })}>{selected.provider === 'shiprocket' && !order.shiprocketShipmentId ? 'Create draft only' : 'Confirm booking (billable)'}</Button><Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>Cancel</Button></div>
      </div>}
      <div className="rounded-lg bg-muted p-4 space-y-3">
        <h4 className="font-semibold">Prefer booking on the provider's platform?</h4>
        <p><a className="underline" href="https://app.shiprocket.in/" target="_blank" rel="noreferrer">Open Shiprocket</a> · <a className="underline" href="https://one.delhivery.com/" target="_blank" rel="noreferrer">Open Delhivery One</a></p>
        {order.shiprocketShipmentId ? <><p>To switch to Delhivery, cancel the unassigned draft in Shiprocket first. Verification will retain its reference in the admin history. If a courier is already assigned there, do not create another booking.</p><Button variant="outline" disabled={busy} onClick={() => mutate('verify-shiprocket-cancellation', {})}>Verify Shiprocket cancellation</Button></> : <>
          <p>Delhivery creates an AWB when booking; it has no separate courier marketplace. This saved preparation stays on your website until you book. If booking in Delhivery One, use this exact order reference:</p>
          <code className="block break-all select-all">{order.id}</code>
          <label className="block space-y-2">Delhivery AWB<Input value={awb} onChange={e => setAwb(e.target.value)} placeholder="Enter AWB from Delhivery One" disabled={busy} /></label>
          <Button variant="outline" disabled={busy || !awb.trim()} onClick={() => mutate('import-delhivery-awb', { awb })}>Verify & link existing AWB</Button>
          <p className="text-sm">Verifies the order reference with Delhivery and sends tracking details. Does not create another shipment.</p>
        </>}
      </div>
    </>}
  </section>;
}
