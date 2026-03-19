/**
 * EmptyStates.jsx
 * Reusable empty state components with icons, messaging, and CTAs
 */

const EmptyStateBase = ({ icon, title, description, action, actionLabel, secondaryAction, secondaryActionLabel, illustration }) => (
  <div className="bg-white rounded-lg shadow p-8 text-center max-w-md mx-auto">
    {illustration ? (
      <div className="mb-4">{illustration}</div>
    ) : (
      <div className="text-6xl mb-4">{icon}</div>
    )}
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 mb-6">{description}</p>
    {action && (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={action}
          className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
        >
          {actionLabel}
        </button>
        {secondaryAction && (
          <button
            onClick={secondaryAction}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    )}
  </div>
);

// No shifts empty state
const EmptyShifts = ({ onCreateShift, onLoadTestData }) => (
  <EmptyStateBase
    icon="📅"
    title="No Shifts Scheduled"
    description="Get started by creating your first volunteer shift or load test data to explore features."
    action={onCreateShift}
    actionLabel="Create First Shift"
    secondaryAction={onLoadTestData}
    secondaryActionLabel="Load Test Data"
  />
);

// No opportunities empty state
const EmptyOpportunities = ({ onCreateOpportunity }) => (
  <EmptyStateBase
    icon="✨"
    title="No Opportunities Yet"
    description="Create volunteer opportunities to define the types of roles available for your organization."
    action={onCreateOpportunity}
    actionLabel="Create Opportunity"
  />
);

// No volunteers empty state
const EmptyVolunteers = ({ onViewApplications, onInviteVolunteers }) => (
  <EmptyStateBase
    icon="👥"
    title="No Volunteers Found"
    description="Start building your volunteer base by reviewing applications or inviting new volunteers."
    action={onViewApplications}
    actionLabel="Review Applications"
    secondaryAction={onInviteVolunteers}
    secondaryActionLabel="Invite Volunteers"
  />
);

// No applications empty state
const EmptyApplications = ({ onShareLink }) => (
  <EmptyStateBase
    icon="📋"
    title="No Applications Yet"
    description="Share your volunteer application link to start receiving applications from interested volunteers."
    action={onShareLink}
    actionLabel="Share Application Link"
  />
);

// No results from search/filter
const NoResults = ({ onClearFilters, searchTerm }) => (
  <EmptyStateBase
    icon="🔍"
    title="No Results Found"
    description={searchTerm ? `No results match "${searchTerm}". Try adjusting your search or filters.` : "No results match your current filters. Try adjusting your criteria."}
    action={onClearFilters}
    actionLabel="Clear Filters"
  />
);

// No upcoming shifts
const NoUpcomingShifts = ({ onScheduleShift }) => (
  <EmptyStateBase
    icon="🗓️"
    title="No Upcoming Shifts"
    description="There are no shifts scheduled in the near future. Schedule new shifts to keep volunteers engaged."
    action={onScheduleShift}
    actionLabel="Schedule Shifts"
  />
);

// No activity/history
const NoActivity = () => (
  <EmptyStateBase
    icon="📊"
    title="No Activity Yet"
    description="Activity will appear here as volunteers are assigned to shifts and complete their hours."
  />
);

// All caught up / no alerts
const AllCaughtUp = () => (
  <EmptyStateBase
    icon="✅"
    title="All Caught Up!"
    description="You're all set! There are no pending actions or alerts at this time."
  />
);

// No messages/communications
const NoMessages = ({ onComposeMessage }) => (
  <EmptyStateBase
    icon="✉️"
    title="No Messages"
    description="Start engaging with your volunteers by composing your first message."
    action={onComposeMessage}
    actionLabel="Compose Message"
  />
);

// No templates
const NoTemplates = ({ onCreateTemplate }) => (
  <EmptyStateBase
    icon="📝"
    title="No Templates Saved"
    description="Create reusable email templates to streamline your volunteer communications."
    action={onCreateTemplate}
    actionLabel="Create Template"
  />
);

// Export all components
window.EmptyStates = {
  Base: EmptyStateBase,
  Shifts: EmptyShifts,
  Opportunities: EmptyOpportunities,
  Volunteers: EmptyVolunteers,
  Applications: EmptyApplications,
  NoResults: NoResults,
  NoUpcomingShifts: NoUpcomingShifts,
  NoActivity: NoActivity,
  AllCaughtUp: AllCaughtUp,
  NoMessages: NoMessages,
  NoTemplates: NoTemplates
};
