import {
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiFileText,
  FiCalendar,
  FiShare2,
  FiImage,
  FiLogOut
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar, isCollapsed, toggleCollapse, activeSection, onSectionSelect }) => {
  const navigate = useNavigate();
  const CollapseIcon = isCollapsed ? FiChevronRight : FiChevronLeft;

  const menuItems = [
    { icon: FiUsers, label: 'Users', key: 'users' },
    { icon: FiFileText, label: 'Blogs', key: 'blogs' },
    { icon: FiCalendar, label: 'Events', key: 'events' },
    { icon: FiShare2, label: 'Connect', key: 'connect' },
    { icon: FiImage, label: 'Carousel', key: 'carousel' }
  ];

  const handleSelect = (itemKey) => {
    onSectionSelect?.(itemKey);
  };

  const handleLogout = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ers-auth');
      }
    } catch (e) {
      // ignore
    }
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
        role="presentation"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/image.png" alt="Er. Rishav Sethi" className="logo-img" />
            <span className="logo-text">Er. Rishav Sethi</span>
          </div>
          <div className="sidebar-header-actions">
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <CollapseIcon />
            </button>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              <FiX />
            </button>
          </div>
        </div>
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <li key={item.key} className="sidebar-menu-item">
                  <button
                    type="button"
                    className={`sidebar-menu-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(item.key)}
                  >
                    <Icon className="menu-icon" />
                    <span className="menu-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
            <FiLogOut className="menu-icon" />
            <span className="menu-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

