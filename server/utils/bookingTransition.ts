import { BookingStatus } from "@prisma/client";

/**
 * Deterministic transition guard for booking lifecycles.
 * Enforces legal state sequences and locks final states.
 */
export function canTransitionBookingStatus(current: BookingStatus, next: BookingStatus): boolean {
  if (current === next) return true;

  switch (current) {
    case BookingStatus.PENDING:
      return next === BookingStatus.CONFIRMED || next === BookingStatus.CANCELLED || next === BookingStatus.REJECTED;
      
    case BookingStatus.CONFIRMED:
      return next === BookingStatus.ASSIGNED || next === BookingStatus.CANCELLED;
      
    case BookingStatus.ASSIGNED:
      return next === BookingStatus.IN_PROGRESS || next === BookingStatus.CANCELLED;
      
    case BookingStatus.IN_PROGRESS:
      return next === BookingStatus.COMPLETED || next === BookingStatus.CANCELLED;
      
    case BookingStatus.COMPLETED:
    case BookingStatus.CANCELLED:
    case BookingStatus.REJECTED:
      return false;

    default:
      return false;
  }
}
