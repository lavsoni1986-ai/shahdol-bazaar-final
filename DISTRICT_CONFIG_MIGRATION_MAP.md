# DISTRICT_CONFIG_MIGRATION_MAP

Legacy Path	Canonical Field	Status
config.dsslWeights	dsslWeights	KEEP (move to top-level district field)
config.primaryColor	primaryColor	KEEP
config.meta.title	metaTitle	FLATTEN
config.meta.description	metaDescription	FLATTEN
config.theme.gradient	REMOVE	DEAD_DRIFT
config.theme.badgeColor	REMOVE	DEAD_DRIFT
config.branding.logoUrl	logoUrl	FLATTEN
config.branding.ogImage	ogImageUrl	FLATTEN
config.branding.twitterImage	twitterImageUrl	FLATTEN
config.contact.number	contactNumber	FLATTEN
config.favicon	faviconUrl	FLATTEN
config.isActive	state	RECONCILE (map boolean to 'active'/'disabled')
config.isDefault	state	RECONCILE (use separate flag isDefault in runtime context)
config.themeConfig	REMOVE	DEAD_DRIFT
config.notificationPreferences	REMOVE	DEAD_DRIFT
config.policy.overrides	policyOverrides	KEEP (move to top-level policyOverrides: Record<string, any>)

Notes:
- This mapping is authoritative for Phase 1B district config flattening. Do NOT introduce new nested config objects into DistrictContract.
- For each KEEP/FLATTEN mapping, consumers should read from district.<canonical> instead of district.config.<path>.
- For RECONCILE entries, establish migration rules in Phase 1B.2.
