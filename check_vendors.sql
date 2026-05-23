SELECT
  id,
  name,
  search_text,
  ai_rank_score,
  rating,
  dssl_score,
  is_shadow_banned
FROM "Vendor"
LIMIT 20;