import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, tenantsRes] = await Promise.all([
          axios.get('/api/properties'),
          axios.get('/api/tenants'),
        ]);
        setProperties(propsRes.data.data);
        setTenants(tenantsRes.data.data);
      } catch (err) {
        setError('Failed to connect to API');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;
  if (error) return <div style={{padding:'2rem',color:'#991b1b'}}>{error}</div>;

  return (
    <div style={{padding:'2rem'}}>
      <h1 style={{fontSize:'22px',fontWeight:'600',marginBottom:'1.5rem'}}>Dashboard</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Properties</div>
          <div style={{fontSize:'24px',fontWeight:'600'}}>{properties.length}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Total units</div>
          <div style={{fontSize:'24px',fontWeight:'600'}}>{properties.reduce((s,p) => s + parseInt(p.total_units||0),0)}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Active tenants</div>
          <div style={{fontSize:'24px',fontWeight:'600'}}>{tenants.length}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Occupied units</div>
          <div style={{fontSize:'24px',fontWeight:'600'}}>{properties.reduce((s,p) => s + parseInt(p.occupied_units||0),0)}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
          <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Properties</div>
          {properties.map(p => (
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div>
                <div style={{fontSize:'13px',fontWeight:'500'}}>{p.name}</div>
                <div style={{fontSize:'11px',color:'#666'}}>{p.city}, {p.state}</div>
              </div>
              <div style={{fontSize:'11px',background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:'20px'}}>{p.total_units} units</div>
            </div>
          ))}
        </div>
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
          <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Tenants</div>
          {tenants.map(t => (
            <div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div>
                <div style={{fontSize:'13px',fontWeight:'500'}}>{t.first_name} {t.last_name}</div>
                <div style={{fontSize:'11px',color:'#666'}}>{t.property_name || 'No unit assigned'}</div>
              </div>
              <div style={{fontSize:'11px',background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:'20px'}}>Active</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
