/**
 * DonationModal Component
 * 
 * Modal dialog for adding and editing donations on existing donor contacts.
 * 
 * PropTypes:
 * @param {boolean} isOpen - Whether the modal is open
 * @param {string} mode - 'add' | 'edit'
 * @param {Object} contact - Contact object
 * @param {Object} donation - Donation object (for edit mode, null for add mode)
 * @param {Function} onClose - Close modal callback
 * @param {Function} onSave - Save success callback
 */

(function(global) {
    'use strict';

    const { React } = global;
    const { useState, useEffect } = React;

    // Helper function to create empty donation
    const createEmptyDonation = () => ({
        // UI fields (will be normalized before saving)
        type: 'monetary', // maps to donationType
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'Cash',
        transactionNumber: '',
        recurringType: 'One-Time', // canonical value expected by service
        inKindDescription: '',
        inKindCategory: '',
        estimatedValue: '',
        campaignType: 'general',
        campaignId: '',
        campaignName: 'General Operating Fund', // required for non-production types
        fund: 'General Operating Fund',
        taxDeductible: true,
        acknowledgmentSent: false,
        acknowledgmentDate: '',
        acknowledgmentMethod: '',
        notes: ''
    });

    // Validation function
    const validateDonation = (data) => {
        const errors = {};
        
        if (data.type === 'monetary') {
            if (!data.amount || parseFloat(data.amount) <= 0) {
                errors.amount = 'Amount must be greater than 0';
            }
        } else {
            if (!data.inKindDescription || data.inKindDescription.trim().length < 5) {
                errors.inKindDescription = 'Description must be at least 5 characters';
            }
            if (!data.estimatedValue || parseFloat(data.estimatedValue) <= 0) {
                errors.estimatedValue = 'Estimated value must be greater than 0';
            }
            if (!data.inKindCategory) {
                errors.inKindCategory = 'Category is required';
            }
        }
        
        if (!data.date) {
            errors.date = 'Date is required';
        } else {
            const donationDate = new Date(data.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (donationDate > today) {
                errors.date = 'Date cannot be in the future';
            }
        }
        
        if (data.acknowledgmentSent) {
            if (!data.acknowledgmentDate) {
                errors.acknowledgmentDate = 'Acknowledgment date required when marked as sent';
            }
            if (!data.acknowledgmentMethod) {
                errors.acknowledgmentMethod = 'Acknowledgment method required when marked as sent';
            }
        }
        
        return errors;
    };

    const DonationModal = ({ 
        isOpen,
        mode = 'add',
        contact,
        donation,
        onClose,
        onSave
    }) => {
        const [formData, setFormData] = useState(donation || createEmptyDonation());
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [validationErrors, setValidationErrors] = useState({});
        const [productions, setProductions] = useState([]);
        const [campaigns, setCampaigns] = useState([]);

        // Load dropdown data when modal opens
        useEffect(() => {
            if (isOpen) {
                // Load productions if ProductionsService exists
                if (window.ProductionsService) {
                    try {
                        const allProductions = window.ProductionsService.loadProductions();
                        setProductions(allProductions.filter(p => p.active !== false));
                    } catch (error) {
                        console.error('Error loading productions:', error);
                        setProductions([]);
                    }
                }
                
                // Load campaigns if CampaignsService exists
                if (window.CampaignsService) {
                    try {
                        const svc = window.CampaignsService;
                        const allCampaigns = typeof svc.getAllCampaigns === 'function'
                            ? svc.getAllCampaigns()
                            : (typeof svc.loadCampaigns === 'function' ? svc.loadCampaigns() : []);
                        setCampaigns((allCampaigns || []).filter(c => c.active !== false));
                    } catch (error) {
                        console.error('Error loading campaigns:', error);
                        setCampaigns([]);
                    }
                }
                
                // Reset form data when opening
                setFormData(donation || createEmptyDonation());
                setValidationErrors({});
            }
        }, [isOpen, donation]);

        // Prevent body scroll when modal is open
        useEffect(() => {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            
            return () => {
                document.body.style.overflow = '';
            };
        }, [isOpen]);

        // Handle Escape key press
        useEffect(() => {
            const handleEscape = (e) => {
                if (e.key === 'Escape' && isOpen && !isSubmitting) {
                    onClose();
                }
            };
            
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }, [isOpen, isSubmitting, onClose]);

        const handleSave = () => {
            // Validate
            const errors = validateDonation(formData);
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                alert('Please fix validation errors before saving.');
                return;
            }
            
            setIsSubmitting(true);

            // Build normalized object first so we can log it if needed
                // Normalize formData to service contract
                const normalized = (() => {
                    const normalizeRecurring = (v) => {
                        if (!v) return null;
                        const s = String(v).toLowerCase().replace(/[^a-z]/g, '');
                        if (s === 'onetime') return 'One-Time';
                        if (s === 'monthly') return 'Monthly';
                        if (s === 'quarterly') return 'Quarterly';
                        if (s === 'annual' || s === 'annually') return 'Annual';
                        // If already canonical values, keep
                        if (v === 'One-Time' || v === 'Monthly' || v === 'Quarterly' || v === 'Annual') return v;
                        return null; // anything else becomes null (optional field)
                    };
                    const mapPayment = {
                        'check': 'Check', 'cash': 'Cash', 'credit-card': 'Credit Card', 'wire-transfer': 'Wire Transfer', 'online-platform': 'Online Platform'
                    };
                    const mapAck = { 'email': 'Email', 'letter': 'Letter', 'phone': 'Phone Call' };
                    const mapInKindCat = { 'equipment': 'Equipment', 'services': 'Services', 'materials': 'Materials', 'other': 'Other' };
                    const mapCampaignType = { 'campaign': 'custom' };

                    const recurringType = normalizeRecurring(formData.recurringType);
                    const paymentMethodRaw = formData.paymentMethod;
                    const paymentMethod = mapPayment[paymentMethodRaw] || paymentMethodRaw;
                    const ackRaw = formData.acknowledgmentMethod;
                    const acknowledgmentMethod = mapAck[ackRaw] || ackRaw;
                    const inKindCatRaw = formData.inKindCategory;
                    const inKindCategory = mapInKindCat[inKindCatRaw] || inKindCatRaw;
                    const campaignTypeRaw = formData.campaignType;
                    const campaignType = mapCampaignType[campaignTypeRaw] || campaignTypeRaw;

                    // Derive campaignName when custom selected and campaignId chosen
                    let campaignName = null;
                    if (campaignType && campaignType !== 'production') {
                        if (campaignType === 'general') {
                            campaignName = 'General Operating Fund';
                        } else if (campaignType === 'custom') {
                            const match = (campaigns || []).find(c => c.id === formData.campaignId);
                            campaignName = match ? match.name : (formData.campaignName || null);
                        } else if (campaignType === 'building') {
                            campaignName = 'Building Renovation Fund';
                        } else if (campaignType === 'scholarship') {
                            campaignName = 'Scholarship Fund';
                        }
                    }

                    return {
                        donationType: formData.type === 'in-kind' ? 'in-kind' : 'monetary',
                        contactId: contact.id,
                        amount: formData.type === 'monetary' ? parseFloat(formData.amount || '0') : null,
                        date: formData.date,
                        recurringType: recurringType || null,
                        campaignType: campaignType || null,
                        campaignId: campaignType === 'production' ? (formData.campaignId || null) : null,
                        campaignName,
                        paymentMethod: paymentMethod || null,
                        transactionNumber: formData.transactionNumber || null,
                        taxDeductible: formData.type === 'monetary' ? !!formData.taxDeductible : null,
                        inKindDescription: formData.type === 'in-kind' ? formData.inKindDescription : null,
                        inKindCategory: formData.type === 'in-kind' ? (inKindCategory || null) : null,
                        estimatedValue: formData.type === 'in-kind' ? parseFloat(formData.estimatedValue || '0') : null,
                        acknowledgmentSent: !!formData.acknowledgmentSent,
                        acknowledgmentDate: formData.acknowledgmentSent ? (formData.acknowledgmentDate || null) : null,
                        acknowledgmentMethod: formData.acknowledgmentSent ? (acknowledgmentMethod || null) : null,
                        notes: formData.notes || null,
                        addedBy: 'ui'
                    };
                })();
            try {
                console.debug('[DonationModal] Normalized donation payload:', normalized);
                // Persist donation
                if (mode === 'add') {
                    if (window.DonationsService) {
                        window.DonationsService.addDonation(normalized);
                    }
                } else if (window.DonationsService && donation) {
                    window.DonationsService.updateDonation(donation.id, normalized);
                }

                // Post-save side effects should not block saving UX
                try {
                    if (window.DonorCalculationService) {
                        window.DonorCalculationService.updateDonorProfile(contact.id);
                    }
                } catch (sideEffectErr) {
                    console.warn('Post-save donor recalculation failed:', sideEffectErr);
                }

                try {
                    if (onSave) onSave();
                } catch (cbErr) {
                    console.warn('onSave callback threw:', cbErr);
                }
                onClose();
            } catch (error) {
                console.error('Error saving donation:', error);
                alert(`Failed to save donation: ${error && error.message ? error.message : error}`);
            } finally {
                setIsSubmitting(false);
            }
        };

        const handleDelete = () => {
            const confirmed = confirm(
                'Are you sure you want to delete this donation? This action cannot be undone.'
            );
            
            if (!confirmed) return;
            
            setIsSubmitting(true);
            
            try {
                if (window.DonationsService && donation) {
                    window.DonationsService.deleteDonation(donation.id);
                }
                
                if (window.DonorCalculationService) {
                    window.DonorCalculationService.updateDonorProfile(contact.id);
                }
                
                if (onSave) {
                    onSave();
                }
                
                onClose();
                
            } catch (error) {
                console.error('Error deleting donation:', error);
                alert('Failed to delete donation. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        };

        if (!isOpen) return null;

        return React.createElement('div', {
            className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
            style: { backdropFilter: 'blur(4px)' },
            onClick: onClose
        },
            React.createElement('div', {
                className: 'bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl',
                onClick: (e) => e.stopPropagation()
            },
                // Header
                React.createElement('div', {
                    className: 'flex justify-between items-center p-6 border-b border-gray-700'
                },
                    React.createElement('h2', {
                        className: 'text-xl font-bold text-white'
                    }, `${mode === 'add' ? 'Add Donation for' : 'Edit Donation for'} ${contact.firstName} ${contact.lastName}`),
                    
                    React.createElement('button', {
                        onClick: onClose,
                        className: 'text-gray-400 hover:text-gray-200 text-2xl leading-none',
                        type: 'button',
                        disabled: isSubmitting
                    }, '✕')
                ),
                
                // Body - Scrollable
                React.createElement('div', {
                    className: 'flex-1 overflow-y-auto p-6'
                },
                    // Validation errors display
                    Object.keys(validationErrors).length > 0 && React.createElement('div', {
                        className: 'bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4'
                    },
                        React.createElement('p', { className: 'font-bold' }, 'Please fix the following errors:'),
                        React.createElement('ul', { className: 'list-disc list-inside mt-2' },
                            Object.entries(validationErrors).map(([field, error]) =>
                                React.createElement('li', { key: field }, error)
                            )
                        )
                    ),
                    
                    // Reuse DonationEntryForm
                    window.DonationEntryForm && React.createElement(window.DonationEntryForm, {
                        index: 1,
                        value: formData,
                        onChange: (updatedData) => {
                            setFormData(updatedData);
                            setValidationErrors({});
                        },
                        onRemove: null,
                        productions: productions,
                        campaigns: campaigns
                    })
                ),
                
                // Footer
                React.createElement('div', {
                    className: 'flex justify-between items-center gap-3 p-6 border-t border-gray-700'
                },
                    // Delete button (only in edit mode)
                    mode === 'edit' ? React.createElement('button', {
                        onClick: handleDelete,
                        className: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed',
                        type: 'button',
                        disabled: isSubmitting
                    }, 'Delete Donation') : React.createElement('div'),
                    
                    // Right side buttons
                    React.createElement('div', {
                        className: 'flex gap-3'
                    },
                        React.createElement('button', {
                            onClick: onClose,
                            className: 'bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed',
                            type: 'button',
                            disabled: isSubmitting
                        }, 'Cancel'),
                        
                        React.createElement('button', {
                            onClick: handleSave,
                            className: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed',
                            type: 'button',
                            disabled: isSubmitting
                        }, isSubmitting ? 'Saving...' : mode === 'add' ? 'Add Donation' : 'Save Changes')
                    )
                )
            )
        );
    };

    // Export to global scope
    global.DonationModal = DonationModal;

})(window);
