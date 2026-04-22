import { useState, useEffect } from 'react';
import axios from 'axios';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [form, setForm] = useState({
    property_id: '', category: 'mortgage', amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '', vendor: '', is_recurring: false, tax_deductible: true
  });

  const fetchData = async () => {
    try {
      const [expRes, summaryRes, propsRes] = await Promise.all([
        axios.get('/api/expenses' + (selectedProperty ? '?property_id=' + selectedProperty : '')),
        axios.get('/api/expenses/summary' + (selectedProperty ? '?property_id=' + selectedProperty : '')),
        axios.get('/api/properties'),
      ]);
      setExpenses(expRes.data.data || []);
      setSummary(summaryRes.data.data);
      setProperties(propsRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedProperty]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/expenses', form);
      setForm({ property_id: '', category: 'mortgage', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '', vendor: '', is_recurring: false, tax_deductible: true });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete('/api/expenses/' + id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('bill', file);
      const res = await axios.post('/api/ai/analyze-expense', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
      if (res.data.success) {
        setForm(prev => ({
          ...prev,
          amount: res.data.data.amount || '',
          expense_date: res.data.data.expense_date || prev.expense_date,
          category: res.data.data.category || 'other',
          description: res.data.data.description || '',
          vendor: res.data.data.vendor || '',
          is_recurring: res.data.data.is_recurring || false,
          tax_deductible: res.data.data.tax_deductible !== false
        }));
        setShowForm(true);
        setShowUpload(false);
      }
    } catch (err) {
      console.error(err);
      setUploadResult({ success: false, error: 'Failed to analyze document' });
    } finally {
      setUploading(false);
    }
  };

  const categoryColor = (cat) => {
    const colors = {
      mortgage: {background:'#dbeafe',color:'#1e40af'},
      utilities: {background:'#fef3c7',color:'#92400e'},
      insurance: {background:'#dcfce7',color:'#166534'},
      repairs: {background:'#fee2e2',color:'#991b1b'},
      maintenance: {background:'#f3e8ff',color:'#6b21a8'},
      taxes: {background:'#ffedd5',color:'#9a3412'},
      other: {background:'#f3f4f6',color:'#374151'}
    };
    return colors[cat] || colors.other;
  };

  const groupByMonth = (expenses) => {
    const grouped = {};
    expenses.forEach(e => {
      const month = new Date(e.expense_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!grouped[month]) grouped[month] = { expenses: [], total: 0 };
      grouped[month].expenses.push(e);
      grouped[month].total += parseFloat(e.amount);
    });
    return grouped;
  };

  const getPnL = () => {
    if (!summary) return null;
    const thisMonthExpenses = parseFloat(summary.totals.this_month || 0);
    const thisYearExpenses = parseFloat(summary.totals.this_year || 0);
    return { thisMonthExpenses, thisYearExpenses };
  };

  const pnl = getPnL();
  const grouped = groupByMonth(expenses);

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Expenses</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>Track costs and profit per property</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={() => setShowUpload(!showUpload)} style={{background:'white',color:'#185FA5',border:'1px solid #185FA5',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
            Upload bill
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
            + Add expense
          </button>
        </div>
      </div>

      <div style={{marginBottom:'1.5rem'}}>
        <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Filter by property</label>
        <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px',minWidth:'200px'}}>
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {summary && pnl && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>This month expenses</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#991b1b'}}>{'$' + Number(pnl.thisMonthExpenses).toLocaleString()}</div>
          </div>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>This year expenses</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#991b1b'}}>{'$' + Number(pnl.thisYearExpenses).toLocaleString()}</div>
          </div>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Total expenses</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#991b1b'}}>{'$' + Number(summary.totals.all_time || 0).toLocaleString()}</div>
          </div>
          <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'6px'}}>Tax deductible</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#166534'}}>
              {'$' + Number(expenses.filter(e => e.tax_deductible).reduce((s,e) => s + parseFloat(e.amount), 0)).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1rem'}}>Upload bill or statement</div>
          <div style={{background:'#EFF6FF',borderRadius:'8px',padding:'1rem',marginBottom:'1rem',fontSize:'12px',color:'#1e40af'}}>
            Claude will extract the amount, date, vendor, and category automatically from mortgage statements, utility bills, insurance invoices, and repair receipts.
          </div>
          {uploading ? (
            <div style={{padding:'2rem',textAlign:'center',color:'#185FA5',fontSize:'14px'}}>Analyzing document...</div>
          ) : (
            <label style={{display:'block',border:'2px dashed #ddd',borderRadius:'8px',padding:'2rem',textAlign:'center',cursor:'pointer'}}>
              <div style={{fontSize:'24px',marginBottom:'8px'}}>📄</div>
              <div style={{fontSize:'13px',color:'#666'}}>Click to upload PDF, Word, or text file</div>
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{display:'none'}}/>
            </label>
          )}
          {uploadResult && !uploadResult.success && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'10px',borderRadius:'8px',marginTop:'10px',fontSize:'13px'}}>{uploadResult.error}</div>
          )}
        </div>
      )}

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'1.25rem'}}>
            {uploadResult && uploadResult.success ? 'Review extracted expense — ' + uploadResult.confidence + '% confidence' : 'New expense'}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Property</label>
                <select name="property_id" value={form.property_id} onChange={handleChange} required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="mortgage">Mortgage</option>
                  <option value="utilities">Utilities</option>
                  <option value="insurance">Insurance</option>
                  <option value="repairs">Repairs</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="taxes">Taxes</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Amount</label>
                <input name="amount" value={form.amount} onChange={handleChange} type="number" step="0.01" placeholder="1200.00" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Date</label>
                <input name="expense_date" value={form.expense_date} onChange={handleChange} type="date" required style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Description</label>
                <input name="description" value={form.description} onChange={handleChange} placeholder="Monthly mortgage payment" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Vendor</label>
                <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="Chase Bank" style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'16px',marginBottom:'1.25rem',fontSize:'13px'}}>
              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                <input type="checkbox" name="is_recurring" checked={form.is_recurring} onChange={handleChange}/>
                Recurring expense
              </label>
              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                <input type="checkbox" name="tax_deductible" checked={form.tax_deductible} onChange={handleChange}/>
                Tax deductible
              </label>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" disabled={submitting} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                {submitting ? 'Saving...' : 'Save expense'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setUploadResult(null); }} style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{display:'flex',gap:'8px',marginBottom:'1.5rem'}}>
        {['expenses','pnl'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{padding:'8px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',background:activeTab===tab?'#185FA5':'#f8f9fa',color:activeTab===tab?'white':'#666'}}>
            {tab === 'expenses' ? 'All expenses' : 'P&L report'}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          {Object.entries(grouped).map(([month, {expenses: monthExpenses, total}]) => (
            <div key={month} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',overflow:'hidden'}}>
              <div style={{padding:'10px 16px',background:'#f8f9fa',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:'13px',fontWeight:'500'}}>{month}</div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#991b1b'}}>{'$' + Number(total).toLocaleString()}</div>
              </div>
              {monthExpenses.map(e => (
                <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f5f5f5'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{...categoryColor(e.category),fontSize:'11px',padding:'2px 8px',borderRadius:'20px',textTransform:'capitalize'}}>{e.category}</span>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:'500'}}>{e.description || e.category}</div>
                      <div style={{fontSize:'11px',color:'#666'}}>{e.vendor || e.property_name} · {new Date(e.expense_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {e.tax_deductible && <span style={{background:'#dcfce7',color:'#166534',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Tax deductible</span>}
                    {e.is_recurring && <span style={{background:'#dbeafe',color:'#1e40af',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Recurring</span>}
                    <div style={{fontSize:'14px',fontWeight:'600',color:'#991b1b'}}>{'$' + Number(e.amount).toLocaleString()}</div>
                    <button onClick={() => handleDelete(e.id)} style={{background:'#fee2e2',border:'none',padding:'4px 8px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',color:'#991b1b'}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {expenses.length === 0 && (
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'2rem',textAlign:'center',color:'#666',fontSize:'13px'}}>
              No expenses yet. Add your first expense or upload a bill above.
            </div>
          )}
        </div>
      )}

      {activeTab === 'pnl' && summary && (
        <div>
          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem',marginBottom:'1rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Monthly breakdown by category</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Month</th>
                  <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Category</th>
                  <th style={{textAlign:'right',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthly.map((row, i) => (
                  <tr key={i}>
                    <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f5f5'}}>{row.month}</td>
                    <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f5f5'}}>
                      <span style={{...categoryColor(row.category),fontSize:'11px',padding:'2px 8px',borderRadius:'20px',textTransform:'capitalize'}}>{row.category}</span>
                    </td>
                    <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f5f5',textAlign:'right',fontWeight:'500',color:'#991b1b'}}>{'$' + Number(row.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Yearly breakdown by category</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Year</th>
                  <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Category</th>
                  <th style={{textAlign:'right',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.yearly.map((row, i) => (
                  <tr key={i}>
                    <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f5f5'}}>{row.year}</td>
                    <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f5f5'}}>
                      <span style={{...categoryColor(row.category),fontSize:'11px',padding:'2px 8px',borderRadius:'20px',textTransform:'capitalize'}}>{row.category}</span>
                    </td>
                    <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f5f5',textAlign:'right',fontWeight:'500',color:'#991b1b'}}>{'$' + Number(row.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;