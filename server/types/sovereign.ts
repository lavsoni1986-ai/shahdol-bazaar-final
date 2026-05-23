import { Request } from 'express';
import { UserRole } from '../../shared/roles';

export interface SovereignRequest extends Request {
  userId?: number;
  districtId?: number | null;
  districtSlug?: string;
  user?: {
    id: number; // canonical user id name
    username: string;
    role: UserRole;
    isAdmin: boolean;
    shopId?: number | null;
    // preserve legacy userId mapping for compatibility (required to match JWTPayload)
    userId: number;
  };
}