function StatusBadge({ status }) {
  const colors = {
    paid:     { background:'#dcfce7', color:'#166534' },
    unpaid:   { background:'#fee2e2', color:'#991b1b' },
    late:     { background:'#fee2e2', color:'#991b1b' },
    overdue:  { background:'#7f1d1d', color:'white' },
    pending:  { background:'#fef3c7', color:'#92400e' },
    active:   { background:'#dcfce7', color:'#166534' },
    expired:  { background:'#f3f4f6', color:'#374151' },
    disputed: { background:'#fef3c7', color:'#92400e' },
  };

  const style = colors[status] || { background:'#f3f4f6', color:'#374151' };

  return (
    <span style={{...style, fontSize:'11px', padding:'2px 8px', borderRadius:'20px', display:'inline-block'}}>
      {status}
    </span>
  );
}

export default StatusBadge;