// @ts-nocheck
import { withTransaction, findVendorByIdInTx, updateVendorInTx, findDistrictByIdInTx, createAuditLogInTx } from "../repositories";

// ============================================
// 🏪 VENDOR SERVICE LAYER
// ============================================
// Business logic for vendor operations

// Data validation to prevent district data leakage
function validateDistrictData(entity: any, districtSlug: string) {
  const entityText = `${entity.name} ${entity.address || ''} ${entity.description || ''}`.toLowerCase();

  // Check if entity belongs to the district
  const belongsToDistrict = entityText.includes(districtSlug.toLowerCase()) ||
    districtSlug === 'shahdol'; // Special case for primary district

  if (!belongsToDistrict) {
    console.warn(`⚠️ DISTRICT VALIDATION: Entity "${entity.name}" may not belong to ${districtSlug}`);
    console.warn(`Entity text: ${entityText}`);
    return false;
  }

  return true;
}

export class VendorService {
  // Validate vendor belongs to correct district
  static validateVendorDistrict(vendor: any, districtSlug: string) {
    return validateDistrictData(vendor, districtSlug);
  }

  // Approve vendor with validation
  static async approveVendor(vendorId: number, adminId: number, districtId: number) {
    return withTransaction(async (tx) => {
      const vendor = await findVendorByIdInTx(tx, vendorId);

      if (!vendor) throw new Error("Vendor not found");
      if (vendor.districtId !== districtId) throw new Error("Access denied - wrong district");

      // Get district slug for validation
      const district = await findDistrictByIdInTx(tx, districtId);

      if (district && !validateDistrictData(vendor, district.slug)) {
        console.warn(`⚠️ APPROVING VENDOR WITH SUSPICIOUS DATA: ${vendor.name}`);
      }

      await updateVendorInTx(tx, vendorId, { status: 'APPROVED' });

      const auditResult = await createAuditLogInTx(tx, {
        action: "VENDOR_APPROVED",
        userId: adminId,
        targetId: vendorId,
        targetType: "vendor",
        details: `Approved vendor: ${vendor.name}`,
        districtId
      });

      return { success: true, auditId: auditResult.id };
    });
  }

  // Ban vendor (delete) with audit trail
  static async banVendor(vendorId: number, adminId: number, districtId: number) {
    return withTransaction(async (tx) => {
      const vendor = await findVendorByIdInTx(tx, vendorId);

      if (!vendor) throw new Error("Vendor not found");
      if (vendor.districtId !== districtId) throw new Error("Access denied - wrong district");

      await tx.vendor.delete({
        where: { id: vendorId }
      });

      const auditResult = await createAuditLogInTx(tx, {
        action: "VENDOR_BANNED",
        userId: adminId,
        targetId: vendorId,
        targetType: "vendor",
        details: `Banned and removed vendor: ${vendor.name}`,
        districtId
      });

      return { success: true, auditId: auditResult.id };
    });
  }
}
