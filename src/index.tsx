import React from 'react';
import ReactDOM from 'react-dom/client';
// 파일 이름이 'futsalteammanagerdebug.tsx'로 소문자 통일되었음을 반영합니다.
import FutsalTeamManagerDebug from './futsalteammanagerdebug'; 
import './index.css'; 

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <FutsalTeamManagerDebug /> 
  </React.StrictMode>
);
