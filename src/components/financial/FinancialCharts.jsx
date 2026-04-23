/**
 * FinancialCharts Component
 * Reusable chart components for financial data visualization using Chart.js.
 */
(function (global) {
  'use strict';

  const { React } = global;

  // ------- Utility -------
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount || 0));
  }

  function parseISODateUTC(s) {
    if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    }
    return null;
  }

  // ------- 1. DonationTrendChart -------
  const DonationTrendChart = ({ donations, period = 'month' }) => {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
      if (chartRef.current) {
        createTrendChart();
      }
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, [donations, period]);

    const createTrendChart = () => {
      const Chart = global.Chart;
      if (!Chart) {
        console.warn('Chart.js not loaded');
        return;
      }
      const ctx = chartRef.current.getContext('2d');
      if (chartInstance.current) chartInstance.current.destroy();
      const chartData = prepareTimeSeriesData(donations || [], period);
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Donation Amount',
            data: chartData.values,
            borderColor: '#c9a14a',
            backgroundColor: 'rgba(201, 161, 74, 0.15)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1c1413',
              borderColor: 'rgba(201, 161, 74, 0.3)',
              borderWidth: 1,
              titleColor: '#f4ede2',
              bodyColor: '#cfc6b3',
              callbacks: {
                label: function(context) {
                  return formatCurrency(context.parsed.y);
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255, 255, 255, 0.06)' },
              ticks: {
                color: '#8e8778',
                callback: function(value) {
                  return formatCurrency(value);
                }
              }
            }
          }
        }
      });
    };

    const prepareTimeSeriesData = (donations, period) => {
      const grouped = {};
      donations.forEach(donation => {
        const d = parseISODateUTC(donation.date) || new Date(donation.date);
        let key;
        switch (period) {
          case 'day':
            key = d.toISOString().split('T')[0];
            break;
          case 'week': {
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          }
          case 'month':
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'quarter': {
            const quarter = Math.floor(d.getMonth() / 3) + 1;
            key = `${d.getFullYear()}-Q${quarter}`;
            break;
          }
          case 'year':
            key = d.getFullYear().toString();
            break;
          default:
            key = d.toISOString().split('T')[0];
        }
        if (!grouped[key]) grouped[key] = 0;
        grouped[key] += Number(donation.amount || 0);
      });
      const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
      return {
        labels: sorted.map(([key]) => formatPeriodLabel(key, period)),
        values: sorted.map(([_, value]) => value)
      };
    };

    const formatPeriodLabel = (key, period) => {
      switch (period) {
        case 'month': {
          const [year, month] = key.split('-');
          return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        case 'quarter':
          return key;
        case 'year':
          return key;
        default:
          return new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    };

    return React.createElement('div', { className: 'donation-trend-chart', style: { height: '300px' } },
      React.createElement('canvas', { ref: chartRef })
    );
  };

  // ------- 2. DonorSegmentationChart -------
  const DonorSegmentationChart = ({ donors, donorLevels }) => {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
      if (chartRef.current) {
        createSegmentationChart();
      }
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, [donors, donorLevels]);

    const createSegmentationChart = () => {
      const Chart = global.Chart;
      if (!Chart) {
        console.warn('Chart.js not loaded');
        return;
      }
      const ctx = chartRef.current.getContext('2d');
      if (chartInstance.current) chartInstance.current.destroy();
      const levelCounts = {};
      (donors || []).forEach(donor => {
        const levelId = donor?.donorProfile?.donorLevelId;
        if (levelId) {
          levelCounts[levelId] = (levelCounts[levelId] || 0) + 1;
        }
      });
      const labels = [];
      const data = [];
      const colors = ['#c9a14a', '#8B1A2B', 'rgba(201, 161, 74, 0.7)', 'rgba(139, 26, 43, 0.7)', 'rgba(201, 161, 74, 0.45)', '#8a6b1f', '#5c1120'];
      Object.entries(levelCounts).forEach(([levelId, count], index) => {
        const level = (donorLevels || []).find(l => l.id === levelId);
        if (level) {
          labels.push(level.name);
          data.push(count);
        }
      });
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            tooltip: {
              backgroundColor: '#1c1413',
              borderColor: 'rgba(201, 161, 74, 0.3)',
              borderWidth: 1,
              titleColor: '#f4ede2',
              bodyColor: '#cfc6b3',
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    };

    const levelCounts = {};
    (donors || []).forEach(donor => {
      const levelId = donor?.donorProfile?.donorLevelId;
      if (levelId) {
        levelCounts[levelId] = (levelCounts[levelId] || 0) + 1;
      }
    });
    const hasData = Object.keys(levelCounts).length > 0;

    if (!hasData) {
      return React.createElement(
        'div',
        { className: 'donor-segmentation-chart flex flex-col items-center justify-center', style: { height: '300px' } },
        React.createElement('div', { className: 'text-5xl mb-3' }, '👥'),
        React.createElement('p', { className: 'font-medium mb-1 text-primary-color' }, 'No donor segments yet'),
        React.createElement('p', { className: 'text-sm text-muted-color text-center' }, 'Assign donor levels to contacts to see segmentation')
      );
    }

    return React.createElement('div', { className: 'donor-segmentation-chart', style: { height: '300px' } },
      React.createElement('canvas', { ref: chartRef })
    );
  };

  // ------- 3. CampaignComparisonChart -------
  const CampaignComparisonChart = ({ campaigns, donations }) => {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
      if (chartRef.current) {
        createComparisonChart();
      }
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, [campaigns, donations]);

    const createComparisonChart = () => {
      const Chart = global.Chart;
      if (!Chart) {
        console.warn('Chart.js not loaded');
        return;
      }
      const ctx = chartRef.current.getContext('2d');
      if (chartInstance.current) chartInstance.current.destroy();
      const campaignData = (campaigns || []).map(campaign => {
        const cds = (donations || []).filter(d => (d.campaignId === campaign.id) || (d.campaignType === 'custom' && d.campaignName === campaign.name));
        const raised = cds.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        return { name: campaign.name, goal: Number(campaign.goalAmount || 0), raised };
      }).sort((a, b) => b.raised - a.raised).slice(0, 10);
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: campaignData.map(c => c.name),
          datasets: [
            {
              label: 'Raised',
              data: campaignData.map(c => c.raised),
              backgroundColor: 'rgba(201, 161, 74, 0.7)',
              borderColor: '#c9a14a',
              borderWidth: 1
            },
            {
              label: 'Goal',
              data: campaignData.map(c => c.goal),
              backgroundColor: 'rgba(139, 26, 43, 0.7)',
              borderColor: '#8B1A2B',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              backgroundColor: '#1c1413',
              borderColor: 'rgba(201, 161, 74, 0.3)',
              borderWidth: 1,
              titleColor: '#f4ede2',
              bodyColor: '#cfc6b3',
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255, 255, 255, 0.06)' },
              ticks: {
                color: '#8e8778',
                callback: function(value) {
                  return formatCurrency(value);
                }
              }
            }
          }
        }
      });
    };

    return React.createElement('div', { className: 'campaign-comparison-chart', style: { height: '400px' } },
      React.createElement('canvas', { ref: chartRef })
    );
  };

  // ------- 4. RecurringVsOneTimeChart -------
  const RecurringVsOneTimeChart = ({ donations }) => {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
      if (chartRef.current) {
        createGiftTypeChart();
      }
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, [donations]);

    const createGiftTypeChart = () => {
      const Chart = global.Chart;
      if (!Chart) {
        console.warn('Chart.js not loaded');
        return;
      }
      const ctx = chartRef.current.getContext('2d');
      if (chartInstance.current) chartInstance.current.destroy();
      const byType = { 'One-Time': 0, 'Monthly': 0, 'Quarterly': 0, 'Annual': 0 };
      (donations || []).forEach(d => {
        if (d.donationType === 'monetary') {
          byType[d.recurringType] = (byType[d.recurringType] || 0) + Number(d.amount || 0);
        }
      });
      chartInstance.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(byType),
          datasets: [{
            data: Object.values(byType),
            backgroundColor: [
              '#c9a14a',
              '#8B1A2B',
              'rgba(201, 161, 74, 0.7)',
              'rgba(139, 26, 43, 0.7)'
            ],
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            tooltip: {
              backgroundColor: '#1c1413',
              borderColor: 'rgba(201, 161, 74, 0.3)',
              borderWidth: 1,
              titleColor: '#f4ede2',
              bodyColor: '#cfc6b3',
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    };

    return React.createElement('div', { className: 'gift-type-chart', style: { height: '300px' } },
      React.createElement('canvas', { ref: chartRef })
    );
  };

  // ------- 5. DonorRetentionChart -------
  const DonorRetentionChart = ({ donations }) => {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
      if (chartRef.current) {
        createRetentionChart();
      }
      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, [donations]);

    const createRetentionChart = () => {
      const Chart = global.Chart;
      if (!Chart) {
        console.warn('Chart.js not loaded');
        return;
      }
      const ctx = chartRef.current.getContext('2d');
      if (chartInstance.current) chartInstance.current.destroy();
      const currentYear = new Date().getFullYear();
      const years = [];
      const retentionRates = [];
      for (let year = currentYear - 5; year <= currentYear; year++) {
        years.push(year);
        const donorsThisYear = new Set();
        const donorsPreviousYear = new Set();
        (donations || []).forEach(d => {
          const donationYear = (parseISODateUTC(d.date) || new Date(d.date)).getFullYear();
          if (donationYear === year) donorsThisYear.add(d.contactId);
          if (donationYear === year - 1) donorsPreviousYear.add(d.contactId);
        });
        const retained = [...donorsPreviousYear].filter(id => donorsThisYear.has(id)).length;
        const rate = donorsPreviousYear.size > 0 ? (retained / donorsPreviousYear.size) * 100 : 0;
        retentionRates.push(rate);
      }
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: years,
          datasets: [{
            label: 'Retention Rate',
            data: retentionRates,
            borderColor: '#c9a14a',
            backgroundColor: 'rgba(201, 161, 74, 0.15)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1c1413',
              borderColor: 'rgba(201, 161, 74, 0.3)',
              borderWidth: 1,
              titleColor: '#f4ede2',
              bodyColor: '#cfc6b3',
              callbacks: {
                label: function(context) {
                  return `${context.parsed.y.toFixed(1)}%`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(255, 255, 255, 0.06)' },
              ticks: {
                color: '#8e8778',
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    };

    return React.createElement('div', { className: 'retention-chart', style: { height: '300px' } },
      React.createElement('canvas', { ref: chartRef })
    );
  };

  // ------- Export all -------
  global.DonationTrendChart = DonationTrendChart;
  global.DonorSegmentationChart = DonorSegmentationChart;
  global.CampaignComparisonChart = CampaignComparisonChart;
  global.RecurringVsOneTimeChart = RecurringVsOneTimeChart;
  global.DonorRetentionChart = DonorRetentionChart;
})(window);
