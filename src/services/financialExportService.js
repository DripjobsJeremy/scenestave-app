(function (global) {
  'use strict';

  /**
   * Financial Export Service
   * Handles exporting financial data to various formats
   */

  // ---------- Public API ----------
  function exportDashboardToCSV(data, dateRange) {
    try {
      const sections = [
        exportSummarySection(data, dateRange),
        exportDonationsSection(data.donations || [], data.contacts || []),
        exportDonorsSection((data.contacts || []).filter(c => c.isDonor)),
        exportCampaignsSection(data.campaigns || [], data.donations || [])
      ];
      const csv = sections.join('\n\n');
      downloadCSV(csv, `Financial_Dashboard_${dateRange}_${getDateString()}.csv`);
    } catch (e) {
      console.error('CSV export failed:', e);
      alert('CSV export failed. See console for details.');
    }
  }

  function exportSummarySection(data, dateRange) {
    const rows = [
      ['FINANCIAL SUMMARY'],
      ['Period', dateRange],
      [''],
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(data.metrics.totalRevenue)],
      ['Total Donations', data.metrics.totalDonations],
      ['Unique Donors', data.metrics.donorCount],
      ['Average Gift', formatCurrency(data.metrics.avgGift)],
      ['Monetary Donations', formatCurrency(data.metrics.byType.monetary)],
      ['In-Kind Contributions', formatCurrency(data.metrics.byType.inKind)]
    ];
    return rows.map(csvJoin).join('\n');
  }

  function exportDonationsSection(donations, contacts) {
    const rows = [
      ['DONATIONS'],
      [''],
      ['Date', 'Donor', 'Amount', 'Type', 'Frequency', 'Campaign', 'Payment Method']
    ];
    (donations || []).forEach(donation => {
      const contact = (contacts || []).find(c => c.id === donation.contactId);
      rows.push([
        donation.date,
        contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
        donation.amount || donation.estimatedValue || 0,
        donation.donationType,
        donation.recurringType || '',
        donation.campaignName || 'General Fund',
        donation.paymentMethod || ''
      ]);
    });
    return rows.map(csvJoin).join('\n');
  }

  function exportDonorsSection(donors) {
    const rows = [
      ['DONORS'],
      [''],
      ['Name', 'Email', 'Lifetime Total', 'Total Gifts', 'Last Gift Date', 'Donor Level']
    ];
    (donors || []).forEach(donor => {
      rows.push([
        `${donor.firstName} ${donor.lastName}`,
        donor.email || '',
        donor?.donorProfile?.lifetimeTotal || 0,
        donor?.donorProfile?.totalDonations || 0,
        donor?.donorProfile?.lastDonationDate || '',
        donor?.donorProfile?.donorLevelId || ''
      ]);
    });
    return rows.map(csvJoin).join('\n');
  }

  function exportCampaignsSection(campaigns, donations) {
    const rows = [
      ['CAMPAIGNS'],
      [''],
      ['Campaign', 'Goal', 'Raised', 'Progress %', 'Donors', 'Status']
    ];
    (campaigns || []).forEach(campaign => {
      const cds = (donations || []).filter(d => d.campaignId === campaign.id || d.campaignName === campaign.name);
      const raised = cds.reduce((sum, d) => sum + (Number(d.amount || 0)), 0);
      const donors = new Set(cds.map(d => d.contactId)).size;
      const progress = campaign.goalAmount ? ((raised / campaign.goalAmount) * 100).toFixed(1) : 0;
      rows.push([
        campaign.name,
        campaign.goalAmount || 0,
        raised,
        progress,
        donors,
        campaign.active ? 'Active' : 'Completed'
      ]);
    });
    return rows.map(csvJoin).join('\n');
  }

  function generatePrintableReport(data, dateRange) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Financial Dashboard Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
        h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .metric-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
        .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        @media print { body { padding: 20px; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Financial Dashboard Report</h1>
          <p style="color: #6b7280;">Period: ${dateRange}</p>
        </div>
        <div>
          <p style="color: #6b7280;">Generated: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <h2>Summary Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Revenue</div>
          <div class="metric-value">${formatCurrency(data.metrics.totalRevenue)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Donations</div>
          <div class="metric-value">${data.metrics.totalDonations}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Unique Donors</div>
          <div class="metric-value">${data.metrics.donorCount}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average Gift</div>
          <div class="metric-value">${formatCurrency(data.metrics.avgGift)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Monetary Donations</div>
          <div class="metric-value">${formatCurrency(data.metrics.byType.monetary)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">In-Kind Contributions</div>
          <div class="metric-value">${formatCurrency(data.metrics.byType.inKind)}</div>
        </div>
      </div>
      
      <h2>Top Campaigns</h2>
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Goal</th>
            <th>Raised</th>
            <th>Progress</th>
            <th>Donors</th>
          </tr>
        </thead>
        <tbody>
          ${generateCampaignRows(data.campaigns || [], data.donations || [])}
        </tbody>
      </table>
      
      <h2>Top Donors</h2>
      <table>
        <thead>
          <tr>
            <th>Donor</th>
            <th>Lifetime Total</th>
            <th>Total Gifts</th>
            <th>Last Gift</th>
          </tr>
        </thead>
        <tbody>
          ${generateTopDonorsRows(data.contacts || [], data.donations || [])}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated by SceneStave Theatre Management CRM</p>
        <p>© ${new Date().getFullYear()} - Confidential Financial Report</p>
      </div>
      
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>`;
    return html;
  }

  function printDashboard(data, dateRange) {
    try {
      const html = generatePrintableReport(data, dateRange);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the report.');
        return;
        }
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (e) {
      console.error('Print failed:', e);
      alert('Print failed. See console for details.');
    }
  }

  function exportToExcel(data, dateRange) {
    if (typeof XLSX === 'undefined') {
      alert('Excel export requires SheetJS (XLSX) library.');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Financial Dashboard Report'],
        ['Period', dateRange],
        ['Generated', new Date().toLocaleDateString()],
        [''],
        ['Metric', 'Value'],
        ['Total Revenue', data.metrics.totalRevenue],
        ['Total Donations', data.metrics.totalDonations],
        ['Unique Donors', data.metrics.donorCount],
        ['Average Gift', data.metrics.avgGift],
        ['Monetary Donations', data.metrics.byType.monetary],
        ['In-Kind Contributions', data.metrics.byType.inKind]
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Donations sheet
      const donationsData = [
        ['Date', 'Donor', 'Amount', 'Type', 'Frequency', 'Campaign', 'Payment Method'],
        ...(data.donations || []).map(d => {
          const contact = (data.contacts || []).find(c => c.id === d.contactId);
          return [
            d.date,
            contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
            d.amount || d.estimatedValue || 0,
            d.donationType,
            d.recurringType || '',
            d.campaignName || 'General Fund',
            d.paymentMethod || ''
          ];
        })
      ];
      const donationsWs = XLSX.utils.aoa_to_sheet(donationsData);
      XLSX.utils.book_append_sheet(wb, donationsWs, 'Donations');

      // Donors sheet
      const donorsData = [
        ['Name', 'Email', 'Lifetime Total', 'Total Gifts', 'Last Gift Date', 'Donor Level'],
        ...((data.contacts || []).filter(c => c.isDonor)).map(d => [
          `${d.firstName} ${d.lastName}`,
          d.email || '',
          d?.donorProfile?.lifetimeTotal || 0,
          d?.donorProfile?.totalDonations || 0,
          d?.donorProfile?.lastDonationDate || '',
          d?.donorProfile?.donorLevelId || ''
        ])
      ];
      const donorsWs = XLSX.utils.aoa_to_sheet(donorsData);
      XLSX.utils.book_append_sheet(wb, donorsWs, 'Donors');

      // Campaigns sheet
      const campaignsData = [
        ['Campaign', 'Goal', 'Raised', 'Progress %', 'Donors', 'Status'],
        ...(data.campaigns || []).map(c => {
          const cds = (data.donations || []).filter(d => d.campaignId === c.id || d.campaignName === c.name);
          const raised = cds.reduce((sum, d) => sum + (Number(d.amount || 0)), 0);
          const donors = new Set(cds.map(d => d.contactId)).size;
          const progress = c.goalAmount ? ((raised / c.goalAmount) * 100).toFixed(1) : 0;
          return [c.name, c.goalAmount || 0, raised, progress, donors, c.active ? 'Active' : 'Completed'];
        })
      ];
      const campaignsWs = XLSX.utils.aoa_to_sheet(campaignsData);
      XLSX.utils.book_append_sheet(wb, campaignsWs, 'Campaigns');

      XLSX.writeFile(wb, `Financial_Dashboard_${dateRange}_${getDateString()}.xlsx`);
    } catch (e) {
      console.error('Excel export failed:', e);
      alert('Excel export failed. See console for details.');
    }
  }

  // ---------- Helpers ----------
  function csvJoin(row) {
    return row.map(cell => {
      if (cell === null || cell === undefined) return '';
      const s = String(cell);
      // Escape quotes and wrap if contains comma or quote
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',');
  }

  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }, 0);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(Number(amount || 0));
  }

  function getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  function generateCampaignRows(campaigns, donations) {
    return (campaigns || []).slice(0, 10).map(campaign => {
      const cds = (donations || []).filter(d => d.campaignId === campaign.id || d.campaignName === campaign.name);
      const raised = cds.reduce((sum, d) => sum + (Number(d.amount || 0)), 0);
      const donors = new Set(cds.map(d => d.contactId)).size;
      const progress = campaign.goalAmount ? ((raised / campaign.goalAmount) * 100).toFixed(1) : 0;
      return `
      <tr>
        <td>${campaign.name}</td>
        <td>${formatCurrency(campaign.goalAmount || 0)}</td>
        <td>${formatCurrency(raised)}</td>
        <td>${progress}%</td>
        <td>${donors}</td>
      </tr>`;
    }).join('');
  }

  function generateTopDonorsRows(contacts, donations) {
    const donors = (contacts || [])
      .filter(c => c.isDonor)
      .sort((a, b) => (b?.donorProfile?.lifetimeTotal || 0) - (a?.donorProfile?.lifetimeTotal || 0))
      .slice(0, 20);
    return donors.map(d => `
      <tr>
        <td>${d.firstName} ${d.lastName}</td>
        <td>${formatCurrency(d?.donorProfile?.lifetimeTotal || 0)}</td>
        <td>${d?.donorProfile?.totalDonations || 0}</td>
        <td>${d?.donorProfile?.lastDonationDate || '—'}</td>
      </tr>`).join('');
  }

  // ---------- Expose to global ----------
  global.financialExportService = {
    exportDashboardToCSV,
    exportSummarySection,
    generatePrintableReport,
    printDashboard,
    exportToExcel
  };

  // Also expose individual functions for convenience if needed
  global.exportDashboardToCSV = exportDashboardToCSV;
  global.exportSummarySection = exportSummarySection;
  global.generatePrintableReport = generatePrintableReport;
  global.printDashboard = printDashboard;
  global.exportToExcel = exportToExcel;

})(window);
