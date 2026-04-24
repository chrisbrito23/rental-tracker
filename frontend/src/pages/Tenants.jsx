import { useState, useEffect } from 'react';
import axios from 'axios';

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '',
  phone: '', id_type: '', id_number: '', notes: '',
  property_id: '', unit_number: '', monthly_rent: '',
  security_deposit: '', start_date: '', end_date: '',
  rent_due_day: '1', late_fee_amount: '', late_fee_grace_days: '5',
  pet_allowed: false
};

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [movingTenant, setMovingTenant] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [moveUnitNumber, setMoveUnitNumber] = useState('');
  const [tenantSummaries, setTenantSummaries] = useState({});
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const fetchData = async () => {
    try {
      const [tenantsRes, propsRes] = await Promise.all([
        axios.get('/api/tenants'),
        axios.get('/api/properties'),
      ]);
      setTenants(tenantsRes.data.data || []);
      setProperties(propsRes.data.data || []);
      setTenantSummaries({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchTenantSummary = async (tenant) => {
    if (expandedTenant === tenant.id) { setExpandedTenant(null); return; }
    try {
      const res = await axios.get('/api/leases/tenant-summary/' + tenant.id);
      if (res.data.success) {
        setTenantSummaries(prev => ({ ...prev, [tenant.id]: res.data.data }));
      }
    } catch (err) { console.error(err); }
    setExpandedTenant(tenant.id);
  };

  const handleAddChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setAddForm(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleEditChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditForm(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleEditOpen = (t) => {
    setEditingTenantId(t.id);
    setExpandedTenant(null);
    setEditForm({
      ...EMPTY_FORM,
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email: t.email || '',
      phone: t.phone || '',
      id_type: t.id_type || '',
      id_number: t.id_number || '',
      notes: t.notes || '',
      property_id: t.property_id || '',
      unit_number: t.unit_number || '',
      monthly_rent: t.monthly_rent || '',
      security_deposit: t.security_deposit || '',
      start_date: t.lease_start_date ? t.lease_start_date.split('T')[0] : '',
      end_date: t.lease_end_date ? t.lease_end_date.split('T')[0] : '',
      rent_due_day: t.rent_due_day || '1',
      late_fee_amount: t.late_fee_amount || '',
      late_fee_grace_days: t.late_fee_grace_days || '5',
      pet_allowed: t.pet_allowed || false,
      lease_id: t.lease_id || null,
    });
  };

  const handleEditSave = async (t) => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setSubmitMsg({ id: t.id, type: 'error', text: 'First and last name are required.' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.patch('/api/tenants/' + t.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        id_type: editForm.id_type || null,
        id_number: editForm.id_number || null,
        notes: editForm.notes || null,
      });
      if (editForm.lease_id) {
        const leaseUpdates = {};
        if (editForm.monthly_rent) leaseUpdates.monthly_rent = editForm.monthly_rent;
        if (editForm.security_deposit) leaseUpdates.security_deposit = editForm.security_deposit;
        if (editForm.rent_due_day) leaseUpdates.rent_due_day = editForm.rent_due_day;
        if (editForm.late_fee_amount) leaseUpdates.late_fee_amount = editForm.late_fee_amount;
        if (editForm.late_fee_grace_days) leaseUpdates.late_fee_grace_days = editForm.late_fee_grace_days;
        if (editForm.start_date) leaseUpdates.start_date = editForm.start_date;
        if (editForm.end_date) leaseUpdates.end_date = editForm.end_date;
        if (Object.keys(leaseUpdates).length > 0) {
          await axios.patch('/api/leases/' + editForm.lease_id, leaseUpdates);
        }
      } else if (editForm.property_id && editForm.monthly_rent) {
        const unitRes = await axios.post('/api/units', {
          property_id: editForm.property_id,
          unit_number: editForm.unit_number || 'Unit 1',
          rental_type: 'entire_unit',
          monthly_rent: editForm.monthly_rent,
        });
        await axios.post('/api/leases', {
          unit_id: unitRes.data.data.id,
          tenant_id: t.id,
          monthly_rent: editForm.monthly_rent,
          security_deposit: editForm.security_deposit || 0,
          start_date: editForm.start_date || new Date().toISOString().split('T')[0],
          end_date: editForm.end_date || null,
          rent_due_day: editForm.rent_due_day || 1,
          late_fee_amount: editForm.late_fee_amount || 0,
          late_fee_grace_days: editForm.late_fee_grace_days || 5,
          generate_payments: true,
        });
      }
      setEditingTenantId(null);
      setSubmitMsg({ id: t.id, type: 'success', text: 'Saved successfully' });
      await fetchData();
      setTimeout(() => setSubmitMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setSubmitMsg({ id: t.id, type: 'error', text: err.response?.data?.error || 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) {
      setSubmitMsg({ id: 'add', type: 'error', text: 'First and last name are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const tenantRes = await axios.post('/api/tenants', {
        first_name: addForm.first_name,
        last_name: addForm.last_name,
        email: addForm.email || null,
        phone: addForm.phone || null,
        id_type: addForm.id_type || null,
        id_number: addForm.id_number || null,
        notes: addForm.notes || null,
      });
      const tenant_id = tenantRes.data.data.id;
      let paymentsGenerated = 0;
      if (addForm.property_id && addForm.monthly_rent) {
        const unitRes = await axios.post('/api/units', {
          property_id: addForm.property_id,
          unit_number: addForm.unit_number || 'Unit 1',
          rental_type: 'entire_unit',
          monthly_rent: addForm.monthly_rent,
        });
        const unit_id = unitRes.data.data.id;
        const leaseRes = await axios.post('/api/leases', {
          unit_id,
          tenant_id,
          monthly_rent: addForm.monthly_rent,
          security_deposit: addForm.security_deposit || 0,
          start_date: addForm.start_date || new Date().toISOString().split('T')[0],
          end_date: addForm.end_date || null,
          rent_due_day: addForm.rent_due_day || 1,
          late_fee_amount: addForm.late_fee_amount || 0,
          late_fee_grace_days: addForm.late_fee_grace_days || 5,
          pet_allowed: addForm.pet_allowed || false,
          generate_payments: true,
        });
        paymentsGenerated = leaseRes.data.payments_generated || 0;
        setSubmitMsg({ id: 'add', type: 'success', text: `Tenant added with lease and ${paymentsGenerated} pending payments generated` });
      } else {
        setSubmitMsg({ id: 'add', type: 'success', text: 'Tenant added — add lease details by clicking edit on their card' });
      }
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setSubmitMsg({ id: 'add', type: 'error', text: err.response?.data?.error || 'Failed to add tenant' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Delete this tenant? Documents and lease history will be preserved.')) return;
    try {
      await axios.delete('/api/tenants/' + tenantId);
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleMove = async () => {
    if (!movingTenant || !selectedProperty) return;
    try {
      await axios.patch('/api/tenants/' + movingTenant.id + '/move', { property_id: selectedProperty, unit_number: moveUnitNumber || null });
      setMovingTenant(null);
      setSelectedProperty('');
      setMoveUnitNumber('');
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const scoreColor = (score) => score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';

  const msgStyle = (type) => ({
    padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '10px',
    background: type === 'success' ? '#dcfce7' : type === 'error' ? '#fee2e2' : '#eff6ff',
    color: type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#1e40af',
  });

  if (loading) return <div style={{ padding: '2rem', color: '#666' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600' }}>Tenants</h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{tenants.length} tenants</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setAddForm(EMPTY_FORM); setSubmitMsg(null); }}
          style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          {showAddForm ? 'Cancel' : '+ Add tenant'}
        </button>
      </div>

      {submitMsg && submitMsg.id === 'add' && (
        <div style={msgStyle(submitMsg.type)}>{submitMsg.text}</div>
      )}

      {/* Add tenant form */}
      {showAddForm && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #185FA5', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '1.25rem', color: '#185FA5' }}>New tenant</div>
          <form onSubmit={handleAddSubmit}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tenant info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>First name</label>
                <input name="first_name" value={addForm.first_name} onChange={handleAddChange} placeholder="James"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Last name</label>
                <input name="last_name" value={addForm.last_name} onChange={handleAddChange} placeholder="Smith"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Email <span style={{ color: '#bbb' }}>(optional)</span></label>
                <input name="email" value={addForm.email} onChange={handleAddChange} placeholder="james@email.com" type="email"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Phone <span style={{ color: '#bbb' }}>(optional)</span></label>
                <input name="phone" value={addForm.phone} onChange={handleAddChange} placeholder="610-555-0101"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '12px' }}>
              Lease details <span style={{ color: '#bbb', fontWeight: '400', textTransform: 'none' }}>(fill in what you have)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Property</label>
                <select name="property_id" value={addForm.property_id} onChange={handleAddChange}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }}>
                  <option value="">No lease yet</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Unit number</label>
                <input name="unit_number" value={addForm.unit_number} onChange={handleAddChange} placeholder="1A"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Monthly rent ($)</label>
                <input name="monthly_rent" value={addForm.monthly_rent} onChange={handleAddChange} type="number" placeholder="1200"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Security deposit ($)</label>
                <input name="security_deposit" value={addForm.security_deposit} onChange={handleAddChange} type="number" placeholder="1200"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease start</label>
                <input name="start_date" value={addForm.start_date} onChange={handleAddChange} type="date"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease end <span style={{ color: '#bbb' }}>(blank = month-to-month)</span></label>
                <input name="end_date" value={addForm.end_date} onChange={handleAddChange} type="date"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Rent due day</label>
                <input name="rent_due_day" value={addForm.rent_due_day} onChange={handleAddChange} type="number" min="1" max="28"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>Late fee ($)</label>
                <input name="late_fee_amount" value={addForm.late_fee_amount} onChange={handleAddChange} type="number" placeholder="50"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="submit" disabled={submitting}
                style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                {submitting ? 'Saving...' : 'Add tenant'}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setSubmitMsg(null); }}
                style={{ background: 'white', color: '#666', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
            </div>
          </form>
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
              <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                <option value="">Select property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Unit number <span style={{ color: '#bbb' }}>(optional — blank creates new unit)</span></label>
              <input value={moveUnitNumber} onChange={(e) => setMoveUnitNumber(e.target.value)} placeholder="e.g. 2nd Floor"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleMove} disabled={!selectedProperty}
                style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Move tenant
              </button>
              <button onClick={() => { setMovingTenant(null); setSelectedProperty(''); setMoveUnitNumber(''); }}
                style={{ background: 'white', color: '#666', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tenants.length === 0 && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>
            No tenants yet. Add one above or upload a lease in the Documents tab.
          </div>
        )}
        {tenants.map((t) => {
          const isExpanded = expandedTenant === t.id;
          const isEditing = editingTenantId === t.id;
          const summary = tenantSummaries[t.id];
          return (
            <div key={t.id} style={{ background: 'white', borderRadius: '12px', border: `1px solid ${isEditing ? '#185FA5' : '#eee'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Tenant row */}
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                    {t.first_name?.[0]}{t.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{t.first_name} {t.last_name}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      {t.property_name ? `${t.property_name}${t.unit_number ? ' · Unit ' + t.unit_number : ''}` : 'No active lease'}
                      {t.monthly_rent ? ` · $${Number(t.monthly_rent).toLocaleString()}/mo` : ''}
                    </div>
                  </div>
                  {t.lease_status && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: t.lease_status === 'active' ? '#dcfce7' : '#f3f4f6', color: t.lease_status === 'active' ? '#166534' : '#666' }}>
                      {t.lease_status}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                  <button onClick={() => { setEditingTenantId(null); fetchTenantSummary(t); }}
                    style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #ddd', background: isExpanded ? '#f0f7ff' : 'white', cursor: 'pointer', color: '#666' }}>
                    {isExpanded ? 'hide' : 'details'}
                  </button>
                  <button onClick={() => isEditing ? setEditingTenantId(null) : handleEditOpen(t)}
                    style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${isEditing ? '#185FA5' : '#ddd'}`, background: isEditing ? '#eff6ff' : 'white', cursor: 'pointer', color: isEditing ? '#185FA5' : '#666' }}>
                    {isEditing ? 'cancel' : 'edit'}
                  </button>
                  <button onClick={() => { setEditingTenantId(null); setMovingTenant(t); setSelectedProperty(''); }}
                    style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#666' }}>
                    move
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', color: '#991b1b' }}>
                    delete
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div style={{ padding: '16px', borderTop: '1px solid #e0edff', background: '#f8fbff' }}>
                  {submitMsg && submitMsg.id === t.id && (
                    <div style={msgStyle(submitMsg.type)}>{submitMsg.text}</div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tenant info</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>First name</label>
                      <input name="first_name" value={editForm.first_name} onChange={handleEditChange}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Last name</label>
                      <input name="last_name" value={editForm.last_name} onChange={handleEditChange}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Email</label>
                      <input name="email" value={editForm.email} onChange={handleEditChange} type="email" placeholder="optional"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Phone</label>
                      <input name="phone" value={editForm.phone} onChange={handleEditChange} placeholder="optional"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                  </div>

                  {editForm.lease_id ? (
                    <>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '10px' }}>Lease details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Monthly rent ($)</label>
                          <input name="monthly_rent" value={editForm.monthly_rent} onChange={handleEditChange} type="number"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Security deposit ($)</label>
                          <input name="security_deposit" value={editForm.security_deposit} onChange={handleEditChange} type="number"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Rent due day</label>
                          <input name="rent_due_day" value={editForm.rent_due_day} onChange={handleEditChange} type="number" min="1" max="28"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Late fee ($)</label>
                          <input name="late_fee_amount" value={editForm.late_fee_amount} onChange={handleEditChange} type="number"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Grace days</label>
                          <input name="late_fee_grace_days" value={editForm.late_fee_grace_days} onChange={handleEditChange} type="number"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease start</label>
                          <input name="start_date" value={editForm.start_date} onChange={handleEditChange} type="date"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease end <span style={{ color: '#bbb' }}>(blank = month-to-month)</span></label>
                          <input name="end_date" value={editForm.end_date} onChange={handleEditChange} type="date"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '10px' }}>Create lease</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Property</label>
                          <select name="property_id" value={editForm.property_id} onChange={handleEditChange}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }}>
                            <option value="">Select property</option>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Unit number</label>
                          <input name="unit_number" value={editForm.unit_number} onChange={handleEditChange} placeholder="2nd Floor"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Monthly rent ($)</label>
                          <input name="monthly_rent" value={editForm.monthly_rent} onChange={handleEditChange} type="number" placeholder="1200"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Security deposit ($)</label>
                          <input name="security_deposit" value={editForm.security_deposit} onChange={handleEditChange} type="number" placeholder="1200"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease start</label>
                          <input name="start_date" value={editForm.start_date} onChange={handleEditChange} type="date"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Lease end <span style={{ color: "#bbb" }}>(blank = month-to-month)</span></label>
                          <input name="end_date" value={editForm.end_date} onChange={handleEditChange} type="date"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Rent due day</label>
                          <input name="rent_due_day" value={editForm.rent_due_day} onChange={handleEditChange} type="number" min="1" max="28"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Late fee ($)</label>
                          <input name="late_fee_amount" value={editForm.late_fee_amount} onChange={handleEditChange} type="number" placeholder="50"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px' }} />
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditSave(t)} disabled={submitting}
                      style={{ background: '#185FA5', color: 'white', border: 'none', padding: '7px 18px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>
                      {submitting ? 'Saving...' : 'Save changes'}
                    </button>
                    <button onClick={() => { setEditingTenantId(null); setSubmitMsg(null); }}
                      style={{ background: 'white', color: '#666', border: '1px solid #ddd', padding: '7px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Details expansion */}
              {isExpanded && summary && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid #f5f5f5', background: '#fafafa' }}>
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
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{summary.months_elapsed} months elapsed</div>
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
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>Payment history (last 12)</div>
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
                      {(!summary.payments || summary.payments.length === 0) && (
                        <span style={{ fontSize: '11px', color: '#999' }}>No payments yet</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#666' }}>Lease period</div>
                    <div style={{ fontWeight: '500' }}>
                      {summary.lease.start_date ? new Date(summary.lease.start_date).toLocaleDateString() : 'N/A'} →{' '}
                      {summary.lease.end_date ? new Date(summary.lease.end_date).toLocaleDateString() : 'Month to month'}
                    </div>
                    <div style={{ color: '#666' }}>Security deposit</div>
                    <div style={{ fontWeight: '500' }}>${Number(summary.lease.security_deposit || 0).toLocaleString()}</div>
                    <div style={{ color: '#666' }}>Pet policy</div>
                    <div style={{ fontWeight: '500' }}>{summary.lease.pet_allowed ? 'Allowed' : 'Not allowed'}</div>
                    <div style={{ color: '#666' }}>On time payments</div>
                    <div style={{ fontWeight: '500' }}>{summary.stats.on_time} of {summary.stats.total_payments}</div>
                  </div>
                </div>
              )}
              {isExpanded && !summary && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f5f5f5', fontSize: '13px', color: '#666' }}>
                  No active lease found for this tenant.{' '}
                  <button onClick={() => handleEditOpen(t)} style={{ background: 'none', border: 'none', color: '#185FA5', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                    Add lease details
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tenants;