import { useState, useEffect } from 'react';
import axios from 'axios';

function Documents() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/documents');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const analyzeFile = async (file) => {
    const allowed = /\.(pdf|doc|docx|txt)$/i;
    if (!allowed.test(file.name)) {
      setError('Please upload a PDF, Word, or text file');
      return;
    }
    setUploading(true);
    setResult(null);
    setError(null);
    setSaved(false);
    setCurrentFile(file);
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

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await axios.post('/api/documents', {
        document_type: 'lease',
        file_name: currentFile?.name || 'uploaded_lease',
        file_url: 'local_upload',
        ai_extracted_data: result.data,
        ai_confidence: result.confidence,
        needs_review: result.needs_review
      });
      setSaved(true);
      fetchHistory();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = (score) => {
    if (score >= 90) return '#166534';
    if (score >= 75) return '#92400e';
    return '#991b1b';
  };

  const confidenceBg = (score) => {
    if (score >= 90) return {background:'#dcfce7',color:'#166534'};
    if (score >= 75) return {background:'#fef3c7',color:'#92400e'};
    return {background:'#fee2e2',color:'#991b1b'};
  };

  const renderFields = (data, confidence) => {
    if (!data) return null;
    const fields = [
      { label: 'Tenant name', value: data.tenant_name },
      { label: 'Monthly rent', value: data.monthly_rent ? `$${Number(data.monthly_rent).toLocaleString()}` : null, conf: confidence?.monthly_rent },
      { label: 'Security deposit', value: data.security_deposit ? `$${Number(data.security_deposit).toLocaleString()}` : null },
      { label: 'Lease start', value: data.start_date, conf: confidence?.dates },
      { label: 'Lease end', value: data.end_date, conf: confidence?.dates },
      { label: 'Late fee', value: data.late_fee_amount ? `$${data.late_fee_amount} after ${data.late_fee_grace_days} days` : 'None / Waived', conf: confidence?.late_fee },
      { label: 'Rent due day', value: data.rent_due_day ? `${data.rent_due_day}th of month` : null },
      { label: 'Pet policy', value: data.pet_allowed ? `Allowed — $${data.pet_deposit} deposit, $${data.monthly_pet_fee}/mo` : 'Not allowed / Waived' },
      { label: 'Property address', value: data.property_address },
      { label: 'Unit', value: data.unit_number },
      { label: 'Utilities included', value: data.utilities_included?.length > 0 ? data.utilities_included.join(', ') : 'None listed' },
    ];

    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'1rem'}}>
        {fields.map((field, i) => (
          <div key={i} style={{padding:'10px 12px',background:'#f8f9fa',borderRadius:'8px'}}>
            <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>{field.label}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:'13px',fontWeight:'500',color:field.value ? '#1a1a1a' : '#999'}}>
                {field.value || 'Not found'}
              </div>
              {field.conf && (
                <span style={{...confidenceBg(field.conf),fontSize:'10px',padding:'1px 6px',borderRadius:'10px'}}>
                  {field.conf}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{padding:'2rem'}}>
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:'22px',fontWeight:'600'}}>AI Lease Analyzer</h1>
        <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>
          Upload any lease and Claude extracts all key terms automatically
        </p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.5rem'}}>
        <div>
          <div style={{background:'#EFF6FF',borderRadius:'12px',padding:'1rem 1.25rem',marginBottom:'1rem',border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:'12px',fontWeight:'500',color:'#1e40af',marginBottom:'6px'}}>Supported formats</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {['PDF','Word (.doc)','Word (.docx)','Text (.txt)'].map(t => (
                <span key={t} style={{background:'white',color:'#1e40af',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',border:'1px solid #bfdbfe'}}>{t}</span>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border:`2px dashed ${dragOver ? '#185FA5' : '#ddd'}`,
              borderRadius:'12px',
              padding:'2rem',
              textAlign:'center',
              background:dragOver ? '#EFF6FF' : 'white',
              transition:'all 0.2s',
              marginBottom:'1rem'
            }}
          >
            {uploading ? (
              <div>
                <div style={{fontSize:'36px',marginBottom:'12px'}}>🤖</div>
                <div style={{fontSize:'14px',fontWeight:'500',color:'#185FA5'}}>Claude is reading your lease...</div>
                <div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>Extracting all key terms</div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:'36px',marginBottom:'10px'}}>📄</div>
                <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'4px'}}>Drop your lease file here</div>
                <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>or click to browse</div>
                <label style={{background:'#185FA5',color:'white',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                  Choose file
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileInput}
                    style={{display:'none'}}
                  />
                </label>
              </div>
            )}
          </div>

          {error && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'1rem',borderRadius:'8px',fontSize:'13px',marginBottom:'1rem'}}>
              {error}
            </div>
          )}

          {result && result.success && (
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',paddingBottom:'10px',borderBottom:'1px solid #eee'}}>
                <div>
                  <div style={{fontSize:'14px',fontWeight:'500'}}>Extraction complete</div>
                  <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>Review before saving</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{fontSize:'11px',color:'#666'}}>Confidence</div>
                  <div style={{fontSize:'20px',fontWeight:'700',color:confidenceColor(result.confidence)}}>
                    {result.confidence}%
                  </div>
                  <span style={{...confidenceBg(result.confidence),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                    {result.needs_review ? 'Needs review' : 'High confidence'}
                  </span>
                </div>
              </div>

              {renderFields(result.data, result.data.confidence)}

              {result.data.notes && (
                <div style={{marginBottom:'1rem',padding:'10px 12px',background:'#EFF6FF',borderRadius:'8px',fontSize:'12px',color:'#1e40af'}}>
                  <div style={{fontWeight:'500',marginBottom:'3px'}}>Claude notes</div>
                  {result.data.notes}
                </div>
              )}

              <div style={{display:'flex',gap:'8px'}}>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  style={{background: saved ? '#166534' : '#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor: saved ? 'default' : 'pointer',fontSize:'13px',fontWeight:'500'}}
                >
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save to database'}
                </button>
                <button
                  onClick={() => { setResult(null); setSaved(false); setCurrentFile(null); }}
                  style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}
                >
                  Analyze another
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>
              Previously analyzed — {history.length} documents
            </div>
            {history.length === 0 ? (
              <p style={{fontSize:'13px',color:'#666'}}>No documents analyzed yet. Upload your first lease above.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {history.map(doc => {
                  const data = typeof doc.ai_extracted_data === 'string'
                    ? JSON.parse(doc.ai_extracted_data)
                    : doc.ai_extracted_data;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                      style={{padding:'10px 12px',background:'#f8f9fa',borderRadius:'8px',cursor:'pointer',border:`1px solid ${selectedDoc?.id === doc.id ? '#185FA5' : 'transparent'}`}}
                    >
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:'500'}}>{data?.tenant_name || 'Unknown tenant'}</div>
                          <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>
                            {doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <span style={{...confidenceBg(doc.ai_confidence),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                            {doc.ai_confidence}%
                          </span>
                          {doc.needs_review && (
                            <span style={{background:'#fef3c7',color:'#92400e',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Review</span>
                          )}
                        </div>
                      </div>

                      {data?.monthly_rent && (
                        <div style={{display:'flex',gap:'12px',marginTop:'6px',fontSize:'11px',color:'#666'}}>
                          <span>${Number(data.monthly_rent).toLocaleString()}/mo</span>
                          {data.start_date && <span>{data.start_date} → {data.end_date}</span>}
                        </div>
                      )}

                      {selectedDoc?.id === doc.id && (
                        <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #eee'}}>
                          {renderFields(data, data?.confidence)}
                          {data?.notes && (
                            <div style={{padding:'8px 10px',background:'#EFF6FF',borderRadius:'6px',fontSize:'11px',color:'#1e40af'}}>
                              <strong>Notes:</strong> {data.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Documents;