/**
 * DonationHistoryItem Component
 * 
 * Displays a single donation record with expandable details.
 * 
 * PropTypes:
 * @param {Object} donation - The donation object
 * @param {string} donation.id - Unique donation ID
 * @param {string} donation.date - Donation date (ISO format)
 * @param {string} donation.type - 'monetary' or 'in-kind'
 * @param {number} donation.amount - Monetary donation amount
 * @param {number} donation.estimatedValue - In-kind estimated value
 * @param {string} donation.paymentMethod - Payment method for monetary
 * @param {string} donation.transactionNumber - Optional transaction ID
 * @param {string} donation.recurringType - 'one-time' | 'monthly' | 'quarterly' | 'annually'
 * @param {string} donation.inKindDescription - Description for in-kind
 * @param {string} donation.inKindCategory - Category for in-kind
 * @param {string} donation.campaignType - 'production' | 'general' | 'custom'
 * @param {string} donation.campaignId - Production ID if production campaign
 * @param {string} donation.campaignName - Custom campaign name
 * @param {boolean} donation.taxDeductible - Tax deductible status
 * @param {boolean} donation.acknowledgmentSent - Acknowledgment sent status
 * @param {string} donation.acknowledgmentMethod - How acknowledgment was sent
 * @param {string} donation.acknowledgmentDate - When acknowledgment was sent
 * @param {string} donation.notes - Optional notes
 * @param {string} donation.createdAt - When donation was recorded
 * @param {boolean} isExpanded - Whether the item is expanded
 * @param {Function} onToggle - Toggle expand/collapse
 * @param {Function} onEdit - Edit donation callback
 * @param {Function} onDelete - Delete donation callback
 * @param {Function} onUpdate - Update donation callback (for acknowledgment)
 */

