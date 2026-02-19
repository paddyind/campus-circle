import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { getTenantSlug } from '../api/client';
import TenantSwitcher from './TenantSwitcher';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, authCheckComplete } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.dashboard);
  const isAuthenticated = Boolean(token && user);
  const authLoading = Boolean(token && !authCheckComplete);
  const [isOpen, setIsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getDashboardHref = () => {
    const role = user?.role || profile?.role;
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'parent') return '/dashboard/parent';
    return '/dashboard/student';
  };

  const userRole = user?.role || profile?.role;
  const isAdmin = userRole === 'admin';

  // Dashboard first for all authenticated users
  const dashboardItem = {
    name: 'Dashboard',
    href: isAdmin ? '/dashboard/admin' : getDashboardHref(),
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10',
  };

  // Manage sub-menu for Admin/Superadmin only
  const manageSubMenu = [
    { name: 'Manage Users', href: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Manage Events', href: '/admin/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Manage Schools', href: '/admin/schools', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m3-3h2m-6 0h-2m4 0h-2m4 0H7m0 0v-2h14v2' },
    { name: 'Tenant Settings', href: '/admin/tenants', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  // Public: Events list (not shown for admin/superadmin)
  const eventsItem = { name: 'Events', href: '/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' };

  const secondaryNavigation = [
    { name: 'About Us', href: '/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Help', href: '/help', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Contact Us', href: '/contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const handleLogout = () => {
    setUserMenuOpen(false);
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Build nav items: Dashboard first, then role-specific items, then secondary
  const getNavItems = () => {
    if (!isAuthenticated) {
      return [eventsItem, ...secondaryNavigation];
    }
    if (isAdmin) {
      return [dashboardItem, { name: 'Manage', subMenu: manageSubMenu }, ...secondaryNavigation];
    }
    return [dashboardItem, { name: 'My Events', href: '/my-events', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }, eventsItem, ...secondaryNavigation];
  };

  const navItems = getNavItems();
  const userDisplayName = user?.name || profile?.full_name || user?.email || profile?.email || 'Profile';
  const userEmail = user?.email || profile?.email || '';
  const userInitial = (userDisplayName && userDisplayName[0]) ? userDisplayName[0].toUpperCase() : '?';
  const currentTenant = useSelector((state) => state.auth.currentTenant);
  const currentTenantName = currentTenant?.name
    || (getTenantSlug() === 'demo-bhis' ? 'Demo-BHIS' : getTenantSlug() === 'demo-circle' ? 'Demo-Circle' : getTenantSlug());
  const isSuperAdmin = Boolean(profile?.is_super_admin);
  const userRoleLabel = isSuperAdmin ? 'Super Admin' : (user?.role || profile?.role || '');

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
            {navItems.map((item) =>
              item.subMenu ? (
                <div key={item.name} className="relative">
                  <button
                    type="button"
                    onClick={() => setManageOpen((open) => !open)}
                    aria-expanded={manageOpen}
                    aria-haspopup="true"
                    className={`${
                      manageSubMenu.some((s) => isActive(s.href))
                        ? 'bg-white bg-opacity-25 text-white shadow-md'
                        : 'text-white hover:bg-white hover:bg-opacity-15'
                    } inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200`}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {item.name}
                    <svg className={`ml-1 h-4 w-4 transition-transform ${manageOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {manageOpen && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setManageOpen(false)} />
                      <div className="absolute left-0 top-full mt-1 py-1 w-52 rounded-lg bg-white shadow-lg z-30 border border-gray-200">
                        {item.subMenu.map((sub) => (
                          <Link
                            key={sub.name}
                            to={sub.href}
                            onClick={() => setManageOpen(false)}
                            className={`flex items-center px-4 py-2 text-sm font-medium ${
                              isActive(sub.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                          <svg className="mr-3 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={sub.icon} />
                          </svg>
                          {sub.name}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
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
              )
            )}
          </div>

          <div className="hidden lg:flex lg:items-center lg:space-x-3 lg:ml-6">
            {isAuthenticated && <TenantSwitcher />}
            {authLoading ? (
              <span className="text-white/90 text-sm font-medium px-4 py-2" aria-label="Loading">Loading…</span>
            ) : !isAuthenticated ? (
              <Link
                to="/login"
                className="bg-white text-indigo-600 hover:bg-gray-50 px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Login / Register
              </Link>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className={`${
                    isActive('/profile') ? 'bg-white/25 text-white' : 'text-white hover:bg-white/15'
                  } inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-white/30 min-w-0 max-w-[11rem] sm:max-w-[13rem]`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  title={userDisplayName}
                >
                  <span className="truncate">{userDisplayName}</span>
                  <svg className="h-4 w-4 shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={userMenuOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                  </svg>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" aria-hidden="true" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white shadow-xl z-30 border border-gray-200 overflow-hidden">
                      <div className="p-4 pb-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-lg">
                            {userInitial}
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{userDisplayName}</p>
                            {userEmail && (
                              <p className="mt-1 text-xs text-gray-500 truncate" title={userEmail}>{userEmail}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">{userRoleLabel}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</span>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[9rem]" title={currentTenantName}>{currentTenantName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 py-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                            isActive('/profile') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </span>
                          My Profile
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 text-left transition-colors"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2z" />
                            </svg>
                          </span>
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
            {navItems.map((item) =>
              item.subMenu ? (
                <div key={item.name}>
                  <p className="px-4 py-2 text-xs font-semibold text-white text-opacity-80 uppercase tracking-wider">{item.name}</p>
                  {item.subMenu.map((sub) => (
                    <Link
                      key={sub.name}
                      to={sub.href}
                      onClick={() => setIsOpen(false)}
                      className={`${
                        isActive(sub.href) ? 'bg-white bg-opacity-25 text-white' : 'text-white hover:bg-white hover:bg-opacity-15'
                      } flex items-center pl-8 pr-4 py-3 rounded-lg text-base font-medium transition-all duration-200`}
                    >
                      <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={sub.icon} />
                      </svg>
                      {sub.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`${
                    isActive(item.href) ? 'bg-white bg-opacity-25 text-white' : 'text-white hover:bg-white hover:bg-opacity-15'
                  } flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200`}
                >
                  <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              )
            )}
            <div className="border-t border-white border-opacity-20 pt-3 mt-2 space-y-2">
              {isAuthenticated && (
                <div className="px-4 py-2">
                  <TenantSwitcher />
                </div>
              )}
              {authLoading ? (
                <span className="block px-4 py-3 text-white/90 text-sm">Loading…</span>
              ) : !isAuthenticated ? (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-lg text-base font-semibold bg-white text-indigo-600 text-center transition-all duration-200"
                >
                  Login / Register
                </Link>
              ) : (
                <>
                  <p className="px-4 py-2 text-xs font-semibold text-white text-opacity-80 uppercase tracking-wider">Account</p>
                  <div className="px-4 py-3 mb-1 rounded-lg bg-white bg-opacity-10 space-y-1.5">
                    <p className="text-sm font-medium text-white truncate">{userDisplayName}</p>
                    {userEmail && <p className="text-xs text-white text-opacity-90 truncate">{userEmail}</p>}
                    <div className="flex gap-4 text-xs text-white text-opacity-90 pt-1">
                      <span><span className="opacity-80">Role:</span> {userRoleLabel}</span>
                      <span><span className="opacity-80">Tenant:</span> {currentTenantName}</span>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className={`${
                      isActive('/profile') ? 'bg-white bg-opacity-25 text-white' : 'text-white hover:bg-white hover:bg-opacity-15'
                    } flex items-center pl-8 pr-4 py-3 rounded-lg text-base font-medium transition-all duration-200`}
                  >
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center pl-8 pr-4 py-3 rounded-lg text-base font-medium text-white hover:bg-white hover:bg-opacity-15 transition-all duration-200 text-left"
                  >
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2z" />
                    </svg>
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
