import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CATEGORIES = ['mortgage','utilities','insurance','repairs','maintenance','taxes','hoa','other'];

const CAT_COLORS = {
  mortgage:    { bg:'#dbeafe', text:'#1e40af', chart:'#3b82f6' },
  utilities:   { bg:'#fef3c7', text:'#92400e', chart:'#f59e0b' },
  insurance:   { bg:'#dcfce7', text:'#166534', chart:'#22c55e' },
  repairs:     { bg:'#fee2e2', text:'#991b1b', chart:'#ef4444' },
  maintenance: { bg:'#f3e8ff', text:'#6b21a8', chart:'#a855f7' },
  taxes:       { bg:'#ffedd5', text:'#9a3412', chart:'#f97316' },
  hoa:         { bg:'#e0f2fe', text:'#0369a1', chart:'#0ea5e9' },
  other:       { bg:'#f3f4f6', text:'#374151', chart:'#6b7280' },
};

const PERIODS = ['monthly','quarterly','yearly'];
const CHART_TYPES = ['bar','line','pie'];
const EMPTY_FORM = {
  property_id:'', category:'mortgage', amount:'',
  expense_date: new Date().toISOString().split('T')[0],
  description:'', vendor:'', is_recurring:false, tax_deductible:true
};

const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits:0, maximumFractionDigits:0 });
const pct = (n) => Number(n || 0).toFixed(1) + '%';

