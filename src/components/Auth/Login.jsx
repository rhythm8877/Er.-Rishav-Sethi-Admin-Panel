import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Login.css';

const VALID_EMAIL = 'rishav@gmail.com';
const VALID_PASSWORD = '12344321';

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return normalize(email).length > 0 && normalize(password).length > 0 && !loading;
  }, [email, password, loading]);

  useEffect(() => {
    const authed = typeof window !== 'undefined' && localStorage.getItem('ers-auth') === 'true';
    if (authed) {
      navigate('/users', { replace: true });
    }
  }, [navigate, location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const ok = normalize(email).toLowerCase() === VALID_EMAIL && normalize(password) === VALID_PASSWORD;
      if (!ok) {
        setError('Invalid credentials. Please check your email and password.');
        setLoading(false);
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('ers-auth', 'true');
      }
      navigate('/users', { replace: true });
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-left">
          <div className="login-brand">
            <img src="/image.png" alt="Er. Rishav Sethi" className="login-logo" />
            <span className="login-brand-text">Er. Rishav Sethi Admin</span>
          </div>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Please enter your details</p>

          {error && <div className="login-error" role="alert">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <label className="login-label" htmlFor="password">Password</label>
            <div className="login-password-field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-show-btn"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button type="submit" className="login-btn login-btn-primary" disabled={!canSubmit}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

        </div>
        <div className="login-right" aria-hidden="true">
          <video
            className="login-video"
            src="/login.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;


