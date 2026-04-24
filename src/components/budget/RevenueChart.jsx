(function(global) {
  const React = global.React;
  const { useRef, useEffect } = React;
  const Chart = global.Chart;

  // Revenue Doughnut Chart
  // Shows five revenue sources as doughnut segments
  // Props: {
  //   revenueData: { ticketSales, donations, grants, sponsorships, other },
  //   totalRevenue: number
  // }
  function RevenueDoughnutChart({ revenueData, totalRevenue }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (!Chart || !chartRef.current) return;
      if (chartInstance.current) chartInstance.current.destroy();

      const sources = [
        { label: '🎫 Ticket Sales',  key: 'ticketSales',  bg: 'rgba(201,161,74,0.85)', border: '#c9a14a' },
        { label: '💰 Donations',     key: 'donations',    bg: 'rgba(139,26,43,0.85)',  border: '#8B1A2B' },
        { label: '📜 Grants',        key: 'grants',       bg: 'rgba(201,161,74,0.5)',  border: '#c9a14a' },
        { label: '🤝 Sponsorships',  key: 'sponsorships', bg: 'rgba(139,26,43,0.5)',   border: '#8B1A2B' },
        { label: '📊 Other Revenue', key: 'other',        bg: 'rgba(180,150,100,0.5)', border: '#b49664' },
      ];

      const values = sources.map(s => revenueData?.[s.key] || 0);
      const hasData = values.some(v => v > 0);

      // If no data, show a single placeholder segment
      const chartData   = hasData ? values                 : [1];
      const chartLabels = hasData ? sources.map(s => s.label) : ['No revenue data yet'];
      const chartBg     = hasData ? sources.map(s => s.bg)    : ['rgba(255,255,255,0.06)'];
      const chartBorder = hasData ? sources.map(s => s.border) : ['rgba(255,255,255,0.1)'];

      chartInstance.current = new Chart(chartRef.current.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartBg,
            borderColor: chartBorder,
            borderWidth: 2,
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#cfc6b3',
                font: { size: 12 },
                padding: 14,
                boxWidth: 12,
                filter: (item) => hasData ? chartData[item.index] > 0 : true
              }
            },
            tooltip: {
              backgroundColor: '#1c1413',
              borderColor: 'rgba(201,161,74,0.3)',
              borderWidth: 1,
              titleColor: '#f4ede2',
              bodyColor: '#cfc6b3',
              callbacks: {
                label: (ctx) => {
                  if (!hasData) return ' No revenue data yet';
                  const val = ctx.parsed;
                  const pct = totalRevenue > 0
                    ? ((val / totalRevenue) * 100).toFixed(1)
                    : '0.0';
                  return ` $${val.toLocaleString()} (${pct}%)`;
                }
              }
            }
          }
        }
      });
      return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [revenueData, totalRevenue]);

    return React.createElement('div', { style: { height: '220px', position: 'relative' } },
      React.createElement('canvas', { ref: chartRef })
    );
  }

  global.RevenueDoughnutChart = RevenueDoughnutChart;

})(window);
