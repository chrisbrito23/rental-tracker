import { useState, useEffect } from 'react';
import axios from 'axios';

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', id_type: '', id_number: '', notes: ''
  });

  const fetchTenants = async () => {
    try {
      const res = await axios.get('/api/tenants');
      setTenants(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/tenants', form);
      setForm({ first_name: '', last_name: '', email: '', phone: '', id_type: '', id_number: '', notes: '' });
      setShowForm(false);
      fetchTenants();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Tenants</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>{tenants.length} active tenants</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
          {showForm ? 'Cancel' : '+ Add tenant'}
        </button>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1.25rem'}}>New tenant</div>
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
                <input name="email" value={form.email} onChange={handleChange} placeholder="james@email.com" required type="email" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="610-555-0101" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
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
            <div style={{marginBottom:'1.25rem'}}>
              <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any notes about this tenant..." rows={3} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',resize:'vertical'}}/>
            </div>
            <button type="submit" disabled={submitting} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              {submitting ? 'Saving...' : 'Save tenant'}
            </button>
          </form>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {tenants.map(t => (
          <div key={t.id} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:'500',color:'#1e40af',flexShrink:0}}>
                {t.first_name[0]}{t.last_name[0]}
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'500'}}>{t.first_name} {t.last_name}</div>
                <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{t.email}</div>
                <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>{t.property_name || 'No unit assigned'}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              {t.monthly_rent && (
                <div style={{fontSize:'13px',fontWeight:'500'}}>${t.monthly_rent}/mo</div>
              )}
              <div style={{fontSize:'11px',background:'#dcfce7',color:'#166534',padding:'3px 10px',borderRadius:'20px'}}>
                Active
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tenants;