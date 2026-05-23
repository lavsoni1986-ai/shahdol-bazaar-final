/**
 * 🛡️ P1-C: TRUST LABEL ENGINE
 *
 * Formalizes 3-tier trust system:
 * - HIGHLY_TRUSTED: 0.9+ (verified + complete + fresh + active)
 * - VERIFIED: 0.75+ (verified + good DSSL)
 * - COMMUNITY_LISTING: <0.75 (unverified or low DSSL)
 *
 * Trust factors:
 * - DSSL score (core governance)
 * - Verification status
 * - Metadata completeness
 * - Data freshness
 * - Activity recency
 * - Actionability signals
 */

export type TrustLabel = "HIGHLY_TRUSTED" | "VERIFIED" | "COMMUNITY_LISTING";

export interface TrustFactors {
    dsslScore: number;
    isVerified: boolean;
    metadataCompleteness: number; // 0-1
    dataFreshness: number; // 0-1 (age-weighted)
    activityRecency: number; // 0-1 (recent activity score)
    actionabilityScore: number; // 0-1 (canCall/canNavigate/etc)
}

export interface TrustAssessment {
    label: TrustLabel;
    score: number; // 0-1 overall trust score
    factors: TrustFactors;
    confidence: number; // 0-1 how confident we are in this assessment
    lastAssessed: Date;
}

/**
 * Calculate trust label based on multiple signals
 */
export function calculateTrustLabel(vendor: any, metadata?: any): TrustAssessment {
    const factors = calculateTrustFactors(vendor, metadata);
    const score = calculateOverallTrustScore(factors);
    const label = determineTrustLabel(score, factors);
    const confidence = calculateAssessmentConfidence(factors);

    return {
        label,
        score,
        factors,
        confidence,
        lastAssessed: new Date()
    };
}

/**
 * Calculate individual trust factors
 */
function calculateTrustFactors(vendor: any, metadata?: any): TrustFactors {
    // DSSL Score (core governance signal)
    const dsslScore = Math.min(vendor?.dsslScore || 0, 100) / 100; // Normalize to 0-1

    // Verification status
    const isVerified = vendor?.status === "APPROVED" || vendor?.isVerified === true;

    // Metadata completeness (how much rich data exists)
    const metadataCompleteness = calculateMetadataCompleteness(vendor, metadata);

    // Data freshness (how recent is the information)
    const dataFreshness = calculateDataFreshness(vendor, metadata);

    // Activity recency (how recently has this vendor been active)
    const activityRecency = calculateActivityRecency(vendor);

    // Actionability score (can user actually do something with this listing)
    const actionabilityScore = calculateActionabilityScore(vendor, metadata);

    return {
        dsslScore,
        isVerified,
        metadataCompleteness,
        dataFreshness,
        activityRecency,
        actionabilityScore
    };
}

/**
 * Calculate how complete the vendor's metadata is
 */
function calculateMetadataCompleteness(vendor: any, metadata?: any): number {
    let completeness = 0;
    let totalChecks = 0;

    // Core fields (required)
    const coreFields = ['name', 'phone', 'address', 'description'];
    coreFields.forEach(field => {
        totalChecks++;
        if (vendor?.[field] && vendor[field].toString().trim()) completeness++;
    });

    // Business metadata (valuable)
    const businessFields = ['businessHours', 'specializations', 'tags'];
    businessFields.forEach(field => {
        totalChecks++;
        if (metadata?.[field] && (
            Array.isArray(metadata[field]) ? metadata[field].length > 0 :
                typeof metadata[field] === 'object' ? Object.keys(metadata[field]).length > 0 :
                    metadata[field]
        )) completeness++;
    });

    // Contact channels (actionable)
    const contactFields = ['whatsappNumber', 'emergencyAvailable', 'deliveryActive'];
    contactFields.forEach(field => {
        totalChecks++;
        if (metadata?.[field] !== null && metadata?.[field] !== undefined) completeness++;
    });

    return totalChecks > 0 ? completeness / totalChecks : 0;
}

/**
 * Calculate how fresh the data is (age-weighted)
 */
function calculateDataFreshness(vendor: any, metadata?: any): number {
    const now = Date.now();
    const createdAt = vendor?.createdAt ? new Date(vendor.createdAt).getTime() : now;
    const updatedAt = vendor?.updatedAt ? new Date(vendor.updatedAt).getTime() : createdAt;
    const lastVerified = metadata?.lastVerified ? new Date(metadata.lastVerified).getTime() : updatedAt;

    // Use most recent timestamp
    const mostRecent = Math.max(createdAt, updatedAt, lastVerified);
    const ageDays = (now - mostRecent) / (1000 * 60 * 60 * 24);

    // Freshness curve: 1.0 for <7 days, 0.5 for 30 days, 0.1 for 90+ days
    if (ageDays <= 7) return 1.0;
    if (ageDays <= 30) return 0.8;
    if (ageDays <= 90) return 0.5;
    if (ageDays <= 180) return 0.3;
    return 0.1;
}

