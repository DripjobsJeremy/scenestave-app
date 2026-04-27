const BoardDashboard = () => {
  const productions = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
  const donations   = window.donationsService?.loadDonations?.() || [];
  const contacts    = window.contactsService?.loadContacts?.()   || [];

  // Financial summary
  const currentYear  = new Date().getFullYear();
  const ytdDonations = donations.filter(d => (d.date || '').startsWith(currentYear));
  const ytdTotal     = ytdDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const uniqueDonors = new Set(ytdDonations.map(d => d.contactId)).size;

  // Active productions
  const ACTIVE_STATUSES = ['active','in rehearsal','in production','tech week','running','open'];
  const activeProds = productions.filter(p =>
    ACTIVE_STATUSES.includes((p.status || '').toLowerCase())
  );

  // Board members
  const BOARD_TAGS = ['board', 'board member', 'board of directors', 'trustee', 'governor'];
  const boardMembers = contacts.filter(c =>
    Array.isArray(c.tags) && c.tags.some(t => BOARD_TAGS.includes(String(t).toLowerCase()))
  );

  // Upcoming shows / auditions / performances
  const today = new Date();
  const upcomingShows = productions
    .flatMap(p =>
      (p.calendar || []).map(ev => ({
        ...ev,
        productionTitle: p.title,
        productionId: p.id,
        _date: new Date(ev.start || ev.date || ev.datetime),
      }))
    )
    .filter(ev =>
      !isNaN(ev._date) && ev._date >= today &&
      ['show', 'audition', 'performance'].some(t => (ev.type || '').toLowerCase().includes(t))
    )
    .sort((a, b) => a._date - b._date)
    .slice(0, 6);

  const fmt = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const kpis = [
    { label: 'Active Productions', value: activeProds.length,   icon: '🎭' },
    { label: 'YTD Donations',       value: fmt(ytdTotal),        icon: '💰' },
    { label: 'Unique Donors',       value: uniqueDonors,         icon: '🤝' },
    { label: 'Board Members',       value: boardMembers.length,  icon: '👥' },
  ];

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  return React.createElement('div', { className: 'bg-base min-h-screen' },
  React.createElement('div', { className: 'max-w-[1400px] mx-auto p-6 space-y-6' },

    // Header
    React.createElement('div', { className: 'mb-2' },
      React.createElement('h1', { className: `text-3xl font-bold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}` }, '🏛️ Board Dashboard'),
      React.createElement('p', { className: `${isLight ? 'text-gray-600' : 'text-gray-400'}` },
        new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      )
    ),

    // KPI row
    React.createElement('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-4' },
      ...kpis.map(kpi =>
        React.createElement('div', {
          key: kpi.label,
          className: 'bg-surface rounded-lg p-5 border border-gray-700 banquo-card'
        },
          React.createElement('div', { className: `text-3xl font-bold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}` }, kpi.value),
          React.createElement('div', { className: `text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, kpi.label)
        )
      )
    ),

    // Main grid
    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },

      // Active Productions
      React.createElement('div', { className: 'bg-surface rounded-lg p-5 border border-gray-700 banquo-card' },
        React.createElement('h3', { className: `text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}` }, '🎬 Active Productions'),
        activeProds.length === 0
          ? React.createElement('p', { className: `text-sm italic ${isLight ? 'text-gray-600' : 'text-gray-500'}` }, 'No active productions')
          : React.createElement('div', { className: 'space-y-2' },
              ...activeProds.map(prod => {
                const budget = parseFloat(prod.overallBudget) || 0;
                const spent = (prod.scenes || [])
                  .flatMap(s => [...(s.props?.items || []), ...(s.wardrobe?.items || [])])
                  .reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
                return React.createElement('div', {
                  key: prod.id,
                  className: 'flex items-center justify-between p-3 bg-gray-750 rounded border border-gray-600 cursor-pointer hover:border-violet-600 transition-colors banquo-card--flat',
                  onClick: () => { window.location.hash = `#/productions/${prod.id}`; }
                },
                  React.createElement('div', null,
                    React.createElement('div', { className: `font-medium ${isLight ? 'text-gray-900' : 'text-white'}` }, prod.title),
                    React.createElement('div', { className: `text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, prod.status || 'Active')
                  ),
                  budget > 0 && React.createElement('div', { className: 'text-right' },
                    React.createElement('div', { className: `text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, 'Budget'),
                    React.createElement('div', {
                      className: `text-xs font-medium ${spent > budget ? 'text-red-400' : 'text-green-400'}`
                    }, `$${budget.toLocaleString()}`)
                  )
                );
              })
            )
      ),

      // Upcoming Shows & Auditions
      React.createElement('div', { className: 'bg-surface rounded-lg p-5 border border-gray-700 banquo-card' },
        React.createElement('h3', { className: `text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}` }, '📅 Upcoming Shows & Auditions'),
        upcomingShows.length === 0
          ? React.createElement('p', { className: `text-sm italic ${isLight ? 'text-gray-600' : 'text-gray-500'}` }, 'No upcoming shows or auditions')
          : React.createElement('div', { className: 'space-y-2' },
              ...upcomingShows.map((ev, idx) =>
                React.createElement('div', {
                  key: ev.id || idx,
                  className: 'flex items-center gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer transition-colors',
                  onClick: () => { window.location.hash = `#/productions/${ev.productionId}?tab=calendar`; }
                },
                  React.createElement('div', {
                    className: 'text-xs text-center bg-gray-700 rounded px-2 py-1 min-w-[44px] shrink-0'
                  },
                    React.createElement('div', { className: `uppercase ${isLight ? 'text-gray-600' : 'text-gray-400'}` },
                      ev._date.toLocaleString('default', { month: 'short' })
                    ),
                    React.createElement('div', { className: `font-bold text-base ${isLight ? 'text-gray-900' : 'text-white'}` },
                      ev._date.getDate()
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('div', { className: `text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}` },
                      ev.title || ev.type
                    ),
                    React.createElement('div', { className: `text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, ev.productionTitle)
                  )
                )
              )
            )
      ),

      // Financial Summary
      React.createElement('div', { className: 'bg-surface rounded-lg p-5 border border-gray-700 banquo-card' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
          React.createElement('h3', { className: `text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}` }, '💰 Financial Summary'),
          React.createElement('button', {
            type: 'button',
            onClick: () => { window.location.hash = '#/financial'; },
            className: 'text-xs text-violet-400 hover:text-violet-300 underline'
          }, 'View full dashboard →')
        ),
        React.createElement('div', { className: 'space-y-3' },
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: `text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, `${currentYear} Donations`),
            React.createElement('span', { className: 'text-green-400 font-semibold' }, fmt(ytdTotal))
          ),
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: `text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, 'Total Gifts'),
            React.createElement('span', { className: `font-semibold ${isLight ? 'text-gray-900' : 'text-white'}` }, ytdDonations.length)
          ),
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: `text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, 'Unique Donors'),
            React.createElement('span', { className: `font-semibold ${isLight ? 'text-gray-900' : 'text-white'}` }, uniqueDonors)
          ),
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: `text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, 'All-Time Total'),
            React.createElement('span', { className: `font-semibold ${isLight ? 'text-gray-900' : 'text-white'}` },
              fmt(donations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0))
            )
          )
        )
      ),

      // Board Members
      React.createElement('div', { className: 'bg-surface rounded-lg p-5 border border-gray-700 banquo-card' },
        React.createElement('h3', { className: `text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}` }, '👥 Board Members'),
        boardMembers.length === 0
          ? React.createElement('p', { className: `text-sm italic ${isLight ? 'text-gray-600' : 'text-gray-500'}` }, 'No board members tagged yet. Tag contacts with "board member" in the Contacts hub.')
          : React.createElement('div', { className: 'space-y-2' },
              ...boardMembers.slice(0, 6).map(m => {
                const name = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || '?';
                const initial = name[0].toUpperCase();
                return React.createElement('div', {
                  key: m.id,
                  className: 'flex items-center gap-3 banquo-card--flat'
                },
                  React.createElement('div', {
                    className: 'w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-sm font-bold shrink-0'
                  }, initial),
                  React.createElement('div', null,
                    React.createElement('div', { className: `text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}` }, name),
                    m.email && React.createElement('div', { className: `text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}` }, m.email)
                  )
                );
              }),
              boardMembers.length > 6 && React.createElement('p', {
                className: `text-xs pt-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`
              }, `+${boardMembers.length - 6} more board members`)
            )
      )
    )
  ));
};

window.BoardDashboard = BoardDashboard;
console.log('✅ BoardDashboard loaded');
