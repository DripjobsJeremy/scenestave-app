/**
 * Organization Service
 * Manages organization profile, branding, and account data persistence.
 */
const OrganizationService = (() => {
    const STORAGE_KEY = 'showsuite_organization';

    // SceneStave placeholder logo — purple-gradient theatrical masks
    const SHOWSUITE_LOGO_SVG = 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">' +
        '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" style="stop-color:#7C3AED"/>' +
        '<stop offset="100%" style="stop-color:#4F46E5"/>' +
        '</linearGradient></defs>' +
        '<circle cx="100" cy="100" r="95" fill="url(#g)" opacity="0.1"/>' +
        '<ellipse cx="72" cy="95" rx="38" ry="44" fill="url(#g)"/>' +
        '<ellipse cx="60" cy="87" rx="5" ry="8" fill="white"/>' +
        '<ellipse cx="84" cy="87" rx="5" ry="8" fill="white"/>' +
        '<circle cx="60" cy="89" r="3" fill="#1F2937"/>' +
        '<circle cx="84" cy="89" r="3" fill="#1F2937"/>' +
        '<path d="M 57,105 Q 72,118 87,105" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="138" cy="105" rx="38" ry="44" fill="url(#g)"/>' +
        '<ellipse cx="126" cy="97" rx="5" ry="8" fill="white"/>' +
        '<ellipse cx="150" cy="97" rx="5" ry="8" fill="white"/>' +
        '<circle cx="126" cy="99" r="3" fill="#1F2937"/>' +
        '<circle cx="150" cy="99" r="3" fill="#1F2937"/>' +
        '<path d="M 123,118 Q 138,108 153,118" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<circle cx="30" cy="30" r="3" fill="#10B981" opacity="0.7"/>' +
        '<circle cx="170" cy="170" r="3" fill="#10B981" opacity="0.7"/>' +
        '</svg>'
    );

    // Banquo ghost-candle palette — matches banquo-wizard landing page identity.
    // primaryColor drives --brand-primary (sidebar gradient start, buttons, all
    // purple Tailwind utility overrides). secondaryColor drives gradient end and
    // --color-secondary. accentColor is reserved for success/confirmation states.
    const DEFAULT_BRANDING = {
        logoUrl:         SHOWSUITE_LOGO_SVG,
        primaryColor:    '#7a1f24',  // crimson (var --crimson on landing)
        secondaryColor:  '#a6282f',  // crimson-bright (hover / gradient end)
        accentColor:     '#c9a14a',  // gold (var --gold on landing — used for labels and accents)
        backgroundColor: '#0a0706',  // ink
        textColor:       '#f4ede2'   // parchment
    };

    const DEFAULT_ORGANIZATION = {
        id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'My Theatre Organization',
        type: 'community',
        website: '',
        description: '',
        taxId: '',
        timezone: (() => {
            try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'America/New_York'; }
        })(),
        accountNumber: `ACCT-${Date.now().toString(36).toUpperCase()}`,
        subscriptionPlan: 'free',
        address: {
            street1: '',
            street2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'US'
        },
        billingAddress: {
            sameAsOrg: true,
            street1: '',
            street2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'US'
        },
        phones: [
            { id: 'phone_1', label: 'Main', number: '', countryCode: '+1', isPrimary: true }
        ],
        emails: [
            { id: 'email_1', label: 'Main', address: '', isPrimary: true }
        ],
        branding: { ...DEFAULT_BRANDING },
        savedCustomTheme: null,
        clientOrganizations: [],
        managesClientOrgs: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Branding migration version — bump this when DEFAULT_BRANDING changes and
    // existing users need their cached branding refreshed.
    const BRANDING_VERSION = 'banquo-v1';
    const BRANDING_VERSION_KEY = 'showsuite_branding_version';

    const migrateBrandingToBanquo = (org) => {
        // Only migrate orgs that are still running the old SceneStave purple defaults.
        // A user who has explicitly customized their brand is detected by having a
        // primaryColor that differs from the old DEFAULT — leave them alone.
        const SCENESTAVE_DEFAULTS = {
            primaryColor:    '#7C3AED',
            secondaryColor:  '#4F46E5',
            accentColor:     '#10B981',
            backgroundColor: '#F9FAFB',
            textColor:       '#111827'
        };
        const b = org.branding || {};
        const isOnOldDefaults =
            (b.primaryColor   || '').toUpperCase() === SCENESTAVE_DEFAULTS.primaryColor &&
            (b.secondaryColor || '').toUpperCase() === SCENESTAVE_DEFAULTS.secondaryColor;

        if (isOnOldDefaults) {
            // Also clear any stored button theme that still references the old purple
            // palette. applyButtonTheme() will then fall back to the new DEFAULT_BTN_THEME
            // on next load instead of restoring purple over our crimson branding.
            try {
                const storedTheme = localStorage.getItem('scenestave_button_theme');
                if (storedTheme) {
                    const parsed = JSON.parse(storedTheme);
                    const primaryBg = (parsed?.primary?.bg || '').toUpperCase();
                    // Only clear if the stored theme is still on the old purple — users
                    // who customized their button theme should keep their choice.
                    if (primaryBg === '#7C3AED' || primaryBg === SCENESTAVE_DEFAULTS.primaryColor.toUpperCase()) {
                        localStorage.removeItem('scenestave_button_theme');
                        console.log('OrganizationService: Cleared stale SceneStave button theme.');
                    }
                }
            } catch (e) {
                console.warn('OrganizationService: Could not check stored button theme:', e);
            }

            return {
                ...org,
                branding: { ...b, ...DEFAULT_BRANDING, logoUrl: b.logoUrl || DEFAULT_BRANDING.logoUrl },
                updatedAt: new Date().toISOString()
            };
        }
        return org;
    };

    const loadOrganization = () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) {
                // Fresh install — seed with Banquo defaults and mark version current.
                saveOrganization(DEFAULT_ORGANIZATION);
                try { localStorage.setItem(BRANDING_VERSION_KEY, BRANDING_VERSION); } catch (e) {}
                return { ...DEFAULT_ORGANIZATION };
            }

            let org = JSON.parse(data);

            // One-time migration: existing installs running SceneStave purple defaults
            // get retinted to Banquo crimson on next load.
            const currentVersion = localStorage.getItem(BRANDING_VERSION_KEY);
            if (currentVersion !== BRANDING_VERSION) {
                const migrated = migrateBrandingToBanquo(org);
                if (migrated !== org) {
                    saveOrganization(migrated);
                    console.log('OrganizationService: Migrated branding to Banquo palette.');
                    org = migrated;
                }
                try { localStorage.setItem(BRANDING_VERSION_KEY, BRANDING_VERSION); } catch (e) {}
            }

            return org;
        } catch (error) {
            console.error('OrganizationService: Error loading organization:', error);
            return { ...DEFAULT_ORGANIZATION };
        }
    };

    const saveOrganization = (org) => {
        try {
            org.updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
            return true;
        } catch (error) {
            console.error('OrganizationService: Error saving organization:', error);
            return false;
        }
    };

    const updateOrganization = (updates) => {
        const org = loadOrganization();
        const updated = { ...org, ...updates };
        return saveOrganization(updated) ? updated : org;
    };

    const addPhone = (phone) => {
        const org = loadOrganization();
        const newPhone = {
            id: `phone_${Date.now()}`,
            label: phone.label || 'Phone',
            number: phone.number || '',
            countryCode: phone.countryCode || '+1',
            isPrimary: phone.isPrimary || false
        };
        org.phones.push(newPhone);
        saveOrganization(org);
        return newPhone;
    };

    const updatePhone = (phoneId, updates) => {
        const org = loadOrganization();
        const index = org.phones.findIndex(p => p.id === phoneId);
        if (index >= 0) {
            org.phones[index] = { ...org.phones[index], ...updates };
            saveOrganization(org);
            return org.phones[index];
        }
        return null;
    };

    const removePhone = (phoneId) => {
        const org = loadOrganization();
        org.phones = org.phones.filter(p => p.id !== phoneId);
        saveOrganization(org);
        return true;
    };

    const addEmail = (email) => {
        const org = loadOrganization();
        const newEmail = {
            id: `email_${Date.now()}`,
            label: email.label || 'Email',
            address: email.address || '',
            isPrimary: email.isPrimary || false
        };
        org.emails.push(newEmail);
        saveOrganization(org);
        return newEmail;
    };

    const updateEmail = (emailId, updates) => {
        const org = loadOrganization();
        const index = org.emails.findIndex(e => e.id === emailId);
        if (index >= 0) {
            org.emails[index] = { ...org.emails[index], ...updates };
            saveOrganization(org);
            return org.emails[index];
        }
        return null;
    };

    const removeEmail = (emailId) => {
        const org = loadOrganization();
        org.emails = org.emails.filter(e => e.id !== emailId);
        saveOrganization(org);
        return true;
    };

    const addClientOrganization = (clientOrg) => {
        const org = loadOrganization();
        const newClient = {
            id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: clientOrg.name || 'Unnamed Organization',
            contactName: clientOrg.contactName || '',
            email: clientOrg.email || '',
            phone: clientOrg.phone || '',
            website: clientOrg.website || '',
            notes: clientOrg.notes || '',
            isActive: clientOrg.isActive !== undefined ? clientOrg.isActive : true,
            createdAt: new Date().toISOString()
        };
        if (!org.clientOrganizations) org.clientOrganizations = [];
        org.clientOrganizations.push(newClient);
        saveOrganization(org);

        // Auto-create Client Admin user if venue operator mode is on and email is provided
        if (org.managesClientOrgs && newClient.email && window.usersService) {
            try {
                const clientAdminUser = window.usersService.createClientAdminUser(newClient);
                newClient.adminUserId = clientAdminUser.id;
                saveOrganization(org);
                console.log('✅ Client Admin created for:', newClient.name);
            } catch (error) {
                console.error('OrganizationService: Error creating Client Admin:', error);
            }
        }

        return newClient;
    };

    const updateClientOrganization = (clientId, updates) => {
        const org = loadOrganization();
        const index = (org.clientOrganizations || []).findIndex(c => c.id === clientId);
        if (index >= 0) {
            org.clientOrganizations[index] = { ...org.clientOrganizations[index], ...updates, id: clientId };
            saveOrganization(org);
            return org.clientOrganizations[index];
        }
        return null;
    };

    const removeClientOrganization = (clientId) => {
        const org = loadOrganization();

        // Remove associated Client Admin user(s) before deleting the org
        if (window.usersService) {
            window.usersService.deleteClientAdminUser(clientId);
        }

        org.clientOrganizations = (org.clientOrganizations || []).filter(c => c.id !== clientId);
        saveOrganization(org);
        return org;
    };

    const toggleClientOrgManagement = (enabled) => {
        const org = loadOrganization();
        org.managesClientOrgs = enabled;
        saveOrganization(org);
        return org;
    };

    const resetBrandingToDefault = () => {
        const org = loadOrganization();
        // Save current theme if it differs from defaults
        const b = org.branding || {};
        const isCustom =
            b.primaryColor   !== DEFAULT_BRANDING.primaryColor  ||
            b.secondaryColor !== DEFAULT_BRANDING.secondaryColor ||
            b.accentColor    !== DEFAULT_BRANDING.accentColor    ||
            (b.logoUrl && !b.logoUrl.startsWith('data:image/svg+xml') === false &&
             b.logoUrl !== DEFAULT_BRANDING.logoUrl);
        if (isCustom) {
            org.savedCustomTheme = { ...b, savedAt: new Date().toISOString() };
        }
        org.branding = { ...DEFAULT_BRANDING };
        saveOrganization(org);
        applyBrandingToDOM(org.branding);
        return org;
    };

    const restoreSavedCustomTheme = () => {
        const org = loadOrganization();
        if (!org.savedCustomTheme) return null;
        const { savedAt, ...themeColors } = org.savedCustomTheme;
        org.branding = { ...themeColors };
        saveOrganization(org);
        applyBrandingToDOM(org.branding);
        // Re-apply button theme after branding so --color-primary stays in sync with button theme
        applyButtonTheme();
        return org;
    };

    const updateBranding = (branding) => {
        const org = loadOrganization();
        org.branding = { ...org.branding, ...branding };
        saveOrganization(org);
        applyBrandingToDOM(org.branding);
        return org.branding;
    };

    // ── Color utility functions ──────────────────────────────────────────────
    const hexToRgba = (hex, opacity) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
    };

    const darkenColor = (hex, percent) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const factor = 1 - percent / 100;
        const r = Math.max(0, Math.floor(parseInt(result[1], 16) * factor));
        const g = Math.max(0, Math.floor(parseInt(result[2], 16) * factor));
        const b = Math.max(0, Math.floor(parseInt(result[3], 16) * factor));
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    };

    const lightenColor = (hex, percent) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const factor = percent / 100;
        const r = Math.min(255, Math.floor(parseInt(result[1], 16) + (255 - parseInt(result[1], 16)) * factor));
        const g = Math.min(255, Math.floor(parseInt(result[2], 16) + (255 - parseInt(result[2], 16)) * factor));
        const b = Math.min(255, Math.floor(parseInt(result[3], 16) + (255 - parseInt(result[3], 16)) * factor));
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    };
    // ────────────────────────────────────────────────────────────────────────

    const applyBrandingToDOM = (branding) => {
        if (!branding) return;

        console.log('🎨 Applying branding to DOM:', branding);

        const root = document.documentElement;

        // ── Existing --brand-* variables (backwards compatibility) ──
        root.style.setProperty('--brand-primary',    branding.primaryColor);
        root.style.setProperty('--brand-secondary',  branding.secondaryColor);
        root.style.setProperty('--brand-accent',     branding.accentColor);
        root.style.setProperty('--brand-background', branding.backgroundColor);
        root.style.setProperty('--brand-text',       branding.textColor);

        // ── New --color-* theme system variables ──
        if (branding.primaryColor) {
            root.style.setProperty('--color-primary',         branding.primaryColor);
            root.style.setProperty('--color-primary-dark',    darkenColor(branding.primaryColor, 15));
            root.style.setProperty('--color-primary-light',   lightenColor(branding.primaryColor, 15));
            root.style.setProperty('--color-primary-surface', hexToRgba(branding.primaryColor, 0.15));
            root.style.setProperty('--color-sidebar-active-bg', branding.primaryColor);
        }
        if (branding.accentColor) {
            root.style.setProperty('--color-accent',         branding.accentColor);
            root.style.setProperty('--color-accent-dark',    darkenColor(branding.accentColor, 15));
            root.style.setProperty('--color-accent-surface', hexToRgba(branding.accentColor, 0.15));
        }
        if (branding.secondaryColor) {
            root.style.setProperty('--color-secondary', branding.secondaryColor);
        }

        console.log('✅ CSS variables set:', {
            primary:    getComputedStyle(root).getPropertyValue('--brand-primary').trim(),
            secondary:  getComputedStyle(root).getPropertyValue('--brand-secondary').trim(),
            accent:     getComputedStyle(root).getPropertyValue('--brand-accent').trim(),
            colorPrimary: getComputedStyle(root).getPropertyValue('--color-primary').trim(),
        });

        // Force-update elements that use the sidebar-gradient class directly
        // (CSS custom properties in linear-gradient need this nudge in some browsers)
        document.querySelectorAll('.sidebar-gradient').forEach(el => {
            el.style.background = `linear-gradient(to bottom, ${branding.primaryColor}, ${branding.secondaryColor})`;
        });
    };

    // ── Button theming ──────────────────────────────────────────────────────
    const BTN_THEME_KEY = 'scenestave_button_theme';

    // Banquo ghost-candle button theme — paired with DEFAULT_BRANDING.
    // applyButtonTheme() writes these to --color-primary / --color-primary-dark /
    // --btn-*-* variables, so any component that uses var(--color-primary) picks
    // up the crimson palette even if it renders before applyBrandingToDOM() runs.
    const DEFAULT_BTN_THEME = {
        primary:   { bg: '#7a1f24', hover: '#a6282f', active: '#611a1e', text: '#f4ede2', hoverText: '#f4ede2' },
        secondary: { bg: '#2f2a26', hover: '#4a443c', active: '#1c1413', text: '#f4ede2', hoverText: '#f4ede2', border: '#8e8778' },
        success:   { bg: '#6b8e4e', hover: '#557239', active: '#3f5629', text: '#f4ede2', hoverText: '#f4ede2' },
    };

    const applyButtonTheme = (overrideTheme) => {
        try {
            const theme = overrideTheme || (() => {
                try {
                    const stored = localStorage.getItem(BTN_THEME_KEY);
                    return stored ? JSON.parse(stored) : DEFAULT_BTN_THEME;
                } catch { return DEFAULT_BTN_THEME; }
            })();
            const r = document.documentElement.style;
            ['primary', 'secondary', 'success'].forEach(type => {
                const t = theme[type] || DEFAULT_BTN_THEME[type];
                r.setProperty(`--btn-${type}-bg`,         t.bg);
                r.setProperty(`--btn-${type}-hover-bg`,   t.hover);
                r.setProperty(`--btn-${type}-active-bg`,  t.active);
                r.setProperty(`--btn-${type}-text`,       t.text);
                r.setProperty(`--btn-${type}-hover-text`, t.hoverText || t.text);
            });
            // Primary bg also drives --color-primary so Tailwind remapping picks it up
            const pri = theme.primary || DEFAULT_BTN_THEME.primary;
            r.setProperty('--color-primary',      pri.bg);
            r.setProperty('--color-primary-dark', pri.hover);
            r.setProperty('--color-primary-text', pri.text);
            // Secondary border
            const sec = theme.secondary || DEFAULT_BTN_THEME.secondary;
            r.setProperty('--btn-secondary-border', sec.border || DEFAULT_BTN_THEME.secondary.border);
        } catch (e) {
            console.warn('applyButtonTheme error:', e);
        }
    };

    const saveButtonTheme = (theme) => {
        try {
            localStorage.setItem(BTN_THEME_KEY, JSON.stringify(theme));
            applyButtonTheme();
        } catch (e) {
            console.error('saveButtonTheme error:', e);
        }
    };

    const loadButtonTheme = () => {
        try {
            const stored = localStorage.getItem(BTN_THEME_KEY);
            return stored ? JSON.parse(stored) : { ...DEFAULT_BTN_THEME };
        } catch (e) {
            return { ...DEFAULT_BTN_THEME };
        }
    };
    // ────────────────────────────────────────────────────────────────────────

    // ── Theme mode ──────────────────────────────────────────────────────────
    const THEME_KEY = 'scenestave_theme_mode';

    const saveThemeMode = (mode) => {
        try {
            localStorage.setItem(THEME_KEY, mode);
            document.documentElement.setAttribute('data-theme', mode);
        } catch (e) {
            console.error('OrganizationService: Error saving theme mode:', e);
        }
    };

    const loadThemeMode = () => {
        try {
            return localStorage.getItem(THEME_KEY) || 'dark';
        } catch (e) {
            return 'dark';
        }
    };

    const applyThemeMode = () => {
        const mode = loadThemeMode();
        document.documentElement.setAttribute('data-theme', mode);
        return mode;
    };
    // ────────────────────────────────────────────────────────────────────────

    return {
        loadOrganization,
        saveOrganization,
        updateOrganization,
        addPhone,
        updatePhone,
        removePhone,
        addEmail,
        updateEmail,
        removeEmail,
        updateBranding,
        resetBrandingToDefault,
        restoreSavedCustomTheme,
        applyBrandingToDOM,
        addClientOrganization,
        updateClientOrganization,
        removeClientOrganization,
        toggleClientOrgManagement,
        saveThemeMode,
        loadThemeMode,
        applyThemeMode,
        applyButtonTheme,
        saveButtonTheme,
        loadButtonTheme,
        DEFAULT_BTN_THEME,
        DEFAULT_ORGANIZATION,
        DEFAULT_BRANDING,
        SHOWSUITE_LOGO_SVG
    };
})();

window.organizationService = OrganizationService;
