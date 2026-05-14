// governance/semantic-aliases.ts

export const SEMANTIC_ALIASES: Record<string, string[]> = {
  // Temporal aliases
  'time.open_now': ['open now', 'open', 'available now', 'abhi', 'asaap', 'immediately'],
  'time.night': ['night', 'raat', 'late night', 'midnight', 'late evening'],
  'time.late_night': ['late night', 'midnight', 'after midnight'],
  'time.emergency': ['emergency', 'urgent', 'immediate help', 'help now'],

  // Night economy
  'food.night': ['night food', 'late night food', 'midnight food', 'late night restaurant'],
  'transport.night': ['last bus', 'late bus', 'night bus', 'last train'],
  'emergency.24x7': ['24x7', '24 hour', '24 hour hospital', '24x7 hospital', 'open 24 hours']
};
