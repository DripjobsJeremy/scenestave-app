/**
 * ToastNotification.jsx
 * Reusable toast notification component for user feedback
 * Supports success, error, warning, and info variants
 */

const { useState, useEffect } = React;

const ToastNotification = ({ message, type = 'info', duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!visible) return null;

  const typeStyles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: '✅',
      iconBg: 'bg-green-100'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: '❌',
      iconBg: 'bg-red-100'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️',
      iconBg: 'bg-yellow-100'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100'
    }
  };

  const style = typeStyles[type] || typeStyles.info;
  const animationClass = exiting ? 'animate-slide-out-right' : 'animate-slide-in-right';

  return (
    <div
      className={`${style.bg} ${style.text} border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[320px] max-w-md ${animationClass}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`${style.iconBg} rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
        <span className="text-lg">{style.icon}</span>
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        aria-label="Close notification"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

// Toast Container Component
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Listen for custom toast events
    const handleToast = (event) => {
      const { message, type, duration } = event.detail;
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    window.addEventListener('showToast', handleToast);
    return () => window.removeEventListener('showToast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Helper function to show toast notifications
window.showToast = (message, type = 'info', duration = 4000) => {
  const event = new CustomEvent('showToast', {
    detail: { message, type, duration }
  });
  window.dispatchEvent(event);
};

// Convenience methods
window.toast = {
  success: (message, duration) => window.showToast(message, 'success', duration),
  error: (message, duration) => window.showToast(message, 'error', duration),
  warning: (message, duration) => window.showToast(message, 'warning', duration),
  info: (message, duration) => window.showToast(message, 'info', duration)
};

window.ToastContainer = ToastContainer;
