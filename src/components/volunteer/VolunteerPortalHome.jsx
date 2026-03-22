/**
 * VolunteerPortalHome.jsx
 * Public-facing volunteer program landing page - no login required
 */

const { useState, useEffect } = React;

const VolunteerPortalHome = () => {
  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;

  // State for modals
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applyPrefill, setApplyPrefill] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOpportunityDetail, setShowOpportunityDetail] = useState(null);
  const [showBrowseOpportunities, setShowBrowseOpportunities] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Auto-popup login modal if redirected due to session expiry
  useEffect(() => {
    // Check for session expiry marker in URL
    if (window.location.search.includes('sessionExpired')) {
      setSessionExpired(true);
      setShowLoginModal(true);
    }
  }, []);

  // State for FAQ accordion
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // State for impact stats
  const [stats, setStats] = useState({
    totalHours: 0,
    activeVolunteers: 0,
    productionsSupported: 0,
    communityServed: 5000 // Default/placeholder
  });

  // Load impact stats
  useEffect(() => {
    const volunteers = storage?.getVolunteerProfiles() || [];
    const activeCount = volunteers.filter(v => v.volunteerInfo?.status === 'active').length;
    
    // Calculate total hours
    let totalHours = 0;
    volunteers.forEach(v => {
      const hours = calc?.calculateVolunteerHours ? calc.calculateVolunteerHours(v.id) : (v.volunteerInfo?.totalHours || 0);
      totalHours += hours;
    });

    // Count productions (shifts grouped by unique dates/productions)
    const shifts = storage?.getVolunteerShifts() || [];
    const uniqueProductions = new Set(shifts.map(s => s.title || s.category).filter(Boolean));

    setStats({
      totalHours: Math.round(totalHours),
      activeVolunteers: activeCount,
      productionsSupported: uniqueProductions.size || 12, // fallback
      communityServed: 5000 // placeholder - can be admin configurable
    });
  }, []);

  // Featured opportunities
  const opportunities = storage?.getVolunteerOpportunities() || [];
  const featuredOpps = opportunities.filter(o => o.featured).slice(0, 4);
  const displayOpps = featuredOpps.length > 0 ? featuredOpps : opportunities.slice(0, 4);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const benefitCards = [
    { icon: '🎭', title: 'Support the Arts', text: 'Help bring world-class performances to our community' },
    { icon: '👥', title: 'Meet Like-Minded People', text: 'Connect with others who share your passion for theatre' },
    { icon: '📈', title: 'Gain Experience', text: 'Develop new skills and build your resume' },
    { icon: '⭐', title: 'Make a Difference', text: 'Your contribution directly impacts our success' }
  ];

  const faqItems = [
    {
      question: 'How do I get started?',
      answer: 'Click "Apply to Volunteer" above to fill out our application. We\'ll review it and contact you within 3-5 business days.'
    },
    {
      question: 'What opportunities are available?',
      answer: 'We have opportunities in Front of House (ushers, box office), Backstage Crew, Administrative support, and Event assistance. Browse all opportunities below.'
    },
    {
      question: 'How much time do I need to commit?',
      answer: 'Most volunteer shifts are 2-4 hours. You can volunteer as often as your schedule allows - weekly, monthly, or just for special events.'
    },
    {
      question: 'Is training provided?',
      answer: 'Yes! We provide orientation and role-specific training for all volunteers. No experience necessary.'
    },
    {
      question: 'Can I volunteer with friends/family?',
      answer: 'Absolutely! We love group volunteering. Mention your group in your application or when signing up for shifts.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Session expired message */}
      {sessionExpired && (
        <div className="fixed top-0 left-0 w-full bg-red-100 text-red-700 py-3 px-6 text-center z-50 shadow">
          Your session expired. Please log in again to continue.
        </div>
      )}
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Join Our Volunteer Community</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Make a difference in the arts. Join our passionate community of volunteers.
          </p>
          <button
            onClick={() => { setApplyPrefill(null); setShowApplicationForm(true); }}
            className="bg-white text-violet-700 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transition-all transform hover:scale-105"
          >
            Apply to Volunteer
          </button>
        </div>
      </section>

      {/* Why Volunteer Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Volunteer With Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefitCards.map((card, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Opportunities Showcase */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Current Volunteer Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayOpps.map((opp) => (
              <div key={opp.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                  opp.category === 'Front of House' ? 'bg-blue-100 text-blue-700' :
                  opp.category === 'Backstage' ? 'bg-purple-100 text-purple-700' :
                  opp.category === 'Administrative' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {opp.category || 'General'}
                </span>
                <h3 className="text-xl font-semibold mb-2">{opp.title || 'Volunteer Opportunity'}</h3>
                <p className="text-sm text-gray-600 mb-2">{opp.timeCommitment || 'Flexible schedule'}</p>
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {opp.description?.substring(0, 100) || 'Help support our theatre productions and events.'}...
                </p>
                <button
                  onClick={() => setShowOpportunityDetail(opp)}
                  className="text-violet-600 hover:text-violet-800 text-sm font-semibold"
                >
                  Learn More →
                </button>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button
              onClick={() => setShowBrowseOpportunities(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              View All Opportunities
            </button>
          </div>
        </div>
      </section>

      {/* Impact Stats Section */}
      <section className="py-16 bg-violet-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Volunteer Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-violet-600 mb-2">
                {stats.totalHours.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Hours Contributed</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">
                {stats.activeVolunteers}
              </div>
              <div className="text-sm text-gray-600 font-medium">Active Volunteers</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">
                {stats.productionsSupported}
              </div>
              <div className="text-sm text-gray-600 font-medium">Productions Supported</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-pink-600 mb-2">
                {stats.communityServed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Community Members Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Already a Volunteer Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Returning Volunteer?</h2>
          <p className="text-lg mb-8 opacity-90">
            Access your volunteer dashboard to view upcoming shifts and sign up for more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Check Your Schedule
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Sign Up for Shifts
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  aria-expanded={!!(openFaqIndex === index)}
                >
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <span className="text-2xl text-gray-400">
                    {openFaqIndex === index ? '−' : '+'}
                  </span>
                </button>
                {openFaqIndex === index && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Have Questions?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Contact us anytime with questions about volunteering
          </p>
          <div className="space-y-2">
            <div className="text-lg">
              <span className="font-semibold">Volunteer Coordinator:</span> Sarah Johnson
            </div>
            <div>
              <a href="mailto:volunteers@theatre.org" className="text-violet-600 hover:text-violet-800 font-semibold">
                volunteers@theatre.org
              </a>
            </div>
            <div className="text-gray-600">
              (555) 123-4567
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-white text-center">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-sm opacity-75 mb-2">
            © {new Date().getFullYear()} Theatre Volunteer Program. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <a href="#" className="hover:text-violet-400 transition-colors">Privacy Policy</a>
            <span className="opacity-50">•</span>
            <a href="#" className="hover:text-violet-400 transition-colors">Main Website</a>
          </div>
        </div>
      </footer>

      {/* Modals - Placeholder until components are built */}
      {showApplicationForm && window.VolunteerApplicationForm && React.createElement(window.VolunteerApplicationForm, {
        isModal: false,
        prefill: applyPrefill,
        onClose: () => setShowApplicationForm(false),
        onSubmitted: () => {
          setShowApplicationForm(false);
          window.toast?.success?.('Application submitted! We\'ll contact you within 3-5 business days.');
        }
      })}

      {showLoginModal && window.VolunteerLogin && React.createElement(window.VolunteerLogin, {
        isModal: true,
        onClose: () => setShowLoginModal(false),
        onSuccess: (volunteer) => {
          setShowLoginModal(false);
          // Redirect to dashboard page instead of showing overlay
          window.location.href = '/volunteer-dashboard.html';
        },
        sessionExpired: sessionExpired
      })}

      {showOpportunityDetail && window.OpportunityDetailPage && React.createElement(window.OpportunityDetailPage, {
        opportunity: showOpportunityDetail,
        onClose: () => setShowOpportunityDetail(null),
        onApply: (opp) => {
          setShowOpportunityDetail(null);
          // Prefill category and specific opportunity
          setApplyPrefill({ category: opp?.category, opportunityId: opp?.id });
          setShowApplicationForm(true);
        }
      })}

      {showBrowseOpportunities && window.BrowseOpportunities && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBrowseOpportunities(false)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-gray-900">All Volunteer Opportunities</h2>
            </div>
            <button
              onClick={() => setShowApplicationForm(true)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold"
            >
              Apply to Volunteer
            </button>
          </div>
          {/* Render browse component */}
          {React.createElement(window.BrowseOpportunities, {
            onSelectOpportunity: (opp) => {
              setShowBrowseOpportunities(false);
              setShowOpportunityDetail(opp);
            }
          })}
        </div>
      )}
    </div>
  );
};

window.VolunteerPortalHome = VolunteerPortalHome;
