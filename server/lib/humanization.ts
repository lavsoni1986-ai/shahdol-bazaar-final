// Humanization Layer - Conversational Intent Recognition
// Handles greetings, social responses, and non-entity queries

export enum ConversationalIntent {
  GREETING = 'GREETING',
  FAREWELL = 'FAREWELL',
  THANKS = 'THANKS',
  APOLOGY = 'APOLOGY',
  HELP = 'HELP',
  STATUS = 'STATUS',
  CONVERSATION = 'CONVERSATION',
  UNKNOWN = 'UNKNOWN'
}

export interface ConversationalResponse {
  intent: ConversationalIntent;
  confidence: number;
  response: string;
  shouldTriggerEntitySearch: boolean;
  suggestedActions?: string[];
}

// Conversational patterns recognition
const CONVERSATIONAL_PATTERNS = {
  [ConversationalIntent.GREETING]: [
    'hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good afternoon',
    'good evening', 'hi there', 'hello there', 'hey there', 'konnichiwa',
    'guten tag', 'bonjour', 'hola', 'ciao', 'salam'
  ],

  [ConversationalIntent.FAREWELL]: [
    'bye', 'goodbye', 'see you', 'bye bye', 'take care', 'alvidha', 'namaste',
    'good night', 'see you later', 'catch you later', 'talk to you later'
  ],

  [ConversationalIntent.THANKS]: [
    'thank you', 'thanks', 'thank you so much', 'thanks a lot', 'dhanyavaad',
    'shukriya', 'thank you very much', 'appreciate it', 'grateful'
  ],

  [ConversationalIntent.APOLOGY]: [
    'sorry', 'apologize', 'maaf karo', 'forgive me', 'pardon', 'excuse me'
  ],

  [ConversationalIntent.HELP]: [
    'help', 'assist', 'support', 'madad', 'guide', 'how to', 'what to do'
  ],

  [ConversationalIntent.STATUS]: [
    'how are you', 'kaise ho', 'how do you do', 'how is everything',
    'how are things', 'kaisa chal raha hai'
  ],

  [ConversationalIntent.CONVERSATION]: [
    'nice', 'good', 'great', 'awesome', 'wonderful', 'excellent',
    'bad', 'not good', 'terrible', 'worst', 'accha', 'bura'
  ]
};

// Response templates
const CONVERSATIONAL_RESPONSES = {
  [ConversationalIntent.GREETING]: [
    "नमस्ते! मैं शहडोल बाजार में आपकी मदद करने के लिए हूँ। आप क्या खोज रहे हैं?",
    "Hello! I'm here to help you find services in Shahdol. What are you looking for?",
    "Hi there! How can I assist you with your needs in Shahdol today?"
  ],

  [ConversationalIntent.FAREWELL]: [
    "अलविदा! अगर आपको फिर से मदद चाहिए तो बताना।",
    "Goodbye! Feel free to ask if you need anything else.",
    "Take care! I'm here whenever you need help."
  ],

  [ConversationalIntent.THANKS]: [
    "आपका स्वागत है! अगर और कोई मदद चाहिए तो बताना।",
    "You're welcome! Let me know if there's anything else I can help with.",
    "My pleasure! Happy to assist."
  ],

  [ConversationalIntent.APOLOGY]: [
    "कोई बात नहीं। मैं आपकी कैसे मदद कर सकता हूँ?",
    "No problem at all. How can I help you?",
    "That's alright. What can I do for you?"
  ],

  [ConversationalIntent.HELP]: [
    "मैं शहडोल में अस्पताल, स्कूल, दुकान, बस आदि की जानकारी देने में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?",
    "I can help you find hospitals, schools, shops, bus services, and more in Shahdol. What would you like to know?",
    "I'm here to help with information about healthcare, education, shopping, and transportation in Shahdol."
  ],

  [ConversationalIntent.STATUS]: [
    "मैं ठीक हूँ, धन्यवाद! आप कैसे हैं? मैं आपकी शहडोल बाजार में मदद करने के लिए तैयार हूँ।",
    "I'm doing well, thank you! How are you? Ready to help you with anything in Shahdol.",
    "All good! How can I assist you today in Shahdol?"
  ],

  [ConversationalIntent.CONVERSATION]: [
    "बढ़िया! आप शहडोल में क्या खोज रहे हैं?",
    "Great! What are you looking for in Shahdol?",
    "Good to hear! How can I help you today?"
  ]
};

// Main conversational intent classifier
export function classifyConversationalIntent(query: string): ConversationalResponse {
  const normalizedQuery = query.toLowerCase().trim();

  // Check each intent type
  for (const [intentKey, patterns] of Object.entries(CONVERSATIONAL_PATTERNS)) {
    const intent = intentKey as ConversationalIntent;

    for (const pattern of patterns) {
      if (normalizedQuery.includes(pattern)) {
        const responses = CONVERSATIONAL_RESPONSES[intent];
        const response = responses[Math.floor(Math.random() * responses.length)];

        return {
          intent,
          confidence: 0.9, // High confidence for matched patterns
          response,
          shouldTriggerEntitySearch: false,
          suggestedActions: getSuggestedActions(intent)
        };
      }
    }
  }

  // Check for very short queries that might be conversational
  if (normalizedQuery.length < 10) {
    const shortPatterns = ['hi', 'hello', 'hey', 'bye', 'thanks', 'sorry'];
    if (shortPatterns.some(p => normalizedQuery.includes(p))) {
      return {
        intent: ConversationalIntent.GREETING,
        confidence: 0.8,
        response: "नमस्ते! मैं शहडोल बाजार में आपकी मदद करने के लिए हूँ।",
        shouldTriggerEntitySearch: false
      };
    }
  }

  // Not conversational - should trigger entity search
  return {
    intent: ConversationalIntent.UNKNOWN,
    confidence: 0.1,
    response: "",
    shouldTriggerEntitySearch: true
  };
}

// Get suggested actions based on intent
function getSuggestedActions(intent: ConversationalIntent): string[] {
  switch (intent) {
    case ConversationalIntent.GREETING:
      return ['हॉस्पिटल खोजें', 'स्कूल ढूँढें', 'दुकान देखें', 'बस टाइमटेबल'];

    case ConversationalIntent.HELP:
      return ['मदद के प्रकार', 'सबसे लोकप्रिय सेवाएं', 'नई सुविधाएं'];

    case ConversationalIntent.FAREWELL:
      return ['फिर मिलते हैं', 'अच्छा दिन रहे'];

    default:
      return [];
  }
}

// Integration point with main cognition engine
export function shouldTriggerEntitySearch(query: string): boolean {
  const result = classifyConversationalIntent(query);
  return result.shouldTriggerEntitySearch;
}

export function getConversationalResponse(query: string): string | null {
  const result = classifyConversationalIntent(query);
  return result.shouldTriggerEntitySearch ? null : result.response;
}

// Export for testing
export { CONVERSATIONAL_PATTERNS, CONVERSATIONAL_RESPONSES };