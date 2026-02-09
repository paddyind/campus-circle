import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { fetchProfile } from '../features/dashboard/dashboardSlice';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const isAuthenticated = Boolean(token && user);
  const { profile } = useSelector((state) => state.dashboard);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch profile when user is logged in to get full_name and role
  useEffect(() => {
    if (token) {
      // Always fetch profile to ensure role is up-to-date
      dispatch(fetchProfile());
    }
  }, [token, dispatch]);

  // Public navigation items (Home removed - logo serves as home link)
  const publicNavigation = [
    { name: 'Events', href: '/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  // Authenticated user navigation (prioritized)
  const getDashboardHref = () => {
    const userRole = user?.role || profile?.role;
    if (userRole === 'admin') return '/dashboard/admin';
    if (userRole === 'parent') return '/dashboard/parent';
    return '/dashboard/student';
  };

  // Admin navigation items
  const adminNavigation = [
    { name: 'Manage Users', href: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Manage Events', href: '/admin/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Manage Schools', href: '/admin/schools', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m3-3h2m-6 0h-2m4 0h-2m4 0H7m0 0v-2h14v2' },
    { name: 'Dashboard', href: '/dashboard/admin', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10' },
  ];

  // Regular user navigation (non-admin)
  const authNavigation = [
    { name: 'My Events', href: '/my-events', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { name: 'Dashboard', href: getDashboardHref(), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10' },
  ];

  // Secondary navigation (less frequently used)
  const secondaryNavigation = [
    { name: 'About Us', href: '/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Help', href: '/help', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Contact Us', href: '/contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Combine navigation items based on user role (only show auth nav when token is validated and user is set)
  const userRole = user?.role || profile?.role;
  const navItems = isAuthenticated
    ? (userRole === 'admin'
        ? [...adminNavigation, ...publicNavigation, ...secondaryNavigation]
        : [...authNavigation, ...publicNavigation, ...secondaryNavigation])
    : [...publicNavigation, ...secondaryNavigation];
  
  // Get user display name for profile button - check both auth state and profile state
  const userDisplayName = user?.name || profile?.full_name || user?.email || profile?.email || 'Profile';

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 shadow-lg border-b border-indigo-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-white rounded-lg p-2 shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-white text-2xl font-bold tracking-tight hidden sm:block">CampusCircle</span>
            </Link>
          </div>

          <div className="hidden lg:flex lg:items-center lg:space-x-1 lg:ml-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive(item.href)
                    ? 'bg-white bg-opacity-25 text-white shadow-md'
                    : 'text-white hover:bg-white hover:bg-opacity-15'
                } inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200`}
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex lg:items-center lg:space-x-3 lg:ml-6">
            {!isAuthenticated ? (
              <Link
                to="/login"
                className="bg-white text-indigo-600 hover:bg-gray-50 px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Login / Register
              </Link>
            ) : (
              <>
                <Link
                  to="/profile"
                  className={`${
                    isActive('/profile')
                      ? 'bg-white bg-opacity-25 text-white shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-15'
                  } inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {userDisplayName.length > 15 ? userDisplayName.substring(0, 15) + '...' : userDisplayName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-white text-indigo-600 hover:bg-gray-50 px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-15 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-all"
              aria-expanded="false"
              aria-label="Toggle navigation menu"
            >
              {!isOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-indigo-700 border-t border-indigo-500">
          <div className="pt-2 pb-4 space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`${
                  isActive(item.href)
                    ? 'bg-white bg-opacity-25 text-white'
                    : 'text-white hover:bg-white hover:bg-opacity-15'
                } flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.name}
              </Link>
            ))}
            <div className="border-t border-white border-opacity-20 pt-3 mt-2 space-y-2">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-lg text-base font-semibold bg-white text-indigo-600 text-center transition-all duration-200"
                >
                  Login / Register
                </Link>
              ) : (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className={`${
                      isActive('/profile')
                        ? 'bg-white bg-opacity-25 text-white'
                        : 'text-white hover:bg-white hover:bg-opacity-15'
                    } flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200`}
                  >
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {userDisplayName.length > 20 ? userDisplayName.substring(0, 20) + '...' : userDisplayName}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full block px-4 py-3 rounded-lg text-base font-semibold bg-white text-indigo-600 text-center transition-all duration-200"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
