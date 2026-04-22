import { useState, useEffect } from 'react';
import axios from 'axios';

function Documents() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/documents');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const analyzeFiles = async (files) => {
    const fileArray = Array.from(files).slice(0, 100);
    const allowed = /\.(pdf|doc|docx|txt)$/i;
    const validFiles = fileArray.filter(f => allowed.test(f.name));
    if (validFiles.length === 0) {
      setError('Please upload PDF, Word, or text files only');
      return;
    }
    setUploading(true);
    setError(null);
    setUploadProgress(validFiles.map(f => ({
      name: f.name, status: 'pending', confidence: null, tenant: null, id: null
    })));
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'analyzing' } : p
      ));
      try {
        const formData = new FormData();
        formData.append('lease', file);
        const res = await axios.post('/api/ai/analyze-lease', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? {
            ...p, status: 'done',
            confidence: res.data.confidence,
            tenant: res.data.data && res.data.data.tenant_name,
            id: res.data.document_id,
            needs_review: res.data.needs_review
          } : p
        ));
      } catch (err) {
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error' } : p
        ));
      }
    }
    setUploading(false);
    fetchHistory();
  };

  const handleFileInput = (e) => {
    if (e.target.files.length > 0) analyzeFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) analyzeFiles(e.dataTransfer.files);
  };

  const confidenceBg = (score) => {
    if (!score) return { background:'#f3f4f6', color:'#374151' };
    if (score >= 90) return { background:'#dcfce7', color:'#166534' };
    if (score >= 75) return { background:'#fef3c7', color:'#92400e' };
    return { background:'#fee2e2', color:'#991b1b' };
  };

  const statusIcon = (status) => {
    if (status === 'pending') return 'Pending';
    if (status === 'analyzing') return 'Reading...';
    if (status === 'done') return 'Done';
    if (status === 'error') return 'Failed';
    return '';
  };

  const statusColor = (status) => {
    if (status === 'done') return '#166534';
    if (status === 'error') return '#991b1b';
    if (status === 'analyzing') return '#185FA5';
    return '#666';
  };

  const renderFields = (data) => {
    if (!data) return null;
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const fields = [
      { label: 'Tenant name', value: parsed.tenant_name },
      { label: 'Monthly rent', value: parsed.monthly_rent ? '$' + Number(parsed.monthly_rent).toLocaleString() : null },
      { label: 'Security deposit', value: parsed.security_deposit ? '$' + Number(parsed.security_deposit).toLocaleString() : null },
      { label: 'Lease start', value: parsed.start_date },
      { label: 'Lease end', value: parsed.end_date },
      { label: 'Late fee', value: parsed.late_fee_amount ? '$' + parsed.late_fee_amount + ' after ' + parsed.late_fee_grace_days + ' days' : 'None / Waived' },
      { label: 'Rent due day', value: parsed.rent_due_day ? parsed.rent_due_day + 'th of month' : null },
      { label: 'Pet policy', value: parsed.pet_allowed ? 'Allowed' : 'Not allowed / Waived' },
      { label: 'Property address', value: parsed.property_address },
      { label: 'Unit', value: parsed.unit_number },
      { label: 'Utilities', value: parsed.utilities_included && parsed.utilities_included.length > 0 ? parsed.utilities_included.join(', ') : 'None listed' },
    ];
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
        {fields.map((field, i) => (
          <div key={i} style={{padding:'8px 10px',background:'#f8f9fa',borderRadius:'6px'}}>
            <div style={{fontSize:'10px',color:'#666',marginBottom:'2px'}}>{field.label}</div>
            <div style={{fontSize:'12px',fontWeight:'500',color:field.value ? '#1a1a1a' : '#999'}}>
              {field.value || 'Not found'}
            </div>
          </div>
        ))}
        {parsed.notes && (
          <div style={{gridColumn:'1/-1',padding:'8px 10px',background:'#EFF6FF',borderRadius:'6px'}}>
            <div style={{fontSize:'10px',color:'#1e40af',marginBottom:'2px',fontWeight:'500'}}>Claude notes</div>
            <div style={{fontSize:'12px',color:'#1e40af'}}>{parsed.notes}</div>
          </div>
        )}
      </div>
    );
  };

  const completedCount = uploadProgress.filter(p => p.status === 'done').length;
  const errorCount = uploadProgress.filter(p => p.status === 'error').length;

  return (
    <div style={{padding:'2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'600'}}>AI Lease Analyzer</h1>
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>
            Upload up to 100 leases at once
          </p>
        </div>
        <div style={{fontSize:'13px',color:'#666'}}>{history.length} documents stored</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
        <div>
          <div style={{background:'#EFF6FF',borderRadius:'12px',padding:'1rem',marginBottom:'1rem',border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:'12px',fontWeight:'500',color:'#1e40af',marginBottom:'6px'}}>Supported formats</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'4px'}}>
              {['PDF','Word (.doc)','Word (.docx)','Text (.txt)'].map(t => (
                <span key={t} style={{background:'white',color:'#1e40af',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',border:'1px solid #bfdbfe'}}>{t}</span>
              ))}
            </div>
            <div style={{fontSize:'11px',color:'#3b82f6'}}>Up to 100 files at once · Each saved permanently</div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: '2px dashed ' + (dragOver ? '#185FA5' : '#ddd'),
              borderRadius:'12px',
              padding:'2rem',
              textAlign:'center',
              background: dragOver ? '#EFF6FF' : 'white',
              transition:'all 0.2s',
              marginBottom:'1rem'
            }}
          >
            <div style={{fontSize:'36px',marginBottom:'10px'}}>📄</div>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'4px'}}>
              {uploading ? 'Analyzing your leases...' : 'Drop lease files here'}
            </div>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'8px'}}>
              {uploading ? completedCount + ' of ' + uploadProgress.length + ' complete' : 'Select multiple files — up to 100'}
            </div>
            {!uploading && (
              <label style={{background:'#185FA5',color:'white',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500'}}>
                Choose files
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileInput} multiple style={{display:'none'}}/>
              </label>
            )}
          </div>

          {error && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'1rem',borderRadius:'8px',fontSize:'13px',marginBottom:'1rem'}}>
              {error}
            </div>
          )}

          {uploadProgress.length > 0 && (
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'1rem'}}>
                <div style={{fontSize:'14px',fontWeight:'500'}}>Upload progress</div>
                <div style={{fontSize:'12px',color:'#666'}}>
                  {completedCount} done
                  {errorCount > 0 && <span style={{color:'#991b1b',marginLeft:'8px'}}>{errorCount} failed</span>}
                </div>
              </div>
              <div style={{height:'6px',background:'#f3f4f6',borderRadius:'3px',marginBottom:'1rem'}}>
                <div style={{
                  height:'6px',borderRadius:'3px',background:'#185FA5',
                  width: uploadProgress.length > 0 ? ((completedCount / uploadProgress.length) * 100) + '%' : '0%',
                  transition:'width 0.3s ease'
                }}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'300px',overflowY:'auto'}}>
                {uploadProgress.map((p, i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#f8f9fa',borderRadius:'8px'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'12px',fontWeight:'500',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{fontSize:'11px',color:statusColor(p.status),marginTop:'1px'}}>{statusIcon(p.status)}{p.tenant ? ' — ' + p.tenant : ''}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                      {p.confidence && (
                        <span style={{...confidenceBg(p.confidence),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>{p.confidence}%</span>
                      )}
                      {p.id && (
                        <a href={'/api/ai/retrieve/' + p.id} target="_blank" rel="noreferrer"
                          style={{fontSize:'11px',color:'#185FA5',textDecoration:'none',background:'white',padding:'2px 8px',borderRadius:'6px',border:'1px solid #bfdbfe'}}>
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!uploading && (
                <button onClick={() => setUploadProgress([])}
                  style={{marginTop:'12px',background:'white',color:'#666',border:'1px solid #ddd',padding:'6px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'12px'}}>
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{background:'white',borderRadius:'12px',border:'1px solid #eee',padding:'1.25rem'}}>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'1rem'}}>
              Previously analyzed — {history.length} documents
            </div>
            {history.length === 0 ? (
              <p style={{fontSize:'13px',color:'#666'}}>No documents yet.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px',maxHeight:'600px',overflowY:'auto'}}>
                {history.map(doc => {
                  const data = typeof doc.ai_extracted_data === 'string' ? JSON.parse(doc.ai_extracted_data) : doc.ai_extracted_data;
                  const isSelected = selectedDoc && selectedDoc.id === doc.id;
                  return (
                    <div key={doc.id} style={{borderRadius:'8px',border:'1px solid ' + (isSelected ? '#185FA5' : '#eee'),overflow:'hidden'}}>
                      <div onClick={() => setSelectedDoc(isSelected ? null : doc)}
                        style={{padding:'10px 12px',background:isSelected ? '#EFF6FF' : '#f8f9fa',cursor:'pointer'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'13px',fontWeight:'500'}}>{data && data.tenant_name ? data.tenant_name : 'Unknown tenant'}</div>
                            <div style={{fontSize:'11px',color:'#666',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.file_name}</div>
                            <div style={{fontSize:'11px',color:'#666',marginTop:'1px'}}>
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                              {data && data.monthly_rent ? ' · $' + Number(data.monthly_rent).toLocaleString() + '/mo' : ''}
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
                            <span style={{...confidenceBg(doc.ai_confidence),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                              {Number(doc.ai_confidence).toFixed(0)}%
                            </span>
                            {doc.needs_review && (
                              <span style={{background:'#fef3c7',color:'#92400e',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Review</span>
                            )}
                          </div>
                        </div>
                        <div style={{marginTop:'8px',display:'flex',gap:'6px'}}>
                          <a href={'/api/ai/retrieve/' + doc.id} target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{fontSize:'11px',color:'#185FA5',textDecoration:'none',background:'white',padding:'3px 10px',borderRadius:'6px',border:'1px solid #bfdbfe'}}>
                            Download original
                          </a>
                          <span style={{fontSize:'11px',color:'#666',padding:'3px 10px',background:'white',borderRadius:'6px',border:'1px solid #eee'}}>
                            {isSelected ? 'Hide' : 'Details'}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{padding:'12px',borderTop:'1px solid #eee',background:'white'}}>
                          {renderFields(doc.ai_extracted_data)}
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
