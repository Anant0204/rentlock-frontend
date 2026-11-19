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
 * Strict Role-Wise and Recipient-Wise Notification Filtering:
 * - Tenant only sees notifications meant for Tenant.
 * - Manager only sees notifications meant for Manager.
 * - Owner only sees notifications meant for Owner.
 * - Admin only sees notifications meant for Admin (never messages sent out to others).
 */
export const getUserNotifications = (user) => {
  if (!user) return [];
  const current = getStoredNotifications();
  const userRole = (user.role || '').toLowerCase();
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.id ? String(user.id) : null;

  return current.filter((n) => {
    // 1. If direct recipient is specified (by email or ID)
    if (n.recipientEmail || n.recipientId) {
      const matchEmail = n.recipientEmail && userEmail && n.recipientEmail === userEmail;
      const matchId = n.recipientId && userId && String(n.recipientId) === userId;
      // Only the exact recipient can see this direct notification
      return Boolean(matchEmail || matchId);
    }

    // 2. Strict Role-based notifications (Tenant -> Tenant, Owner -> Owner, Manager -> Manager, Admin -> Admin)
    if (n.targetRole === 'tenant') {
      return userRole === 'tenant';
    }
    if (n.targetRole === 'manager') {
      return userRole === 'manager';
    }
    if (n.targetRole === 'owner') {
      return userRole === 'owner';
    }
    if (n.targetRole === 'admin') {
      return userRole === 'admin';
    }

    // 3. System-wide broadcasts
    if (n.targetRole === 'all') {
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
    if (n.recipientEmail || n.recipientId) {
      const matchEmail = n.recipientEmail && userEmail && n.recipientEmail === userEmail;
      const matchId = n.recipientId && userId && String(n.recipientId) === userId;
      isForUser = Boolean(matchEmail || matchId);
    } else if (n.targetRole === userRole || n.targetRole === 'all') {
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
