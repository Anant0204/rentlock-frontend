// Notification Storage and Realtime Dispatcher for RentLock

const STORAGE_KEY = 'pm_notifications';

export const getStoredNotifications = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Could not read notifications cache', err);
  }
  return [];
};

export const saveNotifications = (notifications) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.warn('Could not save notifications cache', err);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pm:notification_updated'));
  }
};

export const addNotification = ({
  title,
  desc,
  content,
  body,
  targetRole = 'all', // 'all' | 'manager' | 'owner' | 'tenant' | 'admin'
  recipientEmail = null,
  recipientId = null,
  sender = 'Robert King (Admin)',
  link = '',
  time = 'Just now',
}) => {
  const current = getStoredNotifications();
  const description = desc || content || body || '';
  const newNotif = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: title || 'New Notification',
    desc: description,
    time: time || 'Just now',
    read: false,
    targetRole: (targetRole || 'all').toLowerCase(),
    recipientEmail: recipientEmail ? recipientEmail.toLowerCase().trim() : null,
    recipientId: recipientId ? String(recipientId) : null,
    sender: sender || 'Admin',
    link: link || '',
    createdAt: new Date().toISOString(),
  };

  const updated = [newNotif, ...current];
  saveNotifications(updated);
  return newNotif;
};

/**
 * Strict Role-Wise Notification Filtering:
 * - Tenant (role 'tenant') sees all notifications sent to Tenant.
 * - Manager (role 'manager') sees all notifications sent to Manager.
 * - Owner (role 'owner') sees all notifications sent to Owner.
 * - Admin (role 'admin') only sees notifications sent to Admin (never messages Admin sent out to others).
 * - All roles see announcements where targetRole === 'all'.
 */
export const getUserNotifications = (user) => {
  if (!user) return [];
  const current = getStoredNotifications();
  const userRole = (user.role || '').toLowerCase();
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.id ? String(user.id) : null;

  return current.filter((n) => {
    // 1. If notification is for a different role, don't show unless it's direct recipient or 'all'
    if (n.targetRole && n.targetRole !== 'all' && n.targetRole !== userRole) {
      const isDirectRecipient =
        (n.recipientEmail && userEmail && n.recipientEmail === userEmail) ||
        (n.recipientId && userId && String(n.recipientId) === userId);
      return Boolean(isDirectRecipient);
    }

    // 2. Exact role match (Tenant gets Tenant messages, Manager gets Manager messages, etc.)
    if (n.targetRole === userRole) {
      return true;
    }

    // 3. System-wide broadcasts for all roles
    if (n.targetRole === 'all') {
      return true;
    }

    // 4. Fallback direct match
    if (n.recipientEmail && userEmail && n.recipientEmail === userEmail) {
      return true;
    }
    if (n.recipientId && userId && String(n.recipientId) === userId) {
      return true;
    }

    return false;
  });
};

export const markAllUserNotificationsRead = (user) => {
  if (!user) return [];
  const current = getStoredNotifications();
  const userRole = (user.role || '').toLowerCase();
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.id ? String(user.id) : null;

  const updated = current.map((n) => {
    let isForUser = false;
    if (n.targetRole === userRole || n.targetRole === 'all') {
      isForUser = true;
    } else if (
      (n.recipientEmail && userEmail && n.recipientEmail === userEmail) ||
      (n.recipientId && userId && String(n.recipientId) === userId)
    ) {
      isForUser = true;
    }

    if (isForUser) {
      return { ...n, read: true };
    }
    return n;
  });

  saveNotifications(updated);
  return updated;
};

export const markNotificationRead = (notifId) => {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  saveNotifications(updated);
  return updated;
};
