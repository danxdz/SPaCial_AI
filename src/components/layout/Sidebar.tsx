import { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  FolderIcon, 
  CubeIcon, 
  CogIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UserIcon,
  Cog6ToothIcon,
  ServerIcon,
  DocumentTextIcon,
  CircleStackIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  KeyIcon,
  CheckCircleIcon,
  StarIcon,
  HeartIcon,
  TableCellsIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { useI18nStore } from '../../stores/useI18nStore';
import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';

interface SidebarProps {
  currentModule: string;
  setCurrentModule: (module: string) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  onSettingsClick: () => void;
  onLogout?: () => void;
  onNotificationsClick?: () => void;
}

const Sidebar = ({ currentModule, setCurrentModule, isAdmin, isAuthenticated, onSettingsClick, onLogout, onNotificationsClick }: SidebarProps) => {
  const { t } = useI18nStore();
  const { currentUser } = useUserStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminSectionOpen, setIsAdminSectionOpen] = useState(true);
  const [sidebarAlwaysVisible, setSidebarAlwaysVisible] = useState(false);
  
  useEffect(() => {
    loadSidebarSetting();
  }, []);

  const loadSidebarSetting = async () => {
    try {
      const setting = await db.queryAll(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'sidebar_always_visible'"
      );
      setSidebarAlwaysVisible(setting[0]?.setting_value === 'true');
    } catch (error) {
      console.error('Error loading sidebar setting:', error);
    }
  };
  
  // Different menu items based on authentication status and role
  const getMenuItems = () => {
    if (!isAuthenticated) {
      return {
        main: [
          { id: 'measurements', label: t('nav.measurements'), icon: ClipboardDocumentListIcon },
        ],
        admin: []
      };
    }

    const mainItems = [
      { id: 'home', label: t('nav.dashboard'), icon: HomeIcon },
      { id: 'sections', label: t('nav.sections'), icon: FolderIcon },
      { id: 'gammas', label: t('nav.gammas'), icon: CogIcon },
      { id: 'measurements', label: t('nav.measurements'), icon: ClipboardDocumentListIcon },
    ];

    // Add production user specific items
    if (currentUser?.role === 'prod') {
      mainItems.splice(1, 0, 
        { id: 'production-dashboard', label: t('nav.productionDashboard'), icon: StarIcon },
        { id: 'user-preferences', label: t('nav.userPreferences'), icon: HeartIcon }
      );
    }

    // Add management items for admins and methods (NOT for production users)
    if ((isAdmin || currentUser?.role === 'method') && currentUser?.role !== 'prod') {
      mainItems.splice(2, 0, 
        { id: 'families', label: t('nav.families'), icon: FolderIcon },
        { id: 'products', label: t('nav.products'), icon: CubeIcon }
      );
    }

    // Admin-only items
    const adminItems = isAdmin ? [
      { id: 'users', label: t('nav.users'), icon: UserGroupIcon },
      { id: 'groups', label: t('nav.groups'), icon: UserIcon },
      { id: 'registration-codes', label: t('nav.registrationCodes'), icon: KeyIcon },
      { id: 'user-validation', label: t('nav.userValidation'), icon: CheckCircleIcon },
      { id: 'database-crud', label: t('nav.databaseCrud'), icon: TableCellsIcon },
      { id: 'translations', label: t('nav.translations'), icon: LanguageIcon },
      { id: 'system-settings', label: t('nav.systemSettings'), icon: Cog6ToothIcon },
      { id: 'database', label: t('nav.database'), icon: ServerIcon },
      { id: 'storage', label: t('nav.storage'), icon: CircleStackIcon },
      { id: 'logs', label: t('nav.logs'), icon: DocumentTextIcon }
    ] : [];

    return {
      main: mainItems,
      admin: adminItems
    };
  };

  const menuItems = getMenuItems();

  const handleMenuItemClick = (moduleId: string) => {
    setCurrentModule(moduleId);
    setIsMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <>
      {/* Mobile Hamburger Button - Only show when menu is closed and screen is small */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-[999999] p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation min-w-[48px] min-h-[48px]"
          aria-label="Open menu"
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      )}


      {/* Mobile Overlay - Only show on small screens */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[99996] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 z-[99997]
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarAlwaysVisible ? 'lg:translate-x-0 lg:static lg:shadow-none lg:border-r-0 lg:h-full' : 'lg:translate-x-0 lg:static lg:shadow-none lg:border-r-0 lg:h-full'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 relative">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          
          <h1 className="text-xl font-bold text-gray-900 dark:text-white pr-12">{t('nav.dashboard')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAuthenticated ? 'Smart Production Control' : 'Production Measurements'}
          </p>
          {!isAuthenticated && (
            <div className="mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs text-blue-800 dark:text-blue-200">
{t('auth.noLoginRequired')}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {/* Main Menu Items */}
            {menuItems.main.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuItemClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}

            {/* Admin Section */}
            {menuItems.admin.length > 0 && (
              <>
                <li className="pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Admin Panel
                    </h3>
                    <button
                      onClick={() => setIsAdminSectionOpen(!isAdminSectionOpen)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg 
                        className={`h-4 w-4 transform transition-transform ${isAdminSectionOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </li>
                
                {isAdminSectionOpen && (
                  <li className="space-y-1">
                    {menuItems.admin.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentModule === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMenuItemClick(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ml-2 ${
                            isActive
                              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>{isAuthenticated ? 'Welcome, Admin' : 'Production Mode'}</p>
              <p>SPC Dashboard v2.0</p>
            </div>
            {isAuthenticated && (
              <div className="flex space-x-2">
                {onNotificationsClick && (
                  <button
                    onClick={onNotificationsClick}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors relative"
                    title="Notifications"
                  >
                    <BellIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={onSettingsClick}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  title="Settings"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Logout"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
