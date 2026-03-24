import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, Mail, Calendar, Clock, CheckCircle, AlertCircle, Trash2, Check } from "lucide-react";

interface Booking {
  id: number;
  shopId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preferredDate: string;
  preferredTime?: string;
  serviceType?: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface BookingsSectionProps {
  shopId: number;
}

const fetchBookings = async (shopId: number, token?: string) => {
  const res = await fetch(`/api/bookings?shopId=${shopId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }
  return res.json();
};

const updateBookingStatus = async (bookingId: number, status: string, token?: string) => {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error("Failed to update booking");
  }
  return res.json();
};

const deleteBooking = async (bookingId: number, token?: string) => {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error("Failed to delete booking");
  }
  return res.json();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function BookingsSection({ shopId }: BookingsSectionProps) {
  const queryClient = useQueryClient();
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings", shopId],
    queryFn: () => fetchBookings(shopId),
  });

  const bookings = data?.data || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: number; status: string }) =>
      updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", shopId] });
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId: number) => deleteBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", shopId] });
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin text-orange-600 h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 font-medium">Failed to load bookings</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-50 rounded-lg border-2 border-dashed">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No bookings yet</p>
        <p className="text-slate-500 text-sm">When customers book appointments, they'll appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Count Badge */}
      {bookings.filter((b: Booking) => b.status === "pending").length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-yellow-600 h-5 w-5" />
          <div>
            <p className="font-bold text-yellow-900">
              {bookings.filter((b: Booking) => b.status === "pending").length} pending bookings
            </p>
            <p className="text-yellow-700 text-sm">Confirm or reject these booking requests</p>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.map((booking: Booking) => (
          <div
            key={booking.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{booking.customerName}</h4>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(booking.preferredDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {booking.preferredTime && (
                    <>
                      <Clock className="h-4 w-4 ml-2" />
                      {booking.preferredTime}
                    </>
                  )}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(booking.status)}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm mb-4">
              <a
                href={`tel:${booking.customerPhone}`}
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {booking.customerPhone}
              </a>
              {booking.customerEmail && (
                <a
                  href={`mailto:${booking.customerEmail}`}
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {booking.customerEmail}
                </a>
              )}
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
              className="text-sm text-blue-600 hover:underline font-medium mb-3"
            >
              {expandedBooking === booking.id ? "Hide details" : "Show details"}
            </button>

            {expandedBooking === booking.id && (
              <div className="bg-slate-50 p-3 rounded mb-4 space-y-2 text-sm">
                {booking.serviceType && (
                  <p>
                    <span className="font-bold text-gray-700">Service Type:</span> {booking.serviceType}
                  </p>
                )}
                {booking.notes && (
                  <p>
                    <span className="font-bold text-gray-700">Notes:</span> {booking.notes}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {booking.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Confirm
                </button>
                <button
                  onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Reject
                </button>
              </div>
            )}

            {booking.status === "confirmed" && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "completed" })}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => deleteBookingMutation.mutate(booking.id)}
                  disabled={deleteBookingMutation.isPending}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {booking.status === "completed" && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="h-5 w-5" />
                Booking completed on {new Date(booking.updatedAt).toLocaleDateString("en-IN")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
