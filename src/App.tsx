import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Portal from "./pages/Portal";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/Orders";
import AdminOrderDetail from "./pages/admin/OrderDetail";
import AdminSchedule from "./pages/admin/Schedule";
import AdminInvoices from "./pages/admin/Invoices";
import AdminClients from "./pages/admin/Clients";
import AdminTickets from "./pages/admin/Tickets";
import AdminTravelZones from "./pages/admin/TravelZones";
import AdminGallery from "./pages/admin/Gallery";
import FrameBuilder from "./pages/FrameBuilder";
import SharedReport from "./pages/SharedReport";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import cemeteryBg from "./assets/cemetery-bg.jpg";

const queryClient = new QueryClient();

const App = () => (
  <div className="min-h-screen relative">
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage: `url(${cemeteryBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    />
    <div className="fixed inset-0 -z-10 bg-background/75" />
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute><Portal /></ProtectedRoute>} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/report/:token" element={<SharedReport />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="schedule" element={<AdminSchedule />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="travel-zones" element={<AdminTravelZones />} />
              <Route path="gallery" element={<AdminGallery />} />
              <Route path="frame-builder" element={<FrameBuilder />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </div>
);

export default App;
