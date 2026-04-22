import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';
import Invoices from './pages/Invoices';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <div className="logo-icon">R</div>
            <span>RentTrack</span>
          </div>
          <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Dashboard</NavLink>
          <NavLink to="/properties" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Properties</NavLink>
          <NavLink to="/tenants" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Tenants</NavLink>
          <NavLink to="/payments" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Payments</NavLink>
          <NavLink to="/invoices" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Invoices</NavLink>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/invoices" element={<Invoices />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;