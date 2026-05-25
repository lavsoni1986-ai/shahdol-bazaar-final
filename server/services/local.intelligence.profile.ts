import { prisma } from "../storage";
import { DistrictManager } from "./district.manager";
import { isEventMetadata, isUserIntelligenceProfile } from "../lib/guards";

export interface LocalIntelligenceProfile {
  districtId: number;
  dialectProfile: {
    primaryDialect: string;
    regionalVariations: string[];
    pronunciationGuide: Record<string, string>;
    commonPhrases: Record<string, string>;
    formalityLevel: 'formal' | 'casual' | 'regional';
  };
  preferenceProfile: {
    cuisinePreferences: {
      stapleFoods: string[];
      regionalSpecialties: string[];
      dietaryRestrictions: string[];
      spiceTolerance: 'mild' | 'medium' | 'hot';
    };
    shoppingPatterns: {
      preferredTimes: string[];
      budgetRanges: Record<string, number[]>;
      brandLoyalty: Record<string, number>;
      categoryPreferences: Record<string, number>;
    };
    culturalContext: {
      festivals: string[];
      socialEvents: string[];
      communityValues: string[];
      localHeroes: string[];
    };
  };
  economicProfile: {
    averageIncome: number;
    spendingPower: 'low' | 'medium' | 'high';
    marketMaturity: number; // 0-1 scale
    digitalAdoption: number; // 0-1 scale
  };
  behavioralProfile: {
    trustMetrics: {
      governmentServices: number;
      localBusinesses: number;
      onlinePayments: number;
      deliveryServices: number;
    };
    communicationStyle: {
      preferredLanguage: string;
      responseTime: number; // hours
      complaintHandling: 'direct' | 'indirect' | 'mediator';
    };
  };
}

