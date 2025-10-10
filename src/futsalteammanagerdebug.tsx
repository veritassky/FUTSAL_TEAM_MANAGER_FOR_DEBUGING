import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

// **********************************
// 1. 상수 정의
// **********************************

// 경기별 섹션 키퍼 번호 로테이션 데이터 (8경기 x 6섹션, 고객님 표 기반)
const ROTATION_DATA = [
  [1, 2, 3, 4, 5, 6], 
  [3, 9, 1, 4, 7, 8],
  [7, 8, 2, 5, 6, 9],
  [4, 5, 1, 2, 3, 6],
  [7, 9, 1, 3, 4, 8],
  [6, 8, 2, 5, 7, 9],
  [3, 5, 1, 2, 6, 4],
  [1, 4, 3, 7, 8, 9],
];

const TOTAL_SECTIONS = ROTATION_DATA[0].length; // 6 섹션
const TOTAL_GAMES = ROTATION_DATA.length;       // 8 경기
const SECTION_DURATION = 10 * 60; // 섹션 시간 (10분, 초 단위)
const ALERT_DURATION_MS = 15000; // 알림 음악 재생 시간 (15초)

// !!! 중요: 알림음 파일 경로는 실제 프로젝트 구조에 맞게 변경하세요.
const ALERT_SOUND_PATH = '/alert.mp3'; 

const VIEW_ENUM = {
  TIMER: 'timer',
  STATS: 'stats'
};

// **********************************
// 2. 메인 컴포넌트
// **********************************

