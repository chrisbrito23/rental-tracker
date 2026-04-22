import { useState, useEffect } from 'react';
import axios from 'axios';

function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zip: '', property_type: 'residential'
  });

  const fetchProperties = async () => {
    try {
      const res = await axios.get('/api/properties');
      setProperties(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    const interval = setInterval(fetchProperties, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProperty) {
        await axios.patch('/api/properties/' + editingProperty.id, form);
        setEditingProperty(null);
      } else {
        await axios.post('/api/properties', form);
      }
      setForm({ name: '', address: '', city: '', state: '', zip: '', property_type: 'residential' });
      setShowForm(false);
      fetchProperties();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, address: p.address, city: p.city, state: p.state, zip: p.zip, property_type: p.property_type });
    setEditingProperty(p);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this property? This cannot be undone.')) return;
    try {
      await axios.delete('/api/properties/' + id);
      fetchProperties();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Properties</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>{properties.length} properties</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingProperty(null); setForm({ name:'',address:'',city:'',state:'',zip:'',property_type:'residential' }); }}
          style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}
        >
          {showForm && !editingProperty ? 'Cancel' : '+ Add property'}
        </button>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1.25rem'}}>
            {editingProperty ? 'Edit property' : 'New property'}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Property name</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Oak Street Duplex" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Property type</label>
                <select name="property_type" value={form.property_type} onChange={handleChange} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed use</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Address</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="123 Main Street" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'12px',marginBottom:'1.25rem'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>City</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Reading" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>State</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="PA" required maxLength={2} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>ZIP</label>
                <input name="zip" value={form.zip} onChange={handleChange} placeholder="19601" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" disabled={submitting} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                {submitting ? 'Saving...' : editingProperty ? 'Save changes' : 'Save property'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingProperty(null); }} style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {properties.map(p => (
          <div key={p.id} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:'15px',fontWeight:'500'}}>{p.name}</div>
              <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{p.address}, {p.city}, {p.state} {p.zip}</div>
              <div style={{fontSize:'11px',color:'#666',marginTop:'4px',textTransform:'capitalize'}}>{p.property_type}</div>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <div style={{textAlign:'right',marginRight:'8px'}}>
                <div style={{fontSize:'13px',fontWeight:'500'}}>{p.total_units} units</div>
                <div style={{fontSize:'11px',color:'#22c55e'}}>{p.occupied_units} occupied</div>
              </div>
              <button onClick={() => handleEdit(p)} style={{background:'#f8f9fa',border:'1px solid #eee',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'#185FA5'}}>
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} style={{background:'#fee2e2',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'#991b1b'}}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Properties;