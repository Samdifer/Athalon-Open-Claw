import React from 'react';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Routes, Route } from 'react-router-dom';
import BentoDashboard from './pages/BentoDashboard';
import Fleet from './pages/Fleet';
import WorkOrders from './pages/WorkOrders';
import Billing from './pages/Billing';
import { AppDock } from './components/AppDock';
import { OrgContextProvider } from './providers/OrgContextProvider';

function App() {
  return (
    <>
      <SignedIn>
        <OrgContextProvider>
          <div className="min-h-screen relative font-sans">
            <main className="pb-32 pt-12 px-6 max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<BentoDashboard />} />
                <Route path="/fleet" element={<Fleet />} />
                <Route path="/work-orders" element={<WorkOrders />} />
                <Route path="/billing" element={<Billing />} />
              </Routes>
            </main>
            <AppDock />
          </div>
        </OrgContextProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default App;
