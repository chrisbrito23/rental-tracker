import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const INCOME_TYPES = [
  { value: 'w2',             label: 'W-2 Employment' },
  { value: 'self_employed',  label: 'Self-Employed' },
  { value: 'business',       label: 'Business Income' },
  { value: 'rental',         label: 'Rental Income' },
  { value: '1099',           label: '1099 / Freelance' },
  { value: 'dividends',      label: 'Dividends & Interest' },
  { value: 'investment',     label: 'Investment Returns' },
  { value: 'social_security',label: 'Social Security' },
  { value: 'pension',        label: 'Pension / Retirement' },
  { value: 'alimony',        label: 'Alimony / Child Support' },
  { value: 'side_income',    label: 'Side Income' },
  { value: 'other',          label: 'Other' },
];

const ASSET_TYPES = [
  { value: 'real_estate',    label: 'Real Estate' },
  { value: 'vehicle',        label: 'Vehicle' },
  { value: 'checking',       label: 'Checking Account' },
  { value: 'savings',        label: 'Savings Account' },
  { value: 'retirement',     label: 'Retirement (401k/IRA)' },
  { value: 'investment',     label: 'Brokerage / Investment' },
  { value: 'crypto',         label: 'Cryptocurrency' },
  { value: 'business',       label: 'Business Value' },
  { value: 'life_insurance', label: 'Life Insurance (Cash Value)' },
  { value: 'other',          label: 'Other Asset' },
];

const LIABILITY_TYPES = [
  { value: 'mortgage',       label: 'Mortgage' },
  { value: 'auto_loan',      label: 'Auto Loan' },
  { value: 'credit_card',    label: 'Credit Card' },
  { value: 'student_loan',   label: 'Student Loan' },
  { value: 'personal_loan',  label: 'Personal Loan' },
  { value: 'heloc',          label: 'HELOC' },
  { value: 'business_loan',  label: 'Business Loan' },
  { value: 'medical',        label: 'Medical Debt' },
  { value: 'other',          label: 'Other Debt' },
];

const GOAL_TYPES = [
  { value: 'net_worth',   label: 'Net Worth Target' },
  { value: 'savings',     label: 'Savings Goal' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'property',    label: 'Property Purchase' },
  { value: 'retirement',  label: 'Retirement Fund' },
  { value: 'emergency',   label: 'Emergency Fund' },
  { value: 'investment',  label: 'Investment Target' },
  { value: 'other',       label: 'Other Goal' },
];

const RELATIONSHIPS = ['self','spouse','partner','dependent','parent','other'];
const FREQUENCIES   = ['weekly','biweekly','monthly','quarterly','annually'];
const PIE_COLORS    = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#10b981','#6b7280'];

const TX_COLORS = {
  housing:'#3b82f6', food:'#f59e0b', transport:'#8b5cf6',
  utilities:'#06b6d4', insurance:'#22c55e', healthcare:'#ef4444',
  entertainment:'#f97316', shopping:'#ec4899', savings:'#10b981', other:'#6b7280',
};

const SCORE_COLOR = s => s>=800?'#22c55e':s>=740?'#84cc16':s>=670?'#f59e0b':s>=580?'#f97316':'#ef4444';
const SCORE_LABEL = s => s>=800?'Exceptional':s>=740?'Very Good':s>=670?'Good':s>=580?'Fair':'Poor';

const fmt = (n,d=0) => '$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const pct = n => Number(n||0).toFixed(1)+'%';
const toMonthly = (amount,freq) => {
  const a=parseFloat(amount||0);
  if(freq==='weekly')    return a*4.33;
  if(freq==='biweekly')  return a*2.17;
  if(freq==='quarterly') return a/3;
  if(freq==='annually')  return a/12;
  return a;
};

const Card = ({children,style={}}) => (
  <div style={{background:'white',borderRadius:'16px',border:'1px solid #f0f0f0',padding:'1.25rem',...style}}>
    {children}
  </div>
);

const KPI = ({label,value,sub,color='#111'}) => (
  <Card>
    <div style={{fontSize:'11px',color:'#888',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
    <div style={{fontSize:'22px',fontWeight:'700',color,letterSpacing:'-0.5px'}}>{value}</div>
    {sub&&<div style={{fontSize:'11px',color:'#999',marginTop:'4px'}}>{sub}</div>}
  </Card>
);

const Tag = ({label,bg='#f0f0f0',color='#555'}) => (
  <span style={{background:bg,color,fontSize:'11px',padding:'2px 8px',borderRadius:'20px',textTransform:'capitalize',fontWeight:'500'}}>{label}</span>
);

const Btn = ({onClick,children,variant='primary',disabled,style={}}) => {
  const s = {
    primary:  {background:'#111',color:'white',border:'none'},
    secondary:{background:'white',color:'#111',border:'1px solid #e5e5e5'},
    danger:   {background:'#fee2e2',color:'#991b1b',border:'none'},
    ghost:    {background:'transparent',color:'#666',border:'none'},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...s[variant],padding:'7px 16px',borderRadius:'10px',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:'500',...style}}>
      {children}
    </button>
  );
};

