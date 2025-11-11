import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import Dashboard from './components/Dashboard/Dashboard';
import CreateBlogs from './components/Blogs/CreateBlogs';
import CreateEvents from './components/Events/CreateEvents';
import Login from './components/Auth/Login';
import './App.css';

const SECTION_ROUTES = {
  users: '/users',
  blogs: '/blogs',
  events: '/events',
  connect: '/connect',
  carousel: '/carousel'
};

const deriveSectionFromPath = (pathname = '') => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'users';
  const first = segments[0];
  if (first === 'users' || first === 'blogs' || first === 'events' || first === 'connect' || first === 'carousel') {
    return first;
  }
  return null;
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('light');
  const [authed, setAuthed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ers-auth') === 'true';
  });

  const location = useLocation();
  const navigate = useNavigate();

  const activeSection = useMemo(
    () => deriveSectionFromPath(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    const isLogin = location.pathname.startsWith('/login');
    const isRoot = location.pathname === '/' || location.pathname === '';
    const authedNow = typeof window !== 'undefined' && localStorage.getItem('ers-auth') === 'true';
    if (authed !== authedNow) {
      setAuthed(authedNow);
    }
    if (!authedNow && !isLogin) {
      navigate('/login', { replace: true });
      return;
    }
    if (authedNow && (isLogin || isRoot)) {
      navigate('/users', { replace: true });
      return;
    }
    if (authedNow && !activeSection && !isLogin) {
      navigate('/users', { replace: true });
    }
  }, [activeSection, location.pathname, navigate, authed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = localStorage.getItem('ers-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      return;
    }

    // Default to light mode instead of checking system preference
    setTheme('light');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);

    if (typeof window !== 'undefined') {
      localStorage.setItem('ers-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSectionSelect = (sectionKey) => {
    const targetPath = SECTION_ROUTES[sectionKey] || '/users';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
    if (sidebarOpen && typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {location.pathname.startsWith('/login') ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Sidebar
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            isCollapsed={sidebarCollapsed}
            toggleCollapse={toggleCollapse}
            activeSection={activeSection || 'users'}
            onSectionSelect={handleSectionSelect}
          />
          <div className="app-main">
            <Header toggleSidebar={toggleSidebar} theme={theme} toggleTheme={toggleTheme} />
            <main className="app-content">
              <Routes>
                <Route path="/" element={<Navigate to="/users" replace />} />
                <Route path="/users" element={<Dashboard activeSection="users" />} />
                <Route path="/blogs" element={<Dashboard activeSection="blogs" />} />
                <Route path="/blogs/create" element={<CreateBlogs />} />
                <Route path="/events" element={<Dashboard activeSection="events" />} />
                <Route path="/events/create" element={<CreateEvents />} />
                <Route path="/connect" element={<Dashboard activeSection="connect" />} />
                <Route path="/carousel" element={<Dashboard activeSection="carousel" />} />
                <Route path="*" element={<Navigate to="/users" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
