import { useState, useCallback, useRef, useEffect } from 'react';

// TensorFlow.js and MobileNet types
declare global {
  interface Window {
    tf: any;
    mobilenet: any;
  }
}

// Category mapping for Shahdol Bazaar products
const CATEGORY_MAPPING: Record<string, string[]> = {
  'Grocery': ['apple', 'banana', 'orange', 'vegetable', 'fruit', 'food', 'grocery', 'store'],
  'Electronics': ['phone', 'laptop', 'computer', 'screen', 'camera', 'electronic', 'device', 'telephone'],
  'Clothing': ['shirt', 'dress', 'clothing', 'apparel', 'shirt', 'jeans', 'shoe', 'hat'],
  'Medical': ['pill', 'bottle', 'medicine', 'drug', 'pharmaceutical', 'capsule', 'syringe'],
  'Hardware': ['tool', 'hammer', 'saw', 'drill', 'hardware', 'toolbox'],
  'Home Decor': ['vase', 'flower', 'plant', 'lamp', 'cushion', 'curtain', 'furniture'],
  'Sports': ['ball', 'sports', 'golf', 'tennis', 'football', 'bat', 'racket'],
  'Books': ['book', 'magazine', 'newspaper', 'notebook', 'paper'],
  'Jewelry': ['ring', 'necklace', 'bracelet', 'jewelry', 'watch', 'earring'],
};

const CATEGORIES = ['Grocery', 'Electronics', 'Clothing', 'Medical', 'Hardware', 'Home Decor', 'Sports', 'Books', 'Jewelry', 'Other'];

interface ClassificationResult {
  category: string;
  confidence: number;
  suggestions: string[];
}

export function useImageClassification() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [model, setModel] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const modelRef = useRef<any>(null);

  // Initialize the model
  const loadModel = useCallback(async () => {
    if (modelRef.current) {
      setIsReady(true);
      return modelRef.current;
    }

    setIsModelLoading(true);
    try {
      // Dynamically import TensorFlow.js and MobileNet
      await import('@tensorflow/tfjs');
      const mobilenet = await import('@tensorflow-models/mobilenet');
      
      // Load MobileNet model
      const loadedModel = await mobilenet.load({
        version: 2,
        alpha: 1.0
      });
      
      modelRef.current = loadedModel;
      setModel(loadedModel);
      setIsReady(true);
      console.log('MobileNet model loaded successfully');
      return loadedModel;
    } catch (error) {
      console.error('Failed to load MobileNet model:', error);
      throw error;
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  // Classify an image from a file or URL
  const classifyImage = useCallback(async (imageSource: File | string | HTMLImageElement): Promise<ClassificationResult> => {
    let imgElement: HTMLImageElement;

    if (imageSource instanceof File || typeof imageSource === 'string') {
      // Create an image element from file or URL
      imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        imgElement.onload = () => resolve();
        imgElement.onerror = reject;
        
        if (imageSource instanceof File) {
          imgElement.src = URL.createObjectURL(imageSource);
        } else {
          imgElement.src = imageSource;
        }
      });
    } else {
      imgElement = imageSource;
    }

    // Ensure model is loaded
    let currentModel = modelRef.current;
    if (!currentModel) {
      currentModel = await loadModel();
    }

    // Classify the image
    const predictions = await currentModel.classify(imgElement);
    
    // Map predictions to Shahdol Bazaar categories
    const topPrediction = predictions[0]?.className?.toLowerCase() || '';
    const confidence = predictions[0]?.probability || 0;
    
    let matchedCategory = 'Other';
    let highestMatch = 0;
    
    for (const [category, keywords] of Object.entries(CATEGORY_MAPPING)) {
      for (const keyword of keywords) {
        if (topPrediction.includes(keyword)) {
          if (confidence > highestMatch) {
            matchedCategory = category;
            highestMatch = confidence;
          }
        }
      }
    }

    // Generate suggestions based on predictions
    const suggestions = predictions
      .slice(0, 5)
      .map((p: any) => p.className.split(',')[0].trim());

    return {
      category: matchedCategory,
      confidence: Math.round(confidence * 100) / 100,
      suggestions
    };
  }, [loadModel]);

  // Preload model on mount
  useEffect(() => {
    // Don't auto-load to save resources - load on first use
  }, []);

  return {
    classifyImage,
    loadModel,
    isModelLoading,
    isReady,
    categories: CATEGORIES
  };
}
