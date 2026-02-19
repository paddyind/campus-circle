import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * When the user is logged out (token becomes null after having been set), redirect to /login
 * so they see the login page instead of staying on the current page with an error message.
 */
const AuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((state) => state.auth.token);
  const hadToken = useRef(!!token);

  useEffect(() => {
    const hasToken = !!token;
    if (hadToken.current && !hasToken && location.pathname !== '/login') {
      hadToken.current = false;
      navigate('/login', { replace: true, state: { from: 'session_expired' } });
    } else {
      hadToken.current = hasToken;
    }
  }, [token, navigate, location.pathname]);

  return null;
};

export default AuthRedirect;
