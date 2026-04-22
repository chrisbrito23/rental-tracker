import { useState, useEffect } from 'react';
import axios from 'axios';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenantSummary, setTenantSummary] = useState(null);
  const [form, setForm] = useState({
    lease_id: '', amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '', payment_method: 'cash',
    payment_type: 'rent', status: 'paid',
    late_fee_applied: '0', notes: ''
  });

 useEffect(() => {
    const fetchData = async () => {
      try {
        const leasesRes = await axios.get('/api/leases');
        console.log('Raw leases response:', leasesRes);
        setLeases(leasesRes.data.data || []);

        const paymentsRes = await axios.get('/api/payments');
        setPayments(paymentsRes.data.data || []);

        const summaryRes = await axios.get('/api/payments/summary');
        setSummary(summaryRes.data.data);
      } catch (err) {
        console.error('Fetch error full:', err.message, err.response?.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLeaseChange = async (e) => {
    const lease_id = e.target.value;
    setForm(prev => ({ ...prev, lease_id }));
    if (!lease_id) { setTenantSummary(null); return; }
    const selectedLease = leases.find(l => l.id === lease_id);
    if (selectedLease) {
      try {
        const res = await axios.get(`/api/leases/tenant-summary/${selectedLease.tenant_id}`);
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
      const [p, s, l] = await Promise.all([
        axios.get('/api/payments'),
        axios.get('/api/payments/summary'),
        axios.get('/api/leases'),
      ]);
      setPayments(p.data.data || []);
      setSummary(s.data.data);
      setLeases(l.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (score) => score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';

  const statusColor = (status) => {
    if (status === 'paid') return {background:'#dcfce7',color:'#166534'};
    if (status === 'late') return {background:'#fee2e2',color:'#991b1b'};
    if (status === 'pending') return {background:'#fef3c7',color:'#92400e'};
    return {background:'#f3f4f6',color:'#374151'};
  };

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Payments</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>
            Log and track all rent payments — {leases.length} leases loaded
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
          {showForm ? 'Cancel' : '+ Log payment'}
        </button>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1.25rem'}}>Log new payment</div>
          <div style={{fontSize:'11px',color:'red',marginBottom:'8px'}}>Debug: {leases.length} leases available</div>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Select tenant</label>
              <select
                name="lease_id"
                value={form.lease_id}
                onChange={handleLeaseChange}
                required
                style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}
              >
                <option value="">Select tenant lease</option>
                {leases.length > 0 ? leases.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.tenant_name} — {l.property_name} {l.unit_number} (${l.monthly_rent}/mo)
                  </option>
                )) : (
                  <option disabled>No leases found</option>
                )}
              </select>
            </div>

            {tenantSummary && (
              <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem',marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div style={{fontSize:'13px',fontWeight:'500'}}>{tenantSummary.lease.tenant_name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{fontSize:'11px',color:'#666'}}>Payment score</div>
                    <div style={{fontSize:'16px',fontWeight:'700',color:scoreColor(tenantSummary.score)}}>{tenantSummary.score}%</div>
                  </div>
                </div>
                <div style={{height:'6px',background:'#e5e7eb',borderRadius:'3px',marginBottom:'8px'}}>
                  <div style={{height:'6px',borderRadius:'3px',background:scoreColor(tenantSummary.score),width:`${tenantSummary.score}%`,transition:'width 0.5s ease'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',fontSize:'12px'}}>
                  <div>
                    <div style={{color:'#666'}}>Monthly rent</div>
                    <div style={{fontWeight:'500'}}>${tenantSummary.lease.monthly_rent}</div>
                  </div>
                  <div>
                    <div style={{color:'#666'}}>Due date</div>
                    <div style={{fontWeight:'500'}}>{new Date(tenantSummary.due_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{color:'#666'}}>Late fee</div>
                    <div style={{fontWeight:'500',color:tenantSummary.is_late ? '#ef4444' : '#22c55e'}}>
                      {tenantSummary.is_late ? `$${tenantSummary.late_fee_applicable} applies` : 'Not applicable'}
                    </div>
                  </div>
                </div>
                {tenantSummary.payments.length > 0 && (
                  <div style={{marginTop:'10px',paddingTop:'10px',borderTop:'1px solid #eee'}}>
                    <div style={{fontSize:'11px',color:'#666',marginBottom:'6px'}}>Recent payments</div>
                    <div style={{display:'flex',gap:'4px'}}>
                      {tenantSummary.payments.slice(0,6).map((p,i) => (
                        <div key={i} style={{width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'500',...statusColor(p.status)}}>
                          {p.status === 'paid' ? '✓' : p.status === 'late' ? '!' : '?'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Payment method</label>
                <select name="payment_method" value={form.payment_method} onChange={handleChange} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="cash">Cash</option>
                  <option value="cashapp">Cash App</option>
                  <option value="zelle">Zelle</option>
                  <option value="venmo">Venmo</option>
                  <option value="paypal">PayPal</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank transfer</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Payment type</label>
                <select name="payment_type" value={form.payment_type} onChange={handleChange} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="rent">Rent</option>
                  <option value="pet_fee">Pet fee</option>
                  <option value="late_fee">Late fee</option>
                  <option value="deposit">Deposit</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Amount</label>
                <input name="amount" value={form.amount} onChange={handleChange} placeholder="650.00" required type="number" step="0.01" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Payment date</label>
                <input name="payment_date" value={form.payment_date} onChange={handleChange} required type="date" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Due date</label>
                <input name="due_date" value={form.due_date} onChange={handleChange} required type="date" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'1.25rem'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Late fee applied</label>
                <input name="late_fee_applied" value={form.late_fee_applied} onChange={handleChange} placeholder="0.00" type="number" step="0.01" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange} placeholder="Cash App handle or note" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>

            <button type="submit" disabled={submitting} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              {submitting ? 'Saving...' : 'Log payment'}
            </button>
          </form>
        </div>
      )}

      {summary && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Collected this month</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#166534'}}>${Number(summary.total_collected||0).toLocaleString()}</div>
            <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>{summary.paid_count} payments</div>
          </div>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Late fees collected</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#92400e'}}>${Number(summary.total_late_fees||0).toLocaleString()}</div>
            <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>{summary.late_count} late</div>
          </div>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Pending</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#1e40af'}}>{summary.pending_count}</div>
            <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>awaiting payment</div>
          </div>
        </div>
      )}

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
        <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Payment history</div>
        {payments.length === 0 ? (
          <p style={{fontSize:'13px',color:'#666',padding:'1rem 0'}}>No payments recorded yet. Log your first payment above.</p>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Tenant</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Property</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Method</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Date</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Amount</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5'}}>{p.tenant_name}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666'}}>{p.property_name}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666',textTransform:'capitalize'}}>{p.payment_method}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666'}}>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',fontWeight:'500'}}>${Number(p.amount).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5'}}>
                    <span style={{...statusColor(p.status),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Payments;