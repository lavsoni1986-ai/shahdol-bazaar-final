import React, { useState } from "react";
import { X, Calendar, Clock, User, Phone, Mail, Type, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: number;
  vendorName: string;
  vendorCategory: string;
}

interface BookingFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  notes: string;
}

export function BookingModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  vendorCategory,
}: BookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    preferredDate: "",
    preferredTime: "",
    serviceType: "",
    notes: "",
  });

  const createBookingMutation = useMutation({
    mutationFn: async (booking: BookingFormData) => {
      const response = await apiRequest("POST", "/appointments", {
        shopId: vendorId,
        shopName: vendorName,
        shopCategory: vendorCategory,
        ...booking,
        status: "pending",
      });

      // apiRequest already returns parsed JSON from the new contract
      if (!response.success) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to create booking"
        );
      }

      return response;
    },
    onSuccess: () => {
      toast.success(`Appointment request sent to ${vendorName}! They'll contact you shortly to confirm.`);
      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        preferredDate: "",
        preferredTime: "",
        serviceType: "",
        notes: "",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerName.trim()) {
      toast.warning("Please enter your name");
      return;
    }

    if (!formData.customerPhone.trim()) {
      toast.warning("Please enter your phone number");
      return;
    }

    if (!formData.preferredDate) {
      toast.warning("Please select a preferred date");
      return;
    }

    createBookingMutation.mutate(formData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isLoading = createBookingMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Book Appointment</h2>
            <p className="text-sm text-zinc-400 mt-1">{vendorName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <User className="inline w-4 h-4 mr-2" />
              Full Name *
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Your name"
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              disabled={isLoading}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Phone className="inline w-4 h-4 mr-2" />
              Phone Number *
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleInputChange}
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Mail className="inline w-4 h-4 mr-2" />
              Email (Optional)
            </label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleInputChange}
              placeholder="your@email.com"
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              disabled={isLoading}
            />
          </div>

          {/* Preferred Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              Preferred Date *
            </label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleInputChange}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 [color-scheme:dark]"
              disabled={isLoading}
            />
          </div>

          {/* Preferred Time */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Clock className="inline w-4 h-4 mr-2" />
              Preferred Time (Optional)
            </label>
            <input
              type="time"
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 [color-scheme:dark]"
              disabled={isLoading}
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Type className="inline w-4 h-4 mr-2" />
              Service Type (Optional)
            </label>
            <input
              type="text"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleInputChange}
              placeholder="e.g., Checkup, Haircut, Consultation"
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <MessageSquare className="inline w-4 h-4 mr-2" />
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Tell us more about your requirements..."
              rows={3}
              className="w-full px-3 py-2 bg-black border border-zinc-800 text-white placeholder:text-zinc-500 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 mt-6"
          >
            {isLoading ? "Sending..." : "Send Booking Request"}
          </button>

          {/* Info text */}
          <p className="text-xs text-zinc-500 text-center mt-4">
            We'll send this request to {vendorName} and they'll confirm your booking via WhatsApp or
            phone.
          </p>
        </form>
      </div>
    </div>
  );
}
