import React from 'react';
import ReactDOM from 'react-dom/client';
// ⚠️ './' 다음의 파일명은 실제 GitHub의 'src' 폴더 안 파일명과 
//    대소문자까지 100% 일치해야 합니다.
import FutsalTeamManagerDebug from './FutsalTeamManagerDebug'; 
import './index.css'; 

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    {/* 컴포넌트 이름도 import 이름과 100% 일치해야 합니다. */}
    <FutsalTeamManagerDebug /> 
  </React.StrictMode>
);
