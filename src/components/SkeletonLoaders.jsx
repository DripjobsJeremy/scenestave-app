/**
 * SkeletonLoaders.jsx
 * Reusable skeleton loading components for better UX during data fetching
 */

// Base skeleton animation class
const skeletonBase = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded";

// Card skeleton for dashboard stats
const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow p-4 space-y-3">
    <div className={`${skeletonBase} h-4 w-20`} />
    <div className={`${skeletonBase} h-8 w-16`} />
    <div className={`${skeletonBase} h-3 w-32`} />
  </div>
);

// Table row skeleton
const SkeletonTableRow = ({ columns = 5 }) => (
  <tr className="border-t">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-2 py-3">
        <div className={`${skeletonBase} h-4 ${i === 0 ? 'w-32' : 'w-24'}`} />
      </td>
    ))}
  </tr>
);

// Table skeleton
const SkeletonTable = ({ rows = 5, columns = 5 }) => (
  <div className="bg-white rounded shadow overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-2 py-2 text-left">
              <div className={`${skeletonBase} h-4 w-20`} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

// List item skeleton
const SkeletonListItem = () => (
  <div className="border rounded p-4 space-y-2 bg-white">
    <div className="flex justify-between items-start">
      <div className={`${skeletonBase} h-5 w-48`} />
      <div className={`${skeletonBase} h-6 w-16 rounded-full`} />
    </div>
    <div className={`${skeletonBase} h-4 w-full`} />
    <div className={`${skeletonBase} h-4 w-3/4`} />
    <div className="flex gap-2 mt-2">
      <div className={`${skeletonBase} h-3 w-16 rounded-full`} />
      <div className={`${skeletonBase} h-3 w-20 rounded-full`} />
    </div>
  </div>
);

// List skeleton
const SkeletonList = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <SkeletonListItem key={i} />
    ))}
  </div>
);

// Calendar/Grid skeleton
const SkeletonCalendar = () => (
  <div className="bg-white rounded shadow p-4">
    <div className="flex justify-between items-center mb-4">
      <div className={`${skeletonBase} h-6 w-32`} />
      <div className="flex gap-2">
        <div className={`${skeletonBase} h-8 w-8 rounded`} />
        <div className={`${skeletonBase} h-8 w-8 rounded`} />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className={`${skeletonBase} h-24 rounded`} />
      ))}
    </div>
  </div>
);

// Form skeleton
const SkeletonForm = ({ fields = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className={`${skeletonBase} h-4 w-24`} />
        <div className={`${skeletonBase} h-10 w-full rounded`} />
      </div>
    ))}
    <div className="flex gap-2 mt-6">
      <div className={`${skeletonBase} h-10 w-24 rounded`} />
      <div className={`${skeletonBase} h-10 w-20 rounded`} />
    </div>
  </div>
);

// Profile skeleton
const SkeletonProfile = () => (
  <div className="bg-white rounded-lg shadow p-6 space-y-4">
    <div className="flex items-start gap-4">
      <div className={`${skeletonBase} h-20 w-20 rounded-full`} />
      <div className="flex-1 space-y-2">
        <div className={`${skeletonBase} h-6 w-48`} />
        <div className={`${skeletonBase} h-4 w-64`} />
        <div className="flex gap-2 mt-2">
          <div className={`${skeletonBase} h-6 w-20 rounded-full`} />
          <div className={`${skeletonBase} h-6 w-16 rounded-full`} />
        </div>
      </div>
    </div>
    <div className="space-y-2 pt-4 border-t">
      <div className={`${skeletonBase} h-4 w-full`} />
      <div className={`${skeletonBase} h-4 w-5/6`} />
      <div className={`${skeletonBase} h-4 w-4/6`} />
    </div>
  </div>
);

// Dashboard skeleton (combines multiple components)
const SkeletonDashboard = () => (
  <div className="space-y-6 p-4">
    {/* Header */}
    <div className="space-y-2">
      <div className={`${skeletonBase} h-8 w-64`} />
      <div className={`${skeletonBase} h-4 w-48`} />
    </div>
    
    {/* Stats cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    
    {/* Content grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonList items={3} />
      </div>
      <div>
        <SkeletonList items={2} />
      </div>
    </div>
  </div>
);

// Export all components
window.SkeletonLoaders = {
  Card: SkeletonCard,
  TableRow: SkeletonTableRow,
  Table: SkeletonTable,
  ListItem: SkeletonListItem,
  List: SkeletonList,
  Calendar: SkeletonCalendar,
  Form: SkeletonForm,
  Profile: SkeletonProfile,
  Dashboard: SkeletonDashboard
};
