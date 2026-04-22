import { useState, useEffect } from 'react';
import axios from 'axios';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentsRes, summaryRes] = await Promise.all([
          axios.get('/api/payments'),
          axios.get('/api/payments/summary'),
        ]);
        setPayments(paymentsRes.data.data);
        setSummary(summaryRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statusColor = (status) => {
    if (status === 'paid') return {background:'#dcfce7',color:'#166534'};
    if (status === 'late') return {background:'#fee2e2',color:'#991b1b'};
    if (status === 'pending') return {background:'#fef3c7',color:'#92400e'};
    return {background:'#f3f4f6',color:'#374151'};
  };

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:'22px',fontWeight:'600'}}>Payments</h1>
        <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>This month</p>
      </div>

      {summary && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Collected</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#166534'}}>${Number(summary.total_collected || 0).toLocaleString()}</div>
            <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>{summary.paid_count} payments</div>
          </div>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Late fees collected</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#92400e'}}>${Number(summary.total_late_fees || 0).toLocaleString()}</div>
            <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>{summary.late_count} late payments</div>
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
          <p style={{fontSize:'13px',color:'#666',padding:'1rem 0'}}>No payments recorded yet.</p>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Tenant</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Property</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Date</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Amount</th>
                <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5'}}>{p.tenant_name}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666'}}>{p.property_name} — {p.unit_number}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',color:'#666'}}>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5',fontWeight:'500'}}>${Number(p.amount).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid #f5f5f5'}}>
                    <span style={{...statusColor(p.status),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                      {p.status}
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

export default Payments;