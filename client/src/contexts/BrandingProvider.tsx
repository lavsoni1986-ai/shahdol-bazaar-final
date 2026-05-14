// BrandingProvider - Complete District Branding & SEO
// Handles colors, favicon, meta tags, and OpenGraph for district-specific theming
// Ensures proper social media sharing with district logos and descriptions

import { ReactNode, useEffect } from "react";
import { useDistrict } from "./DistrictContext";

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { currentDistrict } = useDistrict();

  // Helper function to update or create meta tag
  const updateMetaTag = (property: string, content: string, attribute: string = 'property') => {
    let meta = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  // Helper function to update favicon
  const updateFavicon = (faviconUrl: string) => {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;
  };

  useEffect(() => {
    if (currentDistrict) {
      const root = document.documentElement;
      const currentUrl = window.location.href;

      // 🟠 Injecting Sovereign Colors into CSS Variables
      root.style.setProperty('--primary', currentDistrict.primaryColor || '#FF5722');
      root.style.setProperty('--secondary', currentDistrict.secondaryColor || '#000000');

      // Inject additional district-specific variables for comprehensive theming
      root.style.setProperty('--district-primary', currentDistrict.primaryColor || '#FF5722');
      root.style.setProperty('--district-secondary', currentDistrict.secondaryColor || '#000000');

      // 🎯 Update Favicon Dynamically
      if (currentDistrict.faviconUrl) {
        updateFavicon(currentDistrict.faviconUrl);
      }

      // 📱 Update Document Title
      document.title = currentDistrict.metaTitle || `${currentDistrict.name} Bazaar | BharatOS`;

      // 🔍 Update Basic Meta Tags
      const metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (metaDescription && currentDistrict.metaDescription) {
        metaDescription.setAttribute('content', currentDistrict.metaDescription);
      }

      // 📘 OpenGraph Meta Tags for Social Media Sharing
      updateMetaTag('og:title', currentDistrict.metaTitle || `${currentDistrict.name} Bazaar`);
      updateMetaTag('og:description', currentDistrict.metaDescription || `${currentDistrict.name} - Your local marketplace for everything you need`);
      updateMetaTag('og:url', currentUrl);
      updateMetaTag('og:site_name', `${currentDistrict.name} Bazaar`);
      updateMetaTag('og:type', 'website');

      // OpenGraph Image - Use district-specific image or fallback to logo
      const ogImage = currentDistrict.ogImageUrl || currentDistrict.logoUrl || currentDistrict.imageUrl;
      if (ogImage) {
        updateMetaTag('og:image', ogImage);
        updateMetaTag('og:image:alt', `${currentDistrict.name} Bazaar Logo`);
        updateMetaTag('og:image:width', '1200');
        updateMetaTag('og:image:height', '630');
      }

      // 🐦 Twitter Card Meta Tags
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', currentDistrict.metaTitle || `${currentDistrict.name} Bazaar`);
      updateMetaTag('twitter:description', currentDistrict.metaDescription || `${currentDistrict.name} - Your local marketplace`);
      updateMetaTag('twitter:url', currentUrl);

      const twitterImage = currentDistrict.twitterImageUrl || currentDistrict.ogImageUrl || currentDistrict.logoUrl;
      if (twitterImage) {
        updateMetaTag('twitter:image', twitterImage);
        updateMetaTag('twitter:image:alt', `${currentDistrict.name} Bazaar Logo`);
      }

      // 📞 Additional Meta Tags
      updateMetaTag('author', `${currentDistrict.name} Bazaar Team`);
      if (currentDistrict.contactNumber) {
        updateMetaTag('contact', currentDistrict.contactNumber, 'name');
      }

      // 🌐 Canonical URL
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = currentUrl;

      // 🏷️ Keywords (if district has description)
      if (currentDistrict.description) {
        updateMetaTag('keywords', `${currentDistrict.name}, ${currentDistrict.name} bazaar, marketplace, local shopping, ${currentDistrict.state}`, 'name');
      }

      console.log(`🎨 [BRANDING] Applied ${currentDistrict.name} district branding with OpenGraph & SEO tags`);
    }
  }, [currentDistrict]);

  return <>{children}</>;
}