import { FiMenu, FiUser, FiSun, FiMoon } from 'react-icons/fi';
import './Header.css';

const Header = ({ toggleSidebar, theme, toggleTheme }) => {
  const ThemeIcon = theme === 'dark' ? FiSun : FiMoon;
  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={toggleSidebar} aria-label="Open navigation">
          <FiMenu />
        </button>
      </div>
      <div className="header-right">
        <button
          className="header-icon-btn theme-toggle"
          onClick={toggleTheme}
          aria-label={themeLabel}
        >
          <ThemeIcon />
        </button>
        <div className="header-user">
          <div className="user-avatar">
            <FiUser />
          </div>
          <div className="user-info">
            <span className="user-name">Admin</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

