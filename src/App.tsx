import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChartHoverProvider } from "@/contexts/ChartHoverContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Summary from "./pages/Summary";
import Connections from "./pages/Connections";
import Accounts from "./pages/Accounts";
import NetWorth from "./pages/NetWorth";
import RealEstate from "./pages/RealEstate";
import Debts from "./pages/Debts";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import MoneyFlows from "./pages/MoneyFlows";
import EstatePlanning from "./pages/EstatePlanning";
import Scenarios from "./pages/Scenarios";
import RateAssumptions from "./pages/RateAssumptions";
import Settings from "./pages/Settings";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChartHoverProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><Summary /></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
            <Route path="/net-worth" element={<ProtectedRoute><NetWorth /></ProtectedRoute>} />
            <Route path="/real-estate" element={<ProtectedRoute><RealEstate /></ProtectedRoute>} />
            <Route path="/debts" element={<ProtectedRoute><Debts /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/money-flows" element={<ProtectedRoute><MoneyFlows /></ProtectedRoute>} />
            <Route path="/estate-planning" element={<ProtectedRoute><EstatePlanning /></ProtectedRoute>} />
            <Route path="/scenarios" element={<ProtectedRoute><Scenarios /></ProtectedRoute>} />
            <Route path="/rate-assumptions" element={<ProtectedRoute><RateAssumptions /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </ChartHoverProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
