function Dashboard() {
  return (
    <div style={{padding: '2rem'}}>
      <div style={{marginBottom: '1.5rem'}}>
        <h1 style={{fontSize: '22px', fontWeight: '600', color: '#1a1a1a'}}>Dashboard</h1>
        <p style={{fontSize: '13px', color: '#666', marginTop: '4px'}}>Welcome to RentTrack</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem'}}>
        <div style={{background: '#f8f9fa', borderRadius: '10px', padding: '1rem'}}>
          <div style={{fontSize: '12px', color: '#666', marginBottom: '6px'}}>Monthly income</div>
          <div style={{fontSize: '24px', fontWeight: '600'}}>$0</div>
          <div style={{fontSize: '11px', color: '#22c55e', marginTop: '4px'}}>↑ connecting to API</div>
        </div>
        <div style={{background: '#f8f9fa', borderRadius: '10px', padding: '1rem'}}>
          <div style={{fontSize: '12px', color: '#666', marginBottom: '6px'}}>Properties</div>
          <div style={{fontSize: '24px', fontWeight: '600'}}>0</div>
        </div>
        <div style={{background: '#f8f9fa', borderRadius: '10px', padding: '1rem'}}>
          <div style={{fontSize: '12px', color: '#666', marginBottom: '6px'}}>Tenants</div>
          <div style={{fontSize: '24px', fontWeight: '600'}}>0</div>
        </div>
        <div style={{background: '#f8f9fa', borderRadius: '10px', padding: '1rem'}}>
          <div style={{fontSize: '12px', color: '#666', marginBottom: '6px'}}>Outstanding</div>
          <div style={{fontSize: '24px', fontWeight: '600', color: '#ef4444'}}>$0</div>
        </div>
      </div>

      <div style={{background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.25rem'}}>
        <div style={{fontSize: '14px', color: '#666'}}>
          Your live data will appear here once connected to the API.
        </div>
      </div>
    </div>
  );
}

export default Dashboard;