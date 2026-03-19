(function(global) {
  'use strict';

  const SESSION_KEY = 'showsuite_actor_session';
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // ---------- Password Hashing (Simple for Phase 1) ----------
  async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateSalt() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  async function verifyPassword(password, hashedPassword, salt) {
    const hash = await hashPassword(password, salt);
    return hash === hashedPassword;
  }

  // ---------- Session Management ----------
  function generateSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function saveSession(actor, token) {
    const session = {
      actorId: actor.id,
      token: token,
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
      expiresAt: Date.now() + SESSION_DURATION,
      createdAt: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function loadSession() {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Check if session expired
      if (session.expiresAt < Date.now()) {
        clearSession();
        return null;
      }

      return session;
    } catch (e) {
      console.error('Error loading session:', e);
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() {
    const session = loadSession();
    return session !== null;
  }

  function getCurrentActor() {
    const session = loadSession();
    if (!session) return null;

    // Load full actor data
    return global.actorsService?.getActorById(session.actorId);
  }

  // ---------- Password Validation ----------
  function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // ---------- Signup ----------
  async function signup(signupData) {
    const { firstName, lastName, email, password, phone } = signupData;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      throw new Error('First name, last name, email, and password are required');
    }

    // Validate email format
    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error('Password requirements not met: ' + passwordValidation.errors.join(', '));
    }

    // Check if email already exists
    const allActors = global.actorsService?.loadActors() || [];
    const existingActor = allActors.find(a => a.email?.toLowerCase() === email.toLowerCase());

    if (existingActor) {
      throw new Error('An account with this email already exists');
    }

    // Generate salt and hash password
    const salt = generateSalt();
    const hashedPassword = await hashPassword(password, salt);

    // Create actor account
    const newActor = {
      firstName,
      lastName,
      email,
      phone: phone || '',
      actorProfile: {
        experienceLevel: '',
        vocalRange: '',
        specialSkills: [],
        unionAffiliation: [],
        contractPreference: '',
        resume: null,
        headshots: [],
        auditionVideos: [],
        sizeCard: {},
        conflicts: [],
        credentials: {
          hashedPassword: hashedPassword,
          salt: salt,
          emailVerified: false,
          accountCreated: new Date().toISOString(),
          lastLogin: null,
          accountStatus: 'pending' // pending, active, suspended
        }
      }
    };

    // Create the actor
    const createdActor = global.actorsService?.createActor(newActor);

    if (!createdActor) {
      throw new Error('Failed to create actor account');
    }

    console.log('✅ Actor account created:', email, '(Status: pending approval)');

    return {
      success: true,
      actor: createdActor,
      message: 'Account created successfully. Pending admin approval.'
    };
  }

  // ---------- Login ----------
  async function login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find actor by email
    const allActors = global.actorsService?.loadActors() || [];
    const actor = allActors.find(a => a.email?.toLowerCase() === email.toLowerCase());

    if (!actor) {
      throw new Error('Invalid email or password');
    }

    // Check if actor has credentials set up
    if (!actor.actorProfile?.credentials?.hashedPassword) {
      throw new Error('Account not set up for login. Please contact an administrator.');
    }

    // Check account status
    if (actor.actorProfile.credentials.accountStatus === 'suspended') {
      throw new Error('Account suspended. Please contact an administrator.');
    }

    if (actor.actorProfile.credentials.accountStatus === 'pending') {
      throw new Error('Account pending approval. Please wait for admin approval.');
    }

    // Verify password
    const isValid = await verifyPassword(
      password,
      actor.actorProfile.credentials.hashedPassword,
      actor.actorProfile.credentials.salt
    );

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    actor.actorProfile.credentials.lastLogin = new Date().toISOString();
    global.actorsService?.updateActor(actor.id, actor);

    // Create session
    const token = generateSessionToken();
    const session = saveSession(actor, token);

    console.log('✅ Actor logged in:', email);

    return {
      success: true,
      actor: actor,
      session: session
    };
  }

  // ---------- Logout ----------
  function logout() {
    const session = loadSession();
    if (session) {
      console.log('👋 Actor logged out:', session.email);
    }
    clearSession();
  }

  // ---------- Update Password ----------
  async function updatePassword(actorId, oldPassword, newPassword) {
    const actor = global.actorsService?.getActorById(actorId);

    if (!actor) {
      throw new Error('Actor not found');
    }

    // Verify old password
    const isValid = await verifyPassword(
      oldPassword,
      actor.actorProfile.credentials.hashedPassword,
      actor.actorProfile.credentials.salt
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error('New password requirements not met: ' + passwordValidation.errors.join(', '));
    }

    // Generate new salt and hash
    const newSalt = generateSalt();
    const newHashedPassword = await hashPassword(newPassword, newSalt);

    // Update actor
    actor.actorProfile.credentials.hashedPassword = newHashedPassword;
    actor.actorProfile.credentials.salt = newSalt;

    global.actorsService?.updateActor(actorId, actor);

    console.log('✅ Password updated for actor:', actor.email);

    return {
      success: true,
      message: 'Password updated successfully'
    };
  }

  // ---------- Admin Functions ----------
  function approveActorAccount(actorId) {
    const actor = global.actorsService?.getActorById(actorId);

    if (!actor) {
      throw new Error('Actor not found');
    }

    if (!actor.actorProfile.credentials) {
      throw new Error('Actor does not have credentials set up');
    }

    actor.actorProfile.credentials.accountStatus = 'active';
    global.actorsService?.updateActor(actorId, actor);

    console.log('✅ Actor account approved:', actor.email);

    return {
      success: true,
      message: 'Actor account approved'
    };
  }

  function suspendActorAccount(actorId) {
    const actor = global.actorsService?.getActorById(actorId);

    if (!actor) {
      throw new Error('Actor not found');
    }

    if (!actor.actorProfile.credentials) {
      throw new Error('Actor does not have credentials set up');
    }

    actor.actorProfile.credentials.accountStatus = 'suspended';
    global.actorsService?.updateActor(actorId, actor);

    console.log('⚠️ Actor account suspended:', actor.email);

    return {
      success: true,
      message: 'Actor account suspended'
    };
  }

  async function adminResetPassword(actorId, newPassword) {
    const actor = global.actorsService?.getActorById(actorId);

    if (!actor) {
      throw new Error('Actor not found');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error('Password requirements not met: ' + passwordValidation.errors.join(', '));
    }

    // Generate new salt and hash
    const newSalt = generateSalt();
    const newHashedPassword = await hashPassword(newPassword, newSalt);

    // Update or create credentials
    if (!actor.actorProfile.credentials) {
      actor.actorProfile.credentials = {
        accountCreated: new Date().toISOString(),
        emailVerified: false,
        lastLogin: null,
        accountStatus: 'active'
      };
    }

    actor.actorProfile.credentials.hashedPassword = newHashedPassword;
    actor.actorProfile.credentials.salt = newSalt;
    actor.actorProfile.credentials.passwordResetRequired = true;

    global.actorsService?.updateActor(actorId, actor);

    console.log('✅ Admin reset password for actor:', actor.email);

    return {
      success: true,
      message: 'Password reset successfully',
      temporaryPassword: newPassword
    };
  }

  function getPendingActors() {
    const allActors = global.actorsService?.loadActors() || [];
    return allActors.filter(a =>
      a.actorProfile?.credentials?.accountStatus === 'pending'
    );
  }

  function updateSession(actor) {
    const session = loadSession();
    if (!session) return;

    session.firstName = actor.firstName;
    session.lastName = actor.lastName;
    session.email = actor.email;

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  // ---------- Export ----------
  const ActorAuthService = {
    // Authentication
    signup,
    login,
    logout,
    isLoggedIn,
    getCurrentActor,
    loadSession,
    updateSession,

    // Password management
    validatePassword,
    updatePassword,

    // Admin functions
    approveActorAccount,
    suspendActorAccount,
    adminResetPassword,
    getPendingActors,

    // Session management
    SESSION_DURATION
  };

  global.ActorAuthService = ActorAuthService;
  global.actorAuthService = ActorAuthService;

  console.log('✓ Actor Auth Service loaded');

})(typeof window !== 'undefined' ? window : global);
