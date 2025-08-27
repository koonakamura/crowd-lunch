import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

const AdminCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const extractTokenFromFragment = () => {
      const fragment = window.location.hash;
      
      if (fragment.startsWith('#token=')) {
        const token = fragment.substring(7);
        
        if (token) {
          apiClient.setAdminToken(token);
          console.log('Admin token saved successfully');
          
          navigate('/admin', { replace: true });
        } else {
          console.error('No token found in URL fragment');
          navigate('/admin', { replace: true });
        }
      } else {
        console.error('Invalid callback URL format');
        navigate('/admin', { replace: true });
      }
    };

    extractTokenFromFragment();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">認証中...</div>
    </div>
  );
};

export default AdminCallback;
