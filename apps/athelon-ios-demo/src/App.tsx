import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Routes, Route } from "react-router-dom";
import { OrgContextProvider } from "./providers/OrgContextProvider";
import { IOSTabBar } from "./components/ios/IOSTabBar";
import Dashboard from "./pages/Dashboard";
import WorkOrdersList from "./pages/WorkOrdersList";
import WorkOrderDetail from "./pages/WorkOrderDetail";
import FleetList from "./pages/FleetList";
import AircraftDetail from "./pages/AircraftDetail";
import Billing from "./pages/Billing";
import InvoiceDetail from "./pages/InvoiceDetail";
import Parts from "./pages/Parts";
import Compliance from "./pages/Compliance";
import Scheduling from "./pages/Scheduling";
import Personnel from "./pages/Personnel";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MyWork from "./pages/MyWork";
import MoreTab from "./pages/MoreTab";
import CustomerPortal from "./pages/CustomerPortal";

function App() {
  return (
    <>
      <SignedIn>
        <OrgContextProvider>
          <div className="min-h-screen bg-ios-bg font-sans">
            <main className="pb-[calc(49px+env(safe-area-inset-bottom,16px))]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/work-orders" element={<WorkOrdersList />} />
                <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
                <Route path="/fleet" element={<FleetList />} />
                <Route path="/fleet/:tail" element={<AircraftDetail />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/billing/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/more" element={<MoreTab />} />
                <Route path="/more/parts" element={<Parts />} />
                <Route path="/more/compliance" element={<Compliance />} />
                <Route path="/more/scheduling" element={<Scheduling />} />
                <Route path="/more/personnel" element={<Personnel />} />
                <Route path="/more/reports" element={<Reports />} />
                <Route path="/more/settings" element={<Settings />} />
                <Route path="/more/my-work" element={<MyWork />} />
                <Route path="/more/portal" element={<CustomerPortal />} />
              </Routes>
            </main>
            <IOSTabBar />
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
