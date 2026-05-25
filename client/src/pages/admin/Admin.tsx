// 📁 client/src/pages/admin/Admin.tsx
// Main admin router that handles different admin panels

import { useLocation } from "wouter";
import AdminDashboard from "./AdminDashboard";
import ProductsPanel from "./ProductsPanel";
import VendorManagement from "./VendorManagement";
import UserPanel from "./UserPanel";
import OrdersPanel from "./OrdersPanel";
import CategoriesPanel from "./CategoriesPanel";
import ReviewsPanel from "./ReviewsPanel";
import BannersPanel from "./BannersPanel";
import NewsPanel from "./NewsPanel";
import DistrictsPanel from "./DistrictsPanel";
import FraudCenter from "./FraudCenter";
import PolicyPanel from "./PolicyPanel";
import AuditPanel from "./AuditPanel";
import EmergencyPanel from "./EmergencyPanel";
import AIDashboard from "./ai-dashboard";
import ModerationCockpit from "./ModerationCockpit";

export default function Admin() {
  const [location] = useLocation();

  // Extract the admin panel from the path
  const panel = location.split('/').pop();

  switch (panel) {
    case 'dashboard':
      return <AdminDashboard />;
    case 'products':
      return <ProductsPanel />;
    case 'vendors':
      return <VendorManagement />;
    case 'moderation':
      return <ModerationCockpit />;
    case 'users':
      return <UserPanel />;
    case 'orders':
      return <OrdersPanel />;
    case 'categories':
      return <CategoriesPanel />;
    case 'reviews':
      return <ReviewsPanel />;
    case 'banners':
      return <BannersPanel />;
    case 'news':
      return <NewsPanel />;
    case 'districts':
      return <DistrictsPanel />;
    case 'fraud':
      return <FraudCenter />;
    case 'policy':
      return <PolicyPanel />;
    case 'audit':
      return <AuditPanel />;
    case 'emergency':
      return <EmergencyPanel />;
    case 'ai-dashboard':
      return <AIDashboard />;
    case 'ai-monitoring':
      return <AIDashboard />; // Temporarily redirect to ai-dashboard
    default:
      return <AdminDashboard />;
  }
}
