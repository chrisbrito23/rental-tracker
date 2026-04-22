function Dashboard() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Welcome to RentTrack</div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Monthly income</div>
          <div className="metric-value">$0</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Properties</div>
          <div className="metric-value">0</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Tenants</div>
          <div className="metric-value">0</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outstanding</div>
          <div className="metric-value">$0</div>
        </div>
      </div>
      <div className="card">
        <p style={{color:'#666',fontSize:'14px'}}>
          Your dashboard will show live data here once connected to the API.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;