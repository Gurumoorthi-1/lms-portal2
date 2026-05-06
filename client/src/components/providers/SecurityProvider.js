'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { logProctoringEvent } from '@/lib/api';

const SecurityContext = createContext(null);

/**
 * SecurityProvider - The Unified Security Orchestrator (CSO)
 * Centralizes violation tracking, proctoring listeners, and backend sync.
 */
export const SecurityProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [violations, setViolations] = useState([]);
  const [violationCounts, setViolationCounts] = useState({ total: 0, critical: 0, fs: 0 });
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [config, setConfig] = useState({
    sessionId: null,
    round: 'general',
    maxViolations: 5,
    maxCritical: 2,
    enabled: false
  });
  const lastToastTimeRef = useRef({});

  const startSecurity = useCallback((options) => {
    console.log('🛡️ Security Orchestrator: Starting session', options.sessionId);
    setConfig({
      sessionId: options.sessionId,
      round: options.round || 'general',
      maxViolations: options.maxViolations || 5,
      maxCritical: options.maxCritical || 2, // e.g., 2 fullscreen exits
      enabled: true
    });
    setViolations([]);
    setViolationCounts({ total: 0, critical: 0, fs: 0 });
    setIsDisqualified(false);
  }, []);

  const stopSecurity = useCallback(() => {
    console.log('🛡️ Security Orchestrator: Stopping session');
    setConfig(prev => ({ ...prev, enabled: false }));
  }, []);

  const reportViolation = useCallback(async (type, message, severity = 'warning') => {
    if (!config.enabled || isDisqualified) return;

    const now = Date.now();
    
    setViolationCounts(prev => {
      const isFS = type === 'fullscreen_exit' || type === 'screen_exit';
      const isCrit = severity === 'critical' || isFS;
      
      const newCounts = {
        total: prev.total + 1,
        critical: isCrit ? prev.critical + 1 : prev.critical,
        fs: isFS ? prev.fs + 1 : prev.fs
      };

      // Check disqualification within the state update to be precise
      // NEW: Immediate termination for tab_switch_timeout or reaching max violations
      if (type === 'tab_switch_timeout' || newCounts.total >= config.maxViolations || newCounts.fs >= config.maxCritical) {
        setIsDisqualified(true);
      }

      return newCounts;
    });

    const newViolation = {
      id: now,
      ts: now,
      type,
      message,
      severity,
      timestamp: new Date().toISOString()
    };

    setViolations(prev => [...prev, newViolation]);

    // Toast Notification (with 5s cooldown to prevent spam)
    const toastKey = `violation-${type}`;
    if (!lastToastTimeRef.current[type] || now - lastToastTimeRef.current[type] > 5000) {
      if (severity === 'critical') {
        toast.error(message, { 
          id: toastKey,
          icon: '🚨', 
          duration: 5000,
          style: { border: '2px solid #ef4444', background: '#fef2f2' }
        });
      } else {
        toast.error(message, { id: toastKey, icon: '⚠️' });
      }
      lastToastTimeRef.current = { ...lastToastTimeRef.current, [type]: now };
    }

    // Backend Sync
    if (config.sessionId) {
      try {
        await logProctoringEvent(config.sessionId, type, message, severity, config.round);
      } catch (err) {
        console.error('Failed to sync violation to backend:', err);
      }
    }
  }, [config, isDisqualified]);

  // Global Listeners (Tab/Fullscreen/Shortcuts)
  useEffect(() => {
    if (!config.enabled || isDisqualified) return;
    
    // Bypass security listeners completely if the user is on the analytics or student dashboard page
    const isSafePage = pathname?.includes('/analytics') || pathname === '/student';
    if (isSafePage) return;

    const handleVisibility = () => {
      if (document.hidden) {
        const severity = config.round === 'coding' ? 'critical' : 'warning';
        reportViolation('tab_switch', 'Tab switching detected! This event has been logged.', severity);
      }
    };

    const handleFsChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFs) {
        reportViolation('fullscreen_exit', 'Fullscreen mode exited. Please return to continue.', 'warning');
      }
    };

    const handleKeydown = (e) => {
      // Block common cheating shortcuts
      const forbiddenKeys = ['c', 'v', 'r', 't', 'w', 'f', 'p'];
      if ((e.ctrlKey || e.metaKey) && forbiddenKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
        reportViolation('keyboard_shortcut', `Blocked shortcut: Ctrl+${e.key.toUpperCase()}`, 'warning');
      }
      
      // Block F12 (DevTools)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        reportViolation('devtools', 'Developer Tools access attempt blocked.', 'critical');
      }
    };

    const preventContext = (e) => e.preventDefault();

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('contextmenu', preventContext);
    window.addEventListener('copy', preventContext);
    window.addEventListener('paste', preventContext);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('contextmenu', preventContext);
      window.removeEventListener('copy', preventContext);
      window.removeEventListener('copy', preventContext);
      window.removeEventListener('paste', preventContext);
    };
  }, [config.enabled, isDisqualified, reportViolation, pathname]);

  return (
    <SecurityContext.Provider value={{
      violations,
      totalViolations: violations.length,
      isDisqualified,
      startSecurity,
      stopSecurity,
      reportViolation,
      config
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
