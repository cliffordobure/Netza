import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Shell from "./Shell";
import Login from "./pages/Login";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import Attributes from "./pages/Attributes";
import Overview from "./pages/Overview";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import InventoryAdjustments from "./pages/InventoryAdjustments";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import FlashDrops from "./pages/FlashDrops";
import FlashDropForm from "./pages/FlashDropForm";
import Points from "./pages/Points";
import DeliveryOverview from "./pages/DeliveryOverview";
import DeliveryReports from "./pages/DeliveryReports";
import Reports from "./pages/Reports";
import Marketing from "./pages/Marketing";
import Payments from "./pages/Payments";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import ProductUnits from "./pages/ProductUnits";
import ProductImport from "./pages/ProductImport";
import Competitions from "./pages/Competitions";
import CompetitionForm from "./pages/CompetitionForm";
import CompetitionAnalytics from "./pages/CompetitionAnalytics";
import CompetitionDetail from "./pages/CompetitionDetail";

function Guard({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Guard>
                <Shell />
              </Guard>
            }
          >
            <Route index element={<Overview />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/categories" element={<Categories />} />
            <Route path="products/brands" element={<Brands />} />
            <Route path="products/attributes" element={<Attributes />} />
            <Route path="products/units" element={<ProductUnits />} />
            <Route path="products/import" element={<ProductImport />} />
            <Route path="products/adjustments" element={<InventoryAdjustments />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerProfile />} />
            <Route path="flash-drops" element={<FlashDrops />} />
            <Route path="flash-drops/new" element={<FlashDropForm />} />
            <Route path="flash-drops/:id/edit" element={<FlashDropForm />} />
            <Route path="points" element={<Points />} />
            <Route path="competitions" element={<Competitions />} />
            <Route path="competitions/new" element={<CompetitionForm />} />
            <Route path="competitions/analytics" element={<CompetitionAnalytics />} />
            <Route path="competitions/:id/edit" element={<CompetitionForm />} />
            <Route path="competitions/:id" element={<CompetitionDetail />} />
            <Route path="delivery" element={<DeliveryOverview />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/delivery" element={<DeliveryReports />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="support" element={<Support />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
