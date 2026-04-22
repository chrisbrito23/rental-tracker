import { useState, useEffect } from 'react';
import axios from 'axios';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [unpaid, setUnpaid] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    tenant_id: '', property_id: '', lease_id: '',
    amount: '', description: '', category: '',
    due_date: '', notes: ''
  });

  const fetchData = async () => {
    try {
      const [invRes, unpaidRes, tenantsRes, propsRes] = await Promise.all([
        axios.get('/api/invoices'),
        axios.get('/api/invoices/unpaid'),
        axios.get('/api/tenants'),
        axios.get('/api/properties'),
      ]);
      setInvoices(invRes.data.data);
      setUnpaid(unpaidRes.data.data);
      setTenants(tenantsRes.data.data);
      setProperties(propsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/invoices', form);
      setForm({ tenant_id: '', property_id: '', lease_id: '', amount: '', description: '', category: '', due_date: '', notes: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'paid') return {background:'#dcfce7',color:'#166534'};
    if (status === 'unpaid') return {background:'#fee2e2',color:'#991b1b'};
    if (status === 'overdue') return {background:'#7f1d1d',color:'white'};
    return {background:'#f3f4f6',color:'#374151'};
  };

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Invoices</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>{unpaid.length} unpaid invoices</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
          {showForm ? 'Cancel' : '+ Create invoice'}
        </button>
      </div>

      {unpaid.length > 0 && (
        <div style={{background:'#fee2e2',borderRadius:'12px',padding:'1rem 1.25rem',marginBottom:'1.5rem',border:'1px solid #fecaca'}}>
          <div style={{fontSize:'13px',fontWeight:'500',color:'#991b1b',marginBottom:'8px'}}>{unpaid.length} unpaid invoice{unpaid.length > 1 ? 's' : ''} outstanding</div>
          {unpaid.map(i => (
            <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#991b1b',padding:'4px 0'}}>
              <span>{i.tenant_name} — {i.description}</span>
              <span style={{fontWeight:'500'}}>${Number(i.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1.25rem'}}>New invoice</div>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Tenant</label>
                <select name="tenant_id" value={form.tenant_id} onChange={handleChange} required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="">Select tenant</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Property</label>
                <select name="property_id" value={form.property_id} onChange={handleChange} required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="">Select property</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Amount</label>
                <input name="amount" value={form.amount} onChange={handleChange} placeholder="250.00" required type="number" step="0.01" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Due date</label>
                <input name="due_date" value={form.due_date} onChange={handleChange} required type="date" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="">Select category</option>
                  <option value="damage_repair">Damage repair</option>
                  <option value="cleaning_fee">Cleaning fee</option>
                  <option value="key_replacement">Key replacement</option>
                  <option value="pest_control">Pest control</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Description</label>
                <input name="description" value={form.description} onChange={handleChange} placeholder="Broken window repair" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{marginBottom:'1.25rem'}}>
              <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Additional details..." rows={2} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',resize:'vertical'}}/>
            </div>
            <button type="submit" disabled={submitting} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              {submitting ? 'Saving...' : 'Create invoice'}
            </button>
          </form>
        </div>
      )}

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
        <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>All invoices</div>
        {invoices.length === 0 ? (
          <p style={{fontSize:'13px',color:'#666',padding:'1rem 0'}}>No invoices yet.</p>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Tenant</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Description</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Amount</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Due date</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(i => (
                <tr key={i.id}>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5'}}>{i.tenant_name}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666'}}>{i.description}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',fontWeight:'500'}}>${Number(i.amount).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666'}}>{new Date(i.due_date).toLocaleDateString()}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5'}}>
                    <span style={{...statusColor(i.status),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                      {i.status}
                    </span>
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

export default Invoices;