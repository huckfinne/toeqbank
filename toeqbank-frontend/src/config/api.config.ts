// Central API configuration
export const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Use production URL when deployed to Digital Ocean
  if (window.location.hostname === 'toeqbank-wxhxl.ondigitalocean.app') {
    return 'https://toeqbank-wxhxl.ondigitalocean.app/api';
  }
  
  // Default to localhost for development
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();