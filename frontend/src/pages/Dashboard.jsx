import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/dashboard/summary');
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;
  if (!data) return <div style={{padding:'2rem',color:'#991b1b'}}>Failed to load dashboard</div>;

  const netColor = data.net_income >= 0 ? '#166534' : '#991b1b';

  return (
    <div style={{padding:'2rem'}}>
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:'22px',fontWeight:'600',color:'#1a1a1a'}}>Dashboard</h1>
        <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>April 2026</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Monthly income</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#166534'}}>${Number(data.monthly_income).toLocaleString()}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Expenses</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#991b1b'}}>${Number(data.monthly_expenses).toLocaleString()}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Net income</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:netColor}}>${Number(data.net_income).toLocaleString()}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Occupancy</div>
          <div style={{fontSize:'24px',fontWeight:'600'}}>{data.occupied_units}/{data.total_units}</div>
          <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>units occupied</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
          <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Income — last 6 months</div>
          {data.income_chart.length === 0 ? (
            <p style={{fontSize:'13px',color:'#666'}}>No payment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.income_chart} margin={{top:0,right:0,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:12,fill:'#666'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:12,fill:'#666'}} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Income']} contentStyle={{borderRadius:'8px',border:'1px solid #eee',fontSize:'12px'}}/>
                <Bar dataKey="total" fill="#185FA5" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
          <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Overview</div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{fontSize:'13px',color:'#666'}}>Properties</div>
              <div style={{fontSize:'15px',fontWeight:'600'}}>{data.properties}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{fontSize:'13px',color:'#666'}}>Tenants</div>
              <div style={{fontSize:'15px',fontWeight:'600'}}>{data.tenants}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{fontSize:'13px',color:'#666'}}>Total units</div>
              <div style={{fontSize:'15px',fontWeight:'600'}}>{data.total_units}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
              <div style={{fontSize:'13px',color:'#666'}}>Occupied</div>
              <div style={{fontSize:'15px',fontWeight:'600',color: data.occupied_units > 0 ? '#166534' : '#991b1b'}}>{data.occupied_units}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;