const FutsalTeamManagerDebug: React.FC = () => {
  const [timer, setTimer] = useState<number>(SECTION_DURATION);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAlertTime, setIsAlertTime] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [currentGameIndex, setCurrentGameIndex] = useState<number>(0); 
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0); 
  const [currentView, setCurrentView] = useState<'timer' | 'stats'>(VIEW_ENUM.TIMER);

  // Ref를 사용하여 Audio 객체와 타이머 ID 관리 (15초 자동 정지 로직 핵심)
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const alertTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 현재/다음 키퍼 번호 자동 계산 로직
  const getCurrentKeeper = () => ROTATION_DATA[currentGameIndex][currentSectionIndex];
  const getNextKeeper = () => {
    const nextSectionIndex = currentSectionIndex + 1;
    
    // 다음 섹션이 현재 경기 내에 있다면
    if (nextSectionIndex < TOTAL_SECTIONS) {
      return ROTATION_DATA[currentGameIndex][nextSectionIndex];
    }
    
    // 현재 경기가 끝나면, 다음 경기(순환)의 첫 번째 키퍼 번호를 반환
    const nextGame = (currentGameIndex + 1) % TOTAL_GAMES;
    return ROTATION_DATA[nextGame][0];
  };

  // **********************************
  // 3. 알림/오디오 제어 로직 (15초 자동 정지 구현)
  // **********************************

  const stopAlert = useCallback(() => {
    if (alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0; 
      alertSoundRef.current = null;
    }
    if (alertTimerIdRef.current) {
      clearTimeout(alertTimerIdRef.current);
      alertTimerIdRef.current = null;
    }
    setIsAlertTime(false);
  }, []);

  const playAlert = useCallback(() => {
    stopAlert(); 

    const newSound = new Audio(ALERT_SOUND_PATH);
    newSound.play().catch(e => console.error("Audio playback failed:", e)); 

    alertSoundRef.current = newSound;

    // 15초 후 자동 정지 타이머 설정
    const timerId = setTimeout(() => {
      stopAlert();
    }, ALERT_DURATION_MS);

    alertTimerIdRef.current = timerId;
    setIsAlertTime(true);
  }, [stopAlert]);


  // **********************************
  // 4. 타이머 및 상태 업데이트 로직
  // **********************************
  
  // 타이머 인터벌 관리
  useEffect(() => {
    if (isRunning && timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0 && currentView === VIEW_ENUM.TIMER && !isGameFinished) {
      // 타이머 종료 시 (경기 종료 아닐 때만)
      clearInterval(intervalRef.current as NodeJS.Timeout);
      intervalRef.current = null;
      playAlert();
    }
    return () => clearInterval(intervalRef.current as NodeJS.Timeout);
  }, [isRunning, timer, playAlert, isGameFinished, currentView]);

  // 경기 종료 감지 및 자동 통계 전환
  useEffect(() => {
    if (isGameFinished) {
      stopAlert();
      setIsRunning(false);
      // ✅ 팝업 없이 바로 통계 뷰로 전환
      setCurrentView(VIEW_ENUM.STATS); 
    }
  }, [isGameFinished, stopAlert]);


  // **********************************
  // 5. 버튼 핸들러 및 리셋 로직
  // **********************************

  const handleStartPause = () => {
    if (isGameFinished) return;
    setIsRunning(prev => !prev);
  };

  const handleKeeperChange = () => {
    if (isGameFinished) return;
    
    stopAlert(); // 교체 버튼 누르면 알림 즉시 정지
    
    // 로테이션 업데이트 로직
    if (currentSectionIndex + 1 < TOTAL_SECTIONS) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      // 다음 경기로 이동 (마지막 경기였으면 isGameFinished = true)
      if (currentGameIndex + 1 < TOTAL_GAMES) {
        setCurrentGameIndex(prev => prev + 1);
        setCurrentSectionIndex(0); // 새 경기 시작 시 섹션 0으로 리셋
      } else {
        setIsGameFinished(true); // ✅ 모든 경기 종료!
      }
    }
    
    setTimer(SECTION_DURATION); // 타이머 리셋
    setIsRunning(true); // 타이머 재시작
  };

  // ✅ '처음으로 되돌아가기' (리셋) 로직
  const resetApp = () => {
    stopAlert();
    setIsRunning(false);
    setIsGameFinished(false);
    setTimer(SECTION_DURATION);
    setCurrentGameIndex(0);
    setCurrentSectionIndex(0);
    setCurrentView(VIEW_ENUM.TIMER); // 타이머 뷰로 되돌아가기
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // **********************************
  // 6. 뷰 렌더링 (모바일 반응형 디자인 적용)
  // **********************************
  const TimerView: React.FC = () => (
    <div className="flex flex-col items-center justify-start pt-16 min-h-screen bg-gray-900 text-white p-4">
      {/* 현재 상태 표시 */}
      <div className="text-2xl mb-8 font-semibold text-gray-300">
        <span className="text-green-400 font-bold">{currentGameIndex + 1}</span>경기 - <span className="text-green-400 font-bold">{currentSectionIndex + 1}</span> 섹션
      </div>

      {/* 타이머 (모바일 최적화 폰트 크기) */}
      <div className={`text-7xl sm:text-8xl font-mono mb-12 font-extrabold transition-colors duration-500 
                      ${isAlertTime ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
        {formatTime(timer)}
      </div>

      {/* 버튼 (모바일 터치 최적화) */}
      <div className="flex gap-4 w-full max-w-sm justify-center mb-10">
        <button
          onClick={handleStartPause}
          className={`flex-1 p-4 rounded-xl font-bold text-xl sm:text-2xl transition duration-200 shadow-lg
                      ${isRunning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={isGameFinished}
        >
          {isRunning ? '일시정지' : (timer === SECTION_DURATION ? '시작' : '재개')}
        </button>
      </div>

      {/* 키퍼 교체 알림 팝업 (모바일 전면 표시) */}
      {isAlertTime && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-6">
          <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl text-center w-full max-w-md animate-in fade-in zoom-in">
            <h2 className="text-4xl font-extrabold text-red-600 mb-6 border-b pb-4">키퍼 교체 시간!</h2>
            <p className="text-2xl font-semibold mb-8">
              <span className="text-red-500 block">OUT: {getCurrentKeeper()}번 선수</span>
              <span className="text-green-500 block mt-3">IN: {getNextKeeper()}번 선수</span>
            </p>
            <button
              onClick={handleKeeperChange}
              className="w-full p-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-2xl transition duration-300 shadow-xl"
            >
              교체 완료 및 경기 재개
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const StatsView: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white p-4">
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-yellow-400">✅ 모든 경기 종료!</h1>
      <p className="text-xl sm:text-2xl mb-12 text-gray-300 text-center">
        수고하셨습니다. 최종 통계를 확인하고 새로운 시작을 준비하세요.
      </p>
      
      {/* 임시 통계 내용 */}
      <div className="bg-gray-700 p-6 rounded-xl w-full max-w-sm text-left mb-12 shadow-inner">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 text-green-300">경기 기록 요약</h2>
        <p className="text-lg">총 <span className="font-bold">{TOTAL_GAMES}</span>경기 완료.</p>
        <p className="text-lg">섹션 시간: <span className="font-bold">{SECTION_DURATION / 60}</span>분</p>
      </div>

      {/* ✅ 처음으로 되돌아가기 버튼 */}
      <button
        onClick={resetApp}
        className="w-full max-w-sm p-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-2xl transition duration-300 shadow-xl"
      >
        처음으로 되돌아가기
      </button>
    </div>
  );
  
  // 메인 렌더링: 뷰 상태에 따라 컴포넌트 분기
  if (currentView === VIEW_ENUM.TIMER) {
    return <TimerView />;
  } else if (currentView === VIEW_ENUM.STATS) {
    return <StatsView />;
  }
  return null; 
};

// **********************************
// 7. 앱 진입점 (HashRouter 래핑)
// **********************************

const AppWrapper: React.FC = () => (
  // GitHub Pages 경로 문제 해결을 위해 HashRouter를 사용
  <HashRouter>
    <Routes>
      <Route path="/" element={<FutsalTeamManagerDebug />} />
    </Routes>
  </HashRouter>
);

export default AppWrapper;