/**
 * Calculate how recently the vendor has been active
 */
function calculateActivityRecency(vendor: any): number {
    const now = Date.now();
    const updatedAt = vendor?.updatedAt ? new Date(vendor.updatedAt).getTime() : now;
    const ageHours = (now - updatedAt) / (1000 * 60 * 60);

    // Activity recency: 1.0 for <24h, 0.5 for 7 days, 0.1 for 30+ days
    if (ageHours <= 24) return 1.0;
    if (ageHours <= 24 * 7) return 0.7;
    if (ageHours <= 24 * 30) return 0.4;
    return 0.1;
}

/**
 * Calculate how actionable this listing is (can user do something)
 */
function calculateActionabilityScore(vendor: any, metadata?: any): number {
    let score = 0;
    let maxScore = 0;

    // Can call?
    maxScore++;
    if (vendor?.phone || vendor?.mobile) score++;

    // Can WhatsApp?
    maxScore++;
    // Note: This infers availability from other fields, but we're keeping it for now as it's in trust calculation

    // Can navigate?
    maxScore++;
    if (vendor?.address) score++;

    // Can book/order?
    maxScore++;
    if (vendor?.businessType === "SERVICE" || vendor?.businessType === "HEALTHCARE" ||
        metadata?.deliveryActive === true) score++;

    // Has declared emergency capability? (STATIC, not live status)
    maxScore++;
    if (metadata?.emergencyAvailable === true) score++;

    return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Calculate overall trust score from factors
 */
function calculateOverallTrustScore(factors: TrustFactors): number {
    // Weighted combination of factors
    const weights = {
        dsslScore: 0.4,           // Core governance (highest weight)
        isVerified: 0.25,         // Verification status
        metadataCompleteness: 0.15, // Data richness
        dataFreshness: 0.1,       // Information age
        activityRecency: 0.05,    // Recent activity
        actionabilityScore: 0.05  // User can act on this
    };

    const isVerifiedScore = factors.isVerified ? 1.0 : 0.0;

    return (
        factors.dsslScore * weights.dsslScore +
        isVerifiedScore * weights.isVerified +
        factors.metadataCompleteness * weights.metadataCompleteness +
        factors.dataFreshness * weights.dataFreshness +
        factors.activityRecency * weights.activityRecency +
        factors.actionabilityScore * weights.actionabilityScore
    );
}

/**
 * Determine trust label from score and factors
 */
function determineTrustLabel(score: number, factors: TrustFactors): TrustLabel {
    // HIGHLY_TRUSTED requires: verified + high DSSL + good completeness + fresh + actionable
    if (score >= 0.9 &&
        factors.isVerified &&
        factors.dsslScore >= 0.8 &&
        factors.metadataCompleteness >= 0.7 &&
        factors.dataFreshness >= 0.7 &&
        factors.actionabilityScore >= 0.6) {
        return "HIGHLY_TRUSTED";
    }

    // VERIFIED requires: verified + decent DSSL
    if (score >= 0.75 && factors.isVerified && factors.dsslScore >= 0.6) {
        return "VERIFIED";
    }

    // Default to community listing
    return "COMMUNITY_LISTING";
}

/**
 * Calculate confidence in our trust assessment
 */
function calculateAssessmentConfidence(factors: TrustFactors): number {
    // Confidence based on data availability and recency
    const dataCompleteness = factors.metadataCompleteness;
    const dataFreshness = factors.dataFreshness;
    const hasVerification = factors.isVerified ? 1.0 : 0.5;

    // Higher confidence when we have more complete, fresh data
    return (dataCompleteness * 0.4) + (dataFreshness * 0.4) + (hasVerification * 0.2);
}

/**
 * Get human-readable trust explanation
 */
export function getTrustExplanation(assessment: TrustAssessment): string {
    const { label, factors } = assessment;

    switch (label) {
        case "HIGHLY_TRUSTED":
            return "Verified partner with complete information, recent updates, and high district trust score";

        case "VERIFIED":
            return "Approved district partner with good standing and verified contact information";

        case "COMMUNITY_LISTING":
            const reasons = [];
            if (!factors.isVerified) reasons.push("not yet verified");
            if (factors.dsslScore < 0.6) reasons.push("limited district trust history");
            if (factors.metadataCompleteness < 0.5) reasons.push("incomplete information");
            return `Community listing${reasons.length > 0 ? ` (${reasons.join(", ")})` : ""}`;

        default:
            return "Trust assessment unavailable";
    }
}