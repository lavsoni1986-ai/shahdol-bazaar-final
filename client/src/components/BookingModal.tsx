import React, { useState } from "react";
import { Calendar, Clock, User, Phone, Mail, Type, MessageSquare, CheckCircle2, MessageCircle } from "lucide-react";
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
  vendorPhone?: string;
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

interface WhatsAppMessageParams {
  hospitalName: string;
  patientName: string;
  patientPhone: string;
  preferredDate: string;
  preferredTime?: string;
  serviceType?: string;
  appointmentId?: number | string;
}

function buildAppointmentWhatsAppMessage({
  hospitalName,
  patientName,
  patientPhone,
  preferredDate,
  preferredTime,
  serviceType,
  appointmentId,
}: WhatsAppMessageParams): string {
  const lines: string[] = [
    `Namaste ${hospitalName},`,
    ``,
    `I have submitted an appointment request via ShahdolBazaar:`,
    `• Patient Name: ${patientName}`,
    `• Contact Number: ${patientPhone}`,
    `• Preferred Date: ${preferredDate}`,
  ];

  if (preferredTime && preferredTime.trim()) {
    lines.push(`• Preferred Time: ${preferredTime.trim()}`);
  }

  if (serviceType && serviceType.trim()) {
    lines.push(`• Service Type: ${serviceType.trim()}`);
  }

  if (appointmentId) {
    lines.push(`• Appointment ID: #${appointmentId}`);
  }

  lines.push(
    ``,
    `Please review and confirm my appointment. Thank you!`
  );

  return lines.join("\n");
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

  const [relayState, setRelayState] = useState<{
    completed: boolean;
    appointmentId?: number | string;
    whatsappUrl?: string;
  }>({ completed: false });

  const resetFormAndRelay = () => {
    setRelayState({ completed: false });
    setFormData({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      preferredDate: "",
      preferredTime: "",
      serviceType: "",
      notes: "",
    });
  };

  const handleClose = () => {
    if (isLoading) return;
    resetFormAndRelay();
    onClose();
  };

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
    onSuccess: (response: any) => {
      // Check for Hatemi Hospital authorized doctor WhatsApp relay
      const isHatemi = vendorId === 14 || vendorName?.toLowerCase().includes("hatemi");
      const targetPhone = isHatemi ? "7988696949" : null;

      if (targetPhone) {
        const appointmentId = response?.data?.id;
        const message = buildAppointmentWhatsAppMessage({
          hospitalName: vendorName,
          patientName: formData.customerName.trim(),
          patientPhone: formData.customerPhone.trim(),
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
          serviceType: formData.serviceType,
          appointmentId,
        });

        // 7988696949 normalized with India country code 91
        const cleanNumber = targetPhone.replace(/\D/g, "");
        const formattedRecipient = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;
        const whatsappUrl = `https://wa.me/${formattedRecipient}?text=${encodeURIComponent(message)}`;

        // Attempt to open WhatsApp in a new tab
        let popupBlocked = false;
        try {
          const win = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          if (!win || win.closed || typeof win.closed === "undefined") {
            popupBlocked = true;
          }
        } catch {
          popupBlocked = true;
        }

        if (popupBlocked) {
          toast.info("Appointment request saved! Tap below to send details via WhatsApp.");
        } else {
          toast.success("Appointment request saved! Opening WhatsApp to send details...");
        }

        setRelayState({
          completed: true,
          appointmentId,
          whatsappUrl,
        });
      } else {
        toast.success(`Appointment request sent to ${vendorName}! They'll contact you shortly to confirm.`);
        resetFormAndRelay();
        onClose();
      }
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
          handleClose();
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
        {relayState.completed ? (
          /* Success & WhatsApp Relay Confirmation View */
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <DialogTitle className="text-xl font-bold text-white">Appointment Request Saved</DialogTitle>
              {relayState.appointmentId && (
                <p className="text-xs font-mono text-zinc-400 mt-1">Appointment ID: #{relayState.appointmentId}</p>
              )}
              <p className="text-sm text-zinc-300 mt-2">
                Your appointment request for <strong>{vendorName}</strong> has been saved in our system.
              </p>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-left text-xs space-y-1.5 text-zinc-300">
              <p><strong className="text-zinc-200">Patient:</strong> {formData.customerName}</p>
              <p><strong className="text-zinc-200">Phone:</strong> {formData.customerPhone}</p>
              <p><strong className="text-zinc-200">Preferred Date:</strong> {formData.preferredDate}</p>
              {formData.preferredTime && <p><strong className="text-zinc-200">Preferred Time:</strong> {formData.preferredTime}</p>}
              {formData.serviceType && <p><strong className="text-zinc-200">Service:</strong> {formData.serviceType}</p>}
            </div>

            {relayState.whatsappUrl && (
              <div className="space-y-3 pt-2">
                <a
                  href={relayState.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-900/30"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send appointment details on WhatsApp
                </a>
                <p className="text-xs text-amber-400/90 leading-relaxed text-left bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  ⚠️ <strong>Next Step:</strong> Tap the button above to open WhatsApp with your prefilled details. You must press <strong>Send</strong> in WhatsApp so the hospital can review and confirm your slot.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition"
            >
              Done / Close
            </button>
          </div>
        ) : (
          <>
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
                  placeholder="e.g., Checkup, Consultation"
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
              <p className="text-xs text-zinc-400 text-center mt-4">
                We'll record your booking in the system and help you send details to {vendorName} on WhatsApp.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
