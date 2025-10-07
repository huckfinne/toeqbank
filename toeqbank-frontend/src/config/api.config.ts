// Central API configuration
export const getApiBaseUrl = (): string => {
  const timestamp = new Date().toISOString();
  console.log(`🔍 Debug [${timestamp}] - hostname:`, window.location.hostname);
  console.log(`🔍 Debug [${timestamp}] - REACT_APP_API_URL:`, process.env.REACT_APP_API_URL);
  
  // Force localhost for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log(`✅ [${timestamp}] Force using localhost API URL`);
    return 'http://localhost:3001/api';
  }
  
  // Check for environment variable
  if (process.env.REACT_APP_API_URL) {
    console.log(`✅ [${timestamp}] Using env variable API URL:`, process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Use production URL when deployed to Digital Ocean
  if (window.location.hostname === 'toeqbank-wxhxl.ondigitalocean.app') {
    console.log(`✅ [${timestamp}] Using production API URL`);
    return 'https://toeqbank-wxhxl.ondigitalocean.app/api';
  }
  
  // Default to localhost for development
  console.log(`✅ [${timestamp}] Using default localhost API URL`);
  return 'http://localhost:3001/api';
};