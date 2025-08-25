import React from 'react';
import { DIAGNOSTIC_INFO } from '../lib/api';

export const DiagnosticInfo: React.FC = () => {
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '8px', 
      fontSize: '10px',
      borderRadius: '4px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div>API: {DIAGNOSTIC_INFO.API_BASE_URL}</div>
      <div>SHA: {DIAGNOSTIC_INFO.APP_COMMIT_SHA.substring(0, 7)}</div>
      <div>Build: {new Date(DIAGNOSTIC_INFO.APP_BUILD_TIME).toLocaleString()}</div>
      <div>Env: {DIAGNOSTIC_INFO.ENVIRONMENT}</div>
    </div>
  );
};
