import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [tenantSummary, setTenantSummary] = useState(null);
  const [form, setForm] = useState({
    lease_id: '', amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '', payment_method: 'cash',
    payment_type: 'rent', status: 'paid',
    late_fee_applied: '0', notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [leasesRes, paymentsRes, summaryRes] = await Promise.all([
        axios.get('/api/leases'),
        axios.get('/api/payments'),
        axios.get('/api/payments/summary'),
      ]);
      setLeases(leasesRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
      setSummary(summaryRes.data.data);
    } catch (err) {
      console.error('Fetch error:', err.message, err.response?.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLeaseChange = async (e) => {
    const lease_id = e.target.value;
    setForm(prev => ({ ...prev, lease_id }));
    setTenantSummary(null);
    if (!lease_id) return;
    const selectedLease = leases.find(l => l.id === lease_id);
    if (selectedLease) {
      try {
        const res = await axios.get('/api/leases/tenant-summary/' + selectedLease.tenant_id);
        if (res.data.success) {
          setTenantSummary(res.data.data);
          setForm(prev => ({
            ...prev,
            lease_id,
            amount: selectedLease.monthly_rent,
            due_date: res.data.data.due_date,
            late_fee_applied: res.data.data.late_fee_applicable || '0'
          }));
        }
      } catch (err) {
        console.error('Tenant summary error:', err);
      }
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      await axios.post('/api/payments', form);
      setForm({
        lease_id: '', amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '', payment_method: 'cash',
        payment_type: 'rent', status: 'paid',
        late_fee_applied: '0', notes: ''
      });
      setShowForm(false);
      setTenantSummary(null);
      setSubmitMsg({ type: 'success', text: 'Payment logged successfully' });
      fetchData();
    } catch (err) {
      console.error(err);
      setSubmitMsg({ type: 'error', text: err.response?.data?.error || 'Failed to log payment' });
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (score) => score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';

  const statusStyle = (status) => {
    if (status === 'paid') return { background: '#dcfce7', color: '#166534' };
    if (status === 'late') return { background: '#fee2e2', color: '#991b1b' };
    if (status === 'pending') return { background: '#fef3c7', color: '#92400e' };
    return { background: '#f3f4f6', color: '#374151' };
  };

  if (loading) return <div style={{ padding: '2rem', color: '#666' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600' }}>Payments</h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            {leases.length === 0
              ? 'No leases found — add a tenant with lease details first'
              : `${leases.length} lease${leases.length > 1 ? 's' : ''} · ${payments.length} payment${payments.length !== 1 ? 's' : ''} logged`}
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSubmitMsg(null); }}
          style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          {showForm ? 'Cancel' : '+ Log payment'}
        </button>
      </div>

      {submitMsg && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '13px', background: submitMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: submitMsg.type === 'success' ? '#166534' : '#991b1b' }}>
          {submitMsg.text}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          {[
            { label: 'Collected this month', value: '$' + Number(summary.total_collected || 0).toLocaleString(), color: '#166534' },
            { label: 'Late payments', value: '$' + Number(summary.total_late || 0).toLocaleString(), color: '#991b1b' },
            { label: 'Late fees collected', value: '$' + Number(summary.total_late_fees || 0).toLocaleString(), color: '#92400e' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1rem' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{c.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {i === 0 && `${summary.paid_count || 0} payments`}
                {i === 1 && `${summary.late_count || 0} late`}
                {i === 2 && `${summary.pending_count || 0} pending`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log payment form */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '1.25rem' }}>Log new payment</div>
          {leases.length === 0 && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '13px', background: '#fef3c7', color: '#92400e' }}>
              No leases found. Add a tenant with lease details first.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Select tenant</label>
              <select name="lease_id" value={form.lease_id} onChange={handleLeaseChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                <option value="">Select tenant lease</option>
                {leases.map(l => (
                  <option key={l.id} value={l.id}>{l.tenant_name} — {l.property_name} Unit {l.unit_number} (${Number(l.monthly_rent).toLocaleString()}/mo)</option>
                ))}
              </select>
            </div>

            {/* Tenant context card */}
            {tenantSummary && (
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>Payment score</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: scoreColor(tenantSummary.score) }}>{tenantSummary.score}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>Total owed</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: tenantSummary.total_owed > 0 ? '#991b1b' : '#166534' }}>
                    ${Number(tenantSummary.total_owed || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>Late fee</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: tenantSummary.is_late ? '#991b1b' : '#166534' }}>
                    {tenantSummary.is_late ? '$' + tenantSummary.late_fee_applicable + ' applies' : 'None due'}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount ($)</label>
                <input name="amount" value={form.amount} onChange={handleChange} type="number" required placeholder="1200"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Payment date</label>
                <input name="payment_date" value={form.payment_date} onChange={handleChange} type="date" required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Due date</label>
                <input name="due_date" value={form.due_date} onChange={handleChange} type="date"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Payment method</label>
                <select name="payment_method" value={form.payment_method} onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="zelle">Zelle</option>
                  <option value="venmo">Venmo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="late">Late</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Late fee applied ($)</label>
                <input name="late_fee_applied" value={form.late_fee_applied} onChange={handleChange} type="number"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="e.g. Check #1042"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting}
                style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                {submitting ? 'Saving...' : 'Log payment'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setTenantSummary(null); }}
                style={{ background: 'white', color: '#666', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment history */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', fontSize: '14px', fontWeight: '500' }}>
          Payment history
        </div>
        {payments.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            No payments logged yet. Add a tenant with a lease first, then log payments here.
          </div>
        ) : (
          payments.map((p) => (
            <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '13px' }}>{p.tenant_name}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {p.property_name} · Unit {p.unit_number} · {p.payment_method} · {new Date(p.payment_date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>${Number(p.amount).toLocaleString()}</div>
                  {p.late_fee_applied > 0 && (
                    <div style={{ fontSize: '11px', color: '#991b1b' }}>+${Number(p.late_fee_applied).toLocaleString()} late fee</div>
                  )}
                </div>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: '500', ...statusStyle(p.status) }}>
                  {p.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Payments;
