/**
 * KeyboardShortcuts Component
 * 
 * Provides keyboard shortcuts for common actions throughout the application.
 * Shortcuts are context-aware and respect modals, forms, and input focus.
 * 
 * Global Shortcuts:
 * - N: Create new shift (opens shift creation modal)
 * - /: Focus search input
 * - ESC: Close open modals/dialogs
 * - ?: Show keyboard shortcuts help
 * 
 * Form Shortcuts (when in forms):
 * - Cmd/Ctrl + S: Save form
 * - Cmd/Ctrl + Enter: Submit form
 * 
 * Calendar Shortcuts (in shift scheduler):
 * - Arrow keys: Navigate calendar
 * - T: Go to today
 */

const { useState, useEffect } = React;

const KeyboardShortcuts = ({ 
  onNewShift,
  onFocusSearch,
  onCloseModal,
  onSaveForm,
  onNavigateCalendar,
  onToday,
  children 
}) => {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
                       e.target.isContentEditable;

      // Ignore if any modifier keys are pressed (except for specific shortcuts)
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      // Handle form save shortcuts (Cmd/Ctrl + S or Cmd/Ctrl + Enter)
      if (hasModifier && (e.key === 's' || e.key === 'Enter')) {
        if (onSaveForm && isTyping) {
          e.preventDefault();
          onSaveForm();
          return;
        }
      }

      // Don't process other shortcuts if user is typing
      if (isTyping && !hasModifier) return;

      switch(e.key) {
        case 'n':
        case 'N':
          if (!hasModifier && onNewShift) {
            e.preventDefault();
            onNewShift();
          }
          break;

        case '/':
          if (!hasModifier && onFocusSearch) {
            e.preventDefault();
            onFocusSearch();
          }
          break;

        case 'Escape':
          if (onCloseModal) {
            e.preventDefault();
            onCloseModal();
          }
          break;

        case '?':
          if (!hasModifier) {
            e.preventDefault();
            setShowHelp(prev => !prev);
          }
          break;

        case 't':
        case 'T':
          if (!hasModifier && onToday) {
            e.preventDefault();
            onToday();
          }
          break;

        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          // Only handle arrow keys if not in an input and onNavigateCalendar is provided
          if (!isTyping && onNavigateCalendar) {
            e.preventDefault();
            onNavigateCalendar(e.key);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewShift, onFocusSearch, onCloseModal, onSaveForm, onNavigateCalendar, onToday]);

  return (
    <>
      {children}
      
      {/* Keyboard Shortcuts Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close keyboard shortcuts help"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Global Shortcuts */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Global Shortcuts</h3>
                <div className="space-y-2">
                  <ShortcutRow keys={['N']} description="Create new shift" />
                  <ShortcutRow keys={['/']} description="Focus search" />
                  <ShortcutRow keys={['ESC']} description="Close modal or dialog" />
                  <ShortcutRow keys={['?']} description="Show this help" />
                </div>
              </div>

              {/* Form Shortcuts */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Form Shortcuts</h3>
                <div className="space-y-2">
                  <ShortcutRow keys={['⌘', 'S']} description="Save form" mac />
                  <ShortcutRow keys={['Ctrl', 'S']} description="Save form" />
                  <ShortcutRow keys={['⌘', 'Enter']} description="Submit form" mac />
                  <ShortcutRow keys={['Ctrl', 'Enter']} description="Submit form" />
                </div>
              </div>

              {/* Calendar Shortcuts */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Calendar Navigation</h3>
                <div className="space-y-2">
                  <ShortcutRow keys={['T']} description="Go to today" />
                  <ShortcutRow keys={['←', '→']} description="Navigate days/weeks" />
                  <ShortcutRow keys={['↑', '↓']} description="Navigate weeks/months" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> anytime to show this help
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper component for displaying shortcut rows
const ShortcutRow = ({ keys, description, mac = false }) => {
  // Only show mac shortcuts on mac, non-mac shortcuts on other platforms
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (mac && !isMac) return null;
  if (!mac && isMac && (keys.includes('Ctrl') || keys.includes('⌘'))) return null;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400 mx-1">+</span>}
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-800">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Export to window for use in other components
window.KeyboardShortcuts = KeyboardShortcuts;
