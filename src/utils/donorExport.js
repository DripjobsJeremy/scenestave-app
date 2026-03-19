/**
 * SceneStave - Donor Export Utilities
 * 
 * Client-side export functions for donor data in CSV and HTML formats.
 * Generates browser downloads for donor lists, donation history, campaign reports, and tax receipts.
 * 
 * Functions:
 * - exportDonorsToCSV: Export all donor contacts with profile data
 * - exportDonationHistoryToCSV: Export donation history for a single donor
 * - exportDonorStatsToCSV: Export aggregated donor statistics by level
 * - exportCampaignReportToCSV: Export campaign donations with progress
 * - generateDonorReceiptHTML: Generate printable tax receipt
 * 
 * Usage:
 *   const donors = ContactsService.getDonorContacts();
 *   DonorExport.exportDonorsToCSV(donors, { includeHistory: true });
 */

(function(global) {
    'use strict';

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    /**
     * Format currency value consistently
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    function formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0.00';
        }
        return '$' + Number(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Format date string consistently
     * @param {string} dateString - ISO date string
     * @param {string} format - Format type: 'short', 'long', 'iso'
     * @returns {string} Formatted date
     */
    function formatDate(dateString, format = 'short') {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        switch (format) {
            case 'long':
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'iso':
                return date.toISOString().split('T')[0];
            case 'short':
            default:
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
        }
    }

    /**
     * Escape CSV field value (handle commas, quotes, newlines)
     * @param {*} value - Value to escape
     * @returns {string} Escaped CSV field
     */
    function escapeCSVField(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const str = String(value);
        
        // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
    }

    /**
     * Convert array of objects to CSV string
     * @param {Array} data - Array of objects
     * @param {Array} headers - Array of header strings
     * @returns {string} CSV content
     */
    function arrayToCSV(data, headers) {
        const rows = [];
        
        // Add header row
        rows.push(headers.map(escapeCSVField).join(','));
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return escapeCSVField(value);
            });
            rows.push(values.join(','));
        });
        
        return rows.join('\r\n');
    }

    /**
     * Trigger browser download of CSV file
     * @param {string} csvContent - CSV content string
     * @param {string} filename - Filename for download
     */
    function downloadCSV(csvContent, filename) {
        try {
            // Add BOM for Excel UTF-8 compatibility
            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csvContent;
            
            // Create blob
            const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
            
            // Create download link
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            console.log(`✅ CSV Export: ${filename} downloaded successfully`);
        } catch (error) {
            console.error('❌ CSV Export Error:', error);
            throw new Error('Failed to download CSV file: ' + error.message);
        }
    }

    /**
     * Get current date formatted for filenames
     * @returns {string} Date string YYYY-MM-DD
     */
    function getDateForFilename() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ========================================================================
    // EXPORT FUNCTIONS
    // ========================================================================

    /**
     * Export all donor contacts to CSV
     * @param {Array} contacts - Array of donor contact objects
     * @param {Object} options - Export options
     * @param {boolean} options.includeHistory - Include recent donation details
     * @param {boolean} options.includeNotes - Include donor notes
     */
    function exportDonorsToCSV(contacts, options = {}) {
        try {
            const { includeHistory = false, includeNotes = false } = options;
            
            if (!Array.isArray(contacts) || contacts.length === 0) {
                throw new Error('No donor contacts to export');
            }

            console.log(`📊 Exporting ${contacts.length} donors to CSV...`);

            const data = contacts.map(contact => {
                const profile = contact.donorProfile || {};
                const address = contact.address || {};
                
                // Build full address string
                const addressParts = [
                    address.street,
                    address.city,
                    address.state,
                    address.zip
                ].filter(Boolean);
                const fullAddress = addressParts.join(', ');

                const row = {
                    'First Name': contact.firstName || '',
                    'Last Name': contact.lastName || '',
                    'Email': contact.email || '',
                    'Phone': contact.phone || '',
                    'Address': fullAddress,
                    'Donor Level': profile.donorLevelId || '',
                    'Lifetime Total': profile.lifetimeTotal || 0,
                    'In-Kind Total': profile.inKindTotal || 0,
                    'Donor Since': formatDate(profile.donorSince, 'iso'),
                    'Last Gift Date': formatDate(profile.lastDonationDate, 'iso'),
                    'Total Donations': profile.totalDonations || 0,
                    'First Gift Date': formatDate(profile.firstDonationDate, 'iso')
                };

                if (includeNotes) {
                    row['Notes'] = profile.notes || '';
                }

                if (includeHistory && typeof DonationsService !== 'undefined') {
                    // Get recent donations (last 3)
                    const donations = DonationsService.getDonationsByContactId(contact.id) || [];
                    const recent = donations.slice(0, 3);
                    
                    recent.forEach((donation, index) => {
                        const num = index + 1;
                        row[`Recent Gift ${num} Date`] = formatDate(donation.date, 'iso');
                        row[`Recent Gift ${num} Amount`] = donation.donationType === 'monetary' 
                            ? donation.amount 
                            : donation.estimatedValue;
                        row[`Recent Gift ${num} Type`] = donation.donationType;
                    });
                }

                return row;
            });

            // Build headers dynamically based on first row
            const headers = Object.keys(data[0]);
            const csvContent = arrayToCSV(data, headers);
            
            const filename = `Donors_Export_${getDateForFilename()}.csv`;
            downloadCSV(csvContent, filename);

            return { success: true, count: contacts.length, filename };
        } catch (error) {
            console.error('❌ Export Donors Error:', error);
            throw error;
        }
    }

    /**
     * Export donation history for a single donor
     * @param {string} contactId - Contact ID
     */
    function exportDonationHistoryToCSV(contactId) {
        try {
            if (!contactId) {
                throw new Error('Contact ID is required');
            }

            if (typeof ContactsService === 'undefined' || typeof DonationsService === 'undefined') {
                throw new Error('ContactsService and DonationsService must be loaded');
            }

            const contact = ContactsService.getContactById(contactId);
            if (!contact) {
                throw new Error('Contact not found');
            }

            const donations = DonationsService.getDonationsByContactId(contactId) || [];
            
            if (donations.length === 0) {
                throw new Error('No donation history found for this donor');
            }

            console.log(`📊 Exporting ${donations.length} donations for ${contact.firstName} ${contact.lastName}...`);

            const data = donations.map(donation => {
                const isMonetary = donation.donationType === 'monetary';
                const amount = isMonetary ? donation.amount : donation.estimatedValue;
                
                return {
                    'Date': formatDate(donation.date, 'iso'),
                    'Type': donation.donationType,
                    'Amount': amount || 0,
                    'Campaign Type': donation.campaignType || '',
                    'Campaign Name': donation.campaignName || '',
                    'Payment Method': isMonetary ? (donation.paymentMethod || '') : 'N/A',
                    'Recurring': donation.recurringType || 'one-time',
                    'Tax Deductible': isMonetary ? (donation.taxDeductible ? 'Yes' : 'No') : 'N/A',
                    'Acknowledgment Sent': donation.acknowledgmentSent ? 'Yes' : 'No',
                    'Acknowledgment Date': formatDate(donation.acknowledgmentDate, 'iso'),
                    'Acknowledgment Method': donation.acknowledgmentMethod || '',
                    'Transaction Number': donation.transactionNumber || '',
                    'Notes': donation.notes || '',
                    'In-Kind Description': !isMonetary ? (donation.inKindDescription || '') : '',
                    'In-Kind Category': !isMonetary ? (donation.inKindCategory || '') : ''
                };
            });

            const headers = Object.keys(data[0]);
            const csvContent = arrayToCSV(data, headers);
            
            const filename = `${contact.firstName}_${contact.lastName}_Donation_History.csv`.replace(/[^a-zA-Z0-9_-]/g, '_');
            downloadCSV(csvContent, filename);

            return { success: true, count: donations.length, filename };
        } catch (error) {
            console.error('❌ Export Donation History Error:', error);
            throw error;
        }
    }

    /**
     * Export aggregated donor statistics by level
     */
    function exportDonorStatsToCSV() {
        try {
            if (typeof ContactsService === 'undefined' || typeof DonorLevelsService === 'undefined') {
                throw new Error('ContactsService and DonorLevelsService must be loaded');
            }

            console.log('📊 Exporting donor statistics...');

            const donors = ContactsService.getDonorContacts() || [];
            const levels = DonorLevelsService.loadDonorLevels() || [];

            // Group donors by level
            const statsByLevel = {};
            let totalDonors = 0;
            let totalLifetime = 0;
            let totalInKind = 0;

            levels.forEach(level => {
                statsByLevel[level.id] = {
                    'Donor Level': level.name,
                    'Min Amount': level.minAmount,
                    'Max Amount': level.maxAmount || 'Unlimited',
                    'Donor Count': 0,
                    'Total Lifetime Giving': 0,
                    'Total In-Kind Giving': 0,
                    'Average Gift': 0
                };
            });

            // Add category for donors without level
            statsByLevel['none'] = {
                'Donor Level': 'No Level Assigned',
                'Min Amount': 0,
                'Max Amount': 0,
                'Donor Count': 0,
                'Total Lifetime Giving': 0,
                'Total In-Kind Giving': 0,
                'Average Gift': 0
            };

            donors.forEach(donor => {
                const profile = donor.donorProfile || {};
                const levelId = profile.donorLevelId || 'none';
                
                if (statsByLevel[levelId]) {
                    statsByLevel[levelId]['Donor Count']++;
                    statsByLevel[levelId]['Total Lifetime Giving'] += profile.lifetimeTotal || 0;
                    statsByLevel[levelId]['Total In-Kind Giving'] += profile.inKindTotal || 0;
                }

                totalDonors++;
                totalLifetime += profile.lifetimeTotal || 0;
                totalInKind += profile.inKindTotal || 0;
            });

            // Calculate averages
            Object.keys(statsByLevel).forEach(levelId => {
                const stats = statsByLevel[levelId];
                if (stats['Donor Count'] > 0) {
                    stats['Average Gift'] = stats['Total Lifetime Giving'] / stats['Donor Count'];
                }
            });

            // Convert to array and sort by min amount
            const data = Object.values(statsByLevel)
                .filter(stats => stats['Donor Count'] > 0) // Only include levels with donors
                .sort((a, b) => {
                    const aMin = typeof a['Min Amount'] === 'number' ? a['Min Amount'] : 0;
                    const bMin = typeof b['Min Amount'] === 'number' ? b['Min Amount'] : 0;
                    return aMin - bMin;
                });

            // Add summary row
            data.push({
                'Donor Level': '=== TOTAL ===',
                'Min Amount': '',
                'Max Amount': '',
                'Donor Count': totalDonors,
                'Total Lifetime Giving': totalLifetime,
                'Total In-Kind Giving': totalInKind,
                'Average Gift': totalDonors > 0 ? totalLifetime / totalDonors : 0
            });

            const headers = Object.keys(data[0]);
            const csvContent = arrayToCSV(data, headers);
            
            const filename = `Donor_Statistics_${getDateForFilename()}.csv`;
            downloadCSV(csvContent, filename);

            return { success: true, count: data.length - 1, filename }; // -1 for summary row
        } catch (error) {
            console.error('❌ Export Donor Stats Error:', error);
            throw error;
        }
    }

    /**
     * Export campaign report with all donations
     * @param {string} campaignId - Campaign ID
     */
    function exportCampaignReportToCSV(campaignId) {
        try {
            if (!campaignId) {
                throw new Error('Campaign ID is required');
            }

            if (typeof CampaignsService === 'undefined' || typeof ContactsService === 'undefined') {
                throw new Error('CampaignsService and ContactsService must be loaded');
            }

            const campaign = CampaignsService.getCampaignById(campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }

            const donations = CampaignsService.getCampaignDonations(campaignId) || [];
            
            if (donations.length === 0) {
                throw new Error('No donations found for this campaign');
            }

            console.log(`📊 Exporting ${donations.length} donations for campaign: ${campaign.name}...`);

            // Calculate progress
            const totalRaised = donations.reduce((sum, d) => {
                const amount = d.donationType === 'monetary' ? d.amount : d.estimatedValue;
                return sum + (amount || 0);
            }, 0);
            const goal = campaign.goalAmount || 0;
            const percentComplete = goal > 0 ? (totalRaised / goal * 100).toFixed(1) : 0;

            const data = [];

            // Add campaign header rows
            data.push({
                'Campaign Name': campaign.name,
                'Campaign Type': campaign.type,
                'Goal': goal,
                'Total Raised': totalRaised,
                'Percent Complete': `${percentComplete}%`,
                'Status': campaign.status,
                'Start Date': formatDate(campaign.startDate, 'iso'),
                'End Date': formatDate(campaign.endDate, 'iso')
            });

            // Add blank row
            data.push({
                'Campaign Name': '',
                'Campaign Type': '',
                'Goal': '',
                'Total Raised': '',
                'Percent Complete': '',
                'Status': '',
                'Start Date': '',
                'End Date': ''
            });

            // Add donations header row
            data.push({
                'Campaign Name': 'DONOR NAME',
                'Campaign Type': 'DONATION DATE',
                'Goal': 'AMOUNT',
                'Total Raised': 'TYPE',
                'Percent Complete': 'PAYMENT METHOD',
                'Status': 'ACK SENT',
                'Start Date': 'NOTES',
                'End Date': ''
            });

            // Add donation rows
            donations.forEach(donation => {
                const contact = ContactsService.getContactById(donation.contactId);
                const donorName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown';
                const amount = donation.donationType === 'monetary' ? donation.amount : donation.estimatedValue;

                data.push({
                    'Campaign Name': donorName,
                    'Campaign Type': formatDate(donation.date, 'iso'),
                    'Goal': amount || 0,
                    'Total Raised': donation.donationType,
                    'Percent Complete': donation.paymentMethod || '',
                    'Status': donation.acknowledgmentSent ? 'Yes' : 'No',
                    'Start Date': donation.notes || '',
                    'End Date': ''
                });
            });

            const headers = Object.keys(data[0]);
            const csvContent = arrayToCSV(data, headers);
            
            const campaignNameSafe = campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `Campaign_${campaignNameSafe}_${getDateForFilename()}.csv`;
            downloadCSV(csvContent, filename);

            return { success: true, count: donations.length, filename };
        } catch (error) {
            console.error('❌ Export Campaign Report Error:', error);
            throw error;
        }
    }

    /**
     * Generate printable HTML tax receipt for a donation
     * @param {string} donationId - Donation ID
     * @returns {string} HTML string
     */
    function generateDonorReceiptHTML(donationId) {
        try {
            if (!donationId) {
                throw new Error('Donation ID is required');
            }

            if (typeof DonationsService === 'undefined' || typeof ContactsService === 'undefined') {
                throw new Error('DonationsService and ContactsService must be loaded');
            }

            const donation = DonationsService.getDonationById(donationId);
            if (!donation) {
                throw new Error('Donation not found');
            }

            const contact = ContactsService.getContactById(donation.contactId);
            if (!contact) {
                throw new Error('Contact not found');
            }

            const isMonetary = donation.donationType === 'monetary';
            const amount = isMonetary ? donation.amount : donation.estimatedValue;
            const isTaxDeductible = isMonetary && donation.taxDeductible;

            const address = contact.address || {};
            const fullAddress = [
                address.street,
                [address.city, address.state, address.zip].filter(Boolean).join(', ')
            ].filter(Boolean).join('<br>');

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Donation Receipt - ${contact.firstName} ${contact.lastName}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            line-height: 1.6;
        }
        .receipt-header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .receipt-header h1 {
            margin: 0;
            color: #1e40af;
            font-size: 28px;
        }
        .organization-info {
            margin-bottom: 30px;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 8px;
        }
        .donor-info, .donation-info {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
            font-weight: 600;
            color: #6b7280;
        }
        .info-value {
            text-align: right;
        }
        .amount-highlight {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            text-align: center;
            padding: 20px;
            background: #d1fae5;
            border-radius: 8px;
            margin: 20px 0;
        }
        .tax-notice {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
        }
        .receipt-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        .signature-section {
            margin-top: 40px;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        .signature-line {
            border-bottom: 2px solid #333;
            margin: 40px 0 10px 0;
            width: 300px;
        }
        @media print {
            body {
                padding: 20px;
            }
            .no-print {
                display: none;
            }
        }
        .print-button {
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin: 20px auto;
            display: block;
        }
        .print-button:hover {
            background: #1e40af;
        }
    </style>
</head>
<body>
    <div class="receipt-header">
        <h1>🎭 SceneStave Theatre Company</h1>
        <p style="margin: 5px 0; color: #6b7280;">Tax-Deductible Donation Receipt</p>
    </div>

    <div class="organization-info">
        <strong>SceneStave Theatre Company</strong><br>
        123 Theatre Lane<br>
        Arts District, CA 90000<br>
        Tax ID: 12-3456789<br>
        Phone: (555) 123-4567 | Email: donations@showsuite.org
    </div>

    <div class="donor-info">
        <div class="section-title">Donor Information</div>
        <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${contact.firstName} ${contact.lastName}</span>
        </div>
        ${contact.email ? `
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${contact.email}</span>
        </div>
        ` : ''}
        ${fullAddress ? `
        <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${fullAddress}</span>
        </div>
        ` : ''}
    </div>

    <div class="donation-info">
        <div class="section-title">Donation Details</div>
        <div class="info-row">
            <span class="info-label">Receipt Date:</span>
            <span class="info-value">${formatDate(new Date().toISOString(), 'long')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Donation Date:</span>
            <span class="info-value">${formatDate(donation.date, 'long')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Donation Type:</span>
            <span class="info-value">${donation.donationType === 'monetary' ? 'Monetary' : 'In-Kind'}</span>
        </div>
        ${donation.campaignType ? `
        <div class="info-row">
            <span class="info-label">Campaign:</span>
            <span class="info-value">${donation.campaignType}${donation.campaignName ? ' - ' + donation.campaignName : ''}</span>
        </div>
        ` : ''}
        ${isMonetary && donation.paymentMethod ? `
        <div class="info-row">
            <span class="info-label">Payment Method:</span>
            <span class="info-value">${donation.paymentMethod}</span>
        </div>
        ` : ''}
        ${donation.transactionNumber ? `
        <div class="info-row">
            <span class="info-label">Transaction #:</span>
            <span class="info-value">${donation.transactionNumber}</span>
        </div>
        ` : ''}
        ${!isMonetary && donation.inKindDescription ? `
        <div class="info-row">
            <span class="info-label">Description:</span>
            <span class="info-value">${donation.inKindDescription}</span>
        </div>
        ` : ''}
    </div>

    <div class="amount-highlight">
        ${isMonetary ? 'Amount Donated' : 'Estimated Value'}: ${formatCurrency(amount)}
    </div>

    ${isTaxDeductible ? `
    <div class="tax-notice">
        <strong>Tax Deductibility Notice:</strong><br>
        This donation is tax-deductible to the full extent allowed by law. SceneStave Theatre Company is a 501(c)(3) nonprofit organization (Tax ID: 12-3456789). No goods or services were provided in exchange for this contribution. Please retain this receipt for your tax records.
    </div>
    ` : !isMonetary ? `
    <div class="tax-notice">
        <strong>In-Kind Donation Notice:</strong><br>
        This receipt acknowledges receipt of the in-kind donation described above. The estimated value shown is as determined by the donor. SceneStave Theatre Company makes no representation of value for tax purposes. Please consult your tax advisor regarding deductibility.
    </div>
    ` : `
    <div class="tax-notice">
        <strong>Non-Deductible Donation:</strong><br>
        This contribution was designated as non-tax-deductible. Please consult your tax advisor for specific guidance.
    </div>
    `}

    <div class="signature-section">
        <p><strong>Authorized Signature:</strong></p>
        <div class="signature-line"></div>
        <p style="margin: 5px 0; color: #6b7280;">Development Director, SceneStave Theatre Company</p>
        <p style="margin: 5px 0; color: #6b7280;">Date: ${formatDate(new Date().toISOString(), 'long')}</p>
    </div>

    <div class="receipt-footer">
        <p>Thank you for your generous support of SceneStave Theatre Company!</p>
        <p>Your contribution helps us bring exceptional theatre to our community.</p>
        <p style="margin-top: 20px; font-size: 11px;">
            This receipt was generated electronically by SceneStave Donor Management System.<br>
            For questions about this receipt, please contact us at donations@showsuite.org
        </p>
    </div>

    <button class="print-button no-print" onclick="window.print()">🖨️ Print Receipt</button>
</body>
</html>
            `.trim();

            console.log(`✅ Generated receipt for donation ${donationId}`);
            return html;
        } catch (error) {
            console.error('❌ Generate Receipt Error:', error);
            throw error;
        }
    }

    /**
     * Open receipt in new window for printing/saving
     * @param {string} donationId - Donation ID
     */
    function printDonorReceipt(donationId) {
        try {
            const html = generateDonorReceiptHTML(donationId);
            const win = window.open('', '_blank');
            if (!win) {
                throw new Error('Unable to open print window. Please allow popups for this site.');
            }
            win.document.write(html);
            win.document.close();
            console.log('✅ Receipt opened in new window');
        } catch (error) {
            console.error('❌ Print Receipt Error:', error);
            throw error;
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    const DonorExport = {
        // Export functions
        exportDonorsToCSV,
        exportDonationHistoryToCSV,
        exportDonorStatsToCSV,
        exportCampaignReportToCSV,
        generateDonorReceiptHTML,
        printDonorReceipt,
        
        // Helpers (exposed for testing/advanced usage)
        formatCurrency,
        formatDate,
        escapeCSVField,
        downloadCSV
    };

    // Export to global scope
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DonorExport;
    } else {
        global.DonorExport = DonorExport;
    }

    console.log('✅ DonorExport utility loaded');

})(typeof window !== 'undefined' ? window : global);
