import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaBell, FaSearch, FaAngleDown, FaTimes, FaFileAlt, FaBullhorn, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import adminDashboard from '../assets/images/adminDashboard.jpg';
import { useDashboard } from '../context/DashboardContext';
import { AdminNotification } from '../interfaces/notification';
import { notificationApi } from '../services/notificationApi';

interface SearchResult {
  type: 'report' | 'announcement' | 'user';
  id: string | number;
  title: string;
  subtitle: string;
  path: string;
}

interface TopBarProps {
  onMenuClick?: () => void;
}

interface NotificationSocketMessage {
  type?: 'notification.created' | 'notifications.connected';
  notification?: AdminNotification;
}

const getNotificationId = (notification: AdminNotification) =>
  notification.id || notification._id || `${notification.type}-${notification.createdAt}`;

const formatRelativeTime = (dateValue: string) => {
  const createdAt = new Date(dateValue).getTime();

  if (Number.isNaN(createdAt)) {
    return '';
  }

  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { userProfile, reports, announcements, refreshData } = useDashboard();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(notification => !notification.read).length;

  const upsertNotification = useCallback((incoming: AdminNotification) => {
    setNotifications(prev => {
      const incomingId = getNotificationId(incoming);
      const next = prev.filter(notification => getNotificationId(notification) !== incomingId);
      return [incoming, ...next].slice(0, 50);
    });
  }, []);

  const fetchNotifications = useCallback(async (limit = 20) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoadingNotifications(true);
    try {
      const data = await notificationApi.getNotifications(limit);
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let disposed = false;

    const connect = () => {
      const token = localStorage.getItem('token');
      if (!token || disposed) return;

      socket = new WebSocket(notificationApi.getSocketUrl(token));

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as NotificationSocketMessage;
          if (payload.type === 'notification.created' && payload.notification) {
            upsertNotification(payload.notification);
            if (payload.notification.entityType === 'hazardReport') {
              void refreshData();
            }
          }
        } catch (error) {
          console.error('Failed to parse notification socket message:', error);
        }
      };

      socket.onclose = () => {
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    fetchNotifications();
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [fetchNotifications, refreshData, upsertNotification]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminProfile");
    navigate("/admin-login");
  };

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      reports.forEach(report => {
        if (
          report.title.toLowerCase().includes(query) ||
          report.location.toLowerCase().includes(query) ||
          report.name.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'report',
            id: report.id,
            title: report.title,
            subtitle: `${report.location} • ${report.status}`,
            path: '/admin-dashboard/moderation'
          });
        }
      });

      announcements.forEach(announcement => {
        if (
          announcement.title.toLowerCase().includes(query) ||
          announcement.detail.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'announcement',
            id: announcement.id,
            title: announcement.title,
            subtitle: `${announcement.category} • ${announcement.status}`,
            path: '/admin-dashboard/announcements'
          });
        }
      });

      setSearchResults(results.slice(0, 10));
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery, reports, announcements]);

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(result.path);
  };

  const handleNotificationClick = async (notification: AdminNotification) => {
    const notificationId = getNotificationId(notification);

    if (!notification.read) {
      setNotifications(prev =>
        prev.map(item =>
          getNotificationId(item) === notificationId ? { ...item, read: true } : item
        )
      );

      try {
        const updatedNotification = await notificationApi.markAsRead(notificationId);
        setNotifications(prev =>
          prev.map(item =>
            getNotificationId(item) === notificationId ? updatedNotification : item
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    setShowNotifications(false);

    if (notification.link) {
      navigate(notification.link);
    } else if (notification.entityType === 'hazardReport') {
      navigate('/admin-dashboard/moderation');
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'report':
        return <FaFileAlt className="text-blue-500" />;
      case 'announcement':
        return <FaBullhorn className="text-purple-500" />;
      case 'user':
        return <FaUser className="text-green-500" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-white flex items-center justify-between px-4 sm:px-6 border-b border-gray-100 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1 max-w-xl relative" ref={searchRef}>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FaSearch className="text-gray-400" />
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-brand-blue focus:ring-1 text-sm outline-none transition-all"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowResults(false);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 max-h-96 overflow-y-auto z-30">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded capitalize">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 p-6 text-center z-30">
              <p className="text-gray-500 text-sm">No results found for "{searchQuery}"</p>
              <p className="text-gray-400 text-xs mt-1">Try different keywords</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="relative hidden sm:block" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-50"
          >
            <FaBell className="text-lg sm:text-xl" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 sm:h-5 w-4 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] sm:text-xs text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 max-h-96 overflow-y-auto z-30">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              {isLoadingNotifications ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => {
                  const isUnread = !notification.read;

                  return (
                    <button
                      key={getNotificationId(notification)}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                        isUnread ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isUnread && (
                          <div className="w-2 h-2 mt-2 rounded-full bg-brand-blue shrink-0" />
                        )}
                        <div className={isUnread ? 'min-w-0' : 'ml-5 min-w-0'}>
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
              <div className="px-4 py-3 text-center border-t border-gray-100">
                <button
                  onClick={() => fetchNotifications(50)}
                  className="text-sm text-brand-blue font-medium hover:underline"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative" ref={profileRef}>
          <div 
            className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <img
              src={userProfile.avatar || adminDashboard}
              alt={userProfile.name}
              className="h-9 w-9 rounded-full object-cover border border-gray-200"
            />
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-700">{userProfile.name}</span>
              <FaAngleDown className={`text-gray-400 text-xs transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-30">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-xs text-gray-500 truncate">{userProfile.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
