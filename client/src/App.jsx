import React from 'react';
import { ArrowUp, LogIn, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';

// --- MOCK DATA AND UTILITIES ---

// Mock user and link data
const mockLinksData = [
  { id: 1, title: "Modern State Management in React", url: "https://react.dev/blog", score: 154, userId: "user-abc", userVoted: false, isVoting: false },
  { id: 2, title: "Tailwind CSS: Utility-First Styling", url: "https://tailwindcss.com", score: 89, userId: "user-xyz", userVoted: false, isVoting: false },
  { id: 3, title: "The Power of Single-File Components", url: "https://google.com", score: 210, userId: "current-user-123", userVoted: true, isVoting: false }, // User has already voted on this one
  { id: 4, title: "New Trends in Web Accessibility", url: "https://w3.org/a11y", score: 55, userId: "user-def", userVoted: false, isVoting: false },
];

// Mock API Call Utility
/**
 * Simulates a protected PATCH /api/links/:id/vote endpoint.
 * @param {number} linkId - The ID of the link being voted on.
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
const fetchApi = (linkId, userId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Mock failure condition: User already voted on link 3
      if (linkId === 3 && userId === 'current-user-123') {
        reject({ message: "You have already voted on this link." });
        return;
      }
      
      // Mock successful vote
      resolve({ success: true, message: "Vote recorded successfully." });
    }, 500); // Simulate network latency
  });
};

// --- LINK CARD COMPONENT ---

const LinkCard = ({ link, isAuthenticated, handleVote }) => {
  const isVoted = link.userVoted;
  const isVoting = link.isVoting;
  
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

  return (
    <div className="flex items-center bg-gray-700 p-4 rounded-xl shadow-lg hover:shadow-xl transition duration-300 space-x-4 border border-gray-600">
      
      {/* 1. Score and Vote Button */}
      <div className="flex flex-col items-center min-w-[50px]">
        {isAuthenticated ? (
          <button 
            onClick={() => handleVote(link.id)}
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
          <span className="opacity-70">({new URL(link.url).hostname})</span>
        </p>
      </div>
      
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT (HOME) ---

const App = () => {
  // Use local state to manage the list of links
  const [links, setLinks] = React.useState(mockLinksData.sort((a, b) => b.score - a.score));
  
  // Mock authentication state (true = logged in)
  const [isAuthenticated, setIsAuthenticated] = React.useState(true);
  const [userId] = React.useState('current-user-123'); 
  
  // UI feedback for errors
  const [error, setError] = React.useState(null);
  
  // Function to handle the vote action
  const handleVote = async (linkId) => {
    setError(null); // Clear previous errors

    // 1. Find the link and initiate optimistic update
    setLinks(prevLinks => prevLinks.map(link => 
      link.id === linkId 
        ? { ...link, isVoting: true }
        : link
    ));

    try {
      // 2. Call the mock API (simulates PATCH /api/links/:id/vote)
      await fetchApi(linkId, userId);

      // 3. Success: Final update, increment score, mark as voted, and resort
      setLinks(prevLinks => {
        const newLinks = prevLinks.map(link => 
          link.id === linkId 
            ? { ...link, score: link.score + 1, userVoted: true, isVoting: false }
            : link
        );
        // Sort by score immediately after a successful vote
        return newLinks.sort((a, b) => b.score - a.score);
      });

    } catch (err) {
      // 4. Failure: Revert optimistic change and show error
      setLinks(prevLinks => prevLinks.map(link => 
        link.id === linkId 
          ? { ...link, isVoting: false }
          : link
      ));
      
      console.error("Voting error:", err.message);
      setError(err.message || "An unknown error occurred during voting.");

    }
  };
  
  // Link to simulate login/logout
  const AuthLink = () => (
    <button 
      onClick={() => setIsAuthenticated(prev => !prev)}
      className="text-sm text-indigo-400 hover:text-indigo-300 transition duration-150"
    >
      {isAuthenticated ? `Signed in as ${userId} (Click to Logout)` : 'Click to Login'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-gray-700 mb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-sky-500">
            <Sparkles className="inline w-6 h-6 mr-2 mb-1" />
            HN Clone
          </h1>
          <AuthLink />
        </header>
        
        {/* Error Message Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-800/30 text-red-300 border border-red-700 rounded-lg flex items-center shadow-lg">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p className="font-medium text-sm">{error}</p>
            {/* Conditional Login/Register link if not authenticated and error is auth related */}
            {!isAuthenticated && error.includes("vote") && (
              <a href="#login" className="ml-auto underline font-semibold">Log In Now</a>
            )}
          </div>
        )}

        {/* Links List */}
        <main className="space-y-4">
          {links.map((link) => (
            <LinkCard 
              key={link.id} 
              link={link} 
              isAuthenticated={isAuthenticated} 
              handleVote={handleVote} 
            />
          ))}
        </main>
        
        {/* Footer */}
        <footer className="mt-10 text-center text-sm text-gray-500 pt-4 border-t border-gray-800">
          <p>Links are sorted by score. Try voting on item 3 (it will fail) and other items (they will succeed).</p>
        </footer>
      </div>
    </div>
  );
};

export default App;