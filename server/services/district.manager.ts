import { findDistrictById, findDistricts, findEventLogs } from "../repositories";

export interface DistrictConfig {
  id: number;
  name: string;
  slug: string;
  state: string;
  primaryLanguage: string;
  dialects: string[];
  festivals: Array<{
    name: string;
    month: number;
    date: number;
    significance: string;
  }>;
  localCuisine: string[];
  weatherPatterns: {
    hot: { months: number[], avgTemp: number };
    rainy: { months: number[], avgTemp: number };
    winter: { months: number[], avgTemp: number };
  };
  businessHours: {
    standard: { open: string; close: string };
    festivals: { open: string; close: string };
  };
  emergencyNumbers: Record<string, string>;
  aiPersonality: {
    greeting: string;
    tone: 'formal' | 'casual' | 'regional';
    commonPhrases: string[];
  };
}

export class DistrictManager {
  private static configs: Map<number, DistrictConfig> = new Map();

  static async getDistrictConfig(districtId: number): Promise<DistrictConfig> {
    if (this.configs.has(districtId)) {
      return this.configs.get(districtId)!;
    }

    const district = await findDistrictById(districtId);

    if (!district) {
      throw new Error(`District ${districtId} not found`);
    }

    const config = await this.generateDistrictConfig(district);
    this.configs.set(districtId, config);
    return config;
  }

  static async getAllDistrictConfigs(): Promise<DistrictConfig[]> {
    const districts = await findDistricts({ isActive: true });

    const configs: DistrictConfig[] = [];
    for (const district of districts) {
      configs.push(await this.getDistrictConfig(district.id));
    }

    return configs;
  }

  private static async generateDistrictConfig(district: any): Promise<DistrictConfig> {
    // Auto-generate district-specific configuration
    const baseConfig = this.getBaseDistrictConfig(district.name, district.state);

    // Learn from district-specific data
    const learningData = await this.learnFromDistrictData(district.id);

    return {
      ...baseConfig,
      ...learningData,
      id: district.id,
      name: district.name,
      slug: district.slug,
      state: district.state
    };
  }

