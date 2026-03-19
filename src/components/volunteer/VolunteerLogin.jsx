/**
 * VolunteerLogin.jsx
 * Public volunteer portal login/lookup component
 * Email-based or ID-based lookup with session management
 * No passwords required - simple volunteer identification
 */

const { useState, useEffect } = React;

// Session management utilities
const SESSION_KEYS = {
  ID: 'volunteerSessionId',
  DATA: 'volunteerSessionData',
  EXPIRY: 'volunteerSessionExpiry'
};

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

const saveVolunteerSession = (volunteer) => {
  try {
    const expiry = Date.now() + SESSION_DURATION;
    sessionStorage.setItem(SESSION_KEYS.ID, volunteer.id);
    sessionStorage.setItem(SESSION_KEYS.DATA, JSON.stringify(volunteer));
    sessionStorage.setItem(SESSION_KEYS.EXPIRY, expiry.toString());
    
    // Also save in format expected by VolunteerSelfDashboard
    const sessionData = {
      volunteerId: volunteer.id,
      loginTime: Date.now(),
      volunteer: volunteer
    };
    sessionStorage.setItem('volunteerSession', JSON.stringify(sessionData));
    
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
};

const checkVolunteerSession = () => {
  try {
    const expiry = sessionStorage.getItem(SESSION_KEYS.EXPIRY);
    if (!expiry || Date.now() > parseInt(expiry, 10)) {
      clearVolunteerSession();
      return null;
    }
    
    const data = sessionStorage.getItem(SESSION_KEYS.DATA);
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error checking session:', error);
    clearVolunteerSession();
    return null;
  }
};

const clearVolunteerSession = () => {
  sessionStorage.removeItem(SESSION_KEYS.ID);
  sessionStorage.removeItem(SESSION_KEYS.DATA);
  sessionStorage.removeItem(SESSION_KEYS.EXPIRY);
};

// Generate unique access token
const generateAccessToken = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Main Component
window.VolunteerLogin = ({ isModal = false, onClose, onSuccess }) => {
  const storage = window.volunteerStorageService;
  
  // Tab management
  const [activeTab, setActiveTab] = useState('email'); // 'email' or 'id'
  
  // Form state
  const [emailInput, setEmailInput] = useState('');
  const [volunteerIdInput, setVolunteerIdInput] = useState('');
  const [linkEmailInput, setLinkEmailInput] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [sampleEmails, setSampleEmails] = useState([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  
  // Don't auto-redirect on mount - let user explicitly login
  // This was causing the modal to flash and close immediately
  
  // Email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Handle email lookup
  const handleEmailLookup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate email
    if (!emailInput.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!isValidEmail(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    // Simulate async lookup
    setTimeout(() => {
      try {
        if (!storage?.getVolunteerProfiles) {
          setError('Volunteer system not available. Please try again later.');
          setLoading(false);
          return;
        }
        
        const volunteers = storage.getVolunteerProfiles();
        const volunteer = volunteers.find(
          v => v.email?.toLowerCase() === emailInput.toLowerCase().trim() && v.isVolunteer === true
        );
        
        if (volunteer) {
          // Success - save session and navigate
          if (saveVolunteerSession(volunteer)) {
            setSuccess(`Welcome back, ${volunteer.firstName}!`);
            setTimeout(() => {
              if (onSuccess) {
                onSuccess(volunteer);
              }
            }, 500);
          } else {
            setError('Unable to create session. Please try again.');
          }
        } else {
          setError(
            "We couldn't find a volunteer profile with that email. Make sure you're using the email from your application."
          );
          // Reveal helper with sample emails
          setShowSamples(true);
          loadSampleEmails();
        }
      } catch (err) {
        console.error('Lookup error:', err);
        setError('An error occurred during lookup. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Load sample emails from storage (first 5)
  function loadSampleEmails() {
    try {
      setSampleLoading(true);
      const profiles = storage?.getVolunteerProfiles ? storage.getVolunteerProfiles() : [];
      const samples = (profiles || []).slice(0, 5).map(v => v.email).filter(Boolean);
      setSampleEmails(samples);
    } catch (e) {
      setSampleEmails([]);
    } finally {
      setSampleLoading(false);
    }
  }

  // Seed data then reload sample emails
  function seedDataAndReload() {
    try {
      const seeded = window.showSuiteVolunteer?.seedVolunteerData?.();
      if (seeded) {
        setTimeout(() => loadSampleEmails(), 300);
      }
    } catch (e) {}
  }
  
  // Handle ID lookup
  const handleIdLookup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!volunteerIdInput.trim()) {
      setError('Please enter your Volunteer ID');
      return;
    }
    
    setLoading(true);
    
    setTimeout(() => {
      try {
        if (!storage?.getVolunteerProfiles) {
          setError('Volunteer system not available. Please try again later.');
          setLoading(false);
          return;
        }
        
        const volunteers = storage.getVolunteerProfiles();
        // Look for volunteer with matching ID (stored in volunteerInfo.volunteerId or custom field)
        const volunteer = volunteers.find(
          v => v.id === volunteerIdInput.trim() || 
               v.volunteerInfo?.volunteerId === volunteerIdInput.trim()
        );
        
        if (volunteer) {
          if (saveVolunteerSession(volunteer)) {
            setSuccess(`Welcome back, ${volunteer.firstName}!`);
            setTimeout(() => {
              if (onSuccess) {
                onSuccess(volunteer);
              }
            }, 500);
          } else {
            setError('Unable to create session. Please try again.');
          }
        } else {
          setError('No volunteer profile found with that ID. Please check your ID or try email lookup.');
        }
      } catch (err) {
        console.error('Lookup error:', err);
        setError('An error occurred during lookup. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };
  
  // Generate access link
  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!linkEmailInput.trim() || !isValidEmail(linkEmailInput)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    setTimeout(() => {
      try {
        if (!storage?.getVolunteerProfiles) {
          setError('Volunteer system not available. Please try again later.');
          setLoading(false);
          return;
        }
        
        const volunteers = storage.getVolunteerProfiles();
        const volunteer = volunteers.find(
          v => v.email?.toLowerCase() === linkEmailInput.toLowerCase().trim() && v.isVolunteer === true
        );
        
        if (volunteer) {
          // Generate token and URL
          const token = generateAccessToken();
          const baseUrl = window.location.origin;
          const link = `${baseUrl}/volunteer/dashboard?token=${token}`;
          
          // In production, you'd save this token to the volunteer's record
          // For now, we'll just display it
          setGeneratedLink({
            url: link,
            token: token,
            volunteer: volunteer
          });
          setShowLinkModal(true);
          setLinkEmailInput('');
        } else {
          setError('No volunteer profile found with that email address.');
        }
      } catch (err) {
        console.error('Link generation error:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    }).catch(() => {
      setError('Failed to copy. Please select and copy manually.');
    });
  };
  
  // Reset form when switching tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setEmailInput('');
    setVolunteerIdInput('');
  };
  
  // Open application form
  const openApplicationForm = () => {
    if (isModal && onClose) {
      onClose();
    }
    // Trigger application form open (parent component handles this)
    if (window.openVolunteerApplication) {
      window.openVolunteerApplication();
    }
  };
  
  const containerClass = isModal
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
    : 'min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 py-12 px-4';
  
  const contentClass = isModal
    ? 'bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
    : 'max-w-2xl mx-auto';
  
  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-8 relative">
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          )}
          <h1 className="text-3xl font-bold mb-2">Volunteer Portal Login</h1>
          <p className="text-violet-100 text-lg">Access your volunteer dashboard</p>
        </div>
        
        <div className="bg-white px-8 py-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => switchTab('email')}
              className={`flex-1 px-6 py-3 text-center font-semibold transition-colors relative ${
                activeTab === 'email'
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Email Lookup
            </button>
            <button
              onClick={() => switchTab('id')}
              className={`flex-1 px-6 py-3 text-center font-semibold transition-colors relative ${
                activeTab === 'id'
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Volunteer ID Lookup
            </button>
          </div>
          
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-green-800">
                <span className="text-xl mr-2">✓</span>
                <span className="font-medium">{success}</span>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start text-red-800">
                <span className="text-xl mr-2 flex-shrink-0">⚠</span>
                <div className="flex-1">
                  <p className="font-medium mb-2">{error}</p>
                  {error.includes("couldn't find") && (
                    <button
                      onClick={openApplicationForm}
                      className="text-red-700 underline hover:text-red-900 text-sm font-semibold"
                    >
                      Haven't applied yet? Apply to Volunteer →
                    </button>
                  )}
                  {/* Inline helper: sample emails for quick testing */}
                  <div className="mt-3">
                    {!showSamples && (
                      <button
                        type="button"
                        onClick={() => { setShowSamples(true); loadSampleEmails(); }}
                        className="text-sm text-violet-700 hover:text-violet-900 font-semibold"
                      >
                        Show sample emails
                      </button>
                    )}
                    {showSamples && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
                        {sampleLoading && (
                          <div className="text-sm text-gray-700">Loading samples…</div>
                        )}
                        {!sampleLoading && sampleEmails.length > 0 && (
                          <div className="space-y-1">
                            {sampleEmails.map((em, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="font-mono text-gray-900">{em}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(em)}
                                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
                                >
                                  Copy
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {!sampleLoading && sampleEmails.length === 0 && (
                          <div className="text-xs text-yellow-900 bg-yellow-50 border border-yellow-200 rounded p-2">
                            No volunteers found. Open the test harness or
                            <button onClick={seedDataAndReload} className="ml-1 underline text-yellow-900 font-semibold">seed test data</button>
                            and try again.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tab Content: Email Lookup */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLookup} className="space-y-6">
              <div>
                <label htmlFor="email-input" className="block text-sm font-semibold text-gray-900 mb-2">
                  Enter your email address
                </label>
                <input
                  title="Login"
                  placeholder="Enter your login"
                  id="email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="volunteer@email.com"
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  disabled={loading}
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-600">
                  Use the email address from your volunteer application
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-lg transition-colors"
              >
                {loading ? 'Finding Your Profile...' : 'Find My Profile'}
              </button>
            </form>
          )}
          
          {/* Tab Content: ID Lookup */}
          {activeTab === 'id' && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 mb-1">
                  <strong>Your Volunteer ID was provided when you were approved.</strong>
                </p>
                <p className="text-sm text-blue-800">
                  Check your welcome email for your ID.
                </p>
              </div>
              
              <form onSubmit={handleIdLookup} className="space-y-6">
                <div>
                  <label htmlFor="id-input" className="block text-sm font-semibold text-gray-900 mb-2">
                    Enter your Volunteer ID
                  </label>
                  <input
                    id="id-input"
                    type="text"
                    value={volunteerIdInput}
                    onChange={(e) => setVolunteerIdInput(e.target.value.toUpperCase())}
                    placeholder="VOL12345"
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Format: VOL followed by numbers
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-lg transition-colors"
                >
                  {loading ? 'Finding Your Profile...' : 'Find My Profile'}
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchTab('email')}
                    className="text-violet-600 hover:text-violet-800 text-sm font-semibold"
                  >
                    Don't have your ID? Use email lookup instead →
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Divider */}
          <div className="my-8 border-t border-gray-200"></div>
          
          {/* Email Me My Link Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Email Me My Access Link</h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll generate a secure link you can use to access your profile anytime.
            </p>
            
            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div>
                <label htmlFor="link-email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email address
                </label>
                <input
                  id="link-email"
                  type="email"
                  value={linkEmailInput}
                  onChange={(e) => setLinkEmailInput(e.target.value)}
                  placeholder="volunteer@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
              >
                {loading ? 'Generating Link...' : 'Generate Link'}
              </button>
            </form>
          </div>
          
          {/* Security Note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-3 flex-shrink-0">ℹ️</span>
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">For your security</p>
                <p>
                  We only show your upcoming shifts and profile. For sensitive changes, please contact the volunteer coordinator.
                </p>
              </div>
            </div>
          </div>

          {/* Demo Mode Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">🧪 Development Mode</h4>
              <p className="text-xs text-blue-700 mb-3">
                Skip login and view the dashboard with sample data (for testing only)
              </p>
              <button
                onClick={() => {
                  const demoVolunteer = {
                    id: 'demo-volunteer',
                    firstName: 'Demo',
                    lastName: 'Volunteer',
                    email: 'demo@showsuite.local',
                    phone: '555-DEMO',
                    isVolunteer: true,
                    volunteerInfo: {
                      status: 'active',
                      totalHours: 42.5,
                      lastShiftDate: new Date().toISOString(),
                      availability: { friday: true, saturday: true, sunday: true },
                      interests: ['Front of House', 'Box Office']
                    }
                  };
                  
                  if (saveVolunteerSession(demoVolunteer)) {
                    if (onSuccess) {
                      onSuccess(demoVolunteer);
                    }
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Enter Demo Mode
              </button>
            </div>
          </div>
          
          {/* Need Help Section */}
          <div className="mt-6">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-violet-600 hover:text-violet-800 font-semibold flex items-center"
            >
              Need help accessing your account?
              <span className="ml-2">{showHelp ? '▼' : '▶'}</span>
            </button>
            
            {showHelp && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3 text-sm text-gray-700">
                <p>
                  <strong>Forgot your email?</strong> Contact our volunteer coordinator for assistance.
                </p>
                <p>
                  <strong>Never received a Volunteer ID?</strong> Use email lookup instead - it's easier!
                </p>
                <p>
                  <strong>Applied recently?</strong> It may take 3-5 business days to be approved. Check back soon!
                </p>
                <p>
                  <strong>Technical issues?</strong> Email{' '}
                  <a href="mailto:volunteers@theatre.org" className="text-violet-600 hover:text-violet-800 font-semibold">
                    volunteers@theatre.org
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Generated Link Modal */}
      {showLinkModal && generatedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 relative">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setGeneratedLink(null);
                }}
                className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold">Your Personal Volunteer Portal Link</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Access Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink.url}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedLink.url)}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold whitespace-nowrap"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  <strong>Important:</strong> Save this link to access your volunteer dashboard anytime. 
                  Don't share this link with others - it's unique to you.
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Email Template</h3>
                <div className="text-sm text-gray-700 space-y-2 mb-3">
                  <p><strong>Subject:</strong> Your Volunteer Portal Access Link</p>
                  <div className="bg-white p-3 rounded border border-gray-200 text-xs font-mono whitespace-pre-wrap">
{`Hello ${generatedLink.volunteer.firstName},

Here is your personal link to access the Volunteer Portal:

${generatedLink.url}

Save this link to view your upcoming shifts and manage your volunteer profile anytime.

For security, please don't share this link with others.

Questions? Contact us at volunteers@theatre.org

Thank you for volunteering!`}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`Subject: Your Volunteer Portal Access Link\n\nHello ${generatedLink.volunteer.firstName},\n\nHere is your personal link to access the Volunteer Portal:\n\n${generatedLink.url}\n\nSave this link to view your upcoming shifts and manage your volunteer profile anytime.\n\nFor security, please don't share this link with others.\n\nQuestions? Contact us at volunteers@theatre.org\n\nThank you for volunteering!`)}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold"
                >
                  Copy Email Text
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setGeneratedLink(null);
                }}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export session utilities for use in other components
window.volunteerSession = {
  save: saveVolunteerSession,
  check: checkVolunteerSession,
  clear: clearVolunteerSession
};
