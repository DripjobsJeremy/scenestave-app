const icons = {
  hours: '⏱️',
  volunteers: '👥',
  shows: '🎭',
  community: '⭐',
};

const getYear = () => new Date().getFullYear();
const startOfYear = new Date(getYear(), 0, 1).getTime();
const now = Date.now();

// Helper for animated count-up
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return count;
}

const VolunteerImpactTracker = () => {
  // State
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    activeVolunteers: 0,
    showsSupported: 0,
    communityServed: 5000,
  });
  const [categoryStats, setCategoryStats] = useState([]);
  const [topVolunteers, setTopVolunteers] = useState([]);
  const [privacy, setPrivacy] = useState({ showNames: true, showPhotos: false, enabled: true });
  const [milestones, setMilestones] = useState([]);
  const [impactMessage, setImpactMessage] = useState('Our volunteers make it possible to bring world-class theatre to our community. From ushering guests to supporting productions backstage, every contribution matters. Thank you to all our amazing volunteers!');
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(true);

  // Load metrics from localStorage/services
  useEffect(() => {
    setLoading(true);
    // Replace with actual service calls
    const svc = window.volunteerCalculationService;
    const storage = window.volunteerStorageService;
    // Total hours
    const totalHours = svc?.calculateTotalOrganizationHours?.(startOfYear, now) || 1250;
    // Active volunteers
    const volunteers = storage?.getVolunteerProfiles?.() || [];
    const activeVolunteers = volunteers.filter(v => v.status === 'active').length || 45;
    // Shows supported
    const shifts = storage?.getVolunteerShifts?.() || [];
    const showsSupported = new Set(shifts.map(s => s.title || s.category)).size || 12;
    // Community served
    // (manual or from settings)
    const communityServed = 5000;
    setMetrics({ totalHours, activeVolunteers, showsSupported, communityServed });

    // Hours by category
    const categories = ['Front of House', 'Backstage Crew', 'Administrative', 'Event Support'];
    const categoryHours = {};
    shifts.forEach(s => {
      const opp = storage?.getVolunteerOpportunityById?.(s.opportunityId);
      const cat = opp?.category || 'Other';
      if (!categoryHours[cat]) categoryHours[cat] = 0;
      (s.assignments || []).forEach(a => {
        if (a.status === 'completed' && a.checkInTime && a.checkOutTime) {
          categoryHours[cat] += (a.checkOutTime - a.checkInTime) / 3600000;
        }
      });
    });
    const totalCatHours = Object.values(categoryHours).reduce((a, b) => a + b, 0);
    const categoryStatsArr = Object.entries(categoryHours).map(([cat, hours]) => ({
      category: cat,
      hours: Math.round(hours * 10) / 10,
      percent: totalCatHours ? Math.round((hours / totalCatHours) * 100) : 0,
    })).sort((a, b) => b.hours - a.hours);
    setCategoryStats(categoryStatsArr);

    // Top volunteers
    let topVols = svc?.getTopVolunteers?.(5, period) || [];
    // Privacy settings (mock: could be loaded from admin config)
    const privacySettings = JSON.parse(localStorage.getItem('volunteerLeaderboardPrivacy') || '{}');
    setPrivacy({
      showNames: privacySettings.showNames ?? true,
      showPhotos: privacySettings.showPhotos ?? false,
      enabled: privacySettings.enabled ?? true,
    });
    setTopVolunteers(topVols);

    // Milestones
    const ms = JSON.parse(localStorage.getItem('volunteerMilestones') || '[]');
    setMilestones(ms);

    // Impact message
    setImpactMessage(localStorage.getItem('volunteerImpactMessage') || impactMessage);
    setLoading(false);
  }, [period]);

  // Animated numbers
  const hoursCount = useCountUp(metrics.totalHours);
  const volunteersCount = useCountUp(metrics.activeVolunteers);
  const showsCount = useCountUp(metrics.showsSupported);
  const communityCount = useCountUp(metrics.communityServed);

  // Time period options
  const periodOptions = [
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="py-12 text-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-4">🤝</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Our Volunteer Impact</h1>
          <p className="text-xl opacity-90 mb-4">See the difference our volunteers make</p>
        </div>
      </header>
      {/* Hero Stats */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Stat Cards */}
        <StatCard icon={icons.hours} value={hoursCount} label="hours" subtitle={`Contributed in ${getYear()}`} color="bg-violet-600" />
        <StatCard icon={icons.volunteers} value={volunteersCount} label="active volunteers" subtitle="In our community" color="bg-purple-600" />
        <StatCard icon={icons.shows} value={showsCount} label="productions" subtitle="This season" color="bg-indigo-600" />
        <StatCard icon={icons.community} value={communityCount + '+'} label="served" subtitle="This year" color="bg-yellow-500" />
      </section>
      {/* Hours by Category Visualization */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center">Where Our Volunteers Contribute</h2>
        <div className="space-y-4">
          {categoryStats.map((cat, i) => (
            <div key={cat.category} className="flex items-center gap-4">
              <div className="w-40 text-right font-semibold text-gray-700">{cat.category}</div>
              <div className="flex-1">
                <div className="h-6 rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    className="h-6 rounded-full"
                    style={{ width: `${cat.percent}%`, background: `linear-gradient(90deg, #7c3aed, #6366f1)` }}
                  ></div>
                </div>
              </div>
              <div className="w-16 text-right font-bold text-violet-700">{cat.hours}</div>
              <div className="w-12 text-right text-gray-500">{cat.percent}%</div>
            </div>
          ))}
        </div>
      </section>
      {/* Top Volunteers Leaderboard */}
      {privacy.enabled && (
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">Volunteer Spotlight</h2>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="font-semibold text-lg mb-2 md:mb-0">Top Volunteers</div>
            <select
              className="px-3 py-2 rounded border border-gray-300 text-sm"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              aria-label="Select time period"
            >
              {periodOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <ol className="space-y-4">
            {topVolunteers.map((v, i) => (
              <li key={v.id || i} className={`flex items-center gap-4 p-4 rounded-lg shadow-md ${i < 3 ? 'bg-yellow-50' : 'bg-white'}`}>
                <div className="text-2xl font-bold">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}
                </div>
                {privacy.showPhotos && v.photo ? (
                  <img src={v.photo} alt={privacy.showNames ? v.name : v.initials} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center text-xl font-bold">
                    {privacy.showNames ? (v.name?.[0] || v.initials?.[0] || '?') : (v.initials || '?')}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-violet-700 text-lg">
                    {privacy.showNames ? v.name : v.initials}
                  </div>
                  <div className="text-gray-500 text-sm">{v.hours} hours</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {/* Milestones Timeline */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center">Volunteer Milestones</h2>
        <div className="border-l-4 border-violet-300 pl-6">
          {milestones.slice(0, 8).map((m, i) => (
            <div key={i} className="mb-8 relative">
              <div className="absolute -left-7 top-0 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white font-bold">{m.icon || '🎉'}</div>
              <div className="text-lg font-semibold text-violet-700">{m.description}</div>
              <div className="text-sm text-gray-500">{m.date}</div>
            </div>
          ))}
        </div>
      </section>
      {/* Community Impact Statement */}
      <section className="py-12 bg-violet-50 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Community Impact</h2>
          <div className="text-lg text-gray-700 mb-6">{impactMessage}</div>
        </div>
      </section>
      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Become a Volunteer Today</h2>
        <button
          className="px-10 py-4 rounded-lg bg-yellow-400 text-violet-900 font-bold text-xl shadow-lg hover:bg-yellow-300 transition-all mr-4"
          onClick={() => window.showVolunteerApplicationForm?.()}
        >
          Apply to Volunteer
        </button>
        <button
          className="px-8 py-4 rounded-lg bg-white/20 text-white font-semibold text-lg shadow hover:bg-white/30 transition-all"
          onClick={() => window.showBrowseOpportunities?.()}
        >
          Learn More About Opportunities
        </button>
        <div className="mt-6 text-lg">
          Join our community of {metrics.activeVolunteers} volunteers making a difference.<br />
          No experience necessary – we provide training.
        </div>
      </section>
    </div>
  );
};

// Stat Card Component
function StatCard({ icon, value, label, subtitle, color }) {
  return (
    <div className={`rounded-xl shadow-lg p-8 flex flex-col items-center justify-center ${color} text-white`}>
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-6xl font-bold mb-2">{value}</div>
      <div className="text-lg font-semibold mb-1">{label}</div>
      <div className="text-sm opacity-80">{subtitle}</div>
    </div>
  );
}

window.VolunteerImpactTracker = VolunteerImpactTracker;
