const { useState } = React;

function ActorLogin({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState(null);

  // Calculate password strength
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    const validation = window.actorAuthService.validatePassword(password);
    const strength = {
      score: 0,
      label: '',
      color: '',
      isValid: validation.isValid,
      errors: validation.errors
    };

    // Calculate score based on criteria met
    if (password.length >= 8) strength.score++;
    if (/[A-Z]/.test(password)) strength.score++;
    if (/[a-z]/.test(password)) strength.score++;
    if (/[0-9]/.test(password)) strength.score++;
    if (/[^A-Za-z0-9]/.test(password)) strength.score++;

    // Assign label and color
    if (strength.score <= 2) {
      strength.label = 'Weak';
      strength.color = 'bg-red-500';
    } else if (strength.score === 3) {
      strength.label = 'Fair';
      strength.color = 'bg-yellow-500';
    } else if (strength.score === 4) {
      strength.label = 'Good';
      strength.color = 'bg-blue-500';
    } else {
      strength.label = 'Strong';
      strength.color = 'bg-green-500';
    }

    setPasswordStrength(strength);
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await window.actorAuthService.login(
        loginData.email,
        loginData.password
      );

      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(result.actor);
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (passwordStrength && !passwordStrength.isValid) {
      setError('Password does not meet requirements: ' + passwordStrength.errors.join(', '));
      setLoading(false);
      return;
    }

    try {
      const result = await window.actorAuthService.signup({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        phone: signupData.phone,
        password: signupData.password
      });

      if (result.success) {
        setSuccess(result.message);
        // Clear form
        setSignupData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });
        setPasswordStrength(null);
        // Switch to login after 3 seconds
        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🎭 SceneStave</h1>
          <p className="text-purple-100">Actor Portal</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              mode === 'login'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              mode === 'signup'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="text-center text-sm text-gray-600">
                <p>Forgot password? Contact your theatre administrator.</p>
              </div>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signupData.firstName}
                    onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="First"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signupData.lastName}
                    onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Last"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => {
                    setSignupData({ ...signupData, password: e.target.value });
                    checkPasswordStrength(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="••••••••"
                  required
                />

                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {passwordStrength.label}
                      </span>
                    </div>
                    {!passwordStrength.isValid && (
                      <ul className="text-xs text-red-600 space-y-1">
                        {passwordStrength.errors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-xs text-gray-600 text-center">
                By signing up, you agree to wait for admin approval before accessing your account.
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('showsuite_actor_session');
              window.location.href = '/#/';
            }}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium bg-transparent border-0 cursor-pointer p-0"
          >
            ← Back to SceneStave
          </button>
        </div>
      </div>
    </div>
  );
}

window.ActorLogin = ActorLogin;