export default function Expenses() {
  const [expenses,     setExpenses]     = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [properties,   setProperties]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedProp, setSelectedProp] = useState('');
  const [period,       setPeriod]       = useState('monthly');
  const [chartType,    setChartType]    = useState('bar');
  const [hiddenCats,   setHiddenCats]   = useState(new Set());
  const [activeTab,    setActiveTab]    = useState('overview');
  const [showForm,     setShowForm]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [dragOver,     setDragOver]     = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [msg,          setMsg]          = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const q = selectedProp ? '?property_id=' + selectedProp : '';
      const [expRes, sumRes, propRes] = await Promise.all([
        axios.get('/api/expenses' + q),
        axios.get('/api/expenses/summary' + q),
        axios.get('/api/properties'),
      ]);
      setExpenses(expRes.data.data || []);
      setSummary(sumRes.data.data);
      setProperties(propRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedProp]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) await axios.patch('/api/expenses/' + editingId, form);
      else await axios.post('/api/expenses', form);
      setForm(EMPTY_FORM); setShowForm(false); setEditingId(null); setUploadResult(null);
      setMsg({ type:'success', text: editingId ? 'Expense updated' : 'Expense saved' });
      await fetchData();
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.error || 'Failed to save' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await axios.delete('/api/expenses/' + id);
    await fetchData();
  };

  const handleEdit = (exp) => {
    setForm({
      property_id:   exp.property_id || '',
      category:      exp.category || 'other',
      amount:        exp.amount || '',
      expense_date:  exp.expense_date?.split('T')[0] || '',
      description:   exp.description || '',
      vendor:        exp.vendor || '',
      is_recurring:  exp.is_recurring || false,
      tax_deductible: exp.tax_deductible !== false,
    });
    setEditingId(exp.id);
    setShowForm(true);
    setUploadResult(null);
  };

  const processFile = async (file) => {
    if (!file) return;
    setUploading(true); setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append('bill', file);
      const res = await axios.post('/api/ai/analyze-expense', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(res.data);
      if (res.data.success) {
        const d = res.data.data;
        setForm(p => ({
          ...p,
          amount:        d.amount || '',
          expense_date:  d.expense_date || p.expense_date,
          category:      d.category || 'other',
          description:   d.description || '',
          vendor:        d.vendor || '',
          is_recurring:  d.is_recurring || false,
          tax_deductible: d.tax_deductible !== false,
        }));
        setShowForm(true);
      }
    } catch (err) {
      setUploadResult({ success:false, error:'Failed to analyze document' });
    } finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const toggleCat = (cat) => {
    setHiddenCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const getChartData = () => {
    if (!summary) return [];
    const raw = period === 'monthly' ? summary.monthly : period === 'quarterly' ? summary.quarterly : summary.yearly;
    const grouped = {};
    raw.forEach(r => {
      const key = r.month || r.label || r.year;
      if (!grouped[key]) grouped[key] = { name: String(key) };
      if (!hiddenCats.has(r.category)) {
        grouped[key][r.category] = (grouped[key][r.category] || 0) + parseFloat(r.total);
        grouped[key].total = (grouped[key].total || 0) + parseFloat(r.total);
      }
    });
    return Object.values(grouped).slice(0, 12).reverse();
  };

  const getPnLData = () => (summary?.pnl_chart || []).slice(0, 12).reverse();

  const visibleCats = CATEGORIES.filter(c => !hiddenCats.has(c));
  const chartData = getChartData();
  const pnlData = getPnLData();
  const totals = summary?.totals;
  const incomeTotals = summary?.income_totals;
  const netMonth = (incomeTotals?.this_month || 0) - parseFloat(totals?.this_month || 0);
  const netYear  = (incomeTotals?.this_year  || 0) - parseFloat(totals?.this_year  || 0);

  if (loading) return <div style={{padding:'2rem',color:'#666'}}>Loading...</div>;

  return (
    <div style={{padding:'2rem',maxWidth:'1200px'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>Expenses & P&L</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>Full financial overview of your portfolio</p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'flex-end'}}>
          <select value={selectedProp} onChange={e => setSelectedProp(e.target.value)}
            style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
            <option value="">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); setUploadResult(null); }}
            style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
            + Add expense
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'1rem',fontSize:'13px',
          background:msg.type==='success'?'#dcfce7':'#fee2e2',color:msg.type==='success'?'#166534':'#991b1b'}}>
          {msg.text}
        </div>
      )}

      {/* KPI Cards */}
      {totals && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
          {[
            { label:'This month expenses', value:fmt(totals.this_month),        color:'#991b1b', sub:'Income: '+fmt(incomeTotals?.this_month) },
            { label:'Net this month',      value:fmt(netMonth),                 color:netMonth>=0?'#166534':'#991b1b', sub:netMonth>=0?'Profitable':'Operating loss' },
            { label:'This year expenses',  value:fmt(totals.this_year),         color:'#991b1b', sub:'Income: '+fmt(incomeTotals?.this_year) },
            { label:'Net this year',       value:fmt(netYear),                  color:netYear>=0?'#166534':'#991b1b',  sub:netYear>=0?'Profitable':'Operating loss' },
            { label:'Tax deductible',      value:fmt(totals.tax_deductible),    color:'#166534', sub:'Eligible deductions' },
            { label:'Recurring costs',     value:fmt(totals.recurring),         color:'#92400e', sub:'Monthly fixed costs' },
            { label:'All time expenses',   value:fmt(totals.all_time),          color:'#374151', sub:`${expenses.length} expenses logged` },
            { label:'All time income',     value:fmt(incomeTotals?.all_time),   color:'#166534', sub:'From paid rent' },
          ].map((c,i) => (
            <div key={i} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1rem'}}>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'6px'}}>{c.label}</div>
              <div style={{fontSize:'20px',fontWeight:'700',color:c.color}}>{c.value}</div>
              <div style={{fontSize:'11px',color:'#999',marginTop:'4px'}}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Upload */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{border:`2px dashed ${dragOver?'#185FA5':'#ddd'}`,borderRadius:'12px',padding:'1.25rem',
          textAlign:'center',background:dragOver?'#eff6ff':'white',transition:'all 0.2s',marginBottom:'1.5rem',cursor:'pointer'}}
      >
        {uploading ? (
          <div style={{color:'#185FA5',fontSize:'13px'}}>Analyzing document with AI...</div>
        ) : (
          <label style={{cursor:'pointer',display:'block'}}>
            <div style={{fontSize:'24px',marginBottom:'6px'}}>📊</div>
            <div style={{fontSize:'13px',fontWeight:'500',color:'#185FA5'}}>Drop any financial document here</div>
            <div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>
              Mortgage statements · Bank statements · Utility bills · Insurance · Receipts · CSV / OFX exports
            </div>
            <input type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ofx,.qfx"
              onChange={e => processFile(e.target.files[0])} style={{display:'none'}} />
          </label>
        )}
        {uploadResult && !uploadResult.success && (
          <div style={{color:'#991b1b',fontSize:'13px',marginTop:'8px'}}>{uploadResult.error}</div>
        )}
        {uploadResult?.success && (
          <div style={{marginTop:'8px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            <span style={{background:uploadResult.confidence>=95?'#dcfce7':'#fef3c7',
              color:uploadResult.confidence>=95?'#166534':'#92400e',
              fontSize:'12px',padding:'3px 10px',borderRadius:'20px',fontWeight:'500'}}>
              {uploadResult.confidence}% confidence · {uploadResult.document_type?.replace(/_/g,' ')}
            </span>
            {uploadResult.needs_review && (
              <span style={{background:'#fef3c7',color:'#92400e',fontSize:'12px',padding:'3px 10px',borderRadius:'20px'}}>
                ⚠ Needs review
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{background:'white',borderRadius:'12px',border:`1px solid ${uploadResult?.needs_review?'#f59e0b':'#eee'}`,padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{editingId ? 'Edit expense' : uploadResult?.success ? `AI extracted — ${uploadResult.confidence}% confidence` : 'New expense'}</span>
            {uploadResult?.needs_review && (
              <span style={{background:'#fef3c7',color:'#92400e',fontSize:'12px',padding:'4px 10px',borderRadius:'20px'}}>⚠ Please review</span>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Property</label>
                <select name="property_id" value={form.property_id} onChange={handleChange} required
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Category</label>
                <select name="category" value={form.category} onChange={handleChange}
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Amount ($)</label>
                <input name="amount" value={form.amount} onChange={handleChange} type="number" step="0.01" required
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:`1px solid ${uploadResult?.needs_review?'#f59e0b':'#ddd'}`,fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Date</label>
                <input name="expense_date" value={form.expense_date} onChange={handleChange} type="date" required
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:`1px solid ${uploadResult?.needs_review?'#f59e0b':'#ddd'}`,fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Description</label>
                <input name="description" value={form.description} onChange={handleChange} placeholder="Monthly mortgage payment"
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>Vendor</label>
                <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="Chase Bank"
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'13px'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'16px',marginBottom:'1.25rem',fontSize:'13px'}}>
              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                <input type="checkbox" name="is_recurring" checked={form.is_recurring} onChange={handleChange}/>
                Recurring
              </label>
              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                <input type="checkbox" name="tax_deductible" checked={form.tax_deductible} onChange={handleChange}/>
                Tax deductible
              </label>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" disabled={submitting}
                style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                {submitting ? 'Saving...' : editingId ? 'Update expense' : 'Save expense'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setUploadResult(null); setMsg(null); }}
                style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'1.5rem',background:'#f8f9fa',borderRadius:'10px',padding:'4px',width:'fit-content'}}>
        {[['overview','Overview'],['expenses','All expenses'],['pnl','P&L Report'],['property','By property']].map(([key,label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{padding:'7px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',
              background:activeTab===key?'white':'transparent',color:activeTab===key?'#185FA5':'#666',
              fontWeight:activeTab===key?'600':'400',boxShadow:activeTab===key?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && summary && (
        <div>
          <div style={{display:'flex',gap:'8px',marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',gap:'4px',background:'#f8f9fa',borderRadius:'8px',padding:'3px'}}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{padding:'5px 12px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'12px',
                    background:period===p?'white':'transparent',color:period===p?'#185FA5':'#666',fontWeight:period===p?'600':'400'}}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{display:'flex',gap:'4px',background:'#f8f9fa',borderRadius:'8px',padding:'3px'}}>
              {CHART_TYPES.map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  style={{padding:'5px 12px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'12px',
                    background:chartType===t?'white':'transparent',color:chartType===t?'#185FA5':'#666',fontWeight:chartType===t?'600':'400'}}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'1rem'}}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => toggleCat(cat)}
                style={{padding:'4px 10px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',
                  background:hiddenCats.has(cat)?'#f3f4f6':CAT_COLORS[cat].bg,
                  color:hiddenCats.has(cat)?'#999':CAT_COLORS[cat].text,
                  opacity:hiddenCats.has(cat)?0.5:1,textDecoration:hiddenCats.has(cat)?'line-through':'none'}}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem',marginBottom:'1.5rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>
              Expenses by {period} — {selectedProp ? properties.find(p=>p.id===selectedProp)?.name : 'All properties'}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie data={summary.by_category.filter(c=>!hiddenCats.has(c.category))}
                    dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100}
                    label={({category,percentage})=>`${category} ${pct(percentage)}`}>
                    {summary.by_category.filter(c=>!hiddenCats.has(c.category)).map((c,i) => (
                      <Cell key={i} fill={CAT_COLORS[c.category]?.chart || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} />
                  <Legend />
                </PieChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} tickFormatter={v=>'$'+Number(v/1000).toFixed(0)+'k'} />
                  <Tooltip formatter={v=>fmt(v)} />
                  <Legend />
                  {visibleCats.map(cat => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={CAT_COLORS[cat].chart} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} tickFormatter={v=>'$'+Number(v/1000).toFixed(0)+'k'} />
                  <Tooltip formatter={v=>fmt(v)} />
                  <Legend />
                  {visibleCats.map(cat => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLORS[cat].chart} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem',marginBottom:'1.5rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Income vs Expenses (last 12 months)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{fontSize:11}} />
                <YAxis tick={{fontSize:11}} tickFormatter={v=>'$'+Number(v/1000).toFixed(0)+'k'} />
                <Tooltip formatter={v=>fmt(v)} />
                <Legend />
                <Bar dataKey="income"   fill="#22c55e" radius={[4,4,0,0]} name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
                <Bar dataKey="net"      fill="#3b82f6" radius={[4,4,0,0]} name="Net" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>Category breakdown</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {summary.by_category.map(c => (
                <div key={c.category} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{background:CAT_COLORS[c.category]?.bg,color:CAT_COLORS[c.category]?.text,
                    fontSize:'11px',padding:'2px 8px',borderRadius:'20px',minWidth:'80px',textAlign:'center',textTransform:'capitalize'}}>
                    {c.category}
                  </span>
                  <div style={{flex:1,height:'8px',background:'#f3f4f6',borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{width:pct(c.percentage),height:'8px',background:CAT_COLORS[c.category]?.chart,borderRadius:'4px',transition:'width 0.3s'}} />
                  </div>
                  <span style={{fontSize:'12px',color:'#666',minWidth:'40px',textAlign:'right'}}>{pct(c.percentage)}</span>
                  <span style={{fontSize:'13px',fontWeight:'600',minWidth:'80px',textAlign:'right'}}>{fmt(c.total)}</span>
                  <span style={{fontSize:'11px',color:'#999',minWidth:'60px',textAlign:'right'}}>{c.count} entries</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {expenses.length === 0 && (
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'2rem',textAlign:'center',color:'#666',fontSize:'13px'}}>
              No expenses yet. Add one above or drop a document in the upload zone.
            </div>
          )}
          {expenses.map(e => (
            <div key={e.id} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'14px 16px',
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{background:CAT_COLORS[e.category]?.bg,color:CAT_COLORS[e.category]?.text,
                  fontSize:'11px',padding:'3px 10px',borderRadius:'20px',textTransform:'capitalize',flexShrink:0}}>
                  {e.category}
                </span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'500'}}>{e.description || e.category}</div>
                  <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>
                    {e.property_name} · {e.vendor} · {new Date(e.expense_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                {e.tax_deductible && <span style={{background:'#dcfce7',color:'#166534',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Tax ✓</span>}
                {e.is_recurring && <span style={{background:'#dbeafe',color:'#1e40af',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Recurring</span>}
                <div style={{fontSize:'15px',fontWeight:'700',color:'#991b1b',minWidth:'70px',textAlign:'right'}}>{fmt(e.amount)}</div>
                <button onClick={() => handleEdit(e)}
                  style={{background:'white',border:'1px solid #ddd',padding:'4px 8px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',color:'#666'}}>
                  Edit
                </button>
                <button onClick={() => handleDelete(e.id)}
                  style={{background:'#fee2e2',border:'none',padding:'4px 8px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',color:'#991b1b'}}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* P&L TAB */}
      {activeTab === 'pnl' && summary && (
        <div>
          <div style={{display:'flex',gap:'4px',background:'#f8f9fa',borderRadius:'8px',padding:'3px',marginBottom:'1.5rem',width:'fit-content'}}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{padding:'6px 14px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'12px',
                  background:period===p?'white':'transparent',color:period===p?'#185FA5':'#666',fontWeight:period===p?'600':'400'}}>
                {p}
              </button>
            ))}
          </div>
          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',background:'#f8f9fa',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:'14px',fontWeight:'500'}}>{period.charAt(0).toUpperCase()+period.slice(1)} P&L breakdown</div>
              <button onClick={() => window.print()}
                style={{background:'#185FA5',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'12px'}}>
                Export PDF
              </button>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#fafafa'}}>
                  <th style={{textAlign:'left',padding:'10px 16px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Period</th>
                  <th style={{textAlign:'left',padding:'10px 16px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Category</th>
                  <th style={{textAlign:'right',padding:'10px 16px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(period==='monthly' ? summary.monthly : period==='quarterly' ? summary.quarterly : summary.yearly).map((row,i) => (
                  <tr key={i} style={{borderBottom:'1px solid #f5f5f5'}}>
                    <td style={{padding:'10px 16px',color:'#374151'}}>{row.month || row.label || row.year}</td>
                    <td style={{padding:'10px 16px'}}>
                      <span style={{background:CAT_COLORS[row.category]?.bg,color:CAT_COLORS[row.category]?.text,
                        fontSize:'11px',padding:'2px 8px',borderRadius:'20px',textTransform:'capitalize'}}>
                        {row.category}
                      </span>
                    </td>
                    <td style={{padding:'10px 16px',textAlign:'right',fontWeight:'600',color:'#991b1b'}}>{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BY PROPERTY TAB */}
      {activeTab === 'property' && summary && (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {summary.by_property.map(p => {
            const propExpenses = expenses.filter(e => e.property_id === p.id);
            const byCat = CATEGORIES.reduce((acc, cat) => {
              const total = propExpenses.filter(e=>e.category===cat).reduce((s,e)=>s+parseFloat(e.amount),0);
              if (total > 0) acc[cat] = total;
              return acc;
            }, {});
            return (
              <div key={p.id} style={{background:'white',borderRadius:'12px',border:'1px solid #eee',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',background:'#f8f9fa',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:'500',fontSize:'14px'}}>{p.name}</div>
                  <div style={{display:'flex',gap:'16px',fontSize:'13px'}}>
                    <span style={{color:'#991b1b'}}>Total: {fmt(p.total_expenses)}</span>
                    <span>This month: {fmt(p.this_month)}</span>
                  </div>
                </div>
                <div style={{padding:'12px 16px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {Object.entries(byCat).map(([cat,total]) => (
                    <div key={cat} style={{background:CAT_COLORS[cat]?.bg,borderRadius:'8px',padding:'8px 12px',minWidth:'120px'}}>
                      <div style={{fontSize:'11px',color:CAT_COLORS[cat]?.text,textTransform:'capitalize',marginBottom:'3px'}}>{cat}</div>
                      <div style={{fontSize:'14px',fontWeight:'600',color:CAT_COLORS[cat]?.text}}>{fmt(total)}</div>
                    </div>
                  ))}
                  {Object.keys(byCat).length === 0 && (
                    <div style={{fontSize:'13px',color:'#999'}}>No expenses logged for this property</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}