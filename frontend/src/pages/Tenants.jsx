import { useState, useEffect } from 'react';
import axios from 'axios';

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [movingTenant, setMovingTenant] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [tenantSummaries, setTenantSummaries] = useState({});
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', id_type: '', id_number: '', notes: ''
  });

  const fetchData = async () => {
    try {
      const [tenantsRes, propsRes] = await Promise.all([
        axios.get('/api/tenants'),
        axios.get('/api/properties'),
      ]);
      setTenants(tenantsRes.data.data || []);
      setProperties(propsRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchTenantSummary = async (tenant) => {
    if (tenantSummaries[tenant.id]) {
      setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id);
      return;
    }
    try {
      const res = await axios.get('/api/leases/tenant-summary/' + tenant.id);
      if (res.data.success) {
        setTenantSummaries(prev => ({ ...prev, [tenant.id]: res.data.data }));
      }
    } catch (err) {
      console.error(err);
    }
    setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id);
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTenant) {
        await axios.patch('/api/tenants/' + editingTenant.id, form);
        setEditingTenant(null);
      } else {
        await axios.post('/api/tenants', form);
      }
      setForm({ first_name: '', last_name: '', email: '', phone: '', id_type: '', id_number: '', notes: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Delete this tenant? This will also delete their leases and payments.')) return;
    try {
      await axios.delete('/api/tenants/' + tenantId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (tenant) => {
    setForm({
      first_name: tenant.first_name || '',
      last_name: tenant.last_name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      id_type: tenant.id_type || '',
      id_number: tenant.id_number || '',
      notes: tenant.notes || ''
    });
    setEditingTenant(tenant);
    setShowForm(true);
  };

  const handleMove = async (tenantId, newPropertyId) => {
    try {
      await axios.patch('/api/tenants/' + tenantId + '/move', { property_id: newPropertyId });
      setMovingTenant(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const scoreColor = (score) => {
    if (!score && score !== 0) return '#185FA5';
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const scoreBg = (score) => {
    if (!score && score !== 0) return {background:'#dbeafe',color:'#1e40af'};
    if (score >= 90) return {background:'#dcfce7',color:'#166534'};
    if (score >= 70) return {background:'#fef3c7',color:'#92400e'};
    return {background:'#fee2e2',color:'#991b1b'};
  };

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Tenants</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>{tenants.length} active tenants</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingTenant(null); setForm({ first_name:'',last_name:'',email:'',phone:'',id_type:'',id_number:'',notes:'' }); }}
          style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}
        >
          {showForm && !editingTenant ? 'Cancel' : '+ Add tenant'}
        </button>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1.25rem'}}>
            {editingTenant ? 'Edit tenant' : 'New tenant'}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>First name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="James" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Last name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Smith" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Email</label>
                <input name="email" value={form.email} onChange={handleChange} placeholder="james@email.com" type="email" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="610-555-0101" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'1.25rem'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>ID type</label>
                <select name="id_type" value={form.id_type} onChange={handleChange} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="">Select ID type</option>
                  <option value="drivers_license">Drivers license</option>
                  <option value="passport">Passport</option>
                  <option value="state_id">State ID</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>ID number</label>
                <input name="id_number" value={form.id_number} onChange={handleChange} placeholder="DL123456" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" disabled={submitting} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                {submitting ? 'Saving...' : editingTenant ? 'Save changes' : 'Add tenant'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingTenant(null); }} style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {movingTenant && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'1.5rem',width:'400px'}}>
            <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1rem'}}>
              Move {movingTenant.first_name} {movingTenant.last_name}
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Select new property</label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}
              >
                <option value="">Select property</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button
                onClick={() => selectedProperty && handleMove(movingTenant.id, selectedProperty)}
                disabled={!selectedProperty}
                style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}
              >
                Move tenant
              </button>
              <button
                onClick={() => setMovingTenant(null)}
                style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {tenants.map(t => {
          const summary = tenantSummaries[t.id];
          const isExpanded = expandedTenant === t.id;
          return (
            <div key={t.id} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',overflow:'hidden'}}>
              <div style={{padding:'1rem 1.25rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:'600',color:'#1e40af',flexShrink:0}}>
                      {t.first_name[0]}{t.last_name[0]}
                    </div>
                    <div>
                      <div style={{fontSize:'14px',fontWeight:'500'}}>{t.first_name} {t.last_name}</div>
                      <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{t.email || 'No email'}</div>
                      <div style={{fontSize:'11px',color:'#666',marginTop:'1px'}}>{t.property_name || 'No property assigned'} {t.unit_number ? '· ' + t.unit_number : ''}</div>
                    </div>
                  </div>

                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {t.monthly_rent && (
                      <div style={{fontSize:'13px',fontWeight:'500',color:'#1a1a1a'}}>${Number(t.monthly_rent).toLocaleString()}/mo</div>
                    )}
                    {summary && (
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{...scoreBg(summary.score),fontSize:'12px',fontWeight:'600',padding:'3px 10px',borderRadius:'20px'}}>
                          {summary.score}%
                        </div>
                        {summary.is_late && (
                          <span style={{background:'#fee2e2',color:'#991b1b',fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>Late</span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => fetchTenantSummary(t)}
                      style={{background:'#f8f9fa',border:'1px solid #eee',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'#666'}}
                    >
                      {isExpanded ? 'Hide ↑' : 'Expand ↓'}
                    </button>
                    <button
                      onClick={() => handleEdit(t)}
                      style={{background:'#f8f9fa',border:'1px solid #eee',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'#185FA5'}}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setMovingTenant(t); setSelectedProperty(''); }}
                      style={{background:'#f8f9fa',border:'1px solid #eee',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'#666'}}
                    >
                      Move
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{background:'#fee2e2',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'#991b1b'}}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && summary && (
                  <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid #f5f5f5'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1rem'}}>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px 12px'}}>
                        <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Payment score</div>
                        <div style={{fontSize:'20px',fontWeight:'700',color:scoreColor(summary.score)}}>{summary.score}%</div>
                        <div style={{height:'4px',background:'#e5e7eb',borderRadius:'2px',marginTop:'6px'}}>
                          <div style={{height:'4px',borderRadius:'2px',background:scoreColor(summary.score),width:summary.score+'%',transition:'width 0.5s ease'}}/>
                        </div>
                      </div>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px 12px'}}>
                        <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Monthly rent</div>
                        <div style={{fontSize:'18px',fontWeight:'600'}}>${Number(summary.lease.monthly_rent).toLocaleString()}</div>
                        <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>due {summary.due_date}</div>
                      </div>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px 12px'}}>
                        <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Late fee status</div>
                        <div style={{fontSize:'13px',fontWeight:'500',color:summary.is_late ? '#991b1b' : '#166534'}}>
                          {summary.is_late ? '$' + summary.late_fee_applicable + ' applies' : 'Not applicable'}
                        </div>
                        <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>
                          {summary.is_late ? 'Past grace period' : 'Within grace period'}
                        </div>
                      </div>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px 12px'}}>
                        <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Payment history</div>
                        <div style={{display:'flex',gap:'3px',flexWrap:'wrap',marginTop:'4px'}}>
                          {summary.payments && summary.payments.slice(0,6).map((p,i) => (
                            <div key={i} style={{width:'22px',height:'22px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'600',background:p.status==='paid'?'#dcfce7':p.status==='late'?'#fee2e2':'#fef3c7',color:p.status==='paid'?'#166534':p.status==='late'?'#991b1b':'#92400e'}}>
                              {p.status==='paid'?'✓':p.status==='late'?'!':'?'}
                            </div>
                          ))}
                          {(!summary.payments || summary.payments.length === 0) && (
                            <div style={{fontSize:'11px',color:'#999'}}>No payments yet</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px'}}>
                      <div style={{color:'#666'}}>Lease period</div>
                      <div style={{fontWeight:'500'}}>{summary.lease.start_date ? new Date(summary.lease.start_date).toLocaleDateString() : 'N/A'} → {summary.lease.end_date ? new Date(summary.lease.end_date).toLocaleDateString() : 'Month to month'}</div>
                      <div style={{color:'#666'}}>Security deposit</div>
                      <div style={{fontWeight:'500'}}>${Number(summary.lease.security_deposit || 0).toLocaleString()}</div>
                      <div style={{color:'#666'}}>Pet policy</div>
                      <div style={{fontWeight:'500'}}>{summary.lease.pet_allowed ? 'Allowed — $' + summary.lease.pet_deposit + ' deposit' : 'Not allowed'}</div>
                      <div style={{color:'#666'}}>On time payments</div>
                      <div style={{fontWeight:'500'}}>{summary.stats.on_time} of {summary.stats.total_payments}</div>
                    </div>
                  </div>
                )}

                {isExpanded && !summary && (
                  <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid #f5f5f5',fontSize:'13px',color:'#666'}}>
                    No active lease found for this tenant.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tenants;