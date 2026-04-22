import { useState, useEffect } from 'react';
import axios from 'axios';

function Documents() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [populating, setPopulating] = useState(false);
  const [populateResult, setPopulateResult] = useState(null);

  const fetchHistory = async () => {
    try {
      const [docsRes, propsRes] = await Promise.all([
        axios.get('/api/documents'),
        axios.get('/api/properties'),
      ]);
      setHistory(docsRes.data.data || []);
      setProperties(propsRes.data.data || []);
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
      name: f.name, status: 'pending', confidence: null,
      tenant: null, id: null, file: f
    })));

    for (let i = 0; i < validFiles.length; i++) {
      await analyzeFile(validFiles[i], i);
    }
    setUploading(false);
    fetchHistory();
  };

  const analyzeFile = async (file, index) => {
    setUploadProgress(prev => prev.map((p, idx) =>
      idx === index ? { ...p, status: 'analyzing' } : p
    ));
    try {
      const formData = new FormData();
      formData.append('lease', file);
      const res = await axios.post('/api/ai/analyze-lease', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadProgress(prev => prev.map((p, idx) =>
        idx === index ? {
          ...p, status: 'done',
          confidence: res.data.confidence,
          tenant: res.data.data && res.data.data.tenant_name,
          id: res.data.document_id,
          needs_review: res.data.needs_review,
          data: res.data.data
        } : p
      ));
    } catch (err) {
      setUploadProgress(prev => prev.map((p, idx) =>
        idx === index ? { ...p, status: 'error' } : p
      ));
    }
  };

  const retryFile = async (index) => {
    const item = uploadProgress[index];
    if (!item || !item.file) return;
    await analyzeFile(item.file, index);
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

  const openReview = (doc, data) => {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    setReviewDoc(doc);
    setReviewData({ ...parsed });
  };

  const handleReviewChange = (field, value) => {
    setReviewData(prev => ({ ...prev, [field]: value }));
  };

  const handlePopulate = async (documentId, data) => {
    setPopulating(true);
    setPopulateResult(null);
    try {
      const res = await axios.post('/api/ai/populate-from-document/' + documentId, {
        property_id: selectedProperty || null,
        confirmed_data: data
      });
      setPopulateResult({ success: true, message: 'Tenant, unit and lease created successfully' });
      fetchHistory();
    } catch (err) {
      setPopulateResult({ success: false, message: err.response && err.response.data.error || 'Failed to populate' });
    } finally {
      setPopulating(false);
    }
  };

  const confidenceBg = (score) => {
    const s = Number(score);
    if (s >= 90) return { background:'#dcfce7', color:'#166534' };
    if (s >= 75) return { background:'#fef3c7', color:'#92400e' };
    return { background:'#fee2e2', color:'#991b1b' };
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
          <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>Upload leases — Claude extracts data and populates your dashboard automatically</p>
        </div>
        <div style={{fontSize:'13px',color:'#666'}}>{history.length} documents stored</div>
      </div>

      {reviewDoc && reviewData && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'2rem',width:'600px',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
              <div style={{fontSize:'16px',fontWeight:'600'}}>Review extracted data</div>
              <button onClick={() => { setReviewDoc(null); setReviewData(null); setPopulateResult(null); }}
                style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#666'}}>✕</button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'1.5rem'}}>
              {[
                { label: 'Tenant name', field: 'tenant_name', type: 'text' },
                { label: 'Monthly rent', field: 'monthly_rent', type: 'number' },
                { label: 'Security deposit', field: 'security_deposit', type: 'number' },
                { label: 'Start date', field: 'start_date', type: 'date' },
                { label: 'End date', field: 'end_date', type: 'date' },
                { label: 'Late fee amount', field: 'late_fee_amount', type: 'number' },
                { label: 'Grace days', field: 'late_fee_grace_days', type: 'number' },
                { label: 'Rent due day', field: 'rent_due_day', type: 'number' },
                { label: 'Pet deposit', field: 'pet_deposit', type: 'number' },
                { label: 'Monthly pet fee', field: 'monthly_pet_fee', type: 'number' },
                { label: 'Property address', field: 'property_address', type: 'text' },
                { label: 'Unit number', field: 'unit_number', type: 'text' },
              ].map((field, i) => (
                <div key={i}>
                  <label style={{fontSize:'11px',color:'#666',display:'block',marginBottom:'3px'}}>{field.label}</label>
                  <input
                    type={field.type}
                    value={reviewData[field.field] || ''}
                    onChange={(e) => handleReviewChange(field.field, e.target.value)}
                    style={{width:'100%',padding:'7px 10px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'12px'}}
                  />
                </div>
              ))}
            </div>

            <div style={{marginBottom:'1rem'}}>
              <label style={{fontSize:'11px',color:'#666',display:'block',marginBottom:'3px'}}>Select property to add tenant to</label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                style={{width:'100%',padding:'8px 10px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'12px'}}
              >
                <option value="">Select property (optional)</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {populateResult && (
              <div style={{padding:'10px 12px',borderRadius:'8px',marginBottom:'1rem',fontSize:'12px',...(populateResult.success ? {background:'#dcfce7',color:'#166534'} : {background:'#fee2e2',color:'#991b1b'})}}>
                {populateResult.message}
              </div>
            )}

            <div style={{display:'flex',gap:'8px'}}>
              <button
                onClick={() => handlePopulate(reviewDoc.id, reviewData)}
                disabled={populating}
                style={{background:'#185FA5',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500'}}
              >
                {populating ? 'Creating...' : 'Confirm and add to dashboard'}
              </button>
              <button
                onClick={() => { setReviewDoc(null); setReviewData(null); setPopulateResult(null); }}
                style={{background:'white',color:'#666',border:'1px solid #ddd',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
        <div>
          <div style={{background:'#EFF6FF',borderRadius:'12px',padding:'1rem',marginBottom:'1rem',border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:'12px',fontWeight:'500',color:'#1e40af',marginBottom:'6px'}}>Supported formats</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'4px'}}>
              {['PDF','Word (.doc)','Word (.docx)','Text (.txt)'].map(t => (
                <span key={t} style={{background:'white',color:'#1e40af',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',border:'1px solid #bfdbfe'}}>{t}</span>
              ))}
            </div>
            <div style={{fontSize:'11px',color:'#3b82f6'}}>Up to 100 files · High confidence auto-populates dashboard</div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{border:'2px dashed ' + (dragOver ? '#185FA5' : '#ddd'),borderRadius:'12px',padding:'2rem',textAlign:'center',background:dragOver ? '#EFF6FF' : 'white',transition:'all 0.2s',marginBottom:'1rem'}}
          >
            <div style={{fontSize:'36px',marginBottom:'10px'}}>📄</div>
            <div style={{fontSize:'14px',fontWeight:'500',marginBottom:'4px'}}>
              {uploading ? 'Analyzing — ' + completedCount + ' of ' + uploadProgress.length + ' done' : 'Drop lease files here'}
            </div>
            <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>
              {uploading ? 'Each file saved permanently' : 'PDF, Word, or text — up to 100 files'}
            </div>
            {!uploading && (
              <label style={{background:'#185FA5',color:'white',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500'}}>
                Choose files
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileInput} multiple style={{display:'none'}}/>
              </label>
            )}
          </div>

          {error && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'1rem',borderRadius:'8px',fontSize:'13px',marginBottom:'1rem'}}>{error}</div>
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
                <div style={{height:'6px',borderRadius:'3px',background:'#185FA5',width:uploadProgress.length > 0 ? ((completedCount / uploadProgress.length) * 100) + '%' : '0%',transition:'width 0.3s ease'}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'300px',overflowY:'auto'}}>
                {uploadProgress.map((p, i) => (
                  <div key={i} style={{padding:'8px 10px',background:'#f8f9fa',borderRadius:'8px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'12px',fontWeight:'500',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                        <div style={{fontSize:'11px',marginTop:'2px',color: p.status === 'done' ? '#166634' : p.status === 'error' ? '#991b1b' : p.status === 'analyzing' ? '#185FA5' : '#666'}}>
                          {p.status === 'pending' && 'Waiting...'}
                          {p.status === 'analyzing' && 'Claude is reading...'}
                          {p.status === 'done' && (p.tenant || 'Complete')}
                          {p.status === 'error' && 'Failed to analyze'}
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                        {p.confidence && (
                          <span style={{...confidenceBg(p.confidence),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>{p.confidence}%</span>
                        )}
                        {p.status === 'error' && (
                          <button
                            onClick={() => retryFile(i)}
                            style={{fontSize:'11px',color:'#185FA5',background:'white',border:'1px solid #bfdbfe',padding:'2px 8px',borderRadius:'6px',cursor:'pointer'}}
                          >
                            Retry
                          </button>
                        )}
                        {p.status === 'done' && p.needs_review && (
                          <button
                            onClick={() => openReview({ id: p.id }, p.data)}
                            style={{fontSize:'11px',color:'#92400e',background:'#fef3c7',border:'none',padding:'2px 8px',borderRadius:'6px',cursor:'pointer'}}
                          >
                            Review
                          </button>
                        )}
                        {p.status === 'done' && !p.needs_review && p.id && (
                          <button
                            onClick={() => handlePopulate(p.id, p.data)}
                            style={{fontSize:'11px',color:'#166534',background:'#dcfce7',border:'none',padding:'2px 8px',borderRadius:'6px',cursor:'pointer'}}
                          >
                            Add to dashboard
                          </button>
                        )}
                        {p.id && (
                          <a href={'/api/ai/retrieve/' + p.id} target="_blank" rel="noreferrer"
                            style={{fontSize:'11px',color:'#185FA5',textDecoration:'none',background:'white',padding:'2px 8px',borderRadius:'6px',border:'1px solid #bfdbfe'}}>
                            Download
                          </a>
                        )}
                      </div>
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
                  const conf = Number(doc.ai_confidence);
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
                            <span style={{...confidenceBg(conf),fontSize:'11px',padding:'2px 8px',borderRadius:'20px'}}>
                              {conf.toFixed(0)}%
                            </span>
                            {doc.needs_review && !doc.ai_reviewed && (
                              <span style={{background:'#fef3c7',color:'#92400e',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Needs review</span>
                            )}
                            {doc.ai_reviewed && (
                              <span style={{background:'#dcfce7',color:'#166534',fontSize:'10px',padding:'2px 6px',borderRadius:'10px'}}>Added to dashboard</span>
                            )}
                          </div>
                        </div>

                        <div style={{marginTop:'8px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          <a href={'/api/ai/retrieve/' + doc.id} target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{fontSize:'11px',color:'#185FA5',textDecoration:'none',background:'white',padding:'3px 10px',borderRadius:'6px',border:'1px solid #bfdbfe'}}>
                            Download
                          </a>
                          {doc.needs_review && !doc.ai_reviewed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openReview(doc, doc.ai_extracted_data); }}
                              style={{fontSize:'11px',color:'#92400e',background:'#fef3c7',border:'none',padding:'3px 10px',borderRadius:'6px',cursor:'pointer'}}
                            >
                              Review and edit
                            </button>
                          )}
                          {!doc.ai_reviewed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePopulate(doc.id, data); }}
                              style={{fontSize:'11px',color:'#166534',background:'#dcfce7',border:'none',padding:'3px 10px',borderRadius:'6px',cursor:'pointer'}}
                            >
                              Add to dashboard
                            </button>
                          )}
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