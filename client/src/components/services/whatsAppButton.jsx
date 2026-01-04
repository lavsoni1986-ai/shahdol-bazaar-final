import React from "react";

export default function WhatsAppButton({ mobile }) {
  if (!mobile) return null;
  const waLink = `https://wa.me/91${mobile}`;
  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 bg-green-500 text-white p-3 rounded-full shadow-lg z-50 text-sm font-bold"
    >
      💬 WhatsApp
    </a>
  );
}
