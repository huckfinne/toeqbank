/**
 * Helper utilities for handling images, including external URLs and CORS issues
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Determines if a URL is external (not from our server)
 */
export const isExternalUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://');
};

/**
 * Gets the appropriate image URL, using proxy for external images
 */
export const getImageUrl = (source: string): string => {
  if (isExternalUrl(source)) {
    // Use proxy for external images to avoid CORS issues
    return `${API_BASE_URL}/images/proxy?url=${encodeURIComponent(source)}`;
  }
  // Local images use direct serving
  return `${API_BASE_URL}/images/serve/${source}`;
};

/**
 * Handle image loading errors with fallback
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string
) => {
  const img = event.currentTarget;
  
  // Prevent infinite loop if fallback also fails
  if (img.dataset.fallbackAttempted === 'true') {
    console.error('Image and fallback both failed to load:', img.src);
    // Could set a placeholder image here
    img.style.display = 'none';
    return;
  }

  if (fallbackUrl) {
    img.dataset.fallbackAttempted = 'true';
    img.src = fallbackUrl;
  } else {
    console.error('Image failed to load:', img.src);
    img.style.display = 'none';
  }
};

/**
 * Preload an image to check if it's accessible
 */
export const preloadImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

/**
 * Get a placeholder image URL
 */
export const getPlaceholderImage = (): string => {
  // Return a data URL for a simple placeholder
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="20"%3EImage Not Available%3C/text%3E%3C/svg%3E';
};