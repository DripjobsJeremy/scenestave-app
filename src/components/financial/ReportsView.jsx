/**
 * ReportsView Component
 * Financial reports generator with quick templates, custom builder, CSV export, and history.
 */
(function (global) {
  'use strict';

  const { React } = global;

  const ReportsView = ({ data, dateRange }) => {
    const [selectedReport, setSelectedReport] = React.useState(null);
    const [customDateRange, setCustomDateRange] = React.useState({ startDate: '', endDate: '' });
    const [reportFilters, setReportFilters] = React.useState({ donationType: 'all', campaign: 'all', minAmount: '', maxAmount: '' });

    const handleGenerateReport = (reportType) => {
      try {
        let reportData; let filename;
        switch (reportType) {
          case 'annual-summary':
            reportData = generateAnnualSummary(); filename = 'Annual_Giving_Summary'; break;
          case 'donor-list':
            reportData = generateDonorList(); filename = 'Donor_Report'; break;
          case 'campaign-performance':
            reportData = generateCampaignPerformance(); filename = 'Campaign_Performance'; break;
          case 'tax-receipts':
            reportData = generateTaxReceipts(); filename = 'Tax_Receipts_Summary'; break;
          case 'trends':
            reportData = generateTrendAnalysis(); filename = 'Giving_Trends'; break;
          case 'major-donors':
            reportData = generateMajorDonors(); filename = 'Major_Donors'; break;
          case 'board-meeting':
            reportData = generateBoardMeetingReport(); filename = 'Board_Meeting_Report'; break;
          case 'grant-support':
            reportData = generateGrantSupport(); filename = 'Grant_Application_Support'; break;
          case 'payment-methods':
            reportData = generatePaymentMethods(); filename = 'Payment_Methods'; break;
          case 'recurring-analysis':
            reportData = generateRecurringAnalysis(); filename = 'Recurring_Donor_Analysis'; break;
          case 'lapsed-donors':
            reportData = generateLapsedDonors(); filename = 'Lapsed_Donors'; break;
          case 'in-kind':
            reportData = generateInKindReport(); filename = 'In_Kind_Contributions'; break;
          default: return;
        }
        exportToCSV(reportData, filename);
        saveReportHistory(reportType, filename);
        setSelectedReport(reportType);
      } catch (e) {
        console.error('Report generation failed', e);
        alert('Failed to generate the report. See console for details.');
      }
    };

    const handleGenerateCustomReport = (format) => {
      try {
        let filtered = [...(data?.donations || [])];
        if (customDateRange.startDate) {
          const start = parseISODateUTC(customDateRange.startDate) || new Date(customDateRange.startDate);
          filtered = filtered.filter(d => (parseISODateUTC(d.date) || new Date(d.date)) >= start);
        }
        if (customDateRange.endDate) {
          const end = parseISODateUTC(customDateRange.endDate) || new Date(customDateRange.endDate);
          filtered = filtered.filter(d => (parseISODateUTC(d.date) || new Date(d.date)) <= end);
        }
        if (reportFilters.donationType !== 'all') {
          filtered = filtered.filter(d => d.donationType === reportFilters.donationType);
        }
        if (reportFilters.campaign !== 'all') {
          filtered = filtered.filter(d => String(d.campaignId || '') === String(reportFilters.campaign));
        }
        if (reportFilters.minAmount) {
          const min = parseFloat(reportFilters.minAmount);
          filtered = filtered.filter(d => Number(d.amount || d.estimatedValue || 0) >= min);
        }
        if (reportFilters.maxAmount) {
          const max = parseFloat(reportFilters.maxAmount);
          filtered = filtered.filter(d => Number(d.amount || d.estimatedValue || 0) <= max);
        }
        const headers = ['Date','Donor','Amount','Type','Frequency','Campaign','Payment Method','Notes'];
        const rows = filtered.map(donation => {
          const contact = (data?.contacts || []).find(c => c.id === donation.contactId);
          const campaignName = donation.campaignName || (data?.campaigns || []).find(c => c.id === donation.campaignId)?.name || 'General Fund';
          return {
            'Date': donation.date,
            'Donor': contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
            'Amount': donation.amount || donation.estimatedValue || 0,
            'Type': donation.donationType,
            'Frequency': donation.recurringType || '',
            'Campaign': campaignName,
            'Payment Method': donation.paymentMethod || '',
            'Notes': donation.notes || ''
          };
        });
        if (format === 'csv') {
          exportToCSV({ headers, rows }, 'Custom_Report');
          saveReportHistory('custom', 'Custom_Report');
        } else {
          window.print();
        }
      } catch (e) {
        console.error('Custom report failed', e);
        alert('Failed to generate the custom report.');
      }
    };

    // -------- Generators --------
    const generateAnnualSummary = () => {
      const headers = ['Metric','Value'];
      const rows = [
        { Metric:'Total Donations', Value: (data?.donations || []).length },
        { Metric:'Total Revenue', Value: formatCurrency(data?.metrics?.totalRevenue || 0) },
        { Metric:'Unique Donors', Value: data?.metrics?.donorCount || 0 },
        { Metric:'Average Gift', Value: formatCurrency(data?.metrics?.avgGift || 0) },
        { Metric:'Largest Gift', Value: formatCurrency(Math.max(0, ...((data?.donations || []).map(d => d.amount || 0)))) },
        { Metric:'Smallest Gift', Value: formatCurrency(Math.min(...((data?.donations || [0]).map(d => d.amount || 0)))) },
        { Metric:'Monetary Donations', Value: formatCurrency(data?.metrics?.byType?.monetary || 0) },
        { Metric:'In-Kind Contributions', Value: formatCurrency(data?.metrics?.byType?.inKind || 0) },
      ];
      return { headers, rows };
    };

    const generateDonorList = () => {
      const donors = (data?.contacts || []).filter(c => c.isDonor);
      const headers = ['First Name','Last Name','Email','Phone','Lifetime Total','Total Donations','Donor Level','Last Gift Date'];
      const rows = donors.map(d => ({
        'First Name': d.firstName,
        'Last Name': d.lastName,
        'Email': d.email || '',
        'Phone': d.phone || '',
        'Lifetime Total': d?.donorProfile?.lifetimeTotal || 0,
        'Total Donations': d?.donorProfile?.totalDonations || 0,
        'Donor Level': getDonorLevelName(d?.donorProfile?.donorLevelId),
        'Last Gift Date': d?.donorProfile?.lastDonationDate || ''
      }));
      return { headers, rows };
    };

    const generateCampaignPerformance = () => {
      const headers = ['Campaign','Goal','Raised','Progress %','Donors','Donations','Average Gift','Status'];
      const rows = (data?.campaigns || []).map(campaign => {
        const cds = (data?.donations || []).filter(d => (d.campaignId === campaign.id) || (d.campaignType === 'custom' && d.campaignName === campaign.name));
        const raised = cds.reduce((s, d) => s + Number(d.amount || 0), 0);
        const donors = new Set(cds.map(d => d.contactId)).size;
        const progress = campaign.goalAmount ? (raised / Number(campaign.goalAmount)) * 100 : 0;
        return {
          'Campaign': campaign.name,
          'Goal': Number(campaign.goalAmount || 0),
          'Raised': raised,
          'Progress %': progress.toFixed(1),
          'Donors': donors,
          'Donations': cds.length,
          'Average Gift': donors > 0 ? (raised / donors) : 0,
          'Status': campaign.active ? 'Active' : 'Completed'
        };
      });
      return { headers, rows };
    };

    const generateTaxReceipts = () => {
      const tax = (data?.donations || []).filter(d => d.taxDeductible && d.donationType === 'monetary');
      const headers = ['Receipt Number','Date','Donor Name','Amount','Campaign','Acknowledgment Sent'];
      const rows = tax.map(d => {
        const contact = (data?.contacts || []).find(c => c.id === d.contactId);
        const campaignName = d.campaignName || (data?.campaigns || []).find(c => c.id === d.campaignId)?.name || 'General Fund';
        return {
          'Receipt Number': `R-${new Date().getFullYear()}-${String(d.id || '').slice(0,6)}`,
          'Date': d.date,
          'Donor Name': contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
          'Amount': Number(d.amount || 0),
          'Campaign': campaignName,
          'Acknowledgment Sent': d.acknowledgmentSent ? 'Yes' : 'No'
        };
      });
      return { headers, rows };
    };

    const generateTrendAnalysis = () => {
      const headers = ['Year','Donations','Revenue'];
      const byYear = {};
      (data?.donations || []).forEach(d => {
        const y = (parseISODateUTC(d.date) || new Date(d.date)).getFullYear();
        if (!byYear[y]) byYear[y] = { Donations: 0, Revenue: 0 };
        byYear[y].Donations += 1;
        byYear[y].Revenue += Number(d.amount || 0);
      });
      const rows = Object.keys(byYear).sort().map(y => ({ Year: y, Donations: byYear[y].Donations, Revenue: byYear[y].Revenue }));
      return { headers, rows };
    };

    const generateMajorDonors = () => {
      const donors = (data?.contacts || []).filter(c => c.isDonor).sort((a, b) => (b?.donorProfile?.lifetimeTotal || 0) - (a?.donorProfile?.lifetimeTotal || 0)).slice(0, 20);
      const headers = ['Rank','Donor Name','Email','Lifetime Total','Total Gifts','Largest Gift','Last Gift Date','Donor Level'];
      const rows = donors.map((donor, idx) => {
        const gifts = (data?.donations || []).filter(d => d.contactId === donor.id);
        const largest = gifts.length ? Math.max(...gifts.map(g => Number(g.amount || 0))) : 0;
        return {
          'Rank': idx + 1,
          'Donor Name': `${donor.firstName} ${donor.lastName}`,
          'Email': donor.email || '',
          'Lifetime Total': donor?.donorProfile?.lifetimeTotal || 0,
          'Total Gifts': donor?.donorProfile?.totalDonations || 0,
          'Largest Gift': largest,
          'Last Gift Date': donor?.donorProfile?.lastDonationDate || '',
          'Donor Level': getDonorLevelName(donor?.donorProfile?.donorLevelId)
        };
      });
      return { headers, rows };
    };

    const generateBoardMeetingReport = () => {
      const headers = ['Section','Metric','Value'];
      const rows = [
        { Section: 'Summary', Metric: 'Total Revenue', Value: data?.metrics ? formatCurrency(data.metrics.totalRevenue) : '$0' },
        { Section: 'Summary', Metric: 'Unique Donors', Value: data?.metrics?.donorCount || 0 },
        { Section: 'Summary', Metric: 'Average Gift', Value: data?.metrics ? formatCurrency(data.metrics.avgGift) : '$0' },
        { Section: 'Breakdown', Metric: 'Monetary', Value: data?.metrics ? formatCurrency(data.metrics.byType.monetary) : '$0' },
        { Section: 'Breakdown', Metric: 'In-Kind', Value: data?.metrics ? formatCurrency(data.metrics.byType.inKind) : '$0' },
      ];
      return { headers, rows };
    };

    const generateGrantSupport = () => {
      const headers = ['Metric','Value'];
      const rows = [
        { Metric: 'Total Donations (period)', Value: (data?.donations || []).length },
        { Metric: 'Total Raised (period)', Value: data?.metrics ? formatCurrency(data.metrics.totalRevenue) : '$0' },
        { Metric: 'Active Campaigns', Value: (data?.campaigns || []).filter(c => c.active).length },
        { Metric: 'Recurring Revenue (Monthly)', Value: formatCurrency(sumByRecurring((data?.donations || []), 'Monthly')) },
      ];
      return { headers, rows };
    };

    const generatePaymentMethods = () => {
      const headers = ['Payment Method','Count','Amount'];
      const agg = {};
      (data?.donations || []).forEach(d => {
        const key = d.paymentMethod || 'Unknown';
        if (!agg[key]) agg[key] = { Count: 0, Amount: 0 };
        agg[key].Count += 1;
        agg[key].Amount += Number(d.amount || 0);
      });
      const rows = Object.keys(agg).map(k => ({ 'Payment Method': k, 'Count': agg[k].Count, 'Amount': agg[k].Amount }));
      return { headers, rows };
    };

    const generateRecurringAnalysis = () => {
      const headers = ['Frequency','Count','Amount'];
      const agg = {};
      (data?.donations || []).forEach(d => {
        const key = d.recurringType || 'One-Time';
        if (!agg[key]) agg[key] = { Count: 0, Amount: 0 };
        agg[key].Count += 1;
        agg[key].Amount += Number(d.amount || 0);
      });
      const rows = Object.keys(agg).map(k => ({ 'Frequency': k, 'Count': agg[k].Count, 'Amount': agg[k].Amount }));
      return { headers, rows };
    };

    const generateLapsedDonors = () => {
      const now = new Date();
      const lapsers = (data?.contacts || []).filter(c => {
        const lastStr = c?.donorProfile?.lastDonationDate || null;
        if (!c.isDonor || !lastStr) return false;
        const last = parseISODateUTC(lastStr) || new Date(lastStr);
        const days = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        return days > 365;
      });
      const headers = ['Donor Name','Email','Phone','Lifetime Total','Last Gift Date','Days Since Last Gift','Total Gifts'];
      const rows = lapsers.map(c => {
        const last = parseISODateUTC(c?.donorProfile?.lastDonationDate) || new Date(c?.donorProfile?.lastDonationDate);
        const days = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
        return {
          'Donor Name': `${c.firstName} ${c.lastName}`,
          'Email': c.email || '',
          'Phone': c.phone || '',
          'Lifetime Total': c?.donorProfile?.lifetimeTotal || 0,
          'Last Gift Date': c?.donorProfile?.lastDonationDate || '',
          'Days Since Last Gift': days,
          'Total Gifts': c?.donorProfile?.totalDonations || 0
        };
      });
      return { headers, rows };
    };

    const generateInKindReport = () => {
      const headers = ['Date','Donor','Category','Estimated Value','Acknowledgment'];
      const rows = (data?.donations || []).filter(d => d.donationType === 'in-kind').map(d => {
        const contact = (data?.contacts || []).find(c => c.id === d.contactId);
        return {
          'Date': d.date,
          'Donor': contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
          'Category': d.inKindCategory || 'Unspecified',
          'Estimated Value': Number(d.estimatedValue || 0),
          'Acknowledgment': d.acknowledgmentMethod || ''
        };
      });
      return { headers, rows };
    };

    // -------- Utilities --------
    function exportToCSV(reportData, filename) {
      const Papa = window.Papa;
      if (!Papa || !Papa.unparse) {
        alert('CSV export not available. PapaParse missing.');
        return;
      }
      const csv = Papa.unparse({ fields: reportData.headers, data: reportData.rows });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    function saveReportHistory(reportType, filename) {
      const key = 'showsuite_report_history';
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.unshift({ name: filename, type: reportType, generated: new Date().toISOString(), dateRange: String(dateRange || '') });
      localStorage.setItem(key, JSON.stringify(history.slice(0, 10)));
    }

    function getRecentReports() {
      return JSON.parse(localStorage.getItem('showsuite_report_history') || '[]');
    }

    function handleRegenerateReport(report) { handleGenerateReport(report.type); }

    function getDonorLevelName(levelId) {
      if (!levelId) return 'Unknown';
      const level = (data?.donorLevels || []).find(l => l.id === levelId);
      return level ? level.name : 'Unknown';
    }

    function sumByRecurring(donations, recurringType) {
      return donations.filter(d => d.recurringType === recurringType).reduce((s, d) => s + Number(d.amount || 0), 0);
    }

    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(amount || 0));
    }

    function parseISODateUTC(s) {
      if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      }
      return null;
    }

    function formatDateTime(dateString) {
      const d = new Date(dateString);
      return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    // -------- Subcomponents --------
    const ReportCard = ({ icon, title, description, onClick }) => (
      React.createElement('div', { onClick, className: 'report-card border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow cursor-pointer transition bg-white' },
        React.createElement('div', { className: 'text-4xl mb-3' }, icon),
        React.createElement('h4', { className: 'font-semibold mb-2 text-gray-900' }, title),
        React.createElement('p', { className: 'text-sm text-gray-600' }, description)
      )
    );

    const ReportTemplateRow = ({ icon, title, description, onClick }) => (
      React.createElement('div', { onClick, className: 'report-template-row flex items-center gap-4 p-4 border border-gray-200 rounded bg-white hover:bg-gray-50 cursor-pointer transition' },
        React.createElement('div', { className: 'text-3xl' }, icon),
        React.createElement('div', { className: 'flex-1' },
          React.createElement('h4', { className: 'font-semibold text-gray-900' }, title),
          React.createElement('p', { className: 'text-sm text-gray-600' }, description)
        ),
        React.createElement('button', { className: 'btn-sm bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded' }, 'Generate →')
      )
    );

    // -------- Render --------
    return React.createElement('div', { className: 'reports-view p-6' },
      React.createElement('div', { className: 'reports-header mb-6' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-2 text-gray-900' }, 'Financial Reports'),
        React.createElement('p', { className: 'text-gray-600' }, 'Generate comprehensive reports for board meetings, tax purposes, and grant applications')
      ),
      // Quick Reports
      React.createElement('div', { className: 'quick-reports mb-8' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, 'Quick Reports'),
        React.createElement('div', { className: 'reports-grid grid grid-cols-1 md:grid-cols-3 gap-4' },
          React.createElement(ReportCard, { icon: '📊', title: 'Annual Giving Summary', description: 'Complete overview of donations for the fiscal year', onClick: () => handleGenerateReport('annual-summary') }),
          React.createElement(ReportCard, { icon: '👥', title: 'Donor Report', description: 'Complete donor list with giving history', onClick: () => handleGenerateReport('donor-list') }),
          React.createElement(ReportCard, { icon: '💰', title: 'Campaign Performance', description: 'Analysis of all campaign results', onClick: () => handleGenerateReport('campaign-performance') }),
          React.createElement(ReportCard, { icon: '🧾', title: 'Tax Receipts Summary', description: 'All donations requiring tax receipts', onClick: () => handleGenerateReport('tax-receipts') }),
          React.createElement(ReportCard, { icon: '📈', title: 'Trend Analysis', description: 'Year-over-year giving trends', onClick: () => handleGenerateReport('trends') }),
          React.createElement(ReportCard, { icon: '🎯', title: 'Major Donors Report', description: 'Top 20 donors by lifetime giving', onClick: () => handleGenerateReport('major-donors') })
        )
      ),
      // Custom Report Builder
      React.createElement('div', { className: 'custom-report-builder border border-gray-200 rounded-lg p-6 bg-gray-50' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, 'Custom Report Builder'),
        React.createElement('div', { className: 'builder-form space-y-4' },
          // Date Range
          React.createElement('div', { className: 'form-section' },
            React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-700' }, 'Date Range'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              React.createElement('input', { type: 'date', value: customDateRange.startDate, onChange: e => setCustomDateRange({ ...customDateRange, startDate: e.target.value }), className: 'border border-gray-300 rounded px-3 py-2 bg-white text-gray-900', placeholder: 'Start Date' }),
              React.createElement('input', { type: 'date', value: customDateRange.endDate, onChange: e => setCustomDateRange({ ...customDateRange, endDate: e.target.value }), className: 'border border-gray-300 rounded px-3 py-2 bg-white text-gray-900', placeholder: 'End Date' })
            )
          ),
          // Filters
          React.createElement('div', { className: 'form-section' },
            React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-700' }, 'Filters'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-3' },
              React.createElement('select', { value: reportFilters.donationType, onChange: e => setReportFilters({ ...reportFilters, donationType: e.target.value }), className: 'border border-gray-300 rounded px-3 py-2 bg-white text-gray-900' },
                React.createElement('option', { value: 'all' }, 'All Types'),
                React.createElement('option', { value: 'monetary' }, 'Monetary Only'),
                React.createElement('option', { value: 'in-kind' }, 'In-Kind Only')
              ),
              React.createElement('select', { value: reportFilters.campaign, onChange: e => setReportFilters({ ...reportFilters, campaign: e.target.value }), className: 'border border-gray-300 rounded px-3 py-2 bg-white text-gray-900' },
                React.createElement('option', { value: 'all' }, 'All Campaigns'),
                (data?.campaigns || []).map(c => React.createElement('option', { key: c.id, value: c.id }, c.name))
              ),
              React.createElement('input', { type: 'number', value: reportFilters.minAmount, onChange: e => setReportFilters({ ...reportFilters, minAmount: e.target.value }), placeholder: 'Min Amount', className: 'border border-gray-300 rounded px-3 py-2 bg-white text-gray-900' }),
              React.createElement('input', { type: 'number', value: reportFilters.maxAmount, onChange: e => setReportFilters({ ...reportFilters, maxAmount: e.target.value }), placeholder: 'Max Amount', className: 'border border-gray-300 rounded px-3 py-2 bg-white text-gray-900' })
            )
          ),
          // Export Format
          React.createElement('div', { className: 'form-section' },
            React.createElement('label', { className: 'block text-sm font-medium mb-2 text-gray-700' }, 'Export Format'),
            React.createElement('div', { className: 'flex gap-3' },
              React.createElement('button', { onClick: () => handleGenerateCustomReport('csv'), className: 'bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded' }, '📊 Export to CSV'),
              React.createElement('button', { onClick: () => handleGenerateCustomReport('pdf'), className: 'bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded' }, '📄 Export to PDF'),
              React.createElement('button', { onClick: () => handleGenerateCustomReport('print'), className: 'bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded' }, '🖨️ Print Report')
            )
          )
        )
      ),
      // Report Templates
      React.createElement('div', { className: 'report-templates mt-8' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, 'Specialized Reports'),
        React.createElement('div', { className: 'templates-list space-y-3' },
          React.createElement(ReportTemplateRow, { icon: '📋', title: 'Board Meeting Report', description: 'Executive summary for board meetings with key metrics', onClick: () => handleGenerateReport('board-meeting') }),
          React.createElement(ReportTemplateRow, { icon: '📝', title: 'Grant Application Support', description: 'Comprehensive funding data for grant applications', onClick: () => handleGenerateReport('grant-support') }),
          React.createElement(ReportTemplateRow, { icon: '💳', title: 'Payment Method Breakdown', description: 'Analysis of donation methods (cash, check, credit card, etc.)', onClick: () => handleGenerateReport('payment-methods') }),
          React.createElement(ReportTemplateRow, { icon: '🔄', title: 'Recurring Donor Analysis', description: 'Detailed analysis of recurring giving patterns', onClick: () => handleGenerateReport('recurring-analysis') }),
          React.createElement(ReportTemplateRow, { icon: '⏰', title: 'Lapsed Donor Report', description: 'Identify and analyze donors who haven\'t given recently', onClick: () => handleGenerateReport('lapsed-donors') }),
          React.createElement(ReportTemplateRow, { icon: '🎁', title: 'In-Kind Contributions', description: 'Summary of all non-monetary contributions', onClick: () => handleGenerateReport('in-kind') })
        )
      ),
      // Recent Reports
      React.createElement('div', { className: 'recent-reports mt-8' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-900' }, 'Recently Generated'),
        React.createElement('div', { className: 'recent-list border border-gray-200 rounded-lg overflow-hidden bg-white' },
          React.createElement('table', { className: 'w-full' },
            React.createElement('thead', { className: 'bg-gray-50' },
              React.createElement('tr', null,
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Report Name'),
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Generated'),
                React.createElement('th', { className: 'text-left p-3 text-gray-700' }, 'Date Range'),
                React.createElement('th', { className: 'text-center p-3 text-gray-700' }, 'Actions')
              )
            ),
            React.createElement('tbody', null,
              getRecentReports().map((report, index) => (
                React.createElement('tr', { key: index, className: 'border-b border-gray-200 hover:bg-gray-50' },
                  React.createElement('td', { className: 'p-3 font-medium text-gray-900' }, report.name),
                  React.createElement('td', { className: 'p-3 text-sm text-gray-600' }, formatDateTime(report.generated)),
                  React.createElement('td', { className: 'p-3 text-sm text-gray-600' }, report.dateRange || ''),
                  React.createElement('td', { className: 'p-3 text-center' },
                    React.createElement('button', { onClick: () => handleRegenerateReport(report), className: 'text-violet-600 hover:text-violet-700 text-sm' }, 'Regenerate')
                  )
                )
              ))
            )
          )
        )
      )
    );
  };

  // Export
  global.ReportsView = ReportsView;
})(window);
