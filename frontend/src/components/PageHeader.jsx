function PageHeader({ title, subtitle, action, onAction }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
      <div>
        <h1 style={{fontSize:'22px',fontWeight:'600',color:'#1a1a1a'}}>{title}</h1>
        {subtitle && <p style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={onAction} style={{background:'#185FA5',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
          {action}
        </button>
      )}
    </div>
  );
}

export default PageHeader;
