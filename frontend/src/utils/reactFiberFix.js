// Utility to suppress React Fiber removeChild errors
// This is a temporary fix for React 19 compatibility issues

const originalError = console.error;
const originalWarn = console.warn;

export const suppressReactFiberErrors = () => {
  // Intercept console.error to filter out removeChild errors
  console.error = (...args) => {
    const errorString = args.join(' ');
    
    // Check if it's a removeChild error
    if (
      errorString.includes('removeChild') ||
      errorString.includes('removeChildFromContainer') ||
      errorString.includes('NotFoundError') ||
      (errorString.includes('Node') && errorString.includes('child'))
    ) {
      // Log a simplified warning instead of the full error
      console.warn('React DOM manipulation warning suppressed (removeChild issue)');
      return;
    }
    
    // Allow other errors to pass through
    originalError.apply(console, args);
  };

  // Also intercept warnings
  console.warn = (...args) => {
    const warnString = args.join(' ');
    
    if (
      warnString.includes('removeChild') ||
      warnString.includes('commitDeletionEffectsOnFiber')
    ) {
      return; // Suppress React Fiber warnings
    }
    
    originalWarn.apply(console, args);
  };
};

export const restoreConsole = () => {
  console.error = originalError;
  console.warn = originalWarn;
};

// Add global error handler for unhandled promise rejections
export const addGlobalErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    if (
      event.error?.message?.includes('removeChild') ||
      event.error?.message?.includes('NotFoundError')
    ) {
      event.preventDefault();
      console.warn('Global removeChild error suppressed');
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.message?.includes('removeChild') ||
      event.reason?.message?.includes('NotFoundError')
    ) {
      event.preventDefault();
      console.warn('Unhandled removeChild promise rejection suppressed');
      return false;
    }
  });
};

// DOM monkey patch as last resort
export const patchDOMRemoveChild = () => {
  const originalRemoveChild = Node.prototype.removeChild;
  
  Node.prototype.removeChild = function(child) {
    try {
      // Check if child is actually a child of this node
      if (this.contains && !this.contains(child)) {
        console.warn('Attempted to remove non-child node, ignoring');
        return child;
      }
      
      return originalRemoveChild.call(this, child);
    } catch (error) {
      if (error.name === 'NotFoundError' || error.message.includes('removeChild')) {
        console.warn('removeChild error caught and suppressed:', error.message);
        return child;
      }
      throw error;
    }
  };
};