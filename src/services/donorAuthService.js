/**
 * Donor Authentication Service
 * Manages donor portal sessions with email + 6-digit code login.
 * NOTE: This is a client-side stub. Use a secure backend for production.
 */
const DonorAuthService = (() => {
    const SESSION_KEY = 'donor_session_id';
    const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

    const createSession = (donorId) => {
        const session = {
            donorId: donorId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + SESSION_EXPIRY).toISOString()
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    };

    const getSession = () => {
        try {
            const session = localStorage.getItem(SESSION_KEY);
            if (!session) return null;

            const parsed = JSON.parse(session);

            // Check if expired
            if (new Date(parsed.expiresAt) < new Date()) {
                clearSession();
                return null;
            }

            return parsed;
        } catch (error) {
            console.error('Error getting donor session:', error);
            return null;
        }
    };

    const clearSession = () => {
        localStorage.removeItem(SESSION_KEY);
    };

    const isAuthenticated = () => {
        return getSession() !== null;
    };

    const getCurrentDonor = () => {
        const session = getSession();
        if (!session) return null;

        const contacts = window.contactsService?.loadContacts() || [];
        return contacts.find(c => c.id === session.donorId && c.isDonor);
    };

    const loginWithEmail = (email, code) => {
        // Simple code-based login (in production, use proper authentication)
        const contacts = window.contactsService?.loadContacts() || [];
        const donor = contacts.find(c =>
            c.isDonor &&
            c.email?.toLowerCase() === email.toLowerCase()
        );

        if (!donor) {
            throw new Error('Donor not found with this email');
        }

        // In production, verify the code here
        // For now, accept any 6-digit code
        if (!/^\d{6}$/.test(code)) {
            throw new Error('Invalid verification code');
        }

        return createSession(donor.id);
    };

    const sendLoginCode = (email) => {
        const contacts = window.contactsService?.loadContacts() || [];
        const donor = contacts.find(c =>
            c.isDonor &&
            c.email?.toLowerCase() === email.toLowerCase()
        );

        if (!donor) {
            throw new Error('No donor account found with this email');
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // In production, send email with code
        console.log('🔐 Login code for', email, ':', code);

        // Store code temporarily for verification
        localStorage.setItem(`donor_code_${email}`, code);

        return { success: true, code }; // Remove code from return in production
    };

    return {
        createSession,
        getSession,
        clearSession,
        isAuthenticated,
        getCurrentDonor,
        loginWithEmail,
        sendLoginCode
    };
})();

window.donorAuthService = DonorAuthService;

console.log('✅ Donor Auth Service loaded');
