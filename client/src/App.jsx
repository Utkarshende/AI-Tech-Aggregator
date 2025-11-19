import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp, LogIn, Sparkles, AlertTriangle, Loader2, Database, Plus, X } from 'lucide-react';

// --- FIREBASE IMPORTS & SETUP (MANDATORY GLOBALS) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, updateDoc, doc, arrayUnion, runTransaction, query, addDoc, Timestamp } from 'firebase/firestore';

// Parse global environment variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firestore public collection path for shared data
const LINKS_COLLECTION_PATH = `artifacts/${appId}/public/data/links`;


// --- LINK CARD COMPONENT ---

const LinkCard = React.memo(({ link, userId, isAuthenticated, handleVote, isVotingState }) => {
  const isVoted = link.voterIds.includes(userId);
  const isVoting = isVotingState[link.id];
  
  // Dynamic button state and classes
  const voteButtonClasses = `
    flex items-center justify-center w-8 h-8 rounded-full transition duration-150 ease-in-out
    ${isVoted 
      ? 'bg-indigo-600 text-white cursor-default shadow-md' 
      : isVoting 
        ? 'bg-indigo-400 text-white animate-pulse'
        : 'bg-gray-700 text-gray-300 hover:bg-indigo-500 hover:text-white shadow-lg transform hover:scale-110'
    }
  `;

  let hostname = '';
  try {
    hostname = new URL(link.url).hostname;
  } catch (e) {
    hostname = 'Invalid URL';
  }

  return (
    <div className="flex items-center bg-gray-700 p-4 rounded-xl shadow-lg hover:shadow-xl transition duration-300 space-x-4 border border-gray-600">
      
      {/* 1. Score and Vote Button */}
      <div className="flex flex-col items-center min-w-[50px]">
        {isAuthenticated ? (
          <button 
            onClick={() => handleVote(link.id, link.ref)}
            disabled={isVoted || isVoting}
            className={voteButtonClasses}
            aria-label={isVoted ? 'You already voted' : 'Upvote link'}
          >
            {isVoting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center w-8 h-8 text-indigo-400" title="Log in to vote">
            <LogIn className="w-4 h-4 opacity-75" />
          </div>
        )}
        <span className={`text-xl font-bold mt-1 ${isVoted ? 'text-indigo-400' : 'text-white'}`}>
          {link.score}
        </span>
      </div>

      {/* 2. Link Details */}
      <div className="flex-grow min-w-0">
        <a 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-lg font-semibold text-white hover:text-indigo-400 transition duration-200 truncate block"
        >
          {link.title}
        </a>
        <p className="text-sm text-gray-400 truncate">
          <span className="opacity-70">({hostname})</span>
        </p>
      </div>
    </div>
  );
});


// --- LINK SUBMISSION FORM COMPONENT ---

const LinkSubmissionForm = ({ onSubmit, onClose, disabled }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim() || !url.trim()) {
      setValidationError("Both Title and URL are required.");
      return;
    }

    try {
      new URL(url.trim()); // Basic URL validation
    } catch (e) {
      setValidationError("Please enter a valid URL.");
      return;
    }

    onSubmit({ title: title.trim(), url: url.trim() });
    setTitle('');
    setUrl('');
    // Note: onClose() is now handled within the App component after successful submission
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100 opacity-100"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside form
      >
        <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Plus className="w-5 h-5 mr-2 text-indigo-400" />
            Submit New Link
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition"
            aria-label="Close form"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="e.g., GPT-5 Launch Details"
              required
              disabled={disabled}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
              URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="https://example.com/article"
              required
              disabled={disabled}
            />
          </div>

          {validationError && (
            <p className="text-sm text-red-400 mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" /> {validationError}
            </p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition duration-300"
            disabled={disabled}
          >
            {disabled && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {disabled ? 'Submitting...' : 'Post Link'}
          </button>
        </form>
      </div>
    </div>
  );
};


// --- MAIN APPLICATION COMPONENT (HOME) ---

const App = () => {
  // Firebase State
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Application State
  const [links, setLinks] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State for Submission Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State to track which link is currently being voted on (to disable the button)
  const [isVotingState, setIsVotingState] = useState({}); 

  // 1. Initialize Firebase and Auth
  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length > 0) {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authInstance = getAuth(app);
        
        setDb(firestore);
        setAuth(authInstance);

        // Listen for auth state changes
        const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(null); // User is logged out
          }
          setIsAuthReady(true);
        });

        // Sign in using the custom token or anonymously
        const signIn = async () => {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
              console.log("Signed in with custom token.");
            } else {
              await signInAnonymously(authInstance);
              console.log("Signed in anonymously.");
            }
          } catch (e) {
            console.error("Firebase Auth Error:", e);
            setError("Could not establish user session.");
          }
        };

        signIn();
        
        return () => unsubscribeAuth();
      } else {
        setError("Firebase configuration is missing.");
        setIsAuthReady(true);
      }
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("Failed to initialize Firebase services.");
      setIsAuthReady(true);
    }
  }, []);

  // 2. Real-time Data Fetching
  useEffect(() => {
    // Only attempt to attach listener once we know the authentication state (userId)
    if (!db || !isAuthReady || !userId) {
        if (isAuthReady && !userId) {
            // Log for debugging if we are auth ready but still no user (anonymous sign-in failed/blocked)
            console.log("Not fetching data: Auth is ready but userId is null.");
        }
        return;
    }

    const linksRef = collection(db, LINKS_COLLECTION_PATH);
    const q = query(linksRef); 
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLinks = snapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref, // Store reference for voting updates
        ...doc.data(),
      }));

      // Sort by score (client-side sort to avoid requiring Firestore indexes)
      fetchedLinks.sort((a, b) => b.score - a.score); 
      setLinks(fetchedLinks);
      setIsLoading(false);
      setError(null);

      if (fetchedLinks.length === 0) {
          console.log("Links collection is empty.");
      }

    }, (e) => {
      console.error("Firestore Fetch Error:", e);
      // This is often where permission errors land if the rules are too strict
      setError("Failed to load links in real-time. Check console for details.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, isAuthReady, userId]);


  // 3. Handle Voting Logic (Firestore Transaction)
  const handleVote = useCallback(async (linkId, linkRef) => {
    if (!userId || !db) {
      setError("You must be logged in to vote.");
      return;
    }
    
    setError(null);
    setIsVotingState(prev => ({ ...prev, [linkId]: true }));

    try {
      await runTransaction(db, async (transaction) => {
        const linkDoc = await transaction.get(linkRef);

        if (!linkDoc.exists()) {
          throw new Error("Link does not exist.");
        }

        const data = linkDoc.data();
        const voterIds = data.voterIds || [];

        // Check if user has already voted
        if (voterIds.includes(userId)) {
          throw new Error("You have already voted on this link.");
        }

        // Perform the update: increment score and add userId to voterIds array
        transaction.update(linkRef, {
          score: (data.score || 0) + 1,
          voterIds: arrayUnion(userId) // Atomically adds userId if not present
        });
      });
      
      console.log(`Vote recorded successfully for link ${linkId}`);

    } catch (err) {
      console.error("Voting error:", err);
      setError(err.message || "Failed to record vote due to an unexpected error.");
    } finally {
      setIsVotingState(prev => ({ ...prev, [linkId]: false }));
    }
  }, [db, userId]);
  
  
  // 4. Handle Link Submission Logic (Firestore addDoc)
  const handleSubmitLink = useCallback(async ({ title, url }) => {
    if (!userId || !db) {
      setError("You must be logged in to submit a link.");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    const newLink = {
      title,
      url,
      score: 1, // Start with a score of 1 (implicitly voted by creator)
      voterIds: [userId], // Creator votes automatically
      createdAt: Timestamp.now(),
      authorId: userId, // Track the author
    };
    
    try {
      const linksRef = collection(db, LINKS_COLLECTION_PATH);
      await addDoc(linksRef, newLink);
      console.log("Link submitted successfully.");
      setIsFormOpen(false); // Close the form on success
      
    } catch (e) {
      console.error("Submission Error:", e);
      setError("Failed to submit link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [db, userId]);


  // Link to display current user and status
  const AuthStatus = () => {
    if (!isAuthReady) {
      return <span className="text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</span>;
    }
    
    if (userId) {
      // Show the complete userId as required for multi-user apps
      return (
        <span className="text-sm text-indigo-400" title={`User ID: ${userId}`}>
          Signed in: <span className="font-mono text-xs">{userId}</span>
        </span>
      );
    }
    
    return <span className="text-sm text-red-400">Not authenticated.</span>;
  };
  
  return (
    <div className="min-h-screen bg-gray-900 font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 border-b border-gray-700 mb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-sky-500 mb-2 sm:mb-0">
            <Sparkles className="inline w-6 h-6 mr-2 mb-1" />
            AI Tech Aggregator
          </h1>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            {/* Submission button is only visible if authenticated */}
            {userId && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 transition duration-150 shadow-md"
                disabled={!isAuthReady || !userId}
              >
                <Plus className="w-4 h-4 mr-1" />
                Submit Link
              </button>
            )}
            <AuthStatus />
          </div>
        </header>
        
        {/* Loading/Error Message Display */}
        {isLoading && (
          <div className="mb-4 p-3 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg flex items-center justify-center shadow-lg">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            <p className="font-medium text-sm">Loading links from Firestore...</p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-800/30 text-red-300 border border-red-700 rounded-lg flex items-center shadow-lg">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {/* Links List */}
        <main className="space-y-4">
          {links.length > 0 ? (
            links.map((link) => (
              <LinkCard 
                key={link.id} 
                link={link} 
                userId={userId}
                isAuthenticated={!!userId} 
                handleVote={handleVote} 
                isVotingState={isVotingState}
              />
            ))
          ) : !isLoading && (
            <div className="text-center p-12 bg-gray-800 rounded-xl text-gray-400">
              <Database className="w-10 h-10 mx-auto mb-4" />
              <p className="text-lg font-semibold">No links found.</p>
              <p className="text-sm">Be the first to post! Click "Submit Link" above.</p>
            </div>
          )}
        </main>
        
        {/* Submission Form Modal */}
        {isFormOpen && (
          <LinkSubmissionForm
            onSubmit={handleSubmitLink}
            onClose={() => setIsFormOpen(false)}
            disabled={isSubmitting}
          />
        )}
        
        {/* Footer */}
        <footer className="mt-10 text-center text-sm text-gray-500 pt-4 border-t border-gray-800">
          <p>Data is now fetched and updated in real-time using Firestore.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;