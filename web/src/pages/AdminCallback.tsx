import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

const AdminCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const extractTokenFromFragment = () => {
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
          
          if (payload.exp && payload.exp < now) {
            setError('認証トークンの有効期限が切れています');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }

          if (payload.iss !== 'crowd-lunch-api') {
            setError('認証トークンの発行者が無効です');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
          }

          if (payload.aud !== 'crowd-lunch-admin') {
            setError('認証トークンの対象者が無効です');
            setTimeout(() => navigate('/admin', { replace: true }), 2000);
            return;
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

    extractTokenFromFragment();
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
