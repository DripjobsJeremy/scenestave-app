/**
 * VolunteerLoginModal.jsx
 * Authentication modal for returning volunteers to access their dashboard
 */

const { useState } = React;

const VolunteerLoginModal = ({ onClose = () => {}, onSuccess = () => {} }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    // Simple authentication - check if volunteer exists with matching email
    setTimeout(() => {
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const volunteer = contacts.find(c => 
        c.email?.toLowerCase() === email.toLowerCase() && 
        c.volunteerInfo?.status === 'active'
      );

      if (volunteer) {
        // Store logged-in volunteer session
        sessionStorage.setItem('volunteerSession', JSON.stringify({
          id: volunteer.id,
          name: `${volunteer.firstName} ${volunteer.lastName}`,
          email: volunteer.email,
          loginAt: Date.now()
        }));
        
        setLoading(false);
        onSuccess(volunteer);
      } else {
        setLoading(false);
        setError('Invalid credentials or account not found. Please contact the volunteer coordinator if you need assistance.');
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-lg shadow-xl w-full max-w-md" style={{ background: 'var(--color-bg-elevated)' }}>
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Volunteer Login</h2>
            <p className="text-sm text-gray-600 mt-1">Access your volunteer dashboard</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full rounded px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-violet-600 rounded" />
              <span style={{ color: 'var(--color-text-secondary)' }}>Remember me</span>
            </label>
            <a href="#" className="text-violet-600 hover:text-violet-800">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded font-semibold text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="text-center text-sm text-gray-600 pt-4 border-t">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                // Trigger application form
                if (window.VolunteerApplicationForm) {
                  setTimeout(() => {
                    const event = new CustomEvent('openApplicationForm');
                    window.dispatchEvent(event);
                  }, 100);
                }
              }}
              className="text-violet-600 hover:text-violet-800 font-semibold"
            >
              Apply to volunteer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

window.VolunteerLoginModal = VolunteerLoginModal;