const Inp = ({label,name,value,onChange,type='text',placeholder,options,style={}}) => (
  <div>
    {label&&<label style={{fontSize:'12px',color:'#666',display:'block',marginBottom:'4px'}}>{label}</label>}
    {options?(
      <select name={name} value={value} onChange={onChange}
        style={{width:'100%',padding:'8px 12px',borderRadius:'10px',border:'1px solid #e5e5e5',fontSize:'13px',background:'white',...style}}>
        {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    ):(
      <input name={name} value={value} onChange={onChange} type={type} placeholder={placeholder}
        style={{width:'100%',padding:'8px 12px',borderRadius:'10px',border:'1px solid #e5e5e5',fontSize:'13px',...style}}/>
    )}
  </div>
);

function RecommendBtn({category,amount}) {
  const [loading,setLoading]=useState(false);
  const [recs,setRecs]=useState(null);
  const [open,setOpen]=useState(false);
  const fetch=async()=>{
    if(recs){setOpen(!open);return;}
    setLoading(true);
    try{
      const res=await axios.post('/api/finances/recommend',{category,amount});
      setRecs(res.data.data);setOpen(true);
    }catch{setRecs(['Unable to get recommendations.']);setOpen(true);}
    finally{setLoading(false);}
  };
  return(
    <div style={{position:'relative',display:'inline-block'}}>
      <button onClick={fetch} style={{background:'none',border:'1px solid #e5e5e5',borderRadius:'8px',padding:'3px 8px',fontSize:'11px',cursor:'pointer',color:'#666'}}>
        {loading?'...':'💡'}
      </button>
      {open&&recs&&(
        <div style={{position:'absolute',right:0,top:'28px',width:'280px',background:'white',border:'1px solid #e5e5e5',borderRadius:'12px',padding:'12px',zIndex:100,boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>
          <div style={{fontSize:'11px',fontWeight:'600',color:'#888',marginBottom:'8px',textTransform:'uppercase'}}>💡 Recommendations</div>
          {recs.map((r,i)=>(
            <div key={i} style={{fontSize:'12px',color:'#374151',padding:'6px 0',borderBottom:i<recs.length-1?'1px solid #f5f5f5':'none',lineHeight:'1.5'}}>
              {i+1}. {r}
            </div>
          ))}
          <button onClick={()=>setOpen(false)} style={{marginTop:'8px',fontSize:'11px',color:'#999',background:'none',border:'none',cursor:'pointer'}}>Close</button>
        </div>
      )}
    </div>
  );
}

// ─── Credit Report Upload Component ──────────────────────────────────────────
function CreditReportUpload({onComplete}) {
  const [uploading,setUploading]=useState(false);
  const [result,setResult]=useState(null);
  const [dragOver,setDragOver]=useState(false);

  const processFile = async(file) => {
    if(!file) return;
    setUploading(true);setResult(null);
    try{
      const fd=new FormData();
      fd.append('report',file);
      const res=await axios.post('/api/ai/analyze-credit-report',fd,{headers:{'Content-Type':'multipart/form-data'}});
      setResult(res.data);
      if(onComplete) onComplete();
    }catch(err){
      setResult({success:false,error:err.response?.data?.error||'Failed to analyze'});
    }finally{setUploading(false);}
  };

  const confidenceBg = (c) => c>=95?'#dcfce7':c>=50?'#fef3c7':'#fee2e2';
  const confidenceColor = (c) => c>=95?'#166534':c>=50?'#92400e':'#991b1b';
  const confidenceLabel = (c) => c>=95?'✓ Auto-added':c>=50?'⚠ Review':'✗ Low confidence';

  return(
    <div style={{marginBottom:'1.5rem'}}>
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)processFile(f);}}
        style={{border:`2px dashed ${dragOver?'#3b82f6':'#e5e5e5'}`,borderRadius:'12px',padding:'1.5rem',
          textAlign:'center',background:dragOver?'#eff6ff':'#fafafa',transition:'all 0.2s',cursor:'pointer'}}
      >
        {uploading?(
          <div style={{color:'#3b82f6',fontSize:'13px'}}>🔍 Analyzing credit report — extracting all accounts...</div>
        ):(
          <label style={{cursor:'pointer',display:'block'}}>
            <div style={{fontSize:'24px',marginBottom:'6px'}}>📋</div>
            <div style={{fontSize:'13px',fontWeight:'600',color:'#3b82f6'}}>Drop credit report here</div>
            <div style={{fontSize:'12px',color:'#888',marginTop:'4px'}}>
              Experian · Equifax · TransUnion · Chase Credit Journey · Any PDF credit report
            </div>
            <div style={{fontSize:'11px',color:'#aaa',marginTop:'4px'}}>
              Extracts all accounts — mortgages, student loans, credit cards, auto loans
            </div>
            <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={e=>processFile(e.target.files[0])} style={{display:'none'}}/>
          </label>
        )}
      </div>

      {result&&result.success&&(
        <Card style={{marginTop:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontSize:'14px',fontWeight:'600'}}>
              ✅ Credit report analyzed — {result.accounts_created} accounts added, {result.accounts_needs_review} need review
            </div>
            <span style={{background:result.overall_confidence>=95?'#dcfce7':'#fef3c7',
              color:result.overall_confidence>=95?'#166534':'#92400e',
              fontSize:'12px',padding:'3px 10px',borderRadius:'20px',fontWeight:'500'}}>
              {result.overall_confidence}% overall confidence
            </span>
          </div>

          {/* Summary row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'12px'}}>
            {[
              {label:'Credit score',value:result.data.credit_score||'N/A',color:'#111'},
              {label:'Total debt',value:fmt(result.data.total_debt),color:'#991b1b'},
              {label:'Utilization',value:pct(result.data.credit_utilization),color:result.data.credit_utilization>30?'#ef4444':'#22c55e'},
              {label:'Accounts',value:result.data.open_accounts+' open',color:'#111'},
            ].map((k,i)=>(
              <div key={i} style={{background:'#f8f9fa',borderRadius:'10px',padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'3px',textTransform:'uppercase'}}>{k.label}</div>
                <div style={{fontSize:'16px',fontWeight:'700',color:k.color}}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Account list */}
          <div style={{maxHeight:'400px',overflowY:'auto'}}>
            {result.data.accounts?.filter(a=>a.balance>0).map((acct,i)=>{
              const conf = acct.confidence || result.overall_confidence;
              const bg = conf>=95?'white':conf>=50?'#fffbeb':'#fff5f5';
              const border = conf>=95?'#f0f0f0':conf>=50?'#fde68a':'#fecaca';
              return(
                <div key={i} style={{padding:'10px 12px',marginBottom:'6px',borderRadius:'10px',
                  background:bg,border:`1px solid ${border}`,
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'500'}}>{acct.creditor}</div>
                    <div style={{fontSize:'11px',color:'#888'}}>
                      {acct.account_type?.replace(/_/g,' ')}
                      {acct.monthly_payment?` · ${fmt(acct.monthly_payment)}/mo`:''}
                      {acct.interest_rate?` · ${acct.interest_rate}% APR`:''}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{background:confidenceBg(conf),color:confidenceColor(conf),
                      fontSize:'10px',padding:'2px 8px',borderRadius:'12px',fontWeight:'600'}}>
                      {confidenceLabel(conf)} {conf}%
                    </span>
                    <span style={{fontSize:'14px',fontWeight:'700',color:'#991b1b'}}>{fmt(acct.balance)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {result.accounts_needs_review>0&&(
            <div style={{marginTop:'10px',padding:'8px 12px',background:'#fffbeb',borderRadius:'8px',border:'1px solid #fde68a',fontSize:'12px',color:'#92400e'}}>
              ⚠ {result.accounts_needs_review} accounts highlighted in yellow have confidence below 50% — please review and edit in the Net Worth tab.
            </div>
          )}
        </Card>
      )}
      {result&&!result.success&&(
        <div style={{marginTop:'8px',padding:'10px',background:'#fee2e2',borderRadius:'8px',fontSize:'13px',color:'#991b1b'}}>
          {result.error}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Finances() {
  const [data,         setData]         = useState(null);
  const [members,      setMembers]      = useState([]);
  const [properties,   setProperties]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [memberFilter, setMemberFilter] = useState('');
  const [incomeView,   setIncomeView]   = useState('rental');
  const [msg,          setMsg]          = useState(null);
  const [modal,        setModal]        = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState({});

  const fetchData = useCallback(async()=>{
    try{
      const q=memberFilter?'?member_id='+memberFilter:'';
      const [sumRes,propRes]=await Promise.all([
        axios.get('/api/finances/summary'+q),
        axios.get('/api/properties'),
      ]);
      setData(sumRes.data.data);
      setMembers(sumRes.data.data?.members||[]);
      setProperties(propRes.data.data||[]);
    }catch(err){console.error(err);}
    finally{setLoading(false);}
  },[memberFilter]);

  useEffect(()=>{fetchData();},[fetchData]);

  const handleChange=e=>{
    const v=e.target.type==='checkbox'?e.target.checked:e.target.value;
    setForm(p=>({...p,[e.target.name]:v}));
  };

  const openModal=(type,existing=null)=>{
    setForm(existing||{});
    setModal({type,editing:existing?.id||null});
    setMsg(null);
  };
  const closeModal=()=>{setModal(null);setForm({});};

  const handleSave=async()=>{
    setSaving(true);
    try{
      const eps={
        income:    '/api/finances/income',
        asset:     '/api/finances/assets',
        liability: '/api/finances/liabilities',
        goal:      '/api/finances/goals',
        credit:    '/api/finances/credit',
        member:    '/api/finances/members',
        bank:      '/api/finances/bank-accounts',
      };
      const url=eps[modal.type];
      if(modal.editing) await axios.patch(url+'/'+modal.editing,form);
      else              await axios.post(url,form);
      closeModal();
      await fetchData();
      setMsg({type:'success',text:'Saved successfully'});
      setTimeout(()=>setMsg(null),3000);
    }catch(err){
      setMsg({type:'error',text:err.response?.data?.error||'Failed to save'});
    }finally{setSaving(false);}
  };

  const handleDelete=async(type,id)=>{
    if(!window.confirm('Delete this item?')) return;
    const eps={
      income:    '/api/finances/income',
      asset:     '/api/finances/assets',
      liability: '/api/finances/liabilities',
      goal:      '/api/finances/goals',
      member:    '/api/finances/members',
      bank:      '/api/finances/bank-accounts',
    };
    await axios.delete(eps[type]+'/'+id);
    await fetchData();
  };

  if(loading) return <div style={{padding:'2rem',color:'#888',fontSize:'14px'}}>Loading financial data...</div>;

  const t=data?.totals||{};
  const netWorthColor=t.net_worth>=0?'#22c55e':'#ef4444';
  const totalIncomeSources=data?.income||[];
  const totalMonthlyIncome=t.monthly_income||0;

  const incomeByType=totalIncomeSources.reduce((acc,i)=>{
    const monthly=toMonthly(i.amount,i.frequency);
    acc[i.source_type]=(acc[i.source_type]||0)+monthly;
    return acc;
  },{});
  const incomePieData=Object.entries(incomeByType).map(([name,value])=>({name,value:Math.round(value)}));

  return(
    <div style={{padding:'2rem',maxWidth:'1200px',background:'#fafafa',minHeight:'100vh'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',letterSpacing:'-0.5px'}}>Financial Overview</h1>
          <p style={{fontSize:'13px',color:'#888',marginTop:'4px'}}>Your complete financial picture</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <select value={memberFilter} onChange={e=>setMemberFilter(e.target.value)}
            style={{padding:'8px 12px',borderRadius:'10px',border:'1px solid #e5e5e5',fontSize:'13px',background:'white'}}>
            <option value="">All household members</option>
            {members.map(m=><option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>)}
          </select>
          <Btn onClick={()=>openModal('member')} variant="secondary">+ Add member</Btn>
        </div>
      </div>

      {msg&&(
        <div style={{padding:'10px 14px',borderRadius:'10px',marginBottom:'1rem',fontSize:'13px',
          background:msg.type==='success'?'#dcfce7':'#fee2e2',
          color:msg.type==='success'?'#166534':'#991b1b'}}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
        <KPI label="Net Worth"      value={fmt(t.net_worth)}      color={netWorthColor} sub={`${fmt(t.total_assets)} assets − ${fmt(t.total_liabilities)} debts`}/>
        <KPI label="Monthly Income" value={fmt(t.monthly_income)} color="#111"          sub={`${totalIncomeSources.length} active income sources`}/>
        <KPI label="Savings Rate"   value={pct(t.savings_rate)}   color={t.savings_rate>=20?'#22c55e':'#f59e0b'} sub="of monthly income"/>
        <KPI label="Debt-to-Income" value={pct(t.debt_to_income)} color={t.debt_to_income<=36?'#22c55e':'#ef4444'} sub={t.debt_to_income<=36?'Healthy':'High — consider reducing'}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'2rem'}}>
        <KPI label="Rental Income/mo"   value={fmt(t.rental_income_month)}  color="#22c55e" sub={`${fmt(t.rental_income_year)} this year`}/>
        <KPI label="Rental Expenses/mo" value={fmt(t.rental_expense_month)} color="#ef4444" sub={`${fmt(t.rental_expense_year)} this year`}/>
        <KPI label="Rental Net/mo"      value={fmt(t.rental_net_month)}     color={t.rental_net_month>=0?'#22c55e':'#ef4444'} sub="cash flow"/>
        <KPI label="Bank Balances"      value={fmt(t.total_bank_balance)}   color="#111" sub={`${data?.bank_accounts?.length||0} accounts`}/>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'2px',marginBottom:'2rem',background:'#f0f0f0',borderRadius:'12px',padding:'4px',width:'fit-content'}}>
        {[['overview','Overview'],['networth','Net Worth'],['income','Income'],['cashflow','Cash Flow'],['credit','Credit'],['goals','Goals'],['household','Household']].map(([key,label])=>(
          <button key={key} onClick={()=>setActiveTab(key)}
            style={{padding:'8px 18px',borderRadius:'10px',border:'none',cursor:'pointer',fontSize:'13px',
              background:activeTab===key?'white':'transparent',color:activeTab===key?'#111':'#777',
              fontWeight:activeTab===key?'600':'400',boxShadow:activeTab===key?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab==='overview'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div style={{fontSize:'14px',fontWeight:'600'}}>Income breakdown</div>
                <div style={{display:'flex',gap:'4px'}}>
                  {['rental','all'].map(v=>(
                    <button key={v} onClick={()=>setIncomeView(v)}
                      style={{padding:'4px 10px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'12px',
                        background:incomeView===v?'#111':'#f0f0f0',color:incomeView===v?'white':'#666'}}>
                      {v==='rental'?'Rental':'All income'}
                    </button>
                  ))}
                </div>
              </div>
              {incomeView==='rental'?(
                <div>
                  {[
                    {label:'Gross rental income',value:fmt(t.rental_income_month),color:'#22c55e'},
                    {label:'Operating expenses', value:'−'+fmt(t.rental_expense_month),color:'#ef4444'},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                      <span style={{fontSize:'13px',color:'#666'}}>{r.label}</span>
                      <span style={{fontSize:'13px',fontWeight:'600',color:r.color}}>{r.value}/mo</span>
                    </div>
                  ))}
                  <div style={{height:'1px',background:'#f0f0f0',margin:'10px 0'}}/>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:'14px',fontWeight:'600'}}>Net rental cash flow</span>
                    <span style={{fontSize:'14px',fontWeight:'700',color:t.rental_net_month>=0?'#22c55e':'#ef4444'}}>{fmt(t.rental_net_month)}/mo</span>
                  </div>
                </div>
              ):(
                <div>
                  {incomePieData.length>0?(
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={incomePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                          label={({name,value})=>`${name}: ${fmt(value)}`}>
                          {incomePieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={v=>fmt(v)+'/mo'}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ):(
                    <div style={{padding:'2rem',textAlign:'center',color:'#999',fontSize:'13px'}}>No income sources added yet</div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #f0f0f0',paddingTop:'10px'}}>
                    <span style={{fontSize:'13px',color:'#666'}}>Total monthly income</span>
                    <span style={{fontSize:'14px',fontWeight:'700',color:'#22c55e'}}>{fmt(totalMonthlyIncome)}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'1rem'}}>Balance sheet</div>
              <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                <div style={{flex:1,background:'#f0fdf4',borderRadius:'10px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#16a34a',marginBottom:'4px'}}>ASSETS</div>
                  <div style={{fontSize:'20px',fontWeight:'700',color:'#15803d'}}>{fmt(t.total_assets)}</div>
                </div>
                <div style={{flex:1,background:'#fef2f2',borderRadius:'10px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#dc2626',marginBottom:'4px'}}>LIABILITIES</div>
                  <div style={{fontSize:'20px',fontWeight:'700',color:'#b91c1c'}}>{fmt(t.total_liabilities)}</div>
                </div>
              </div>
              <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'12px',textAlign:'center',marginBottom:'12px'}}>
                <div style={{fontSize:'11px',color:'#888',marginBottom:'4px'}}>NET WORTH</div>
                <div style={{fontSize:'24px',fontWeight:'800',color:netWorthColor,letterSpacing:'-1px'}}>{fmt(t.net_worth)}</div>
              </div>
              {data?.assets?.slice(0,4).map((a,i)=>(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'8px'}}>
                  <span style={{fontSize:'11px',color:'#666',minWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</span>
                  <div style={{flex:1,height:'6px',background:'#f0f0f0',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{width:pct((parseFloat(a.value)/t.total_assets)*100),height:'6px',background:PIE_COLORS[i],borderRadius:'3px'}}/>
                  </div>
                  <span style={{fontSize:'11px',fontWeight:'600',minWidth:'70px',textAlign:'right'}}>{fmt(a.value)}</span>
                </div>
              ))}
            </Card>
          </div>

          {data?.transactions_by_category?.length>0&&(
            <Card style={{marginBottom:'16px'}}>
              <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'1rem'}}>Spending by category (last 30 days)</div>
              {data.transactions_by_category.map(c=>(
                <div key={c.category} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                  <span style={{background:(TX_COLORS[c.category]||'#6b7280')+'20',color:TX_COLORS[c.category]||'#6b7280',
                    fontSize:'11px',padding:'2px 8px',borderRadius:'20px',minWidth:'90px',textAlign:'center',textTransform:'capitalize'}}>
                    {c.category||'other'}
                  </span>
                  <div style={{flex:1,height:'8px',background:'#f0f0f0',borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{width:pct(c.percentage),height:'8px',background:TX_COLORS[c.category]||'#6b7280',borderRadius:'4px'}}/>
                  </div>
                  <span style={{fontSize:'12px',color:'#888',minWidth:'35px',textAlign:'right'}}>{pct(c.percentage)}</span>
                  <span style={{fontSize:'13px',fontWeight:'600',minWidth:'75px',textAlign:'right'}}>{fmt(c.total)}</span>
                  <RecommendBtn category={c.category} amount={Math.round(c.total)}/>
                </div>
              ))}
            </Card>
          )}

          {data?.goals?.filter(g=>!g.is_achieved).length>0&&(
            <Card>
              <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'1rem'}}>Goal progress</div>
              {data.goals.filter(g=>!g.is_achieved).slice(0,3).map(g=>{
                const progress=Math.min(100,(parseFloat(g.current_amount)/parseFloat(g.target_amount))*100);
                const daysLeft=g.target_date?Math.ceil((new Date(g.target_date)-new Date())/86400000):null;
                return(
                  <div key={g.id} style={{marginBottom:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                      <span style={{fontSize:'13px',fontWeight:'500'}}>{g.name}</span>
                      <span style={{fontSize:'12px',color:'#888'}}>
                        {fmt(g.current_amount)} / {fmt(g.target_amount)}
                        {daysLeft&&<span style={{marginLeft:'8px',color:daysLeft<90?'#ef4444':'#888'}}>{daysLeft}d left</span>}
                      </span>
                    </div>
                    <div style={{height:'8px',background:'#f0f0f0',borderRadius:'4px',overflow:'hidden'}}>
                      <div style={{width:pct(progress),height:'8px',background:progress>=100?'#22c55e':'#3b82f6',borderRadius:'4px',transition:'width 0.5s'}}/>
                    </div>
                    <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>{progress.toFixed(1)}% complete</div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {/* NET WORTH */}
      {activeTab==='networth'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontSize:'16px',fontWeight:'600'}}>Assets & Liabilities</div>
            <div style={{display:'flex',gap:'8px'}}>
              <Btn onClick={()=>openModal('asset')} variant="secondary">+ Asset</Btn>
              <Btn onClick={()=>openModal('liability')}>+ Liability</Btn>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <Card>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#16a34a',marginBottom:'1rem',display:'flex',justifyContent:'space-between'}}>
                <span>ASSETS</span><span>{fmt(t.total_assets)}</span>
              </div>
              {(!data?.assets||data.assets.length===0)&&<div style={{fontSize:'13px',color:'#999',textAlign:'center',padding:'1rem'}}>No assets added yet</div>}
              {data?.assets?.map(a=>(
                <div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid #f5f5f5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'500'}}>{a.name}</div>
                    <div style={{fontSize:'11px',color:'#888'}}>{a.asset_type?.replace(/_/g,' ')}{a.institution?' · '+a.institution:''}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontSize:'14px',fontWeight:'700',color:'#15803d'}}>{fmt(a.value)}</span>
                    <Btn onClick={()=>openModal('asset',a)} variant="ghost" style={{padding:'3px 8px',fontSize:'11px'}}>Edit</Btn>
                    <Btn onClick={()=>handleDelete('asset',a.id)} variant="danger" style={{padding:'3px 8px',fontSize:'11px'}}>×</Btn>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#dc2626',marginBottom:'1rem',display:'flex',justifyContent:'space-between'}}>
                <span>LIABILITIES</span><span>{fmt(t.total_liabilities)}</span>
              </div>
              {(!data?.liabilities||data.liabilities.length===0)&&<div style={{fontSize:'13px',color:'#999',textAlign:'center',padding:'1rem'}}>No liabilities added yet</div>}
              {data?.liabilities?.map(l=>{
                const needsReview = l.notes==='NEEDS_REVIEW';
                const conf = parseFloat(l.ai_confidence||100);
                const rowBg = !l.ai_extracted?'white':conf>=95?'white':conf>=50?'#fffbeb':'#fff5f5';
                const rowBorder = !l.ai_extracted?'#f5f5f5':conf>=95?'#f5f5f5':conf>=50?'#fde68a':'#fecaca';
                return(
                  <div key={l.id} style={{padding:'10px',marginBottom:'6px',borderRadius:'10px',
                    background:rowBg,border:`1px solid ${rowBorder}`,
                    display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                        <span style={{fontSize:'13px',fontWeight:'500'}}>{l.name}</span>
                        {l.ai_extracted&&conf<95&&(
                          <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'10px',fontWeight:'600',
                            background:conf>=50?'#fef3c7':'#fee2e2',color:conf>=50?'#92400e':'#991b1b'}}>
                            {conf>=50?'⚠ Review':'✗ Low confidence'} {Math.round(conf)}%
                          </span>
                        )}
                        {l.ai_extracted&&conf>=95&&(
                          <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'10px',background:'#dcfce7',color:'#166534',fontWeight:'600'}}>✓ AI</span>
                        )}
                      </div>
                      <div style={{fontSize:'11px',color:'#888'}}>
                        {l.liability_type?.replace(/_/g,' ')}
                        {l.interest_rate?` · ${l.interest_rate}% APR`:''}
                        {l.minimum_payment?` · ${fmt(l.minimum_payment)}/mo`:''}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'14px',fontWeight:'700',color:'#b91c1c'}}>{fmt(l.balance)}</span>
                      <Btn onClick={()=>openModal('liability',l)} variant="ghost" style={{padding:'3px 8px',fontSize:'11px'}}>Edit</Btn>
                      <Btn onClick={()=>handleDelete('liability',l.id)} variant="danger" style={{padding:'3px 8px',fontSize:'11px'}}>×</Btn>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
          <Card style={{marginTop:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div style={{fontSize:'14px',fontWeight:'600'}}>Bank accounts</div>
              <Btn onClick={()=>openModal('bank')} variant="secondary">+ Account</Btn>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
              {data?.bank_accounts?.map(b=>(
                <div key={b.id} style={{background:'#f8f9fa',borderRadius:'12px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#888',marginBottom:'4px'}}>{b.institution} · {b.account_type}</div>
                  <div style={{fontSize:'16px',fontWeight:'700'}}>{fmt(b.current_balance)}</div>
                  <div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{b.account_name}{b.account_number_last4?' ···'+b.account_number_last4:''}</div>
                  <div style={{display:'flex',gap:'4px',marginTop:'8px'}}>
                    <Btn onClick={()=>openModal('bank',b)} variant="ghost" style={{padding:'2px 8px',fontSize:'11px'}}>Edit</Btn>
                    <Btn onClick={()=>handleDelete('bank',b.id)} variant="danger" style={{padding:'2px 8px',fontSize:'11px'}}>×</Btn>
                  </div>
                </div>
              ))}
              {(!data?.bank_accounts||data.bank_accounts.length===0)&&(
                <div style={{fontSize:'13px',color:'#999',gridColumn:'1/-1',textAlign:'center',padding:'1rem'}}>No bank accounts added yet</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* INCOME */}
      {activeTab==='income'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontSize:'16px',fontWeight:'600'}}>All income sources</div>
            <Btn onClick={()=>openModal('income')}>+ Add income</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
            <KPI label="Total monthly" value={fmt(totalMonthlyIncome)} color="#22c55e" sub="all sources combined"/>
            <KPI label="Total annual"  value={fmt(totalMonthlyIncome*12)} color="#111" sub="projected"/>
            <KPI label="Sources"       value={totalIncomeSources.length} color="#111" sub="active income streams"/>
          </div>
          {members.map(m=>{
            const mi=totalIncomeSources.filter(i=>i.household_member_id===m.id);
            const mt=mi.reduce((s,i)=>s+toMonthly(i.amount,i.frequency),0);
            if(mi.length===0) return null;
            return(
              <Card key={m.id} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <span style={{fontSize:'14px',fontWeight:'600'}}>{m.name}</span>
                    <Tag label={m.relationship}/>
                  </div>
                  <span style={{fontSize:'15px',fontWeight:'700',color:'#22c55e'}}>{fmt(mt)}/mo</span>
                </div>
                {mi.map(i=>{
                  const monthly=toMonthly(i.amount,i.frequency);
                  return(
                    <div key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:'500'}}>{i.name}</div>
                        <div style={{fontSize:'11px',color:'#888'}}>
                          {INCOME_TYPES.find(t=>t.value===i.source_type)?.label||i.source_type}
                          {i.employer?' · '+i.employer:''} · {i.frequency}
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'13px',fontWeight:'700',color:'#22c55e'}}>{fmt(monthly)}/mo</div>
                          <div style={{fontSize:'11px',color:'#888'}}>{fmt(i.amount)} {i.frequency}</div>
                        </div>
                        <Btn onClick={()=>openModal('income',i)} variant="ghost" style={{padding:'3px 8px',fontSize:'11px'}}>Edit</Btn>
                        <Btn onClick={()=>handleDelete('income',i.id)} variant="danger" style={{padding:'3px 8px',fontSize:'11px'}}>×</Btn>
                      </div>
                    </div>
                  );
                })}
              </Card>
            );
          })}
          {totalIncomeSources.length===0&&(
            <Card><div style={{textAlign:'center',padding:'2rem',color:'#999',fontSize:'13px'}}>No income sources added. Click "+ Add income" to get started.</div></Card>
          )}
        </div>
      )}

      {/* CASH FLOW */}
      {activeTab==='cashflow'&&(
        <div>
          <div style={{fontSize:'16px',fontWeight:'600',marginBottom:'1rem'}}>Cash Flow Analysis</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'1.5rem'}}>
            <KPI label="Monthly income"      value={fmt(totalMonthlyIncome)} color="#22c55e"/>
            <KPI label="Monthly obligations" value={fmt(t.total_min_payments)} color="#ef4444" sub="minimum debt payments"/>
            <KPI label="Available cash"      value={fmt(totalMonthlyIncome-t.total_min_payments)} color={(totalMonthlyIncome-t.total_min_payments)>=0?'#22c55e':'#ef4444'}/>
          </div>
          <Card style={{marginBottom:'16px'}}>
            <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'1rem'}}>Rental P&L — this year</div>
            {[
              {label:'Gross rental income',value:t.rental_income_year,color:'#22c55e'},
              {label:'Operating expenses', value:t.rental_expense_year,color:'#ef4444',neg:true},
              {label:'Net rental income',  value:t.rental_income_year-t.rental_expense_year,color:(t.rental_income_year-t.rental_expense_year)>=0?'#22c55e':'#ef4444',bold:true},
            ].map((row,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',
                background:i===2?'#f8f9fa':'white',borderRadius:'8px',border:i===2?'1px solid #e5e5e5':'none',marginBottom:'4px'}}>
                <span style={{fontSize:'13px',color:'#555',fontWeight:row.bold?'600':'400'}}>{row.label}</span>
                <span style={{fontSize:row.bold?'16px':'14px',fontWeight:'700',color:row.color}}>
                  {row.neg?'−':''}{fmt(Math.abs(row.value))}
                </span>
              </div>
            ))}
          </Card>
          {data?.transactions_by_category?.length>0&&(
            <Card>
              <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'1rem'}}>Monthly spending categories</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.transactions_by_category}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="category" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}} tickFormatter={v=>'$'+v}/>
                  <Tooltip formatter={v=>fmt(v)}/>
                  <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{marginTop:'12px'}}>
                {data.transactions_by_category.map(c=>(
                  <div key={c.category} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                    <span style={{fontSize:'12px',color:'#555',minWidth:'100px',textTransform:'capitalize'}}>{c.category||'other'}</span>
                    <div style={{flex:1,height:'6px',background:'#f0f0f0',borderRadius:'3px'}}>
                      <div style={{width:pct(c.percentage),height:'6px',background:TX_COLORS[c.category]||'#6b7280',borderRadius:'3px'}}/>
                    </div>
                    <span style={{fontSize:'12px',fontWeight:'600',minWidth:'70px',textAlign:'right'}}>{fmt(c.total)}</span>
                    <RecommendBtn category={c.category} amount={Math.round(c.total)}/>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* CREDIT */}
      {activeTab==='credit'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontSize:'16px',fontWeight:'600'}}>Credit profiles</div>
            <Btn onClick={()=>openModal('credit')}>+ Manual entry</Btn>
          </div>

          <CreditReportUpload onComplete={fetchData}/>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
            {data?.credit?.map(c=>(
              <Card key={c.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:'600'}}>{c.member_name||'Primary'}</div>
                    <div style={{fontSize:'11px',color:'#888'}}>{c.bureau} · {new Date(c.snapshot_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'36px',fontWeight:'800',color:SCORE_COLOR(c.score),letterSpacing:'-1px'}}>{c.score}</div>
                    <div style={{fontSize:'12px',color:SCORE_COLOR(c.score),fontWeight:'600'}}>{SCORE_LABEL(c.score)}</div>
                  </div>
                </div>
                <div style={{marginBottom:'1rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#888',marginBottom:'4px'}}>
                    <span>300</span><span>580</span><span>670</span><span>740</span><span>800</span><span>850</span>
                  </div>
                  <div style={{height:'8px',borderRadius:'4px',background:'linear-gradient(to right,#ef4444,#f97316,#f59e0b,#84cc16,#22c55e)',position:'relative'}}>
                    <div style={{position:'absolute',top:'-4px',left:`${((c.score-300)/550)*100}%`,width:'16px',height:'16px',
                      background:'white',border:`3px solid ${SCORE_COLOR(c.score)}`,borderRadius:'50%',transform:'translateX(-50%)'}}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px'}}>
                  {c.credit_utilization!=null&&(
                    <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'8px'}}>
                      <div style={{color:'#888',marginBottom:'2px'}}>Utilization</div>
                      <div style={{fontWeight:'700',color:c.credit_utilization>30?'#ef4444':'#22c55e'}}>{pct(c.credit_utilization)}</div>
                    </div>
                  )}
                  {c.on_time_payment_pct!=null&&(
                    <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'8px'}}>
                      <div style={{color:'#888',marginBottom:'2px'}}>On-time payments</div>
                      <div style={{fontWeight:'700',color:'#22c55e'}}>{pct(c.on_time_payment_pct)}</div>
                    </div>
                  )}
                  {c.total_accounts!=null&&(
                    <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'8px'}}>
                      <div style={{color:'#888',marginBottom:'2px'}}>Total accounts</div>
                      <div style={{fontWeight:'700'}}>{c.total_accounts}</div>
                    </div>
                  )}
                  {c.derogatory_marks!=null&&(
                    <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'8px'}}>
                      <div style={{color:'#888',marginBottom:'2px'}}>Derogatory marks</div>
                      <div style={{fontWeight:'700',color:c.derogatory_marks>0?'#ef4444':'#22c55e'}}>{c.derogatory_marks}</div>
                    </div>
                  )}
                </div>
                {c.total_debt&&(
                  <div style={{marginTop:'8px',fontSize:'12px',color:'#888'}}>Total debt: <strong>{fmt(c.total_debt)}</strong></div>
                )}
              </Card>
            ))}
            {(!data?.credit||data.credit.length===0)&&(
              <Card style={{gridColumn:'1/-1'}}>
                <div style={{textAlign:'center',padding:'2rem',color:'#999',fontSize:'13px'}}>
                  No credit data yet. Upload a credit report above or add a snapshot manually.
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* GOALS */}
      {activeTab==='goals'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontSize:'16px',fontWeight:'600'}}>Financial goals</div>
            <Btn onClick={()=>openModal('goal')}>+ Add goal</Btn>
          </div>
          {data?.goals?.map(g=>{
            const progress=Math.min(100,(parseFloat(g.current_amount)/parseFloat(g.target_amount))*100);
            const remaining=parseFloat(g.target_amount)-parseFloat(g.current_amount);
            const daysLeft=g.target_date?Math.ceil((new Date(g.target_date)-new Date())/86400000):null;
            const monthlyNeeded=daysLeft&&daysLeft>0?remaining/(daysLeft/30):null;
            return(
              <Card key={g.id} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                  <div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'4px'}}>
                      <span style={{fontSize:'15px',fontWeight:'600'}}>{g.name}</span>
                      <Tag label={g.goal_type?.replace(/_/g,' ')}/>
                      {g.is_achieved&&<Tag label="✓ Achieved" bg="#dcfce7" color="#166534"/>}
                    </div>
                    <div style={{fontSize:'12px',color:'#888'}}>
                      {g.member_name&&`${g.member_name} · `}
                      {g.target_date&&`Target: ${new Date(g.target_date).toLocaleDateString()}`}
                      {daysLeft&&` · ${daysLeft} days left`}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'18px',fontWeight:'700'}}>{fmt(g.target_amount)}</div>
                    <div style={{fontSize:'12px',color:'#888'}}>{fmt(g.current_amount)} saved</div>
                  </div>
                </div>
                <div style={{height:'10px',background:'#f0f0f0',borderRadius:'5px',overflow:'hidden',marginBottom:'8px'}}>
                  <div style={{width:pct(progress),height:'10px',background:progress>=100?'#22c55e':'#3b82f6',borderRadius:'5px',transition:'width 0.5s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:'12px',color:'#888'}}>
                    {progress.toFixed(1)}% complete · {fmt(remaining)} remaining
                    {monthlyNeeded&&` · ${fmt(monthlyNeeded)}/mo needed`}
                  </div>
                  <div style={{display:'flex',gap:'6px'}}>
                    <Btn onClick={()=>openModal('goal',g)} variant="secondary" style={{padding:'4px 10px',fontSize:'11px'}}>Edit</Btn>
                    <Btn onClick={()=>handleDelete('goal',g.id)} variant="danger" style={{padding:'4px 10px',fontSize:'11px'}}>×</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
          {(!data?.goals||data.goals.length===0)&&(
            <Card><div style={{textAlign:'center',padding:'2rem',color:'#999',fontSize:'13px'}}>No goals set yet.</div></Card>
          )}
        </div>
      )}

      {/* HOUSEHOLD */}
      {activeTab==='household'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontSize:'16px',fontWeight:'600'}}>Household members</div>
            <Btn onClick={()=>openModal('member')}>+ Add member</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
            {members.map(m=>{
              const mi=totalIncomeSources.filter(i=>i.household_member_id===m.id);
              const mt=mi.reduce((s,i)=>s+toMonthly(i.amount,i.frequency),0);
              const mc=data?.credit?.find(c=>c.household_member_id===m.id);
              return(
                <Card key={m.id}>
                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'16px',fontWeight:'700',marginBottom:'8px'}}>
                    {m.name[0]}
                  </div>
                  <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'4px'}}>{m.name}</div>
                  <Tag label={m.relationship}/>
                  <div style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'6px',fontSize:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#888'}}>Monthly income</span>
                      <span style={{fontWeight:'600',color:'#22c55e'}}>{fmt(mt)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#888'}}>Income sources</span>
                      <span style={{fontWeight:'600'}}>{mi.length}</span>
                    </div>
                    {mc&&(
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{color:'#888'}}>Credit score</span>
                        <span style={{fontWeight:'700',color:SCORE_COLOR(mc.score)}}>{mc.score}</span>
                      </div>
                    )}
                  </div>
                  <div style={{marginTop:'10px'}}>
                    <Btn onClick={()=>openModal('member',m)} variant="secondary" style={{padding:'4px 10px',fontSize:'11px',width:'100%'}}>Edit</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:'20px',padding:'2rem',width:'520px',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:'18px',fontWeight:'700',marginBottom:'1.5rem'}}>
              {modal.editing?'Edit':'Add'} {modal.type.charAt(0).toUpperCase()+modal.type.slice(1).replace(/_/g,' ')}
            </div>
            {msg&&(
              <div style={{padding:'8px 12px',borderRadius:'8px',marginBottom:'1rem',fontSize:'13px',
                background:msg.type==='success'?'#dcfce7':'#fee2e2',color:msg.type==='success'?'#166534':'#991b1b'}}>
                {msg.text}
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {modal.type==='member'&&<>
                <Inp label="Full name" name="name" value={form.name||''} onChange={handleChange} placeholder="Jane Smith"/>
                <Inp label="Relationship" name="relationship" value={form.relationship||'self'} onChange={handleChange}
                  options={RELATIONSHIPS.map(r=>({value:r,label:r.charAt(0).toUpperCase()+r.slice(1)}))}/>
                <Inp label="Date of birth" name="date_of_birth" value={form.date_of_birth||''} onChange={handleChange} type="date"/>
              </>}
              {modal.type==='income'&&<>
                <Inp label="Household member" name="household_member_id" value={form.household_member_id||''} onChange={handleChange}
                  options={[{value:'',label:'Unassigned'},...members.map(m=>({value:m.id,label:m.name}))]}/>
                <Inp label="Income type" name="source_type" value={form.source_type||'w2'} onChange={handleChange} options={INCOME_TYPES}/>
                <Inp label="Name / Description" name="name" value={form.name||''} onChange={handleChange} placeholder="e.g. Google W-2"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Amount ($)" name="amount" value={form.amount||''} onChange={handleChange} type="number" placeholder="5000"/>
                  <Inp label="Frequency" name="frequency" value={form.frequency||'monthly'} onChange={handleChange}
                    options={FREQUENCIES.map(f=>({value:f,label:f.charAt(0).toUpperCase()+f.slice(1)}))}/>
                </div>
                <Inp label="Employer / Payer" name="employer" value={form.employer||''} onChange={handleChange} placeholder="Acme Corp"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Start date" name="start_date" value={form.start_date||''} onChange={handleChange} type="date"/>
                  <Inp label="Tax rate %" name="tax_rate" value={form.tax_rate||''} onChange={handleChange} type="number" placeholder="25"/>
                </div>
              </>}
              {modal.type==='asset'&&<>
                <Inp label="Household member" name="household_member_id" value={form.household_member_id||''} onChange={handleChange}
                  options={[{value:'',label:'Unassigned'},...members.map(m=>({value:m.id,label:m.name}))]}/>
                <Inp label="Asset type" name="asset_type" value={form.asset_type||'real_estate'} onChange={handleChange} options={ASSET_TYPES}/>
                <Inp label="Name" name="name" value={form.name||''} onChange={handleChange} placeholder="Primary Home"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Current value ($)" name="value" value={form.value||''} onChange={handleChange} type="number" placeholder="350000"/>
                  <Inp label="Purchase price ($)" name="purchase_price" value={form.purchase_price||''} onChange={handleChange} type="number"/>
                </div>
                {properties.length>0&&(
                  <Inp label="Link to property" name="property_id" value={form.property_id||''} onChange={handleChange}
                    options={[{value:'',label:'None'},...properties.map(p=>({value:p.id,label:p.name}))]}/>
                )}
                <Inp label="Institution" name="institution" value={form.institution||''} onChange={handleChange} placeholder="Chase, Vanguard"/>
                <Inp label="As of date" name="as_of_date" value={form.as_of_date||new Date().toISOString().split('T')[0]} onChange={handleChange} type="date"/>
              </>}
              {modal.type==='liability'&&<>
                <Inp label="Household member" name="household_member_id" value={form.household_member_id||''} onChange={handleChange}
                  options={[{value:'',label:'Unassigned'},...members.map(m=>({value:m.id,label:m.name}))]}/>
                <Inp label="Liability type" name="liability_type" value={form.liability_type||'mortgage'} onChange={handleChange} options={LIABILITY_TYPES}/>
                <Inp label="Name" name="name" value={form.name||''} onChange={handleChange} placeholder="Chase Mortgage"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Current balance ($)" name="balance" value={form.balance||''} onChange={handleChange} type="number" placeholder="245000"/>
                  <Inp label="Original amount ($)" name="original_amount" value={form.original_amount||''} onChange={handleChange} type="number"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Interest rate %" name="interest_rate" value={form.interest_rate||''} onChange={handleChange} type="number" placeholder="6.5"/>
                  <Inp label="Minimum payment ($)" name="minimum_payment" value={form.minimum_payment||''} onChange={handleChange} type="number"/>
                </div>
                <Inp label="Institution" name="institution" value={form.institution||''} onChange={handleChange} placeholder="Chase Bank"/>
                {properties.length>0&&(
                  <Inp label="Link to property" name="property_id" value={form.property_id||''} onChange={handleChange}
                    options={[{value:'',label:'None'},...properties.map(p=>({value:p.id,label:p.name}))]}/>
                )}
              </>}
              {modal.type==='goal'&&<>
                <Inp label="Household member" name="household_member_id" value={form.household_member_id||''} onChange={handleChange}
                  options={[{value:'',label:'All household'},...members.map(m=>({value:m.id,label:m.name}))]}/>
                <Inp label="Goal type" name="goal_type" value={form.goal_type||'savings'} onChange={handleChange} options={GOAL_TYPES}/>
                <Inp label="Goal name" name="name" value={form.name||''} onChange={handleChange} placeholder="Emergency fund 6 months"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Target amount ($)" name="target_amount" value={form.target_amount||''} onChange={handleChange} type="number" placeholder="50000"/>
                  <Inp label="Current amount ($)" name="current_amount" value={form.current_amount||''} onChange={handleChange} type="number" placeholder="12000"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Target date" name="target_date" value={form.target_date||''} onChange={handleChange} type="date"/>
                  <Inp label="Priority (1=highest)" name="priority" value={form.priority||1} onChange={handleChange} type="number"/>
                </div>
                <Inp label="Notes" name="notes" value={form.notes||''} onChange={handleChange} placeholder="Additional context"/>
              </>}
              {modal.type==='credit'&&<>
                <Inp label="Household member" name="household_member_id" value={form.household_member_id||''} onChange={handleChange}
                  options={[{value:'',label:'Unassigned'},...members.map(m=>({value:m.id,label:m.name}))]}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Credit score" name="score" value={form.score||''} onChange={handleChange} type="number" placeholder="720"/>
                  <Inp label="Bureau" name="bureau" value={form.bureau||'experian'} onChange={handleChange}
                    options={[{value:'experian',label:'Experian'},{value:'equifax',label:'Equifax'},{value:'transunion',label:'TransUnion'}]}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Snapshot date" name="snapshot_date" value={form.snapshot_date||new Date().toISOString().split('T')[0]} onChange={handleChange} type="date"/>
                  <Inp label="Total debt ($)" name="total_debt" value={form.total_debt||''} onChange={handleChange} type="number"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Credit utilization %" name="credit_utilization" value={form.credit_utilization||''} onChange={handleChange} type="number" placeholder="28"/>
                  <Inp label="On-time payments %" name="on_time_payment_pct" value={form.on_time_payment_pct||''} onChange={handleChange} type="number" placeholder="98"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Total accounts" name="total_accounts" value={form.total_accounts||''} onChange={handleChange} type="number"/>
                  <Inp label="Derogatory marks" name="derogatory_marks" value={form.derogatory_marks||0} onChange={handleChange} type="number"/>
                </div>
              </>}
              {modal.type==='bank'&&<>
                <Inp label="Household member" name="household_member_id" value={form.household_member_id||''} onChange={handleChange}
                  options={[{value:'',label:'Unassigned'},...members.map(m=>({value:m.id,label:m.name}))]}/>
                <Inp label="Institution" name="institution" value={form.institution||''} onChange={handleChange} placeholder="Chase, Bank of America"/>
                <Inp label="Account name" name="account_name" value={form.account_name||''} onChange={handleChange} placeholder="Main Checking"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <Inp label="Account type" name="account_type" value={form.account_type||'checking'} onChange={handleChange}
                    options={[{value:'checking',label:'Checking'},{value:'savings',label:'Savings'},{value:'money_market',label:'Money Market'},{value:'cd',label:'CD'},{value:'brokerage',label:'Brokerage'}]}/>
                  <Inp label="Last 4 digits" name="account_number_last4" value={form.account_number_last4||''} onChange={handleChange} placeholder="1234"/>
                </div>
                <Inp label="Current balance ($)" name="current_balance" value={form.current_balance||''} onChange={handleChange} type="number" placeholder="12500"/>
              </>}
            </div>
            <div style={{display:'flex',gap:'8px',marginTop:'1.5rem'}}>
              <Btn onClick={handleSave} disabled={saving}>{saving?'Saving...':modal.editing?'Save changes':'Add'}</Btn>
              <Btn onClick={closeModal} variant="secondary">Cancel</Btn>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}