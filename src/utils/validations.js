/**
 * Validation Utilities for Donor and Donation Forms
 * 
 * Provides comprehensive validation functions for all donor-related forms in SceneStave.
 * 
 * @module validations
 */

(function(global) {
    'use strict';

    /**
     * Validates email format
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    const isValidEmail = (email) => {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    /**
     * Validates phone number (flexible format)
     * Accepts various formats and validates digit count
     * @param {string} phone - Phone number to validate
     * @returns {boolean} True if valid phone format
     */
    const isValidPhone = (phone) => {
        if (!phone) return false;
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        // Must be 10 or 11 digits (with optional country code)
        return digits.length >= 10 && digits.length <= 11;
    };

    /**
     * Validates US ZIP code
     * Supports both 5-digit and 9-digit (ZIP+4) formats
     * @param {string} zip - ZIP code to validate
     * @returns {boolean} True if valid ZIP code
     */
    const isValidZipCode = (zip) => {
        if (!zip) return false;
        // Supports both 5-digit and 9-digit formats
        const zipRegex = /^\d{5}(-\d{4})?$/;
        return zipRegex.test(zip);
    };

    /**
     * Checks if email already exists in contacts
     * @param {string} email - Email to check
     * @param {string} excludeId - Optional contact ID to exclude from check (for edits)
     * @returns {boolean} True if email exists
     */
    const emailExists = (email, excludeId = null) => {
        if (!window.ContactsService) return false;
        const contacts = window.ContactsService.loadContacts();
        return contacts.some(c => 
            c.id !== excludeId &&
            c.email && 
            c.email.toLowerCase() === email.toLowerCase()
        );
    };

    /**
     * Validates currency amount string or number
     * @param {string|number} value - Currency value to validate
     * @returns {boolean} True if valid currency
     */
    const isValidCurrency = (value) => {
        if (typeof value === 'number') return value >= 0;
        if (typeof value !== 'string') return false;
        
        // Remove currency symbols and commas
        const cleaned = value.replace(/[$,]/g, '');
        const num = parseFloat(cleaned);
        
        return !isNaN(num) && num >= 0;
    };

    /**
     * Validates date string
     * @param {string} dateString - Date string to validate
     * @returns {boolean} True if valid date
     */
    const isValidDate = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    };

    /**
     * Validates contact data
     * @param {Object} contactData - Contact object to validate
     * @param {Object} options - Validation options
     * @param {boolean} options.isNew - Whether this is a new contact
     * @param {boolean} options.requireEmail - Whether email is required
     * @param {string} options.excludeId - Contact ID to exclude from duplicate checks
     * @returns {Object} { isValid: boolean, errors: {} }
     */
    const validateContact = (contactData, options = {}) => {
        const errors = {};
        
        // First name validation
        if (!contactData.firstName || contactData.firstName.trim().length < 1) {
            errors.firstName = 'First name is required';
        } else if (contactData.firstName.trim().length < 2) {
            errors.firstName = 'First name must be at least 2 characters';
        } else if (contactData.firstName.length > 100) {
            errors.firstName = 'First name must be less than 100 characters';
        }
        
        // Last name validation
        if (!contactData.lastName || contactData.lastName.trim().length < 1) {
            errors.lastName = 'Last name is required';
        } else if (contactData.lastName.trim().length < 2) {
            errors.lastName = 'Last name must be at least 2 characters';
        } else if (contactData.lastName.length > 100) {
            errors.lastName = 'Last name must be less than 100 characters';
        }
        
        // Email validation
        if (options.requireEmail || contactData.email) {
            if (!contactData.email) {
                errors.email = 'Email is required';
            } else if (!isValidEmail(contactData.email)) {
                errors.email = 'Invalid email format';
            } else if (emailExists(contactData.email, options.excludeId || contactData.id)) {
                errors.email = 'Email already exists';
            }
        }
        
        // Phone validation (optional but validate format if provided)
        if (contactData.phone && contactData.phone.trim() !== '') {
            if (!isValidPhone(contactData.phone)) {
                errors.phone = 'Invalid phone format (must be 10-11 digits)';
            }
        }
        
        // Organization validation
        if (contactData.organization && contactData.organization.length > 200) {
            errors.organization = 'Organization name must be less than 200 characters';
        }
        
        // Address validation
        if (contactData.address) {
            if (typeof contactData.address === 'string') {
                if (contactData.address.length > 500) {
                    errors.address = 'Address must be less than 500 characters';
                }
            } else if (typeof contactData.address === 'object') {
                if (contactData.address.zip && !isValidZipCode(contactData.address.zip)) {
                    errors.zip = 'Invalid ZIP code (must be 5 or 9 digits)';
                }
                if (contactData.address.state && contactData.address.state.length !== 2) {
                    errors.state = 'State must be 2-letter abbreviation';
                }
            }
        }
        
        // Notes validation
        if (contactData.notes && contactData.notes.length > 2000) {
            errors.notes = 'Notes must be less than 2000 characters';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    /**
     * Validates donation data
     * @param {Object} donationData - Donation object to validate
     * @returns {Object} { isValid: boolean, errors: {} }
     */
    const validateDonation = (donationData) => {
        const errors = {};
        
        // Type validation
        if (!donationData.type && !donationData.donationType) {
            errors.type = 'Donation type is required';
            return { isValid: false, errors };
        }
        
        const type = donationData.type || donationData.donationType;
        
        if (type === 'monetary') {
            // Amount validation
            if (!donationData.amount && donationData.amount !== 0) {
                errors.amount = 'Amount is required';
            } else {
                const amount = parseFloat(donationData.amount);
                if (isNaN(amount) || amount <= 0) {
                    errors.amount = 'Amount must be a positive number';
                } else if (amount > 1000000) {
                    errors.amount = 'Amount cannot exceed $1,000,000';
                } else if (amount < 0.01) {
                    errors.amount = 'Amount must be at least $0.01';
                }
            }
            
            // Payment method validation
            if (!donationData.paymentMethod || donationData.paymentMethod.trim() === '') {
                errors.paymentMethod = 'Payment method is required';
            }
            
        } else if (type === 'in-kind') {
            // Description validation
            if (!donationData.inKindDescription || donationData.inKindDescription.trim().length < 5) {
                errors.inKindDescription = 'Description must be at least 5 characters';
            } else if (donationData.inKindDescription.length > 500) {
                errors.inKindDescription = 'Description must be less than 500 characters';
            }
            
            // Category validation
            if (!donationData.inKindCategory || donationData.inKindCategory.trim() === '') {
                errors.inKindCategory = 'Category is required';
            }
            
            // Estimated value validation
            if (!donationData.estimatedValue && donationData.estimatedValue !== 0) {
                errors.estimatedValue = 'Estimated value is required';
            } else {
                const value = parseFloat(donationData.estimatedValue);
                if (isNaN(value) || value <= 0) {
                    errors.estimatedValue = 'Estimated value must be a positive number';
                } else if (value > 1000000) {
                    errors.estimatedValue = 'Estimated value cannot exceed $1,000,000';
                }
            }
        }
        
        // Date validation (common to both types)
        if (!donationData.date) {
            errors.date = 'Date is required';
        } else {
            const donationDate = new Date(donationData.date);
            
            if (!isValidDate(donationData.date)) {
                errors.date = 'Invalid date format';
            } else {
                const today = new Date();
                today.setHours(23, 59, 59, 999); // End of today
                
                if (donationDate > today) {
                    errors.date = 'Date cannot be in the future';
                }
                
                const minDate = new Date('1900-01-01');
                if (donationDate < minDate) {
                    errors.date = 'Date cannot be before 1900';
                }
            }
        }
        
        // Campaign validation
        if (donationData.campaignType === 'production' && !donationData.campaignId) {
            errors.campaignId = 'Please select a production';
        }
        if (donationData.campaignType === 'custom') {
            if (!donationData.campaignName || donationData.campaignName.trim() === '') {
                errors.campaignName = 'Please enter campaign name';
            } else if (donationData.campaignName.length > 200) {
                errors.campaignName = 'Campaign name must be less than 200 characters';
            }
        }
        
        // Acknowledgment validation
        if (donationData.acknowledgmentSent) {
            if (!donationData.acknowledgmentDate) {
                errors.acknowledgmentDate = 'Acknowledgment date is required when marked as sent';
            } else if (!isValidDate(donationData.acknowledgmentDate)) {
                errors.acknowledgmentDate = 'Invalid acknowledgment date';
            }
            
            if (!donationData.acknowledgmentMethod || donationData.acknowledgmentMethod.trim() === '') {
                errors.acknowledgmentMethod = 'Acknowledgment method is required when marked as sent';
            }
            
            // Acknowledgment date can't be before donation date
            if (donationData.acknowledgmentDate && donationData.date) {
                const ackDate = new Date(donationData.acknowledgmentDate);
                const donDate = new Date(donationData.date);
                if (ackDate < donDate) {
                    errors.acknowledgmentDate = 'Acknowledgment date cannot be before donation date';
                }
            }
        }
        
        // Notes validation
        if (donationData.notes && donationData.notes.length > 1000) {
            errors.notes = 'Notes must be less than 1000 characters';
        }
        
        // Transaction number validation (if provided)
        if (donationData.transactionNumber && donationData.transactionNumber.length > 100) {
            errors.transactionNumber = 'Transaction number must be less than 100 characters';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    /**
     * Validates multiple donations at once
     * @param {Array} donations - Array of donation objects
     * @returns {Object} { isValid: boolean, errors: Array }
     */
    const validateDonations = (donations) => {
        const errors = [];
        
        if (!Array.isArray(donations)) {
            return {
                isValid: false,
                errors: [{ general: 'Donations must be an array' }]
            };
        }
        
        donations.forEach((donation, index) => {
            const validation = validateDonation(donation);
            if (!validation.isValid) {
                errors.push({
                    index,
                    donationId: donation.tempId || donation.id,
                    errors: validation.errors
                });
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    };

    /**
     * Sanitizes contact data before saving
     * Trims whitespace, normalizes formats
     * @param {Object} contactData - Contact object to sanitize
     * @returns {Object} Sanitized contact data
     */
    const sanitizeContact = (contactData) => {
        const sanitized = {
            ...contactData,
            firstName: contactData.firstName?.trim(),
            lastName: contactData.lastName?.trim(),
            email: contactData.email?.trim().toLowerCase(),
            phone: sanitizePhone(contactData.phone),
            organization: contactData.organization?.trim(),
            notes: contactData.notes?.trim()
        };
        
        // Sanitize address if it's an object
        if (contactData.address && typeof contactData.address === 'object') {
            sanitized.address = {
                street: contactData.address.street?.trim(),
                city: contactData.address.city?.trim(),
                state: contactData.address.state?.trim().toUpperCase(),
                zip: contactData.address.zip?.trim()
            };
        } else if (typeof contactData.address === 'string') {
            sanitized.address = contactData.address.trim();
        }
        
        return sanitized;
    };

    /**
     * Normalizes phone number to consistent format
     * Formats as (XXX) XXX-XXXX or +1 (XXX) XXX-XXXX
     * @param {string} phone - Phone number to sanitize
     * @returns {string} Formatted phone number
     */
    const sanitizePhone = (phone) => {
        if (!phone) return '';
        
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        
        return phone; // Return original if can't format
    };

    /**
     * Parses currency string to number
     * Removes currency symbols, commas, and spaces
     * @param {string|number} value - Currency value to parse
     * @returns {number} Parsed numeric value
     */
    const parseCurrency = (value) => {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        
        // Remove currency symbols, commas, and spaces
        const cleaned = value.toString().replace(/[$,\s]/g, '');
        return parseFloat(cleaned) || 0;
    };

    /**
     * Sanitizes donation data before saving
     * @param {Object} donationData - Donation object to sanitize
     * @returns {Object} Sanitized donation data
     */
    const sanitizeDonation = (donationData) => {
        const sanitized = { ...donationData };
        
        // Trim string fields
        if (sanitized.inKindDescription) {
            sanitized.inKindDescription = sanitized.inKindDescription.trim();
        }
        if (sanitized.inKindCategory) {
            sanitized.inKindCategory = sanitized.inKindCategory.trim();
        }
        if (sanitized.paymentMethod) {
            sanitized.paymentMethod = sanitized.paymentMethod.trim();
        }
        if (sanitized.transactionNumber) {
            sanitized.transactionNumber = sanitized.transactionNumber.trim();
        }
        if (sanitized.campaignName) {
            sanitized.campaignName = sanitized.campaignName.trim();
        }
        if (sanitized.notes) {
            sanitized.notes = sanitized.notes.trim();
        }
        if (sanitized.acknowledgmentMethod) {
            sanitized.acknowledgmentMethod = sanitized.acknowledgmentMethod.trim();
        }
        
        // Parse numeric fields
        if (sanitized.amount) {
            sanitized.amount = parseCurrency(sanitized.amount);
        }
        if (sanitized.estimatedValue) {
            sanitized.estimatedValue = parseCurrency(sanitized.estimatedValue);
        }
        
        return sanitized;
    };

    /**
     * Formats error object for display
     * @param {Object} errors - Error object from validation
     * @returns {string} Formatted error message
     */
    const formatErrorMessages = (errors) => {
        if (!errors || Object.keys(errors).length === 0) {
            return '';
        }
        
        return Object.entries(errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n');
    };

    /**
     * Validates donor level data
     * @param {Object} levelData - Donor level object
     * @returns {Object} { isValid: boolean, errors: {} }
     */
    const validateDonorLevel = (levelData) => {
        const errors = {};
        
        if (!levelData.name || levelData.name.trim() === '') {
            errors.name = 'Level name is required';
        } else if (levelData.name.length > 100) {
            errors.name = 'Level name must be less than 100 characters';
        }
        
        if (levelData.minAmount === undefined || levelData.minAmount === null) {
            errors.minAmount = 'Minimum amount is required';
        } else if (isNaN(levelData.minAmount) || levelData.minAmount < 0) {
            errors.minAmount = 'Minimum amount must be a positive number';
        }
        
        if (levelData.color && !/^#[0-9A-F]{6}$/i.test(levelData.color)) {
            errors.color = 'Color must be a valid hex code (e.g., #FF5733)';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    // Create service object
    const ValidationService = {
        // Validation functions
        validateContact,
        validateDonation,
        validateDonations,
        validateDonorLevel,
        
        // Helper validators
        isValidEmail,
        isValidPhone,
        isValidZipCode,
        isValidCurrency,
        isValidDate,
        emailExists,
        
        // Sanitization functions
        sanitizeContact,
        sanitizeDonation,
        sanitizePhone,
        parseCurrency,
        
        // Utility functions
        formatErrorMessages
    };

    // Export to global scope
    global.ValidationService = ValidationService;

})(window);
