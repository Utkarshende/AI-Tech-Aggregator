import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp, LogIn, Sparkles, AlertTriangle, Loader2, Database } from 'lucide-react';

// --- FIREBASE IMPORTS & SETUP (MANDATORY GLOBALS) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, updateDoc, doc, arrayUnion, runTransaction, query } from 'firebase/firestore';

// Parse global environment variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mock initial data used as seed if the collection is empty
const initialSeedLinks = [
  { title: "Modern State Management in React", url: "https://react.dev/blog", score: 154, voterIds: [], createdAt: Date.now() - 3600000 },
  { title: "Tailwind CSS: Utility-First Styling", url: "https://tailwindcss.com", score: 89, voterIds: [], createdAt: Date.now() - 7200000 },
  { title: "New Trends in Web Accessibility", url: "https://w3.org/a11y", score: 55, voterIds: [], createdAt: Date.now() - 10800000 },
];

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
    if (!db || !isAuthReady) return;

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
          // If the collection is empty, you might want to seed it here.
          // For simplicity, we will assume the collection is pre-seeded or filled by another action.
          console.log("Links collection is empty. Please add data.");
      }

    }, (e) => {
      console.error("Firestore Fetch Error:", e);
      setError("Failed to load links in real-time. Check console for details.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, isAuthReady]);


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
          score: data.score + 1,
          voterIds: arrayUnion(userId) // Atomically adds userId if not present
        });
      });
      
      console.log(`Vote recorded successfully for link ${linkId}`);

    } catch (err) {
      console.error("Voting error:", err);
      // Display the specific error message from the transaction (e.g., "already voted")
      setError(err.message || "Failed to record vote due to an unexpected error.");
    } finally {
      // Revert the voting state regardless of success/failure.
      // The onSnapshot listener handles the success state update.
      setIsVotingState(prev => ({ ...prev, [linkId]: false }));
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
          <AuthStatus />
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
              <p className="text-sm">Add a mechanism to submit new links to the "{LINKS_COLLECTION_PATH}" collection!</p>
            </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="mt-10 text-center text-sm text-gray-500 pt-4 border-t border-gray-800">
          <p>Data is now fetched and updated in real-time using Firestore.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;