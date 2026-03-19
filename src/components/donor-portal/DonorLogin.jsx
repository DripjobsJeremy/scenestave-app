function DonorLogin({ onLoginSuccess }) {
    const [email, setEmail] = React.useState('');
    const [code, setCode] = React.useState('');
    const [codeSent, setCodeSent] = React.useState(false);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = window.donorAuthService.sendLoginCode(email);
            setCodeSent(true);

            if (window.showToast) {
                window.showToast(`✅ Login code sent to ${email}`, 'success');
            }

            // In development, show code in console
            console.log('🔐 Use this code:', result.code);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            window.donorAuthService.loginWithEmail(email, code);

            if (window.showToast) {
                window.showToast('✅ Login successful!', 'success');
            }

            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">💎</div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Portal</h1>
                    <p className="text-gray-600">Access your giving history and exclusive updates</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {!codeSent ? (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="your.email@example.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Login Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                            <p className="text-sm text-blue-900">
                                We've sent a 6-digit code to <strong>{email}</strong>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-2xl tracking-widest"
                                placeholder="000000"
                                maxLength="6"
                                pattern="\d{6}"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Login'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setCodeSent(false);
                                setCode('');
                                setError('');
                            }}
                            className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm"
                        >
                            Use different email
                        </button>
                    </form>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
                    <p>Don't have an account? Contact us to become a donor.</p>
                </div>
            </div>
        </div>
    );
}

window.DonorLogin = DonorLogin;

console.log('✅ DonorLogin component loaded');
