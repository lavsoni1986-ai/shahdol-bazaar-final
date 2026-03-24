// MyOrders - Customer order tracking page
// Shows all orders placed by the current user

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useDistrict } from "@/contexts/DistrictContext";
import { 
  Package, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  MapPin,
  Phone,
  Store,
  ShoppingBag,
  ChevronRight,
  Truck,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Order {
  id: number;
  productId: number;
  vendorId: number;
  quantity: number;
  totalPrice: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    name: string;
    phone: string;
    address: string;
    logo?: string;
    isVerified?: boolean;
    dsslScore?: number;
    safetyBadges?: string[];
  };
  product?: {
    name: string;
    imageUrl: string;
    price?: number;
  };
}

export default function MyOrders() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { currentDistrict } = useDistrict();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth?redirect=/my-orders");
    }
  }, [isAuthenticated, setLocation]);

  // Fetch user's orders
  useEffect(() => {
    if (!user?.id) return;

    fetch(`/api/orders/user/${user.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [user?.id]);

  if (!isAuthenticated) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted':
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  // Order Status Timeline Stages
  const orderStages = [
    { key: 'pending', label: 'Order Placed', icon: Package },
    { key: 'accepted', label: 'Accepted by Vendor', icon: CheckCircle },
    { key: 'shipped', label: 'Out for Delivery', icon: Truck },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ];

  const getCurrentStageIndex = (status: string) => {
    const statusMap: Record<string, number> = {
      'pending': 0,
      'accepted': 1,
      'confirmed': 1,
      'shipped': 2,
      'out_for_delivery': 2,
      'completed': 3,
      'delivered': 3,
    };
    return statusMap[status?.toLowerCase()] ?? 0;
  };

  // Separate orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['accepted', 'confirmed', 'shipped'].includes(o.status));
  const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{currentDistrict?.name || 'Shahdol'} - My Orders</h1>
              <p className="text-slate-400">Track your orders and view order history</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No orders yet</h3>
              <p className="text-slate-500 mb-6">Start shopping to see your orders here</p>
              <Button onClick={() => setLocation('/marketplace')} className="bg-orange-500">
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending ({pendingOrders.length})
                </h2>
                <div className="space-y-4">
                  {pendingOrders.map(order => (
                    <Card key={order.id} className="border-yellow-200 overflow-hidden">
                      {/* Order Details Header */}
                      <div className="bg-gradient-to-r from-yellow-50 to-white p-4 border-b border-yellow-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Product Image */}
                            {order.product?.imageUrl ? (
                              <img 
                                src={order.product.imageUrl} 
                                alt={order.product.name} 
                                className="w-16 h-16 rounded-lg object-cover border"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800">{order.product?.name || `Product #${order.productId}`}</p>
                              <p className="text-sm text-slate-500">Qty: {order.quantity} • {new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">₹{Number(order.totalPrice).toLocaleString()}</p>
                            <Badge className={`mt-1 ${getStatusColor(order.status)}`}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Vendor Info & Timeline */}
                      <CardContent className="p-4">
                        {/* Vendor with Trust Badge */}
                        {order.vendor && (
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-slate-500" />
                              <span className="font-medium text-slate-700">{order.vendor.name}</span>
                              {order.vendor.isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                  <ShieldCheck className="w-3 h-3" />
                                  DSSL Verified
                                </span>
                              )}
                            </div>
                            {order.vendor.phone && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => window.open(`https://wa.me/91${order.vendor?.phone?.replace(/\D/g, '')}`, '_blank')}
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Contact
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Status Timeline */}
                        <div className="flex items-center justify-between">
                          {orderStages.map((stage, index) => {
                            const currentIndex = getCurrentStageIndex(order.status);
                            const isCompleted = index <= currentIndex;
                            const isCurrent = index === currentIndex;
                            const StageIcon = stage.icon;
                            
                            return (
                              <div key={stage.key} className="flex flex-col items-center flex-1">
                                <div className={`
                                  w-8 h-8 rounded-full flex items-center justify-center mb-1
                                  ${isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-slate-200 text-slate-400'
                                  }
                                  ${isCurrent && !['completed', 'delivered'].includes(order.status) ? 'ring-2 ring-orange-400' : ''}
                                `}>
                                  <StageIcon className="w-4 h-4" />
                                </div>
                                <span className={`text-xs text-center ${isCompleted ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                  {stage.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Delivery Address */}
                        {order.customerAddress && (
                          <div className="flex items-start gap-2 mt-4 pt-4 border-t border-slate-100">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span className="text-sm text-slate-600">{order.customerAddress}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  In Progress ({activeOrders.length})
                </h2>
                <div className="space-y-4">
                  {activeOrders.map(order => (
                    <Card key={order.id} className="border-blue-200 overflow-hidden">
                      {/* Order Details Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Product Image */}
                            {order.product?.imageUrl ? (
                              <img 
                                src={order.product.imageUrl} 
                                alt={order.product.name} 
                                className="w-16 h-16 rounded-lg object-cover border"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800">{order.product?.name || `Product #${order.productId}`}</p>
                              <p className="text-sm text-slate-500">Qty: {order.quantity} • {new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">₹{Number(order.totalPrice).toLocaleString()}</p>
                            <Badge className={`mt-1 ${getStatusColor(order.status)}`}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Vendor Info & Timeline */}
                      <CardContent className="p-4">
                        {/* Vendor with Trust Badge */}
                        {order.vendor && (
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-slate-500" />
                              <span className="font-medium text-slate-700">{order.vendor.name}</span>
                              {order.vendor.isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                  <ShieldCheck className="w-3 h-3" />
                                  DSSL Verified
                                </span>
                              )}
                            </div>
                            {order.vendor.phone && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => window.open(`https://wa.me/91${order.vendor?.phone?.replace(/\D/g, '')}`, '_blank')}
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Contact
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Status Timeline */}
                        <div className="flex items-center justify-between">
                          {orderStages.map((stage, index) => {
                            const currentIndex = getCurrentStageIndex(order.status);
                            const isCompleted = index <= currentIndex;
                            const isCurrent = index === currentIndex;
                            const StageIcon = stage.icon;
                            
                            return (
                              <div key={stage.key} className="flex flex-col items-center flex-1">
                                <div className={`
                                  w-8 h-8 rounded-full flex items-center justify-center mb-1
                                  ${isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-slate-200 text-slate-400'
                                  }
                                  ${isCurrent && !['completed', 'delivered'].includes(order.status) ? 'ring-2 ring-blue-400' : ''}
                                `}>
                                  <StageIcon className="w-4 h-4" />
                                </div>
                                <span className={`text-xs text-center ${isCompleted ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                  {stage.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Delivery Address */}
                        {order.customerAddress && (
                          <div className="flex items-start gap-2 mt-4 pt-4 border-t border-slate-100">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span className="text-sm text-slate-600">{order.customerAddress}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Completed ({completedOrders.length})
                </h2>
                <div className="space-y-4">
                  {completedOrders.map(order => (
                    <Card key={order.id} className="border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">Order #{order.id}</p>
                                <p className="text-sm text-slate-500">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {order.vendor && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                                <Store className="w-4 h-4" />
                                <span>{order.vendor.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-600">₹{order.totalPrice}</p>
                            <Badge className={`mt-2 ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{order.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}