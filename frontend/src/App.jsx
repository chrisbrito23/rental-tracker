import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard  from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants    from './pages/Tenants';
import Payments   from './pages/Payments';
import Invoices   from './pages/Invoices';
import Documents  from './pages/Documents';
import Expenses   from './pages/Expenses';
import Finances   from './pages/Finances';
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
          <NavLink to="/tenants"    className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Tenants</NavLink>
          <NavLink to="/payments"   className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Payments</NavLink>
          <NavLink to="/finances"   className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Finances</NavLink>
          <NavLink to="/expenses"   className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Expenses</NavLink>
          <NavLink to="/invoices"   className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Invoices</NavLink>
          <NavLink to="/documents"  className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>Documents</NavLink>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/tenants"    element={<Tenants />} />
            <Route path="/payments"   element={<Payments />} />
            <Route path="/finances"   element={<Finances />} />
            <Route path="/expenses"   element={<Expenses />} />
            <Route path="/invoices"   element={<Invoices />} />
            <Route path="/documents"  element={<Documents />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;