export class LocalIntelligenceManager {
  private static lipCache: Map<number, { profile: LocalIntelligenceProfile; timestamp: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  static async getLIP(districtId: number): Promise<LocalIntelligenceProfile> {
    const cached = this.lipCache.get(districtId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached.profile;
    }

    const lip = await this.generateLIP(districtId);
    this.lipCache.set(districtId, { profile: lip, timestamp: Date.now() });
    return lip;
  }

  private static async generateLIP(districtId: number): Promise<LocalIntelligenceProfile> {
    const district = await prisma.district.findUnique({
      where: { id: districtId }
    });

    if (!district) {
      throw new Error(`District ${districtId} not found`);
    }

    // Get base configuration from DistrictManager
    const baseConfig = await DistrictManager.getDistrictConfig(districtId);

    // Generate comprehensive LIP based on district data
    const lip = await this.buildIntelligenceProfile(district, baseConfig);

    // Learn from EventLog data
    const learnedProfile = await this.learnFromBehavior(districtId);

    // Merge learned intelligence with base profile
    const finalLIP = this.mergeProfiles(lip, learnedProfile);

    return finalLIP;
  }

  private static async buildIntelligenceProfile(district: any, config: any): Promise<LocalIntelligenceProfile> {
    // Base profiles for different districts
    const baseProfiles: Record<string, Partial<LocalIntelligenceProfile>> = {
      'Shahdol': {
        dialectProfile: {
          primaryDialect: 'bagheli',
          regionalVariations: ['pure_bagheli', 'hindi_influenced'],
          pronunciationGuide: {
            'पनीर': 'pa-neer',
            'दूध': 'doo-dh',
            'रोटी': 'ro-tee'
          },
          commonPhrases: {
            'hello': 'नमस्ते साथी',
            'thank_you': 'धन्यवाद साथी',
            'please': 'कृपया'
          },
          formalityLevel: 'regional'
        },
        preferenceProfile: {
          cuisinePreferences: {
            stapleFoods: ['गेहूं', 'चना', 'दाल'],
            regionalSpecialties: ['बाफला', 'दाल बाफली', 'खिचड़ी'],
            dietaryRestrictions: ['vegetarian_heavy', 'jain_options'],
            spiceTolerance: 'medium'
          },
          shoppingPatterns: {
            preferredTimes: ['morning_6_9', 'evening_5_8'],
            budgetRanges: {
              grocery: [100, 500],
              household: [200, 1000]
            },
            brandLoyalty: { 'local': 0.8, 'regional': 0.6 },
            categoryPreferences: { 'grocery': 0.7, 'dairy': 0.8 }
          },
          culturalContext: {
            festivals: ['होली', 'दिवाली', 'दशहरा'],
            socialEvents: ['गांव की सभाएं', 'त्यौहार'],
            communityValues: ['सामाजिक सद्भाव', 'परिवारिक मूल्य'],
            localHeroes: ['संत रविदास', 'कबीरदास']
          }
        },
        economicProfile: {
          averageIncome: 15000,
          spendingPower: 'medium',
          marketMaturity: 0.6,
          digitalAdoption: 0.4
        },
        behavioralProfile: {
          trustMetrics: {
            governmentServices: 0.7,
            localBusinesses: 0.8,
            onlinePayments: 0.5,
            deliveryServices: 0.6
          },
          communicationStyle: {
            preferredLanguage: 'hindi_bagheli_mix',
            responseTime: 2,
            complaintHandling: 'direct'
          }
        }
      },
      'Anuppur': {
        dialectProfile: {
          primaryDialect: 'bagheli_gondi_mix',
          regionalVariations: ['gondi_influenced', 'traditional_bagheli'],
          pronunciationGuide: {
            'पानी': 'paa-nee',
            'खाना': 'khaa-naa',
            'दुकान': 'du-kaan'
          },
          commonPhrases: {
            'hello': 'नमस्ते भाई',
            'thank_you': 'धन्यवाद भाई',
            'please': 'मेहरबानी'
          },
          formalityLevel: 'casual'
        },
        preferenceProfile: {
          cuisinePreferences: {
            stapleFoods: ['मक्का', 'चना', 'साग'],
            regionalSpecialties: ['कोरमा', 'बिरयानी', 'पोहा'],
            dietaryRestrictions: ['mixed_diet', 'non_veg_options'],
            spiceTolerance: 'hot'
          },
          shoppingPatterns: {
            preferredTimes: ['morning_7_10', 'evening_6_9'],
            budgetRanges: {
              grocery: [150, 600],
              household: [300, 1200]
            },
            brandLoyalty: { 'local': 0.9, 'regional': 0.7 },
            categoryPreferences: { 'grocery': 0.8, 'spices': 0.9 }
          },
          culturalContext: {
            festivals: ['दिवाली', 'दशहरा', 'नवरात्रि'],
            socialEvents: ['गांव की पंचायत', 'जातरा'],
            communityValues: ['सामुदायिक सद्भाव', 'परंपराएं'],
            localHeroes: ['शहीद वीर सूरमा', 'रानी अंबालिका']
          }
        },
        economicProfile: {
          averageIncome: 12000,
          spendingPower: 'low',
          marketMaturity: 0.5,
          digitalAdoption: 0.3
        },
        behavioralProfile: {
          trustMetrics: {
            governmentServices: 0.6,
            localBusinesses: 0.9,
            onlinePayments: 0.4,
            deliveryServices: 0.5
          },
          communicationStyle: {
            preferredLanguage: 'hindi_gondi_mix',
            responseTime: 3,
            complaintHandling: 'mediator'
          }
        }
      },
      'Umaria': {
        dialectProfile: {
          primaryDialect: 'standard_hindi',
          regionalVariations: ['formal_hindi', 'bagheli_traces'],
          pronunciationGuide: {
            'सामान': 'saa-maan',
            'कीमत': 'kee-mat',
            'सेवा': 'sey-va'
          },
          commonPhrases: {
            'hello': 'नमस्ते जी',
            'thank_you': 'धन्यवाद जी',
            'please': 'कृपया'
          },
          formalityLevel: 'formal'
        },
        preferenceProfile: {
          cuisinePreferences: {
            stapleFoods: ['चावल', 'गेहूं', 'दाल'],
            regionalSpecialties: ['दाल तड़का', 'छोले भटूरे', 'पकोड़े'],
            dietaryRestrictions: ['vegetarian', 'jain_friendly'],
            spiceTolerance: 'medium'
          },
          shoppingPatterns: {
            preferredTimes: ['morning_8_11', 'evening_4_7'],
            budgetRanges: {
              grocery: [200, 800],
              household: [400, 1500]
            },
            brandLoyalty: { 'regional': 0.7, 'national': 0.5 },
            categoryPreferences: { 'grocery': 0.6, 'electronics': 0.7 }
          },
          culturalContext: {
            festivals: ['गणेश चतुर्थी', 'स्वतंत्रता दिवस', 'गणतंत्र दिवस'],
            socialEvents: ['नगर पंचायत बैठक', 'सामाजिक कार्यक्रम'],
            communityValues: ['शिक्षा', 'विकास'],
            localHeroes: ['स्वामी विवेकानंद', 'सर्वपल्ली राधाकृष्णन']
          }
        },
        economicProfile: {
          averageIncome: 18000,
          spendingPower: 'medium',
          marketMaturity: 0.7,
          digitalAdoption: 0.6
        },
        behavioralProfile: {
          trustMetrics: {
            governmentServices: 0.8,
            localBusinesses: 0.7,
            onlinePayments: 0.7,
            deliveryServices: 0.7
          },
          communicationStyle: {
            preferredLanguage: 'standard_hindi',
            responseTime: 1,
            complaintHandling: 'direct'
          }
        }
      }
    };

    const baseProfile = baseProfiles[district.name] || {
      dialectProfile: {
        primaryDialect: 'hindi',
        regionalVariations: ['standard'],
        pronunciationGuide: {},
        commonPhrases: {
          'hello': 'नमस्ते',
          'thank_you': 'धन्यवाद',
          'please': 'कृपया'
        },
        formalityLevel: 'formal'
      },
      preferenceProfile: {
        cuisinePreferences: {
          stapleFoods: ['गेहूं', 'चावल', 'दाल'],
          regionalSpecialties: ['मिश्रित व्यंजन'],
          dietaryRestrictions: ['vegetarian'],
          spiceTolerance: 'medium'
        },
        shoppingPatterns: {
          preferredTimes: ['morning', 'evening'],
          budgetRanges: { grocery: [100, 500] },
          brandLoyalty: { local: 0.8 },
          categoryPreferences: { grocery: 0.7 }
        },
        culturalContext: {
          festivals: ['दिवाली', 'होली'],
          socialEvents: ['त्यौहार'],
          communityValues: ['सद्भाव'],
          localHeroes: []
        }
      },
      economicProfile: {
        averageIncome: 15000,
        spendingPower: 'medium',
        marketMaturity: 0.5,
        digitalAdoption: 0.4
      },
      behavioralProfile: {
        trustMetrics: {
          governmentServices: 0.7,
          localBusinesses: 0.7,
          onlinePayments: 0.5,
          deliveryServices: 0.6
        },
        communicationStyle: {
          preferredLanguage: 'hindi',
          responseTime: 2,
          complaintHandling: 'direct'
        }
      }
    };

    return {
      districtId: district.id,
      ...baseProfile
    } as LocalIntelligenceProfile;
  }

  private static async learnFromBehavior(districtId: number): Promise<Partial<LocalIntelligenceProfile>> {
    const events = await prisma.eventLog.findMany({
      where: {
        districtId,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      take: 2000
    });

    // Analyze shopping patterns
    const categorySearches = events
      .filter(e => e.type && e.type.includes('search') && isEventMetadata(e.metadata) && e.metadata.category)
      .reduce((acc, e) => {
        const cat = (e.metadata as any).category as string;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Analyze timing patterns
    const hourlyActivity = events.reduce((acc, e) => {
      const hour = new Date(e.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Extract learned preferences
    const totalSearches = Object.values(categorySearches).reduce((a, b) => a + b, 0);
    const learnedCategories = Object.entries(categorySearches).reduce((acc, [cat, count]) => {
      acc[cat] = count / totalSearches;
      return acc;
    }, {} as Record<string, number>);

    return {
      preferenceProfile: {
        shoppingPatterns: {
          preferredTimes: Object.entries(hourlyActivity)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([hour]) => `hour_${hour}`),
          categoryPreferences: learnedCategories,
          budgetRanges: {},
          brandLoyalty: {}
        },
        cuisinePreferences: {
          stapleFoods: [],
          regionalSpecialties: [],
          dietaryRestrictions: [],
          spiceTolerance: 'medium' as const
        },
        culturalContext: {
          festivals: ['Diwali', 'Holi', 'Navratri'],
          socialEvents: ['Weddings', 'Festivals', 'Community gatherings'],
          communityValues: ['Family', 'Respect', 'Hard work'],
          localHeroes: ['Local leaders', 'Freedom fighters']
        }
      }
    };
  }

  private static mergeProfiles(base: LocalIntelligenceProfile, learned: Partial<LocalIntelligenceProfile>): LocalIntelligenceProfile {
    return {
      ...base,
      ...learned,
      preferenceProfile: {
        ...base.preferenceProfile,
        ...learned.preferenceProfile,
        shoppingPatterns: {
          preferredTimes: learned.preferenceProfile?.shoppingPatterns?.preferredTimes || base.preferenceProfile.shoppingPatterns.preferredTimes,
          categoryPreferences: {
            ...base.preferenceProfile.shoppingPatterns.categoryPreferences,
            ...(learned.preferenceProfile?.shoppingPatterns?.categoryPreferences || {})
          },
          budgetRanges: learned.preferenceProfile?.shoppingPatterns?.budgetRanges || base.preferenceProfile.shoppingPatterns.budgetRanges || {},
          brandLoyalty: learned.preferenceProfile?.shoppingPatterns?.brandLoyalty || base.preferenceProfile.shoppingPatterns.brandLoyalty || {},
          ...(learned.preferenceProfile?.shoppingPatterns?.budgetRanges && {
            budgetRanges: learned.preferenceProfile.shoppingPatterns.budgetRanges
          }),
          ...(learned.preferenceProfile?.shoppingPatterns?.brandLoyalty && {
            brandLoyalty: learned.preferenceProfile.shoppingPatterns.brandLoyalty
          })
        }
      }
    };
  }

  static async getDialectSimilarity(districtId1: number, districtId2: number): Promise<number> {
    const lip1 = await this.getLIP(districtId1);
    const lip2 = await this.getLIP(districtId2);

    // Calculate dialect similarity (0-1 scale)
    const commonVariations = lip1.dialectProfile.regionalVariations.filter(v =>
      lip2.dialectProfile.regionalVariations.includes(v)
    ).length;

    const totalVariations = new Set([
      ...lip1.dialectProfile.regionalVariations,
      ...lip2.dialectProfile.regionalVariations
    ]).size;

    return commonVariations / totalVariations;
  }

  static clearCache(districtId?: number) {
    if (districtId) {
      this.lipCache.delete(districtId);
    } else {
      this.lipCache.clear();
    }
  }
}
