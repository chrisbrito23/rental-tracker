function DataTable({ columns, rows, renderRow, emptyMessage = 'No data yet.' }) {
  if (!rows || rows.length === 0) {
    return (
      <p style={{fontSize:'13px',color:'#666',padding:'1rem 0'}}>{emptyMessage}</p>
    );
  }

  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col} style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:'12px',color:'#666',fontWeight:'500'}}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => renderRow(row, i))}
      </tbody>
    </table>
  );
}

export default DataTable;