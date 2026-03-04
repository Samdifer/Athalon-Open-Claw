import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BentoDashboard from './pages/BentoDashboard';
import Fleet from './pages/Fleet';
import WorkOrders from './pages/WorkOrders';
import { AppDock } from './components/AppDock';

function App() {
  return (
    <div className="min-h-screen relative font-sans">
      <main className="pb-32 pt-12 px-6 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<BentoDashboard />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          {/* Future routes for Billing, etc. */}
        </Routes>
      </main>
      <AppDock />
    </div>
  );
}

export default App;
