import { useState } from 'react';
import axios from 'axios';

function Documents() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const analyzeFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    setUploading(true);
    setResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('lease', file);
      const res = await axios.post('/api/ai/analyze-lease', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError('Failed to analyze lease. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) analyzeFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) analyzeFile(file);
  };

  const confidenceColor = (score) => {
    if (score >= 95) return '#166534';
    if (score >= 80) return '#92400e';
    return '#991b1b';
  };

  const fieldConfidence = (score) => {
    if (!score) return null;
    const color = score >= 95 ? '#dcfce7' : score >= 80 ? '#fef3c7' : '#fee2e2';
    const text = score >= 95 ? '#166534' : score >= 80 ? '#92400e' : '#991b1b';
    return { background: color, color: text };
  };

  return (
    <div style={{padding:'2rem'}}>
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:'22px',fontWeight:'600'}}>AI Lease Analyzer</h1>
        <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>
          Upload a lease PDF and Claude will extract all key terms automatically
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#185FA5' : '#ddd'}`,
          borderRadius:'12px',
          padding:'3rem',
          textAlign:'center',
          marginBottom:'1.5rem',
          background: dragOver ? '#EFF6FF' : 'white',
          transition:'all 0.2s'
        }}
      >
        {uploading ? (
          <div>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>⏳</div>
            <div style={{fontSize:'15px',fontWeight:'500',color:'#185FA5'}}>Claude is reading your lease...</div>
            <div style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>This takes about 10 seconds</div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>📄</div>
            <div style={{fontSize:'15px',fontWeight:'500',marginBottom:'4px'}}>Drop your lease PDF here</div>
            <div style={{fontSize:'13px',color:'#666',marginBottom:'16px'}}>or click to browse files</div>
            <label style={{background:'#185FA5',color:'white',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              Browse files
              <input type="file" accept=".pdf" onChange={handleFileInput} style={{display:'none'}}/>
            </label>
          </div>
        )}
      </div>

      {error && (
        <div style={{background:'#fee2e2',color:'#991b1b',padding:'1rem',borderRadius:'8px',marginBottom:'1.5rem',fontSize:'13px'}}>
          {error}
        </div>
      )}

      {result && result.success && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',paddingBottom:'12px',borderBottom:'1px solid #eee'}}>
            <div style={{fontSize:'15px',fontWeight:'500'}}>Extraction results</div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{fontSize:'12px',color:'#666'}}>Overall confidence</div>
              <div style={{fontSize:'18px',fontWeight:'700',color:confidenceColor(result.confidence)}}>
                {result.confidence}%
              </div>
              {result.needs_review && (
                <span style={{background:'#fef3c7',color:'#92400e',fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                  Needs review
                </span>
              )}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {[
              { label: 'Tenant name', value: result.data.tenant_name, conf: result.data.confidence?.monthly_rent },
              { label: 'Monthly rent', value: result.data.monthly_rent ? `$${result.data.monthly_rent}` : null, conf: result.data.confidence?.monthly_rent },
              { label: 'Security deposit', value: result.data.security_deposit ? `$${result.data.security_deposit}` : null },
              { label: 'Lease start', value: result.data.start_date },
              { label: 'Lease end', value: result.data.end_date },
              { label: 'Late fee', value: result.data.late_fee_amount ? `$${result.data.late_fee_amount} after ${result.data.late_fee_grace_days} days` : null, conf: result.data.confidence?.late_fee },
              { label: 'Rent due day', value: result.data.rent_due_day ? `${result.data.rent_due_day}st of month` : null },
              { label: 'Pet allowed', value: result.data.pet_allowed ? `Yes — $${result.data.pet_deposit} deposit, $${result.data.monthly_pet_fee}/mo` : 'No' },
              { label: 'Property address', value: result.data.property_address },
              { label: 'Unit number', value: result.data.unit_number },
            ].map((field, i) => (
              <div key={i} style={{padding:'10px 12px',background:'#f8f9fa',borderRadius:'8px'}}>
                <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>{field.label}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:'13px',fontWeight:'500',color: field.value ? '#1a1a1a' : '#999'}}>
                    {field.value || 'Not found'}
                  </div>
                  {field.conf && (
                    <span style={{...fieldConfidence(field.conf),fontSize:'10px',padding:'1px 6px',borderRadius:'10px'}}>
                      {field.conf}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {result.data.notes && (
            <div style={{marginTop:'12px',padding:'12px',background:'#EFF6FF',borderRadius:'8px',fontSize:'12px',color:'#1e40af'}}>
              <div style={{fontWeight:'500',marginBottom:'4px'}}>Notes from Claude</div>
              {result.data.notes}
            </div>
          )}

          <div style={{marginTop:'1.25rem',paddingTop:'12px',borderTop:'1px solid #eee',display:'flex',gap:'8px'}}>
            <button style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              Save to database
            </button>
            <button onClick={() => setResult(null)} style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              Analyze another lease
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;