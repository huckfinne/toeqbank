// Central API configuration
export const getApiBaseUrl = (): string => {
  console.log('🔍 Debug - hostname:', window.location.hostname);
  console.log('🔍 Debug - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ Using env variable API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Use production URL when deployed to Digital Ocean
  if (window.location.hostname === 'toeqbank-wxhxl.ondigitalocean.app') {
    console.log('✅ Using production API URL');
    return 'https://toeqbank-wxhxl.ondigitalocean.app/api';
  }
  
  // Default to localhost for development
  console.log('✅ Using localhost API URL');
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();