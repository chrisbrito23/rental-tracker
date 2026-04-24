import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [data, setData] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenantSummaries, setTenantSummaries] = useState({});
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [movingTenant, setMovingTenant] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const fetchData = async () => {
    try {
      const [dashRes, tenantsRes, propsRes] = await Promise.all([
        axios.get('/api/dashboard/summary'),
        axios.get('/api/tenants'),
        axios.get('/api/properties'),
      ]);
      setData(dashRes.data.data);
      setTenants(tenantsRes.data.data || []);
      setProperties(propsRes.data.data || []);
      // Always clear cached tenant summaries so expanded cards show fresh data
      setTenantSummaries({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTenantSummary = async (tenantId) => {
    if (expandedTenant === tenantId) { setExpandedTenant(null); return; }
    try {
      const res = await axios.get('/api/leases/tenant-summary/' + tenantId);
      if (res.data.success) setTenantSummaries(prev => ({ ...prev, [tenantId]: res.data.data }));
    } catch (err) { console.error(err); }
    setExpandedTenant(tenantId);
  };

  const handleMove = async () => {
    if (!movingTenant || !selectedProperty) return;
    try {
      await axios.patch('/api/tenants/' + movingTenant.id + '/move', { property_id: selectedProperty });
      setMovingTenant(null);
      setSelectedProperty('');
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleEditOpen = (t) => {
    setEditForm({
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email: t.email || '',
      phone: t.phone || '',
      id_type: t.id_type || '',
      id_number: t.id_number || '',
      notes: t.notes || '',
      // Lease fields from JOIN
      lease_id: t.lease_id || null,
      monthly_rent: t.monthly_rent || '',
      security_deposit: t.security_deposit || '',
      rent_due_day: t.rent_due_day || '1',
      late_fee_amount: t.late_fee_amount || '',
      late_fee_grace_days: t.late_fee_grace_days || '5',
      end_date: t.lease_end_date ? t.lease_end_date.split('T')[0] : '',
    });
    setSaveMsg(null);
    setEditingTenant(t);
  };

  const handleEditSave = async () => {
    if (!editingTenant) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Save tenant fields
      await axios.patch('/api/tenants/' + editingTenant.id, editForm);

      // Also patch lease if it exists
      if (editForm.lease_id) {
        await axios.patch('/api/leases/' + editForm.lease_id, {
          monthly_rent: editForm.monthly_rent || undefined,
          security_deposit: editForm.security_deposit || undefined,
          rent_due_day: editForm.rent_due_day || undefined,
          late_fee_amount: editForm.late_fee_amount || undefined,
          late_fee_grace_days: editForm.late_fee_grace_days || undefined,
          end_date: editForm.end_date || undefined,
        });
      }

      setSaveMsg({ type: 'success', text: 'Saved successfully' });
      setTimeout(() => {
        setEditingTenant(null);
        setSaveMsg(null);
      }, 1200);
      fetchData();
    } catch (err) {
      console.error(err);
      setSaveMsg({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Delete this tenant? Documents will be preserved.')) return;
    try {
      await axios.delete('/api/tenants/' + tenantId);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const scoreColor = (score) => score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';

  if (loading) return <div style={{ padding: '2rem', color: '#666' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Overview of your rental portfolio</p>
        </div>
        <button onClick={fetchData} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#666' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Summary cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          {[
            { label: 'Monthly income', value: '$' + Number(data.monthly_income).toLocaleString(), sub: 'this month (paid)', color: '#166534', bg: '#dcfce7' },
            { label: 'Monthly expenses', value: '$' + Number(data.monthly_expenses).toLocaleString(), sub: 'this month', color: '#991b1b', bg: '#fee2e2' },
            { label: 'Net income', value: '$' + Number(data.net_income).toLocaleString(), sub: 'income minus expenses', color: data.net_income >= 0 ? '#166534' : '#991b1b', bg: data.net_income >= 0 ? '#dcfce7' : '#fee2e2' },
            { label: 'Pending rent owed', value: '$' + Number(data.pending_rent_owed || 0).toLocaleString(), sub: 'past due payments', color: '#92400e', bg: '#fef3c7' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1rem' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{card.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          {[
            { label: 'Properties', value: data.properties },
            { label: 'Tenants', value: data.tenants },
            { label: 'Active leases', value: data.active_leases },
            { label: 'Units occupied', value: `${data.occupied_units} / ${data.total_units}` },
          ].map((card, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1rem' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{card.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Income chart */}
      {data && data.income_chart && data.income_chart.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '1rem' }}>Income — last 6 months</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.income_chart} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => '$' + Number(v).toLocaleString()} />
              <Tooltip formatter={(v) => '$' + Number(v).toLocaleString()} />
              <Bar dataKey="total" fill="#185FA5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tenants */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', fontSize: '14px', fontWeight: '500' }}>
          Tenant overview
        </div>
        {tenants.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            No tenants yet — add one in the Tenants tab or upload a lease in Documents.
          </div>
        )}
        {tenants.map((t) => {
          const isExpanded = expandedTenant === t.id;
          const summary = tenantSummaries[t.id];
          return (
            <div key={t.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    {t.first_name?.[0]}{t.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '500', fontSize: '13px' }}>{t.first_name} {t.last_name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {t.property_name ? `${t.property_name}${t.unit_number ? ' · Unit ' + t.unit_number : ''}` : 'No active lease'}
                      {t.monthly_rent ? ` · $${Number(t.monthly_rent).toLocaleString()}/mo` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                  <button onClick={() => fetchTenantSummary(t.id)}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#666' }}>
                    {isExpanded ? 'hide' : 'details'}
                  </button>
                  <button onClick={() => handleEditOpen(t)}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#666' }}>
                    edit
                  </button>
                  <button onClick={() => { setMovingTenant(t); setSelectedProperty(''); }}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#666' }}>
                    move
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', color: '#991b1b' }}>
                    delete
                  </button>
                </div>
              </div>

              {isExpanded && summary && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f5f5f5', background: '#fafafa' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #eee' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Payment score</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: scoreColor(summary.score) }}>{summary.score}%</div>
                      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '6px' }}>
                        <div style={{ height: '4px', borderRadius: '2px', background: scoreColor(summary.score), width: summary.score + '%' }} />
                      </div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #eee' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Monthly rent</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>${Number(summary.lease.monthly_rent).toLocaleString()}</div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>due {summary.due_date}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #eee' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Total owed</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: summary.total_owed > 0 ? '#991b1b' : '#166534' }}>
                        ${Number(summary.total_owed || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{summary.months_elapsed} months · ${Number(summary.total_paid || 0).toLocaleString()} paid</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #eee' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Late fee</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: summary.is_late ? '#991b1b' : '#166534' }}>
                        {summary.is_late ? '$' + summary.late_fee_applicable + ' applies' : 'Not applicable'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{summary.is_late ? 'Past grace period' : 'Within grace period'}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>Payment history</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {summary.payments && summary.payments.slice(0, 12).map((p, i) => (
                        <div key={i} style={{
                          width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: '600',
                          background: p.status === 'paid' ? '#dcfce7' : p.status === 'late' ? '#fee2e2' : '#fef3c7',
                          color: p.status === 'paid' ? '#166534' : p.status === 'late' ? '#991b1b' : '#92400e'
                        }}>
                          {p.status === 'paid' ? '✓' : p.status === 'late' ? '!' : '…'}
                        </div>
                      ))}
                      {(!summary.payments || summary.payments.length === 0) && <span style={{ fontSize: '11px', color: '#999' }}>No payments yet</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', fontSize: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                    <div><div style={{ color: '#666', marginBottom: '2px' }}>Lease start</div><div style={{ fontWeight: '500' }}>{summary.lease.start_date ? new Date(summary.lease.start_date).toLocaleDateString() : 'N/A'}</div></div>
                    <div><div style={{ color: '#666', marginBottom: '2px' }}>Lease end</div><div style={{ fontWeight: '500' }}>{summary.lease.end_date ? new Date(summary.lease.end_date).toLocaleDateString() : 'Month to month'}</div></div>
                    <div><div style={{ color: '#666', marginBottom: '2px' }}>Deposit</div><div style={{ fontWeight: '500' }}>${Number(summary.lease.security_deposit || 0).toLocaleString()}</div></div>
                    <div><div style={{ color: '#666', marginBottom: '2px' }}>On time</div><div style={{ fontWeight: '500' }}>{summary.stats.on_time} of {summary.stats.total_payments}</div></div>
                  </div>
                </div>
              )}
              {isExpanded && !summary && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f5f5f5', fontSize: '13px', color: '#666' }}>
                  No active lease found for this tenant.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editingTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1.25rem' }}>
              Edit — {editingTenant.first_name} {editingTenant.last_name}
            </div>

            {saveMsg && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '13px', background: saveMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: saveMsg.type === 'success' ? '#166534' : '#991b1b' }}>
                {saveMsg.text}
              </div>
            )}

            <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Tenant info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {['first_name', 'last_name', 'email', 'phone'].map(field => (
                <div key={field}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>{field.replace('_', ' ')}</label>
                  <input value={editForm[field] || ''} onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                </div>
              ))}
            </div>

            {editForm.lease_id && (
              <>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 10px' }}>Lease details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Monthly rent ($)</label>
                    <input type="number" value={editForm.monthly_rent || ''} onChange={e => setEditForm(p => ({ ...p, monthly_rent: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Security deposit ($)</label>
                    <input type="number" value={editForm.security_deposit || ''} onChange={e => setEditForm(p => ({ ...p, security_deposit: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Rent due day</label>
                    <input type="number" min="1" max="28" value={editForm.rent_due_day || ''} onChange={e => setEditForm(p => ({ ...p, rent_due_day: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Late fee ($)</label>
                    <input type="number" value={editForm.late_fee_amount || ''} onChange={e => setEditForm(p => ({ ...p, late_fee_amount: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Grace days</label>
                    <input type="number" value={editForm.late_fee_grace_days || ''} onChange={e => setEditForm(p => ({ ...p, late_fee_grace_days: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease end date</label>
                    <input type="date" value={editForm.end_date || ''} onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
              <button onClick={handleEditSave} disabled={saving}
                style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button onClick={() => { setEditingTenant(null); setSaveMsg(null); }}
                style={{ background: 'white', color: '#666', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move modal */}
      {movingTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '400px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '1rem' }}>
              Move {movingTenant.first_name} {movingTenant.last_name}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Select new property</label>
              <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                <option value="">Select property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleMove} disabled={!selectedProperty}
                style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Move tenant
              </button>
              <button onClick={() => { setMovingTenant(null); setSelectedProperty(''); }}
                style={{ background: 'white', color: '#666', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
