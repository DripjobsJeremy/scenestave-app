/**
 * OpportunityDetailPage.jsx
 * Detailed view of a volunteer opportunity with apply functionality

// ...existing code for icons, formatDate, formatTime, defaultFaqs from previous implementation...

const OpportunityDetailPage = () => {
  const [opportunity, setOpportunity] = useState(null);
  const [related, setRelated] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [faqOpen, setFaqOpen] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  // Get opportunityId from URL
  useEffect(() => {
    const urlParts = window.location.pathname.split('/');
    const opportunityId = urlParts[urlParts.length - 1];
    const storage = window.volunteerStorageService;
    const opp = storage?.getVolunteerOpportunityById?.(opportunityId);
    if (!opp) {
      setError('Opportunity not found.');
      return;
    }
    setOpportunity(opp);
    // Related opportunities
    const allOpps = storage?.getVolunteerOpportunities?.() || [];
    setRelated(allOpps.filter(o => o.category === opp.category && o.id !== opp.id).slice(0, 3));
    // Upcoming shifts
    const allShifts = storage?.getVolunteerShifts?.() || [];
    const upcoming = allShifts.filter(s => s.opportunityId === opp.id && s.status === 'open' && new Date(s.date) > new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);
    setShifts(upcoming);
  }, []);

  if (error) return <div className="max-w-xl mx-auto py-20 text-center text-red-600 text-xl">{error}</div>;
  if (!opportunity) return <div className="max-w-xl mx-auto py-20 text-center text-gray-600 text-xl">Loading...</div>;

  // Share URL
  const shareUrl = `${window.location.origin}/volunteer/opportunity/${opportunity.id}`;

  // Copy link
  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Email share
  function handleEmailShare() {
    const subject = `Check out this volunteer opportunity: ${opportunity.title}`;
    const body = `${opportunity.title} - ${opportunity.timeCommitment}\n\n${opportunity.description?.slice(0, 200)}\n\nLearn more: ${shareUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  // Social share
  function handleTwitterShare() {
    const text = `I'm interested in volunteering with our organization: ${opportunity.title}. Join me! ${shareUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
  }

  function handleFacebookShare() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  }

  // CTA
  function handleApply() {
    window.showVolunteerApplicationForm?.(opportunity.id);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-gray-900">
      <nav className="mb-6 text-sm text-gray-500 flex items-center gap-2">
        <a href="/" className="hover:underline">Home</a>
        <span>&gt;</span>
        <a href="/volunteer/opportunities" className="hover:underline">Volunteer Opportunities</a>
        <span>&gt;</span>
        <span className="font-semibold text-violet-700">{opportunity.title}</span>
      </nav>
      {/* Opportunity Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold text-sm">{opportunity.category}</span>
          <h1 className="text-3xl md:text-4xl font-bold">{opportunity.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-6 py-3 bg-violet-600 text-white rounded-lg font-bold text-lg shadow hover:bg-violet-700 transition-all" onClick={handleApply}>Apply Now</button>
          <div className="relative">
            <button className="px-4 py-3 bg-gray-100 text-violet-700 rounded-lg font-semibold text-lg shadow hover:bg-gray-200 transition-all" aria-haspopup="true">Share</button>
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
              <button className="block w-full text-left px-4 py-2 hover:bg-violet-50" onClick={handleCopy}>{copied ? 'Link Copied!' : 'Copy Link'}</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-violet-50" onClick={handleEmailShare}>Share via Email</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-violet-50" onClick={handleTwitterShare}>Share on Twitter</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-violet-50" onClick={handleFacebookShare}>Share on Facebook</button>
            </div>
          </div>
        </div>
      </div>
      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Overview</h2>
        <div className="prose prose-lg max-w-none mb-6" style={{ whiteSpace: 'pre-line' }}>{opportunity.description}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-2"><span className="text-2xl">⏱️</span><div><div className="font-semibold">Time Commitment</div><div>{opportunity.timeCommitment}</div></div></div>
          <div className="flex items-center gap-2"><span className="text-2xl">📂</span><div><div className="font-semibold">Category</div><div>{opportunity.category}</div></div></div>
          <div className="flex items-center gap-2"><span className="text-2xl">{opportunity.isActive ? '✓' : '⚡'}</span><div><div className="font-semibold">Status</div><div><span className={`px-2 py-1 rounded-full text-xs font-bold ${opportunity.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{opportunity.isActive ? 'Actively Recruiting' : 'Inactive'}</span></div></div></div>
        </div>
      </section>
      {/* What You'll Do */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">What You'll Do</h2>
        <div className="prose prose-lg max-w-none" style={{ whiteSpace: 'pre-line' }}>{opportunity.activities || opportunity.description}</div>
      </section>
      {/* Who We're Looking For */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">What We're Looking For</h2>
        <ul className="list-disc pl-6 mb-4">
          {(opportunity.requirements || []).map((req, i) => (
            <li key={i} className="mb-2 flex items-center gap-2">
              <span className="text-xl">🎯</span> {req.text || req}
            </li>
          ))}
        </ul>
        {opportunity.skills && (
          <div className="flex flex-wrap gap-2 mt-2">
            {opportunity.skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold">{skill}</span>
            ))}
          </div>
        )}
      </section>
      {/* Time Commitment Details */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Time Commitment</h2>
        <div className="mb-2">Typical shift length: <span className="font-semibold">{opportunity.timeCommitment}</span></div>
        <div className="mb-2">Frequency options: Weekly, monthly, or occasional</div>
        <div className="mb-2">Flexibility: Work as much or as little as your schedule allows</div>
        <div className="mb-2">Scheduling: Sign up for shifts that fit your availability</div>
        {opportunity.availability && (
          <div className="mb-2">We especially need volunteers on: <span className="font-semibold">{opportunity.availability}</span></div>
        )}
      </section>
      {/* Current Openings */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Upcoming Shifts</h2>
        {shifts.length === 0 ? (
          <div className="text-gray-600 mb-4">No shifts are currently scheduled for this opportunity.</div>
        ) : (
          <ul className="space-y-4">
            {shifts.map((shift, i) => (
              <li key={shift.id} className="p-4 rounded-lg shadow border flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-lg">{formatDate(shift.date)}</div>
                  <div className="text-gray-600">{formatTime(shift.startTime, shift.endTime)}</div>
                  <div className="text-gray-600">Location: {shift.location}</div>
                </div>
                <div className="flex flex-col items-end mt-4 md:mt-0">
                  <div className="mb-2">Slots Available: <span className="font-bold">{shift.slotsAvailable} of {shift.slotsNeeded}</span></div>
                  <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-3 rounded-full ${shift.slotsAvailable / shift.slotsNeeded > 0.5 ? 'bg-green-400' : shift.slotsAvailable / shift.slotsNeeded > 0.2 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${(shift.slotsAvailable / shift.slotsNeeded) * 100}%` }}></div>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-lg font-semibold text-white ${shift.slotsAvailable > 0 ? 'bg-violet-600 hover:bg-violet-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    disabled={shift.slotsAvailable === 0}
                    onClick={() => window.showShiftSignUpFlow?.(shift.id)}
                  >Sign Up</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {shifts.length > 10 && (
          <div className="mt-4 text-right">
            <a href="#" className="text-violet-600 hover:underline">View All Shifts</a>
          </div>
        )}
      </section>
      {/* Apply Now CTA */}
      <section className="mb-10 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Join Us?</h2>
        <button className="px-10 py-4 rounded-lg bg-violet-600 text-white font-bold text-xl shadow-lg hover:bg-violet-700 transition-all mr-4" onClick={handleApply}>Apply for This Opportunity</button>
        <div className="mt-2 text-gray-600">No experience necessary. Application takes less than 5 minutes. We'll contact you within 3-5 business days.</div>
      </section>
      {/* FAQs Accordion */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="divide-y divide-gray-200">
          {[...(opportunity.faqs || []), ...defaultFaqs].map((faq, i) => (
            <div key={i}>
              <button
                className="w-full text-left py-4 font-semibold text-violet-700 focus:outline-none flex items-center justify-between"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                aria-expanded={faqOpen === i}
              >
                {faq.q}
                <span>{faqOpen === i ? '-' : '+'}</span>
              </button>
              {faqOpen === i && (
                <div className="py-2 text-gray-700 text-base">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>
      {/* Related Opportunities */}
      {related.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">You Might Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {related.map((opp, i) => (
              <div key={opp.id} className="p-4 rounded-lg shadow border flex flex-col gap-2">
                <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold text-xs w-fit">{opp.category}</span>
                <div className="font-bold text-lg">{opp.title}</div>
                <div className="text-gray-600">{opp.timeCommitment}</div>
                <div className="text-gray-500 text-sm">{opp.description?.slice(0, 80)}...</div>
                <button className="mt-2 px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all" onClick={() => window.showOpportunityDetail?.(opp.id)}>Learn More</button>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* Share This Opportunity */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Share This Opportunity</h2>
        <div className="flex gap-4 flex-wrap">
          <button className="px-4 py-2 rounded-lg bg-gray-100 text-violet-700 font-semibold hover:bg-gray-200" onClick={handleCopy}>{copied ? 'Link Copied!' : 'Copy Link'}</button>
          <button className="px-4 py-2 rounded-lg bg-gray-100 text-violet-700 font-semibold hover:bg-gray-200" onClick={handleEmailShare}>Share via Email</button>
          <button className="px-4 py-2 rounded-lg bg-gray-100 text-violet-700 font-semibold hover:bg-gray-200" onClick={handleTwitterShare}>Share on Twitter</button>
          <button className="px-4 py-2 rounded-lg bg-gray-100 text-violet-700 font-semibold hover:bg-gray-200" onClick={handleFacebookShare}>Share on Facebook</button>
        </div>
      </section>
      {/* Contact */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Questions About This Opportunity?</h2>
        <div className="mb-2">Volunteer Coordinator: <span className="font-semibold">Jane Smith</span></div>
        <div className="mb-2">Email: <a href="mailto:volunteer@theatre.org" className="text-violet-700 hover:underline">volunteer@theatre.org</a></div>
        <div className="mb-2">Phone: <a href="tel:555-123-4567" className="text-violet-700 hover:underline">555-123-4567</a></div>
        <div className="mb-2">Contact Hours: Available Mon-Fri, 9am-5pm</div>
      </section>
      {/* Footer */}
      <footer className="mt-12 pt-8 border-t text-center text-gray-500 text-sm">
        <a href="/volunteer/opportunities" className="text-violet-700 hover:underline">&lt;&lt; View All Volunteer Opportunities</a>
        <div className="mt-2">Opportunity last updated: {opportunity.updatedAt ? formatDate(opportunity.updatedAt) : 'N/A'}</div>
      </footer>
    </div>
  );
};

window.OpportunityDetailPage = OpportunityDetailPage;
