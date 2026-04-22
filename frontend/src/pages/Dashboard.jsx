import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [data, setData] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantSummaries, setTenantSummaries] = useState({});
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, tenantsRes] = await Promise.all([
          axios.get('/api/dashboard/summary'),
          axios.get('/api/tenants'),
        ]);
        setData(dashRes.data.data);
        setTenants(tenantsRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchTenantSummary = async (tenantId) => {
    if (expandedTenant === tenantId) { setExpandedTenant(null); return; }
    try {
      const res = await axios.get('/api/leases/tenant-summary/' + tenantId);
      if (res.data.success) setTenantSummaries(prev => ({ ...prev, [tenantId]: res.data.data }));
    } catch (err) { console.error(err); }
    setExpandedTenant(tenantId);
  };

  const scoreColor = (s) => s >= 90 ? '#22c55e' : s >= 70 ? '#f59e0b' : '#ef4444';
  const scoreBg = (s) => s >= 90 ? {background:'#dcfce7',color:'#166534'} : s >= 70 ? {background:'#fef3c7',color:'#92400e'} : {background:'#fee2e2',color:'#991b1b'};

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;
  if (!data) return <div style={{padding:'2rem',color:'#991b1b'}}>Failed to load</div>;

  return (
    <div style={{padding:'2rem'}}>
      <h1 style={{fontSize:'22px',fontWeight:'600',marginBottom:'4px'}}>Dashboard</h1>
      <p style={{fontSize:'13px',color:'#666',marginBottom:'1.5rem'}}>April 2026</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Monthly income</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#166534'}}>{'$' + Number(data.monthly_income).toLocaleString()}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Expenses</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#991b1b'}}>{'$' + Number(data.monthly_expenses).toLocaleString()}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Net income</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:data.net_income >= 0 ? '#166534' : '#991b1b'}}>{'$' + Number(data.net_income).toLocaleString()}</div>
        </div>
        <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Occupancy</div>
          <div style={{fontSize:'24px',fontWeight:'600'}}>{data.occupied_units + '/' + data.total_units}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1rem',marginBottom:'1.5rem'}}>
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
          <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Income - last 6 months</div>
          {data.income_chart.length === 0 ? <p style={{color:'#666',fontSize:'13px'}}>No data yet</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.income_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:12,fill:'#666'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:12,fill:'#666'}} axisLine={false} tickLine={false} tickFormatter={v => '$'+v}/>
                <Tooltip formatter={(value) => ['$'+Number(value).toLocaleString(),'Income']}/>
                <Bar dataKey="total" fill="#185FA5" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
          <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Overview</div>
          {[['Properties',data.properties],['Tenants',data.tenants],['Total units',data.total_units],['Occupied',data.occupied_units]].map(([label,value],i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{fontSize:'13px',color:'#666'}}>{label}</div>
              <div style={{fontSize:'15px',fontWeight:'600'}}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
        <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Tenant overview - {tenants.length} tenants</div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {tenants.map(t => {
            const summary = tenantSummaries[t.id];
            const isExpanded = expandedTenant === t.id;
            return (
              <div key={t.id} style={{borderRadius:'10px',border:'1px solid ' + (isExpanded ? '#185FA5' : '#eee'),overflow:'hidden'}}>
                <div onClick={() => fetchTenantSummary(t.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:isExpanded ? '#EFF6FF' : '#f8f9fa',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'600',color:'#1e40af'}}>
                      {t.first_name[0]}{t.last_name[0]}
                    </div>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:'500'}}>{t.first_name + ' ' + t.last_name}</div>
                      <div style={{fontSize:'11px',color:'#666'}}>{t.property_name || 'No property'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {t.monthly_rent && <div style={{fontSize:'12px',fontWeight:'500'}}>{'$' + Number(t.monthly_rent).toLocaleString() + '/mo'}</div>}
                    {summary && <span style={{...scoreBg(summary.score),fontSize:'11px',fontWeight:'600',padding:'2px 10px',borderRadius:'20px'}}>{summary.score + '%'}</span>}
                    {summary && summary.total_owed > 0 && <span style={{background:'#fee2e2',color:'#991b1b',fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>{'Owes $' + Number(summary.total_owed).toLocaleString()}</span>}
                    {summary && summary.is_late && <span style={{background:'#fee2e2',color:'#991b1b',fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>Late</span>}
                    <span style={{fontSize:'11px',color:'#666'}}>{isExpanded ? 'hide' : 'expand'}</span>
                  </div>
                </div>
                {isExpanded && summary && (
                  <div style={{padding:'14px',borderTop:'1px solid #eee',background:'white'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'12px'}}>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px'}}>
                        <div style={{fontSize:'10px',color:'#666',marginBottom:'4px'}}>Payment score</div>
                        <div style={{fontSize:'20px',fontWeight:'700',color:scoreColor(summary.score)}}>{summary.score + '%'}</div>
                        <div style={{height:'4px',background:'#e5e7eb',borderRadius:'2px',marginTop:'6px'}}>
                          <div style={{height:'4px',borderRadius:'2px',background:scoreColor(summary.score),width:summary.score+'%'}}/>
                        </div>
                      </div>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px'}}>
                        <div style={{fontSize:'10px',color:'#666',marginBottom:'4px'}}>Monthly rent</div>
                        <div style={{fontSize:'18px',fontWeight:'600'}}>{'$' + Number(summary.lease.monthly_rent).toLocaleString()}</div>
                        <div style={{fontSize:'10px',color:'#666',marginTop:'2px'}}>{'due ' + summary.due_date}</div>
                      </div>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px'}}>
                        <div style={{fontSize:'10px',color:'#666',marginBottom:'4px'}}>Total rent owed</div>
                        <div style={{fontSize:'18px',fontWeight:'700',color:summary.total_owed > 0 ? '#991b1b' : '#166534'}}>{'$' + Number(summary.total_owed || 0).toLocaleString()}</div>
                        <div style={{fontSize:'10px',color:'#666',marginTop:'2px'}}>{summary.months_elapsed + ' months - $' + Number(summary.total_paid||0).toLocaleString() + ' paid of $' + Number(summary.total_expected||0).toLocaleString()}</div>
                      </div>
                      <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px'}}>
                        <div style={{fontSize:'10px',color:'#666',marginBottom:'4px'}}>Late fee</div>
                        <div style={{fontSize:'13px',fontWeight:'500',color:summary.is_late ? '#991b1b' : '#166534'}}>{summary.is_late ? '$' + summary.late_fee_applicable + ' applies' : 'Not applicable'}</div>
                      </div>
                    </div>
                    <div style={{marginBottom:'10px'}}>
                      <div style={{fontSize:'11px',color:'#666',marginBottom:'6px'}}>Payment history</div>
                      <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                        {summary.payments && summary.payments.slice(0,12).map((p,i) => (
                          <div key={i} style={{width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'600',background:p.status==='paid'?'#dcfce7':p.status==='late'?'#fee2e2':'#fef3c7',color:p.status==='paid'?'#166534':p.status==='late'?'#991b1b':'#92400e'}}>
                            {p.status==='paid'?'Y':p.status==='late'?'L':'P'}
                          </div>
                        ))}
                        {(summary.payments.length === 0) && <span style={{fontSize:'11px',color:'#999'}}>No payments yet</span>}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',fontSize:'12px',paddingTop:'10px',borderTop:'1px solid #f5f5f5'}}>
                      <div><div style={{color:'#666',marginBottom:'2px'}}>Lease start</div><div style={{fontWeight:'500'}}>{summary.lease.start_date ? new Date(summary.lease.start_date).toLocaleDateString() : 'N/A'}</div></div>
                      <div><div style={{color:'#666',marginBottom:'2px'}}>Lease end</div><div style={{fontWeight:'500'}}>{summary.lease.end_date ? new Date(summary.lease.end_date).toLocaleDateString() : 'Month to month'}</div></div>
                      <div><div style={{color:'#666',marginBottom:'2px'}}>Deposit</div><div style={{fontWeight:'500'}}>{'$' + Number(summary.lease.security_deposit||0).toLocaleString()}</div></div>
                      <div><div style={{color:'#666',marginBottom:'2px'}}>On time</div><div style={{fontWeight:'500'}}>{summary.stats.on_time + ' of ' + summary.stats.total_payments}</div></div>
                    </div>
                  </div>
                )}
                {isExpanded && !summary && <div style={{padding:'12px 14px',borderTop:'1px solid #eee',fontSize:'13px',color:'#666'}}>No active lease found.</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
