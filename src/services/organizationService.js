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

    const DEFAULT_BRANDING = {
        logoUrl:         SHOWSUITE_LOGO_SVG,
        primaryColor:    '#7C3AED',
        secondaryColor:  '#4F46E5',
        accentColor:     '#10B981',
        backgroundColor: '#F9FAFB',
        textColor:       '#111827'
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

    const loadOrganization = () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) {
                saveOrganization(DEFAULT_ORGANIZATION);
                return { ...DEFAULT_ORGANIZATION };
            }
            return JSON.parse(data);
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
        return org;
    };

    const updateBranding = (branding) => {
        const org = loadOrganization();
        org.branding = { ...org.branding, ...branding };
        saveOrganization(org);
        applyBrandingToDOM(org.branding);
        return org.branding;
    };

    const applyBrandingToDOM = (branding) => {
        if (!branding) return;

        console.log('🎨 Applying branding to DOM:', branding);

        const root = document.documentElement;
        root.style.setProperty('--brand-primary',    branding.primaryColor);
        root.style.setProperty('--brand-secondary',  branding.secondaryColor);
        root.style.setProperty('--brand-accent',     branding.accentColor);
        root.style.setProperty('--brand-background', branding.backgroundColor);
        root.style.setProperty('--brand-text',       branding.textColor);

        console.log('✅ CSS variables set:', {
            primary:    getComputedStyle(root).getPropertyValue('--brand-primary').trim(),
            secondary:  getComputedStyle(root).getPropertyValue('--brand-secondary').trim(),
            accent:     getComputedStyle(root).getPropertyValue('--brand-accent').trim()
        });

        // Force-update elements that use the sidebar-gradient class directly
        // (CSS custom properties in linear-gradient need this nudge in some browsers)
        document.querySelectorAll('.sidebar-gradient').forEach(el => {
            el.style.background = `linear-gradient(to bottom, ${branding.primaryColor}, ${branding.secondaryColor})`;
        });
    };

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
        DEFAULT_ORGANIZATION,
        DEFAULT_BRANDING,
        SHOWSUITE_LOGO_SVG
    };
})();

window.organizationService = OrganizationService;
