import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Create the Context object
export const AuthContext = createContext();

// Utility for fetching with error handling and automatic bearer token setup
const fetchApi = async (url, options = {}) => {
  // Use 'localStorage' for token management
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // --- Implement Exponential Backoff for API Calls ---
  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
        const response = await fetch(url, { ...options, headers });
        
        // Custom error handling based on status codes
        if (!response.ok) {
            // Attempt to parse the error message from the response body
            const contentType = response.headers.get("content-type");
            let errorBody = {};
            if (contentType && contentType.indexOf("application/json") !== -1) {
                // Safely attempt to parse JSON response
                try {
                    errorBody = await response.json();
                } catch (e) {
                    // If JSON parsing fails, treat as plain text error
                    const text = await response.text();
                    errorBody.msg = text.substring(0, 100) || `API Request Failed with status ${response.status}`;
                }
            } else {
                const text = await response.text();
                // Take a snippet of the text response for the error message
                errorBody.msg = text.substring(0, 100) || `API Request Failed with status ${response.status}`;
            }

            if (response.status === 401) {
                // If unauthorized, clear the token and reload to log the user out
                localStorage.removeItem('token');
                window.location.reload(); 
            }
            lastError = new Error(errorBody.msg || `API Request Failed with status ${response.status}`);
            
            // If it's a 5xx error or rate limiting (429), retry after a delay
            if (response.status >= 500 || response.status === 429) {
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // 1s, 2s, 4s + jitter
                await new Promise(res => setTimeout(res, delay));
                continue; // Retry the request
            }
            // For other client errors (4xx, excluding 401 which reloads), don't retry, just throw
            throw lastError; 
        }

        // Handle successful empty response (e.g., status 204 No Content)
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return {};
        }

        return response.json();

    } catch (e) {
      // Catch network errors (e.g., fetch failed) and retry if applicable
      lastError = e;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(res => setTimeout(res, delay));
      if (attempt === MAX_RETRIES - 1) {
          throw new Error("Network request failed after multiple retries: " + lastError.message);
      }
    }
  }
  // If we exit the loop due to max retries
  throw lastError || new Error("API call failed mysteriously."); 
};


export const AuthProvider = ({ children }) => {
  // user stores { id, username, role } extracted from the token payload
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));


  // --- Helper function to check for token validity and get user info ---
  const loadUser = async () => {
    if (token) {
        try {
            // NOTE: Decoding locally is for UX/data extraction, security check happens on the backend
            // The token is base64 encoded, split by '.', [1] is the payload
            const tokenPayloadBase64 = token.split('.')[1];
            // Decode from base64 (using browser's atob) and parse JSON
            const tokenPayload = JSON.parse(atob(tokenPayloadBase64));
            setUser(tokenPayload.user);
        } catch (error) {
            console.error('Token handling failed. Clearing token.', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Re-run user loading whenever the token changes
    loadUser();
  }, [token]);


  // --- Auth Actions (Register / Login / Logout) ---

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Note: This API call relies on the backend being available at /api/users/login
      const data = await fetchApi('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', data.token);
      setToken(data.token); // Updates local state, triggers useEffect -> loadUser
      setLoading(false); 
      return true;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const data = await fetchApi('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      // After successful registration, log the user in immediately
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setLoading(false);
      return true;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    role: user ? user.role : null,
    login,
    register,
    logout,
    fetchApi, // Export the utility for protected fetches
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} 
      {/* Show a full-page loader while checking token/auth state */}
      {loading && <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 text-xl font-semibold text-blue-700">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading authentication status...
        </div>
      </div>}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access to auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};