  private static getBaseDistrictConfig(name: string, state: string): Omit<DistrictConfig, 'id' | 'name' | 'slug' | 'state'> {
    const mpDistricts: Record<string, Omit<DistrictConfig, 'id' | 'name' | 'slug' | 'state'>> = {
      'Shahdol': {
        primaryLanguage: 'hi',
        dialects: ['bagheli', 'hindi'],
        festivals: [
          { name: 'Ram Navami', month: 3, date: 17, significance: 'Lord Rama birthday' },
          { name: 'Diwali', month: 10, date: 12, significance: 'Festival of lights' },
          { name: 'Holi', month: 3, date: 14, significance: 'Festival of colors' }
        ],
        localCuisine: ['bafla', 'dal baati', 'khichdi', 'jalebi'],
        weatherPatterns: {
          hot: { months: [3, 4, 5], avgTemp: 35 },
          rainy: { months: [6, 7, 8, 9], avgTemp: 25 },
          winter: { months: [10, 11, 12, 1, 2], avgTemp: 15 }
        },
        businessHours: {
          standard: { open: '09:00', close: '21:00' },
          festivals: { open: '08:00', close: '22:00' }
        },
        emergencyNumbers: {
          police: '100',
          fire: '101',
          ambulance: '108'
        },
        aiPersonality: {
          greeting: 'नमस्ते साथी',
          tone: 'regional',
          commonPhrases: ['क्या चाहिए?', 'बोलिए साथी', 'ठीक है साथी']
        }
      },
      'Anuppur': {
        primaryLanguage: 'hi',
        dialects: ['bagheli', 'hindi', 'gondi'],
        festivals: [
          { name: 'Navratri', month: 9, date: 26, significance: 'Nine nights of goddess' },
          { name: 'Dussehra', month: 10, date: 3, significance: 'Victory of good over evil' },
          { name: 'Makar Sankranti', month: 1, date: 14, significance: 'Harvest festival' }
        ],
        localCuisine: ['korma', 'biryani', 'poha', 'samosa'],
        weatherPatterns: {
          hot: { months: [4, 5, 6], avgTemp: 38 },
          rainy: { months: [7, 8, 9], avgTemp: 28 },
          winter: { months: [11, 12, 1, 2, 3], avgTemp: 18 }
        },
        businessHours: {
          standard: { open: '10:00', close: '20:00' },
          festivals: { open: '09:00', close: '21:00' }
        },
        emergencyNumbers: {
          police: '100',
          fire: '101',
          ambulance: '102'
        },
        aiPersonality: {
          greeting: 'नमस्ते भाई',
          tone: 'casual',
          commonPhrases: ['क्या काम है?', 'बोलो भाई', 'ठीक है भाई']
        }
      },
      'Umaria': {
        primaryLanguage: 'hi',
        dialects: ['bagheli', 'hindi'],
        festivals: [
          { name: 'Ganesh Chaturthi', month: 8, date: 7, significance: 'Lord Ganesha festival' },
          { name: 'Independence Day', month: 7, date: 15, significance: 'National holiday' },
          { name: 'Republic Day', month: 0, date: 26, significance: 'Constitution day' }
        ],
        localCuisine: ['dal tadka', 'chole bhature', 'pakora', 'laddoo'],
        weatherPatterns: {
          hot: { months: [4, 5, 6], avgTemp: 40 },
          rainy: { months: [7, 8, 9], avgTemp: 30 },
          winter: { months: [10, 11, 12, 1, 2, 3], avgTemp: 12 }
        },
        businessHours: {
          standard: { open: '08:00', close: '22:00' },
          festivals: { open: '07:00', close: '23:00' }
        },
        emergencyNumbers: {
          police: '100',
          fire: '101',
          ambulance: '108'
        },
        aiPersonality: {
          greeting: 'जय हिन्द साथी',
          tone: 'formal',
          commonPhrases: ['कृपया बताएं', 'साथी जी', 'धन्यवाद साथी']
        }
      }
    };

    return mpDistricts[name] || {
      primaryLanguage: 'hi',
      dialects: ['hindi'],
      festivals: [],
      localCuisine: ['mixed'],
      weatherPatterns: {
        hot: { months: [3, 4, 5], avgTemp: 35 },
        rainy: { months: [6, 7, 8, 9], avgTemp: 25 },
        winter: { months: [10, 11, 12, 1, 2], avgTemp: 15 }
      },
      businessHours: {
        standard: { open: '09:00', close: '21:00' },
        festivals: { open: '08:00', close: '22:00' }
      },
      emergencyNumbers: {
        police: '100',
        fire: '101',
        ambulance: '108'
      },
      aiPersonality: {
        greeting: 'नमस्ते',
        tone: 'formal',
        commonPhrases: ['कृपया बताएं', 'धन्यवाद']
      }
    };
  }

  private static async learnFromDistrictData(districtId: number): Promise<Partial<DistrictConfig>> {
    // Learn from EventLog patterns for this district
    const events = await findEventLogs({
      districtId,
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
      }
    }, { take: 1000 });

    // Analyze peak hours
    const hourlyActivity = events.reduce((acc, event) => {
      const hour = new Date(event.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Analyze popular search intents
    const searchEvents = events.filter(e => e.type.includes('search'));
    const popularIntents = searchEvents.reduce((acc, event) => {
      const intent = (typeof event.metadata === 'object' && event.metadata !== null && 'intent' in event.metadata) ? event.metadata.intent as string : 'general';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      // Adapt business hours based on peak activity
      businessHours: peakHour ? {
        standard: {
          open: `${Math.max(6, parseInt(peakHour) - 3)}:00`,
          close: `${Math.min(22, parseInt(peakHour) + 3)}:00`
        },
        festivals: {
          open: `${Math.max(5, parseInt(peakHour) - 4)}:00`,
          close: `${Math.min(23, parseInt(peakHour) + 4)}:00`
        }
      } : undefined,

      // Learn AI personality from user interactions
      aiPersonality: {
        greeting: 'नमस्ते साथी',
        tone: popularIntents['food'] > popularIntents['service'] ? 'casual' : 'formal',
        commonPhrases: ['क्या चाहिए?', 'बोलिए', 'ठीक है']
      }
    };
  }

  static async addNewDistrict(districtData: { name: string; slug: string; state: string }): Promise<DistrictConfig> {
    // Create district in DB
    const district = await withTransaction(async (tx) => {
      const newDistrict = await tx.district.create({
        data: {
          ...districtData,
          isActive: true
        }
      });
      return newDistrict;
    });

    // Auto-generate config
    const config = await this.generateDistrictConfig(district);

    // Cache it
    this.configs.set(district.id, config);

    return config;
  }

  static clearCache(districtId?: number) {
    if (districtId) {
      this.configs.delete(districtId);
    } else {
      this.configs.clear();
    }
  }
}
