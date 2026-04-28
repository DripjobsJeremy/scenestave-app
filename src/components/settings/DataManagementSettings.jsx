/**
 * DataManagementSettings Component
 * 
 * Provides tools for backing up, exporting, importing, and resetting SceneStave data.
 * Includes statistics dashboard, backup/restore, CSV exports, data maintenance, and danger zone.
 */

const DataManagementSettings = () => {
  const [stats, setStats] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastBackup, setLastBackup] = React.useState(null);
  const [importConfirmed, setImportConfirmed] = React.useState(false);
  
  React.useEffect(() => {
    loadStats();
    loadLastBackupInfo();
  }, []);
  
  /**
   * Load statistics from all services
   */
  const loadStats = () => {
    try {
      const contacts = window.contactsService.loadContacts();
      const donations = window.donationsService.loadDonations();
      const productions = window.productionsService?.loadProductions() || [];
      
      setStats({
        contacts: contacts.length,
        donors: contacts.filter(c => c.isDonor).length,
        donations: donations.length,
        productions: productions.length,
        totalDonationAmount: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
        storageUsed: calculateStorageUsed()
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  /**
   * Calculate total storage used by SceneStave
   */
  const calculateStorageUsed = () => {
    let total = 0;
    for (let key in localStorage) {
      if (key.startsWith('showsuite_')) {
        total += localStorage[key].length;
      }
    }
    // Convert bytes to KB
    return (total / 1024).toFixed(2);
  };
  
  /**
   * Load last backup timestamp from localStorage
   */
  const loadLastBackupInfo = () => {
    const lastBackupDate = localStorage.getItem('showsuite_last_backup');
    if (lastBackupDate) {
      setLastBackup(lastBackupDate);
    }
  };
  
  /**
   * Create a full backup of all SceneStave data
   */
  const handleFullBackup = () => {
    setIsProcessing(true);
    
    try {
      const backupData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: {
          contacts: window.contactsService.loadContacts(),
          donations: window.donationsService.loadDonations(),
          donorLevels: window.donorLevelsService.loadDonorLevels(),
          campaigns: window.campaignsService.loadCampaigns(),
          importLogs: window.importLogsService?.loadImportLogs() || [],
          mappingPresets: window.mappingPresetsService?.loadMappingPresets() || [],
          acknowledgmentTemplates: window.acknowledgmentService.loadTemplates(),
          orgInfo: window.acknowledgmentService.loadOrgInfo(),
          productions: window.productionsService?.loadProductions() || []
        }
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Banquo_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      // Save last backup timestamp
      localStorage.setItem('showsuite_last_backup', new Date().toISOString());
      setLastBackup(new Date().toISOString());
      
      alert('✓ Backup created successfully!');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Restore data from a backup file
   */
  const handleRestoreBackup = () => {
    const confirmed = confirm(
      'WARNING: This will overwrite ALL existing data with the backup. ' +
      'Make sure you have a current backup before proceeding. Continue?'
    );
    
    if (!confirmed) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsProcessing(true);
      
      try {
        const text = await file.text();
        const backupData = JSON.parse(text);
        
        // Validate backup structure
        if (!backupData.version || !backupData.data) {
          throw new Error('Invalid backup file format');
        }
        
        // Restore data
        const { data } = backupData;
        
        if (data.contacts) {
          localStorage.setItem('showsuite_contacts', JSON.stringify(data.contacts));
        }
        if (data.donations) {
          localStorage.setItem('showsuite_donations', JSON.stringify(data.donations));
        }
        if (data.donorLevels) {
          localStorage.setItem('showsuite_donor_levels', JSON.stringify(data.donorLevels));
        }
        if (data.campaigns) {
          localStorage.setItem('showsuite_campaigns', JSON.stringify(data.campaigns));
        }
        if (data.importLogs) {
          localStorage.setItem('showsuite_import_logs', JSON.stringify(data.importLogs));
        }
        if (data.mappingPresets) {
          localStorage.setItem('showsuite_mapping_presets', JSON.stringify(data.mappingPresets));
        }
        if (data.acknowledgmentTemplates) {
          localStorage.setItem('showsuite_acknowledgment_templates', JSON.stringify(data.acknowledgmentTemplates));
        }
        if (data.orgInfo) {
          localStorage.setItem('showsuite_org_info', JSON.stringify(data.orgInfo));
        }
        if (data.productions) {
          localStorage.setItem('showsuite_productions', JSON.stringify(data.productions));
        }
        
        alert('Backup restored successfully! The page will now reload.');
        window.location.reload();
        
      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Failed to restore backup: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    };
    
    input.click();
  };
  
  /**
   * Export donors to CSV
   */
  const handleExportDonorsCSV = () => {
    setIsProcessing(true);
    
    try {
      const donors = window.contactsService.loadContacts().filter(c => c.isDonor);
      const donations = window.donationsService.loadDonations();
      
      const headers = [
        'First Name', 'Last Name', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP',
        'Donor Level', 'Lifetime Total', 'Total Donations', 'Last Donation', 'First Donation'
      ];
      
      const rows = donors.map(donor => {
        const donorDonations = donations.filter(d => d.contactId === donor.id);
        const sortedDonations = donorDonations.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return {
          'First Name': donor.firstName,
          'Last Name': donor.lastName,
          'Email': donor.email || '',
          'Phone': donor.phone || '',
          'Street': donor.address?.street || '',
          'City': donor.address?.city || '',
          'State': donor.address?.state || '',
          'ZIP': donor.address?.zip || '',
          'Donor Level': donor.donorProfile?.donorLevelId || '',
          'Lifetime Total': donor.donorProfile?.lifetimeTotal || 0,
          'Total Donations': donorDonations.length,
          'Last Donation': sortedDonations.length > 0 ? sortedDonations[sortedDonations.length - 1].date : '',
          'First Donation': sortedDonations.length > 0 ? sortedDonations[0].date : ''
        };
      });
      
      const Papa = window.Papa;
      const csv = Papa.unparse({ fields: headers, data: rows });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Banquo_Donors_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert(`✓ Exported ${donors.length} donors to CSV`);
    } catch (error) {
      console.error('Error exporting donors:', error);
      alert('Failed to export donors. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Export donations to CSV
   */
  const handleExportDonationsCSV = () => {
    setIsProcessing(true);
    
    try {
      const donations = window.donationsService.loadDonations();
      const contacts = window.contactsService.loadContacts();
      
      const headers = [
        'Date', 'Donor Name', 'Email', 'Amount', 'Type', 'Campaign',
        'Payment Method', 'Transaction #', 'Acknowledgment Sent', 'Notes'
      ];
      
      const rows = donations.map(donation => {
        const contact = contacts.find(c => c.id === donation.contactId);
        
        return {
          'Date': donation.date,
          'Donor Name': contact ? `${contact.firstName} ${contact.lastName}` : '',
          'Email': contact?.email || '',
          'Amount': donation.amount,
          'Type': donation.recurringType,
          'Campaign': donation.campaignName || 'General Fund',
          'Payment Method': donation.paymentMethod,
          'Transaction #': donation.transactionNumber || '',
          'Acknowledgment Sent': donation.acknowledgmentSent ? 'Yes' : 'No',
          'Notes': donation.notes || ''
        };
      });
      
      const Papa = window.Papa;
      const csv = Papa.unparse({ fields: headers, data: rows });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Banquo_Donations_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert(`✓ Exported ${donations.length} donations to CSV`);
    } catch (error) {
      console.error('Error exporting donations:', error);
      alert('Failed to export donations. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Export all contacts to CSV
   */
  const handleExportContactsCSV = () => {
    setIsProcessing(true);
    
    try {
      const contacts = window.contactsService.loadContacts();
      
      const headers = [
        'First Name', 'Last Name', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP',
        'Tags', 'Is Donor', 'Lifetime Total', 'Donor Level'
      ];
      
      const rows = contacts.map(contact => ({
        'First Name': contact.firstName,
        'Last Name': contact.lastName,
        'Email': contact.email || '',
        'Phone': contact.phone || '',
        'Street': contact.address?.street || '',
        'City': contact.address?.city || '',
        'State': contact.address?.state || '',
        'ZIP': contact.address?.zip || '',
        'Tags': contact.tags?.join(', ') || '',
        'Is Donor': contact.isDonor ? 'Yes' : 'No',
        'Lifetime Total': contact.donorProfile?.lifetimeTotal || 0,
        'Donor Level': contact.donorProfile?.donorLevelId || ''
      }));
      
      const Papa = window.Papa;
      const csv = Papa.unparse({ fields: headers, data: rows });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Banquo_Contacts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert(`✓ Exported ${contacts.length} contacts to CSV`);
    } catch (error) {
      console.error('Error exporting contacts:', error);
      alert('Failed to export contacts. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Open the CSV import wizard
   */
  const handleOpenImportWizard = () => {
    // Trigger the import modal (assuming it exists globally)
    window.dispatchEvent(new CustomEvent('openImportWizard'));
    setImportConfirmed(false);
  };
  
  /**
   * Recalculate all donor profiles
   */
  const handleRecalculateDonors = () => {
    if (confirm('Recalculate all donor profiles? This may take a moment.')) {
      setIsProcessing(true);
      
      try {
        if (window.donorCalculationService) {
          window.donorCalculationService.recalculateAllDonorProfiles();
          loadStats();
          alert('✓ All donor profiles have been recalculated!');
        } else {
          alert('Donor calculation service not available');
        }
      } catch (error) {
        console.error('Error recalculating donors:', error);
        alert('Failed to recalculate donors. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  /**
   * Run data integrity check
   */
  const handleDataIntegrityCheck = () => {
    setIsProcessing(true);
    
    try {
      const issues = [];
      
      // Check for orphaned donations
      const donations = window.donationsService.loadDonations();
      const contacts = window.contactsService.loadContacts();
      const contactIds = new Set(contacts.map(c => c.id));
      
      const orphanedDonations = donations.filter(d => !contactIds.has(d.contactId));
      if (orphanedDonations.length > 0) {
        issues.push(`Found ${orphanedDonations.length} donations with missing contacts`);
      }
      
      // Check for donors without profiles
      const donorsWithoutProfiles = contacts.filter(c => c.isDonor && !c.donorProfile);
      if (donorsWithoutProfiles.length > 0) {
        issues.push(`Found ${donorsWithoutProfiles.length} donors without donor profiles`);
      }
      
      // Check for duplicate emails
      const emailMap = {};
      contacts.forEach(c => {
        if (c.email) {
          emailMap[c.email] = (emailMap[c.email] || 0) + 1;
        }
      });
      const duplicateEmails = Object.entries(emailMap).filter(([_, count]) => count > 1);
      if (duplicateEmails.length > 0) {
        issues.push(`Found ${duplicateEmails.length} duplicate email addresses`);
      }
      
      if (issues.length === 0) {
        alert('✓ Data integrity check complete. No issues found!');
      } else {
        const message = `Found ${issues.length} issue(s):\n\n${issues.join('\n')}`;
        alert(message);
      }
    } catch (error) {
      console.error('Error checking data integrity:', error);
      alert('Failed to check data integrity. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Clear old import history logs
   */
  const handleClearImportHistory = () => {
    if (confirm('Clear import logs older than 90 days?')) {
      try {
        if (window.importLogsService) {
          const logs = window.importLogsService.loadImportLogs();
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 90);
          
          const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);
          const deletedCount = logs.length - filteredLogs.length;
          
          localStorage.setItem('showsuite_import_logs', JSON.stringify(filteredLogs));
          
          alert(`✓ Deleted ${deletedCount} old import logs`);
          loadStats();
        } else {
          alert('Import logs service not available');
        }
      } catch (error) {
        console.error('Error clearing import history:', error);
        alert('Failed to clear import history. Please try again.');
      }
    }
  };
  
  /**
   * Show detailed storage breakdown
   */
  const handleShowStorageDetails = () => {
    const details = [];
    let totalSize = 0;
    
    for (let key in localStorage) {
      if (key.startsWith('showsuite_')) {
        const size = (localStorage[key].length / 1024).toFixed(2);
        totalSize += parseFloat(size);
        details.push(`${key}: ${size} KB`);
      }
    }
    
    details.sort((a, b) => {
      const sizeA = parseFloat(a.split(': ')[1]);
      const sizeB = parseFloat(b.split(': ')[1]);
      return sizeB - sizeA;
    });
    
    alert('Storage Details:\n\n' + details.join('\n') + `\n\nTotal: ${totalSize.toFixed(2)} KB`);
  };
  
  /**
   * Restore all demo/sample data
   */
  const handleRestoreDemoData = () => {
    const confirmed = confirm(
      'This will restore all demo data (productions, actors, donors, donations).\n\n' +
      'Your existing data will be overwritten. Continue?'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      if (typeof window.forceResetDemoData === 'function') {
        window.forceResetDemoData();
        loadStats();
        alert('✅ Demo data restored! The page will now reload.');
        window.location.reload();
      } else {
        alert('Demo data function not available. Please refresh and try again.');
      }
    } catch (error) {
      console.error('Error restoring demo data:', error);
      alert('Failed to restore demo data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset all SceneStave data (DANGER)
   */
  const handleResetAllData = () => {
    const confirmation = prompt(
      'WARNING: This will DELETE ALL DATA!\n\n' +
      'Type "DELETE ALL DATA" to confirm:'
    );
    
    if (confirmation === 'DELETE ALL DATA') {
      const doubleCheck = confirm(
        'Are you ABSOLUTELY SURE? This cannot be undone!'
      );
      
      if (doubleCheck) {
        // Clear all SceneStave data
        for (let key in localStorage) {
          if (key.startsWith('showsuite_')) {
            localStorage.removeItem(key);
          }
        }
        
        alert('All data has been deleted. The page will now reload.');
        window.location.reload();
      }
    }
  };
  
  /**
   * Delete only donor data (DANGER)
   */
  const handleDeleteDonorData = () => {
    const confirmation = prompt(
      'WARNING: This will delete all donations and donor profiles!\n\n' +
      'Contact records will be kept but donor information will be removed.\n\n' +
      'Type "DELETE DONOR DATA" to confirm:'
    );
    
    if (confirmation === 'DELETE DONOR DATA') {
      // Clear donations
      localStorage.removeItem('showsuite_donations');
      
      // Clear donor profiles from contacts
      const contacts = window.contactsService.loadContacts();
      contacts.forEach(contact => {
        if (contact.isDonor) {
          contact.isDonor = false;
          contact.donorProfile = null;
          contact.tags = contact.tags?.filter(tag => tag !== 'Donor') || [];
        }
      });
      localStorage.setItem('showsuite_contacts', JSON.stringify(contacts));
      
      alert('Donor data has been deleted. The page will now reload.');
      window.location.reload();
    }
  };
  
  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };
  
  /**
   * Format date
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  // Render component
  return React.createElement(
    'div',
    { className: 'data-management-settings' },
    
    // Section Header
    React.createElement(
      'div',
      { className: 'section-header mb-6' },
      React.createElement('h2', { className: 'text-2xl font-bold mb-2 text-gray-900' }, 'Data Management'),
      React.createElement('p', { className: 'text-sm text-gray-600' },
        'Backup, export, import, and manage your Banquo data'
      )
    ),
    
    // Statistics Overview
    stats && React.createElement(
      'div',
      { className: 'stats-grid grid grid-cols-3 gap-4 mb-6' },
      
      // Contacts Stat
      React.createElement(
        'div',
        { className: 'stat-card bg-white border border-violet-200/50 rounded-lg p-4' },
        React.createElement('div', { className: 'text-3xl font-bold text-violet-400' }, stats.contacts),
        React.createElement('div', { className: 'text-sm text-gray-600 mt-1' }, 'Total Contacts'),
        React.createElement('div', { className: 'text-xs text-violet-400 mt-1' }, `${stats.donors} donors`)
      ),
      
      // Donations Stat
      React.createElement(
        'div',
        { className: 'stat-card bg-white border border-green-200/50 rounded-lg p-4' },
        React.createElement('div', { className: 'text-3xl font-bold text-green-400' }, stats.donations),
        React.createElement('div', { className: 'text-sm text-gray-600 mt-1' }, 'Total Donations'),
        React.createElement('div', { className: 'text-xs text-green-400 mt-1' },
          `${formatCurrency(stats.totalDonationAmount)} raised`
        )
      ),
      
      // Storage Stat
      React.createElement(
        'div',
        { className: 'stat-card bg-white border border-blue-200/50 rounded-lg p-4' },
        React.createElement('div', { className: 'text-3xl font-bold text-blue-400' }, `${stats.storageUsed} KB`),
        React.createElement('div', { className: 'text-sm text-gray-600 mt-1' }, 'Storage Used'),
        React.createElement('div', { className: 'text-xs text-blue-400 mt-1' },
          `${stats.productions} productions`
        )
      )
    ),
    
    // Restore Demo Data — first action for quick onboarding recovery
    React.createElement(
      'div',
      { className: 'section mb-6' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '🎭 Demo Data'),
      React.createElement(
        'div',
        { className: 'action-card bg-white border border-violet-200 rounded-lg p-4' },
        React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Restore Demo Data'),
        React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
          'Reload all sample productions, actors, donors, and donations. Useful if you cleared your browser data or want to start fresh with demo content.'
        ),
        React.createElement(
          'button',
          {
            onClick: handleRestoreDemoData,
            disabled: isProcessing,
            className: 'px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-600 text-white rounded-lg font-medium transition-colors'
          },
          isProcessing ? 'Restoring...' : '🔄 Restore Demo Data'
        )
      )
    ),

    // Backup & Export Section
    React.createElement(
      'div',
      { className: 'section mb-6' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '📦 Backup & Export'),
      
      React.createElement(
        'div',
        { className: 'actions-grid grid grid-cols-2 gap-4' },
        
        // Full Backup
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Full Data Backup'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Download a complete backup of all Banquo data (JSON format)'
          ),
          React.createElement(
            'button',
            {
              onClick: handleFullBackup,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-600 text-gray-900 rounded-lg font-medium transition-colors',
              'data-action': 'full-backup'
            },
            isProcessing ? 'Creating Backup...' : '💾 Download Full Backup'
          ),
          lastBackup && React.createElement('p', { className: 'text-xs text-gray-600 mt-2' },
            `Last backup: ${formatDate(lastBackup)}`
          )
        ),
        
        // Export Donors CSV
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Export Donors (CSV)'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Export all donor contacts and donation history to CSV'
          ),
          React.createElement(
            'button',
            {
              onClick: handleExportDonorsCSV,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '📊 Export Donors CSV'
          )
        ),
        
        // Export Donations CSV
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Export Donations (CSV)'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Export all donation records with donor information'
          ),
          React.createElement(
            'button',
            {
              onClick: handleExportDonationsCSV,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '📊 Export Donations CSV'
          )
        ),
        
        // Export Contacts CSV
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Export All Contacts (CSV)'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Export complete contact database to CSV'
          ),
          React.createElement(
            'button',
            {
              onClick: handleExportContactsCSV,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '📊 Export Contacts CSV'
          )
        )
      )
    ),
    
    // Import & Restore Section
    React.createElement(
      'div',
      { className: 'section mb-6' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '📥 Import & Restore'),
      
      // Warning Banner
      React.createElement(
        'div',
        { className: 'warning-banner mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-900 text-sm' },
        React.createElement('p', null,
          React.createElement('strong', null, '⚠️ Warning: '),
          'Importing data will overwrite existing records. Make sure to create a backup first!'
        ),
        React.createElement(
          'label',
          { className: 'flex items-center gap-2 mt-3 cursor-pointer text-sm text-amber-900' },
          React.createElement('input', {
            type: 'checkbox',
            checked: importConfirmed,
            onChange: (e) => setImportConfirmed(e.target.checked),
            className: 'w-4 h-4 accent-amber-600'
          }),
          'I understand this will overwrite my existing records and cannot be undone'
        )
      ),
      
      React.createElement(
        'div',
        { className: 'actions-grid grid grid-cols-2 gap-4' },
        
        // Restore from Backup
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Restore from Backup'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Restore all data from a previous backup file (JSON)'
          ),
          React.createElement(
            'button',
            {
              onClick: handleRestoreBackup,
              disabled: isProcessing || !importConfirmed,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors' + (!importConfirmed ? ' opacity-50 cursor-not-allowed' : '')
            },
            '📂 Select Backup File'
          )
        ),
        
        // Import CSV
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Import Donors (CSV/Excel)'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Use the full CSV import wizard with field mapping'
          ),
          React.createElement(
            'button',
            {
              onClick: handleOpenImportWizard,
              disabled: !importConfirmed,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-100 disabled:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors' + (!importConfirmed ? ' opacity-50 cursor-not-allowed' : '')
            },
            '📥 Open Import Wizard'
          )
        )
      )
    ),
    
    // Data Maintenance Section
    React.createElement(
      'div',
      { className: 'section mb-6' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-3 text-gray-900' }, '🔧 Data Maintenance'),
      
      React.createElement(
        'div',
        { className: 'actions-grid grid grid-cols-2 gap-4' },
        
        // Recalculate Donor Profiles
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Recalculate Donor Profiles'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Refresh all donor statistics and level assignments'
          ),
          React.createElement(
            'button',
            {
              onClick: handleRecalculateDonors,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '🔄 Recalculate All Donors'
          )
        ),
        
        // Data Integrity Check
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Data Integrity Check'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Find and fix data inconsistencies and orphaned records'
          ),
          React.createElement(
            'button',
            {
              onClick: handleDataIntegrityCheck,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '🔍 Run Integrity Check'
          )
        ),
        
        // Clear Import History
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Clear Import History'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'Remove old import logs (keeps last 90 days)'
          ),
          React.createElement(
            'button',
            {
              onClick: handleClearImportHistory,
              disabled: isProcessing,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '🗑 Clear Old Logs'
          )
        ),
        
        // View Storage Details
        React.createElement(
          'div',
          { className: 'action-card bg-white border border-gray-200 rounded-lg p-4' },
          React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, 'Storage Details'),
          React.createElement('p', { className: 'text-sm text-gray-600 mb-3' },
            'View detailed breakdown of storage usage'
          ),
          React.createElement(
            'button',
            {
              onClick: handleShowStorageDetails,
              className: 'w-full px-4 py-2 bg-gray-200 hover:bg-gray-100 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '📊 View Details'
          )
        )
      )
    ),

    // Danger Zone
    React.createElement(
      'div',
      { className: 'section danger-zone' },
      React.createElement('h3', { className: 'text-lg font-semibold text-red-500 mb-3' }, '⚠️ Danger Zone'),
      
      React.createElement(
        'div',
        { className: 'danger-actions border-2 border-red-600/50 rounded-lg p-4 bg-red-900/20' },
        
        // Reset All Data
        React.createElement(
          'div',
          { className: 'mb-6' },
          React.createElement('h4', { className: 'font-semibold text-red-400 mb-2' }, 'Reset All Data'),
          React.createElement('p', { className: 'text-sm text-red-300 mb-3' },
            'This will permanently delete ALL Banquo data including contacts, donations, ' +
            'productions, and settings. This action cannot be undone!'
          ),
          React.createElement(
            'button',
            {
              onClick: handleResetAllData,
              disabled: isProcessing,
              className: 'px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-600 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '🗑 Reset All Data'
          )
        ),
        
        // Delete Donor Data Only
        React.createElement(
          'div',
          null,
          React.createElement('h4', { className: 'font-semibold text-red-400 mb-2' }, 'Delete Donor Data Only'),
          React.createElement('p', { className: 'text-sm text-red-300 mb-3' },
            'Delete all donations and donor profiles, but keep contact records'
          ),
          React.createElement(
            'button',
            {
              onClick: handleDeleteDonorData,
              disabled: isProcessing,
              className: 'px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-600 text-gray-900 rounded-lg font-medium transition-colors'
            },
            '🗑 Delete Donor Data'
          )
        )
      )
    )
  );
};

// Export to global scope
window.DataManagementSettings = DataManagementSettings;