(function(global) {
    'use strict';

    const { React } = global;
    const { useState } = React;

    // Helper function to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    // Helper function to format date (treats YYYY-MM-DD as UTC to avoid TZ shift)
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [y, m, d] = dateString.split('-').map(Number);
            const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            });
        }
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper function to get campaign name
    const getCampaignName = (donation) => {
        if (donation.campaignType === 'production') {
            // Try to get production name from ProductionsService
            if (window.ProductionsService) {
                const productions = window.ProductionsService.loadProductions();
                const prod = productions.find(p => p.id === donation.campaignId);
                return prod ? (prod.showName || prod.title || 'Production') : 'Unknown Production';
            }
            return 'Production Campaign';
        } else if (donation.campaignType === 'general') {
            return 'General Operating Fund';
        } else {
            return donation.campaignName || 'Custom Campaign';
        }
    };

    // Helper function to get recurring type label
    const getRecurringLabel = (recurringType) => {
        const map = {
            'one-time': 'One-Time',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'annually': 'Annual',
            'One-Time': 'One-Time',
            'Monthly': 'Monthly',
            'Quarterly': 'Quarterly',
            'Annual': 'Annual'
        };
        return map[recurringType] || 'One-Time';
    };

    // DetailRow component
    const DetailRow = ({ label, value, className = '' }) => (
        React.createElement('div', { className: `flex mb-2 ${className}` },
            React.createElement('span', { 
                className: 'text-sm font-medium text-gray-400 w-32' 
            }, `${label}:`),
            React.createElement('span', { 
                className: 'text-sm text-gray-200' 
            }, value)
        )
    );

    // Main component
    const DonationHistoryItem = ({
        donation,
        isExpanded,
        onToggle,
        onEdit,
        onDelete,
        onUpdate
    }) => {
        const [isMarkingAcknowledged, setIsMarkingAcknowledged] = useState(false);

        const handleMarkAcknowledged = (e) => {
            e.stopPropagation();
            
            const acknowledged = confirm('Mark this donation as acknowledged via Email?');
            if (acknowledged && onUpdate) {
                setIsMarkingAcknowledged(true);
                
                const updatedDonation = {
                    ...donation,
                    acknowledgmentSent: true,
                    acknowledgmentDate: new Date().toISOString().split('T')[0],
                    acknowledgmentMethod: 'Email'
                };

                // Update via service if available
                if (window.DonationsService) {
                    window.DonationsService.updateDonation(donation.id, updatedDonation);
                }

                // Call parent callback
                onUpdate(updatedDonation);
                
                setIsMarkingAcknowledged(false);
            }
        };

        const handleEdit = (e) => {
            e.stopPropagation();
            if (onEdit) onEdit();
        };

        const handleDelete = (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this donation? This action cannot be undone.')) {
                if (onDelete) onDelete();
            }
        };

        const isMoney = (donation.donationType || donation.type) === 'monetary';
        const amount = isMoney ? donation.amount : donation.estimatedValue;
        const campaignName = getCampaignName(donation);

        return React.createElement('div', {
            className: `border ${isExpanded ? 'border-gray-600 bg-gray-750' : 'border-gray-700'} rounded-lg p-3 mb-2 transition-colors duration-200`
        },
            // Header (always visible)
            React.createElement('div', {
                className: 'flex items-center justify-between cursor-pointer gap-3',
                onClick: onToggle
            },
                React.createElement('div', { className: 'flex items-center gap-3 flex-1 min-w-0' },
                    // Date
                    React.createElement('span', {
                        className: 'text-sm text-gray-400 w-24 flex-shrink-0'
                    }, formatDate(donation.date)),
                    
                    // Type badge
                    React.createElement('span', {
                        className: `text-xs px-2 py-1 rounded flex-shrink-0 ${
                            isMoney 
                                ? 'bg-green-900 text-green-200' 
                                : 'bg-purple-900 text-purple-200'
                        }`
                    }, isMoney ? '💰 Monetary' : '💝 In-Kind'),
                    
                    // Amount
                    React.createElement('span', {
                        className: 'font-semibold text-base text-white flex-shrink-0'
                    }, formatCurrency(amount)),
                    
                    // Campaign name
                    React.createElement('span', {
                        className: 'text-sm text-gray-400 truncate flex-1 min-w-0'
                    }, campaignName)
                ),
                
                // Expand/collapse button
                React.createElement('button', {
                    className: 'text-gray-400 hover:text-gray-200 flex-shrink-0 w-6 text-center',
                    type: 'button'
                }, isExpanded ? '▼' : '▶')
            ),
            
            // Expanded details
            isExpanded && React.createElement('div', {
                className: 'mt-3 pl-4 border-l-2 border-gray-600'
            },
                // Type-specific details
                isMoney ? (
                    React.createElement(React.Fragment, null,
                        React.createElement(DetailRow, {
                            label: 'Payment Method',
                            value: donation.paymentMethod || 'N/A'
                        }),
                        donation.transactionNumber && React.createElement(DetailRow, {
                            label: 'Transaction #',
                            value: donation.transactionNumber
                        }),
                        React.createElement(DetailRow, {
                            label: 'Recurring',
                            value: getRecurringLabel(donation.recurringType)
                        }),
                        React.createElement(DetailRow, {
                            label: 'Fund',
                            value: donation.fund || 'General'
                        })
                    )
                ) : (
                    React.createElement(React.Fragment, null,
                        React.createElement(DetailRow, {
                            label: 'Description',
                            value: donation.inKindDescription || 'N/A'
                        }),
                        React.createElement(DetailRow, {
                            label: 'Category',
                            value: donation.inKindCategory || 'N/A'
                        })
                    )
                ),
                
                // Campaign
                React.createElement(DetailRow, {
                    label: 'Campaign',
                    value: campaignName
                }),
                
                // Tax deductible
                React.createElement(DetailRow, {
                    label: 'Tax Deductible',
                    value: donation.taxDeductible ? 'Yes' : 'No'
                }),
                
                // Acknowledgment status
                donation.acknowledgmentSent ? (
                    React.createElement(DetailRow, {
                        label: 'Acknowledgment',
                        value: `Sent via ${donation.acknowledgmentMethod || 'Email'} on ${formatDate(donation.acknowledgmentDate)}`,
                        className: 'text-green-400'
                    })
                ) : (
                    React.createElement(DetailRow, {
                        label: 'Acknowledgment',
                        value: 'Not sent',
                        className: 'text-orange-400'
                    })
                ),
                
                // Notes
                donation.notes && React.createElement(DetailRow, {
                    label: 'Notes',
                    value: donation.notes
                }),
                
                // Created date
                React.createElement(DetailRow, {
                    label: 'Added',
                    value: formatDate(donation.createdAt),
                    className: 'text-xs text-gray-500'
                }),
                
                // Action buttons
                React.createElement('div', { className: 'flex gap-2 mt-3' },
                    onEdit && React.createElement('button', {
                        onClick: handleEdit,
                        className: 'bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded',
                        type: 'button'
                    }, 'Edit'),
                    
                    onDelete && React.createElement('button', {
                        onClick: handleDelete,
                        className: 'bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded',
                        type: 'button'
                    }, 'Delete'),
                    
                    !donation.acknowledgmentSent && onUpdate && React.createElement('button', {
                        onClick: handleMarkAcknowledged,
                        className: 'bg-gray-600 hover:bg-gray-500 text-white text-sm px-3 py-1 rounded',
                        type: 'button',
                        disabled: isMarkingAcknowledged
                    }, isMarkingAcknowledged ? 'Updating...' : 'Mark Acknowledged')
                )
            )
        );
    };

    // Export to global scope
    global.DonationHistoryItem = DonationHistoryItem;

})(window);
