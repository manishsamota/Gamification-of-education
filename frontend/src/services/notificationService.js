
import { toast } from 'react-toastify';

class NotificationService {
  constructor() {
    this.activeToasts = new Set();
    this.debounceTimers = new Map();
  }

  // Clear any existing toast with the same ID and show new one
  showToast(type, message, options = {}) {
    const toastId = options.toastId || `${type}-${Date.now()}`;
    
    // Clear any existing debounce timer for this toast
    if (this.debounceTimers.has(toastId)) {
      clearTimeout(this.debounceTimers.get(toastId));
      this.debounceTimers.delete(toastId);
    }
    
  
    const timer = setTimeout(() => {

      toast.dismiss(toastId);
          
      this.activeToasts.delete(toastId);
      
      // this will show the new toast
      const toastOptions = {
        toastId,
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        onClose: () => {
          this.activeToasts.delete(toastId);
          this.debounceTimers.delete(toastId);
        },
        ...options
      };

      switch (type) {
        case 'success':
          toast.success(message, toastOptions);
          break;
        case 'error':
          toast.error(message, toastOptions);
          break;
        case 'info':
          toast.info(message, toastOptions);
          break;
        case 'warning':
          toast.warning(message, toastOptions);
          break;
        default:
          toast(message, toastOptions);
      }

      this.activeToasts.add(toastId);
      this.debounceTimers.delete(toastId);
    }, 100); // 100ms debounce

    this.debounceTimers.set(toastId, timer);
  }

  success(message, options = {}) {
    this.showToast('success', message, options);
  }

  error(message, options = {}) {
    this.showToast('error', message, options);
  }

  info(message, options = {}) {
    this.showToast('info', message, options);
  }

  warning(message, options = {}) {
    this.showToast('warning', message, options);
  }

  // Specific notification methods with predefined IDs
  loginSuccess(userName) {
    this.success(`Welcome back, ${userName}! 🎉`, { 
      toastId: 'login-success' 
    });
  }

  loginError(message) {
    this.error(message || 'Login failed', { 
      toastId: 'login-error' 
    });
  }

  signupSuccess(userName) {
    this.success(`Welcome to EduGame, ${userName}! 🚀`, { 
      toastId: 'signup-success' 
    });
  }

  signupError(message) {
    this.error(message || 'Signup failed', { 
      toastId: 'signup-error' 
    });
  }

  logoutSuccess(userName) {
    this.info(`Goodbye${userName ? `, ${userName}` : ''}! See you soon! 👋`, { 
      toastId: 'logout-success' 
    });
  }

  profileUpdated() {
    this.success('Profile updated successfully! ✅', { 
      toastId: 'profile-updated' 
    });
  }

  profileError(message) {
    this.error(message || 'Failed to update profile', { 
      toastId: 'profile-error' 
    });
  }

  sessionExpired() {
    this.error('Session expired. Please login again.', { 
      toastId: 'session-expired' 
    });
  }

  challengeCompleted(xp) {
    this.success(`Challenge completed! +${xp} XP earned! 🎯`, { 
      toastId: 'challenge-completed' 
    });
  }

  achievementUnlocked(title) {
    this.success(`Achievement unlocked: ${title}! 🏆`, { 
      toastId: 'achievement-unlocked' 
    });
  }

  // Clear all active toasts
  clearAll() {
    toast.dismiss();
    this.activeToasts.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  // Clear specific toast
  clear(toastId) {
    toast.dismiss(toastId);
    this.activeToasts.delete(toastId);
    if (this.debounceTimers.has(toastId)) {
      clearTimeout(this.debounceTimers.get(toastId));
      this.debounceTimers.delete(toastId);
    }
  }
}


export default new NotificationService();