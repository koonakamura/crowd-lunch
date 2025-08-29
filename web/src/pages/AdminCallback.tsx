import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

const JWT_ISS = (import.meta.env as { VITE_JWT_ISS?: string }).VITE_JWT_ISS || 'crowd-lunch';
const JWT_AUD = (import.meta.env as { VITE_JWT_AUD?: string }).VITE_JWT_AUD || 'admin';
const LEGACY_JWT_ISS = 'crowd-lunch-api';
const LEGACY_JWT_AUD = 'crowd-lunch-admin';

const AdminCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const extractTokenFromFragment = async () => {
      const fragment = window.location.hash;
      
      if (!fragment || !fragment.includes('token=')) {
        setError('認証情報が見つかりません');
        setTimeout(() => navigate('/admin', { replace: true }), 2000);
        return;
      }

      try {
        const params = new URLSearchParams(fragment.substring(1));
        const token = params.get('token');
        const state = params.get('state');
        const stateSig = params.get('state_sig');
        
        if (!token) {
          setError('認証トークンが見つかりません');
          setTimeout(() => navigate('/admin', { replace: true }), 2000);
          return;
        }

        if (state && stateSig) {
          const storedState = sessionStorage.getItem('auth_state');
          
          const [stateValue, stateExpStr] = state.split(':');
          const stateExp = parseInt(stateExpStr);
          const now = Math.floor(Date.now() / 1000);
          
          if (stateExp < now) {
            setError('認証状態の有効期限が切れています');
            sessionStorage.removeItem('auth_state');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }
          
          if (storedState && stateValue !== storedState) {
            setError('認証状態が一致しません');
            sessionStorage.removeItem('auth_state');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }
          
        }

        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          setError('無効な認証トークンです');
          setTimeout(() => navigate('/admin', { replace: true }), 2000);
          return;
        }

        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Math.floor(Date.now() / 1000);
          
          console.table({
            sub: payload.sub,
            role: payload.role,
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp,
            iat: payload.iat
          });
          
          if (payload.exp && payload.exp < now) {
            setError('認証トークンの有効期限が切れています');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }

          const validIss = payload.iss === JWT_ISS || payload.iss === LEGACY_JWT_ISS;
          const validAud = payload.aud === JWT_AUD || payload.aud === LEGACY_JWT_AUD;
          
          if (!validIss || !validAud) {
            console.warn('JWT iss/aud mismatch detected, attempting whoami fallback');
            
            try {
              const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://crowd-lunch.fly.dev'}/auth/whoami`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const whoamiData = await response.json();
                console.log('whoami=200 fallback successful:', whoamiData);
                console.table(whoamiData);
              } else {
                if (!validIss) {
                  setError('認証トークンの発行者が無効です');
                } else {
                  setError('認証トークンの対象者が無効です');
                }
                setTimeout(() => navigate('/admin', { replace: true }), 2000);
                return;
              }
            } catch (whoamiError) {
              console.error('whoami fallback failed:', whoamiError);
              if (!validIss) {
                setError('認証トークンの発行者が無効です');
              } else {
                setError('認証トークンの対象者が無効です');
              }
              setTimeout(() => navigate('/admin', { replace: true }), 2000);
              return;
            }
          }

          if (payload.role !== 'admin') {
            setError('管理者権限が不足しています');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }

          if (payload.sub !== 'admin@example.com') {
            setError('認証ユーザーが無効です');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }
        } catch {
          setError('認証トークンの解析に失敗しました');
          setTimeout(() => navigate('/admin', { replace: true }), 2000);
          return;
        }

        apiClient.setAdminToken(token);
        sessionStorage.removeItem('auth_state');
        
        window.history.replaceState(null, '', '/admin');
        
        console.log('Admin token saved successfully with enhanced validation');
        navigate('/admin', { replace: true });
        
      } catch (error) {
        console.error('Token extraction failed:', error);
        setError('認証処理中にエラーが発生しました');
        setTimeout(() => navigate('/admin', { replace: true }), 2000);
      }
    };

    extractTokenFromFragment().catch(error => {
      console.error('Token extraction failed:', error);
      setError('認証処理中にエラーが発生しました');
      setTimeout(() => navigate('/admin', { replace: true }), 2000);
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">{error}</div>
          <div className="text-sm text-gray-600">管理画面に戻ります...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">認証中...</div>
    </div>
  );
};

export default AdminCallback;
