import React, { useState } from "react";
import { Calendar, Clock, User, Phone, Mail, Type, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: number;
  vendorName: string;
  vendorCategory: string;
  entityKind?: string;
  title?: string;
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
  entityKind,
  title,
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
  const isService = entityKind === "service" || vendorCategory?.toUpperCase() === "SERVICE" || vendorCategory?.toLowerCase().includes("service");
  const resolvedTitle = title || (isService ? "Book Service" : "Book Appointment");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isLoading) return;
          onClose();
        }
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isLoading) e.preventDefault();
        }}
        className={`bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-[95%] sm:w-full max-h-[90vh] overflow-y-auto p-0 gap-0 text-white [&>button]:p-2.5 [&>button]:rounded-lg [&>button]:hover:bg-white/10 [&>button]:text-zinc-400 [&>button]:hover:text-white [&>button]:transition-colors ${isLoading ? '[&>button]:opacity-30 [&>button]:pointer-events-none [&>button]:cursor-not-allowed' : ''}`}
      >
        {/* Header */}
        <DialogHeader className="p-6 border-b border-zinc-800 text-left pr-14">
          <DialogTitle className="text-xl font-bold text-white">{resolvedTitle}</DialogTitle>
          <p className="text-sm text-zinc-400 mt-1">{vendorName}</p>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
