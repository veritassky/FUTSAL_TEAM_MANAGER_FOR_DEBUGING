import React, { useState, useEffect, useRef } from 'react';
import { Users, Timer, Play, Pause, RotateCcw, Plus, Trash2, Bell, List } from 'lucide-react';

// --- 타입 정의 (TypeScript를 가정하여 편의상 추가) ---
type Player = {
    id: number;
    name: string;
    level: number;
    team: 'yellow' | 'blue';
};
type TeamState = { teamA: Player[]; teamB: Player[] };
type BenchState = { teamA: Player[]; teamB: Player[] };
type KeeperRotation = { teamA: number; teamB: number };
type Score = { teamA: number; teamB: number };
type PlayerStats = { [id: number]: { fieldTime: number, keeperTime: number, totalGames: number } };
type GameHistory = { game: number; scoreA: number; scoreB: number; winner: string }[];


// --- 상수 설정 ---
const DEFAULT_GAME_TIME_SEC = 7 * 60; 
const ALARM_SOUND_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

// 1. 8경기 필드 로테이션 스케줄 상수 (마킹 번호 1~9 기준)
const FIELD_ROTATION_SCHEDULE = [
    [1, 2, 3, 4, 5, 6], // 1경기 필드 (기본)
    [3, 9, 1, 4, 7, 8], // 2경기 필드
    [7, 8, 2, 5, 6, 9], // 3경기 필드
    [4, 5, 1, 2, 3, 6], // 4경기 필드
    [7, 9, 1, 3, 4, 8], // 5경기 필드
    [6, 8, 2, 5, 7, 9], // 6경기 필드
    [3, 5, 1, 2, 6, 4], // 7경기 필드
    [1, 4, 3, 7, 8, 9], // 8경기 필드
];


// --- 컴포넌트 시작 ---
const FutsalTeamManagerDebug = () => {
  
  // --- 상태 관리 (생략) ---
  const [currentView, setCurrentView] = useState<'players' | 'teams' | 'game' | 'rotation' | 'history'>('players'); 
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamState>({ teamA: [], teamB: [] });
  const [benchPlayers, setBenchPlayers] = useState<BenchState>({ teamA: [], teamB: [] });
  
  const [gameDurationSeconds, setGameDurationSeconds] = useState(DEFAULT_GAME_TIME_SEC); 
  
  const [timerCount, setTimerCount] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isKeeperChangeTime, setIsKeeperChangeTime] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1);
  const [totalGameTime, setTotalGameTime] = useState(0);
  
  const [keeperRotation, setKeeperRotation] = useState<KeeperRotation>({ teamA: 1, teamB: 1 });
  const [currentGame, setCurrentGame] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({});
  const [score, setScore] = useState<Score>({ teamA: 0, teamB: 0 });
  const [gameHistory, setGameHistory] = useState<GameHistory>([]); 
  
  const [newPlayer, setNewPlayer] = useState<Omit<Player, 'id' | 'level' | 'team'> & { level: number, team: 'yellow' | 'blue' }>({ name: '', level: 1, team: 'yellow' });
  const [debugLog, setDebugLog] = useState('디버깅 모드');
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  
  // 모든 선수 목록을 합칩니다. (키퍼 정보 계산에 필요)
  const allPlayers = [...teams.teamA, ...teams.teamB, ...benchPlayers.teamA, ...benchPlayers.teamB].sort((a, b) => a.id - b.id);

  // ... (오디오, 타이머, 상태 업데이트 로직 - 이전 코드와 동일) ...
  const stopAlarm = () => { 
    if (audioRef.current) { 
      audioRef.current.pause(); 
      audioRef.current.currentTime = 0; 
      audioRef.current = null; 
    } 
  }; 

  const playAlarm = () => {
      try {stopAlarm(); 
          const audio = new Audio(ALARM_SOUND_URL);
          audio.volume = 0.5;
          audio.play().catch(e => console.error("Audio playback failed:", e));
          audioRef.current = audio; 
      } catch (e) {
          console.error("Audio object creation failed:", e);
      }
  };

  const triggerNotification = (message: string) => {
    if (Notification.permission === 'granted') {
        new Notification("풋살팀 매니저 알림", { body: message });
    }
    setDebugLog(message);
    playAlarm();
  };

  useEffect(() => {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isTimerRunning || isKeeperChangeTime) return;
    
    const timer = setTimeout(() => {
      setTimerCount(prev => prev + 1);
      setTotalGameTime(prev => {
        const nextTotal = prev + 1;
        setDebugLog(`총 ${formatTime(nextTotal)} 진행중`);

        if (nextTotal % gameDurationSeconds === 0) {
          setIsTimerRunning(false);
          setIsKeeperChangeTime(true);
          
          if (nextTotal >= gameDurationSeconds * 2) { 
            triggerNotification(`🔔 경기 ${currentGame} 종료! 최종 스코어 ${score.teamA}:${score.teamB}`);
          } else {
            triggerNotification(`🔔 ${gameDurationSeconds / 60}분 경과! 키퍼 교체 시간!`); 
          }
        }

        return nextTotal;
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timerCount, isTimerRunning, isKeeperChangeTime, totalGameTime, currentGame, score.teamA, score.teamB, gameDurationSeconds]); 


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateScore = (team: 'teamA' | 'teamB', amount: number) => {
    setScore(prev => ({
      ...prev,
      [team]: Math.max(0, prev[team] + amount)
    }));
  };

  const addPlayer = () => {
    if (newPlayer.name.trim()) {
      const newId = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.id), 0) + 1 : 1;
      const player: Player = { ...newPlayer, id: newId };
      setPlayers(prev => [...prev, player]);
      
      setPlayerStats(prev => ({
        ...prev,
        [newId]: { fieldTime: 0, keeperTime: 0, totalGames: 0 }
      }));
      setNewPlayer({ name: '', level: 1, team: 'yellow' });
    }
  };

  const deletePlayer = (id: number) => {
    setPlayers(players.filter(p => p.id !== id));
  };
  
  const generateBalancedTeams = () => {
    const sortedAllPlayers = [...players].sort((a, b) => a.id - b.id);
    
    if (sortedAllPlayers.length < 18) {
        alert('9명씩 18명이 필요합니다.');
        return;
    }
    
    const yellowPlayers = sortedAllPlayers.filter(p => p.team === 'yellow');
    const bluePlayers = sortedAllPlayers.filter(p => p.team === 'blue');
    
    if (yellowPlayers.length !== 9 || bluePlayers.length !== 9) {
        alert('각 팀에 정확히 9명씩 배정해야 합니다.');
        return;
    }
    
    setTeams({ 
        teamA: yellowPlayers.slice(0, 6), // 옐로 필드 (마킹 번호 1~6, ID 1~6)
        teamB: bluePlayers.slice(0, 6)   // 블루 필드 (마킹 번호 1~6, ID 10~15)
    });
    setBenchPlayers({ 
        teamA: yellowPlayers.slice(6, 9), // 옐로 벤치 (마킹 번호 7~9, ID 7~9)
        teamB: bluePlayers.slice(6, 9)   // 블루 벤치 (마킹 번호 7~9, ID 16~18)
    });

    setCurrentView('teams');
    setDebugLog('선수 ID 순서대로 팀 편성 완료 (1-6 필드, 7-9 벤치)');
  };


  const startGame = () => {
    const numPlayers = 9;
    const currentKeeperMarker = (currentGame - 1) % numPlayers + 1;

    setKeeperRotation({ teamA: currentKeeperMarker, teamB: currentKeeperMarker });

    setCurrentView('game');
    setTimerCount(0);
    setTotalGameTime(0);
    setCurrentHalf(1);
    setScore({ teamA: 0, teamB: 0 });
    
    setIsKeeperChangeTime(false);
    setIsTimerRunning(true);
    setDebugLog(`경기 ${currentGame} 시작. 양팀 키퍼: 마킹 ${currentKeeperMarker}번`);
    
    const newStats = { ...playerStats };
    [...teams.teamA, ...teams.teamB].forEach(player => {
      newStats[player.id].totalGames += 1;
    });
    setPlayerStats(newStats);
  };

  const completeKeeperChange = () => {
    stopAlarm(); 
    
    if (totalGameTime < gameDurationSeconds * 2) { 
        setCurrentHalf(2);
        setIsKeeperChangeTime(false);
        setIsTimerRunning(true);
        setDebugLog(`후반 시작`);
    } else {
      endGame(true);
    }
  };

  const endGame = (completed = false) => {
    stopAlarm();
    setIsTimerRunning(false);
    setIsKeeperChangeTime(false);
    
    setGameHistory(prev => [...prev, {
        game: currentGame,
        scoreA: score.teamA,
        scoreB: score.teamB,
        winner: score.teamA > score.teamB ? '옐로 승' : score.teamB > score.teamA ? '블루 승' : '무승부'
    }]);

    const finalLog = `경기 ${currentGame} 종료! 최종 스코어: ${score.teamA} 대 ${score.teamB}`;
    setDebugLog(finalLog);
    setCurrentGame(prev => prev + 1);
    setCurrentView('rotation');
  };

    // ------------------------------------------------------------------
    // 2. 골키퍼 정보 계산 함수 (9경기 순환)
    // ------------------------------------------------------------------
    const getKeeperInfo = (allPlayers: Player[], currentGame: number, teamStartID: number) => {
        const numPlayers = 9;
        
        // 마킹 번호 (1~9) 계산: 1경기 -> 1번, 9경기 -> 9번, 10경기 -> 1번
        const currentMarker = (currentGame - 1) % numPlayers + 1;
        
        // 다음 경기 마킹 번호 (1~9) 계산: 1경기 -> 2번, 9경기 -> 1번, 10경기 -> 2번
        const nextMarker = (currentGame % numPlayers) + 1;

        // 실제 선수 ID를 계산합니다. (팀 A: ID=마킹, 팀 B: ID=마킹+9)
        const currentKeeperID = teamStartID === 1 ? currentMarker : currentMarker + 9;
        const nextKeeperID = teamStartID === 1 ? nextMarker : nextMarker + 9;
        
        const currentKeeper = allPlayers.find(p => p.id === currentKeeperID);
        const nextKeeper = allPlayers.find(p => p.id === nextKeeperID);

        return {
            currentName: currentKeeper 
                ? `#${currentMarker} ${currentKeeper.name}` 
                : `마킹 #${currentMarker} (ID: ${currentKeeperID})`,
            nextName: nextKeeper 
                ? `#${nextMarker} ${nextKeeper.name}` 
                : `마킹 #${nextMarker} (ID: ${nextKeeperID})`,
        };
    };


  // 3. suggestSubstitutions 함수 (8경기 로테이션 적용) - 이전 코드와 동일
  const suggestSubstitutions = () => {
    // 8경기가 지나면 로테이션이 반복됩니다.
    // 1경기(currentGame=1) -> 인덱스 0 사용, 8경기(currentGame=8) -> 인덱스 7 사용
    // 이 로직은 교체 적용 (applySubstitutions) 시에 사용되므로, 
    // 실제로는 **다음 경기(currentGame+1)**의 로테이션을 미리 제안해야 합니다.
    const nextGame = currentGame + 1;
    const nextRotationIndex = (nextGame - 1) % FIELD_ROTATION_SCHEDULE.length;
    const markersForNextGame = FIELD_ROTATION_SCHEDULE[nextRotationIndex];


    // ------------------------------------------------------------------
    // 1. 옐로팀 (Team A) 교체 계산: ID = 마킹 번호 (1~9)
    // ------------------------------------------------------------------
    const teamAOut: Player[] = [];
    const teamAIn: Player[] = [];

    // OUT: 현재 필드 (teams.teamA)에 있지만, 다음 경기 필드 (markersForNextGame)에 없는 선수
    teams.teamA.forEach(player => {
        if (!markersForNextGame.includes(player.id)) {
            teamAOut.push(player);
        }
    });

    // IN: 전체 선수 중 다음 경기 필드에 포함되어야 하는데 현재 필드에 없는 선수
    const allAPlayers = [...teams.teamA, ...benchPlayers.teamA].sort((a, b) => a.id - b.id);
    allAPlayers.forEach(player => {
        if (markersForNextGame.includes(player.id) && !teams.teamA.some(p => p.id === player.id)) {
             teamAIn.push(player);
        }
    });

    // ------------------------------------------------------------------
    // 2. 블루팀 (Team B) 교체 계산: ID = 마킹 번호 + 9 (10~18)
    // ------------------------------------------------------------------
    const teamBOut: Player[] = [];
    const teamBIn: Player[] = [];

    // OUT: 현재 필드 (teams.teamB)에 있지만, 다음 경기 필드에 없는 선수
    teams.teamB.forEach(player => {
        const marker = player.id - 9; // 블루팀 선수의 마킹 번호
        if (!markersForNextGame.includes(marker)) {
            teamBOut.push(player);
        }
    });

    // IN: 전체 선수 중 다음 경기 필드에 포함되어야 하는데 현재 필드에 없는 선수
    const allBPlayers = [...teams.teamB, ...benchPlayers.teamB].sort((a, b) => a.id - b.id);
    allBPlayers.forEach(player => {
        const marker = player.id - 9;
        if (markersForNextGame.includes(marker) && !teams.teamB.some(p => p.id === player.id)) {
             teamBIn.push(player);
        }
    });

    return {
        teamA: { out: teamAOut, in: teamAIn },
        teamB: { out: teamBOut, in: teamBIn }
    };
  };

  
  // 4. applySubstitutions 함수 - 이전 코드와 동일
  const applySubstitutions = () => {
    const subs = suggestSubstitutions();
    
    // Team A (필드) 업데이트: OUT 선수를 제외하고, IN 선수를 추가
    const newTeamA = [
        ...teams.teamA.filter(p => !subs.teamA.out.some(outP => outP.id === p.id)),
        ...subs.teamA.in
    ];
    
    // Team B (필드) 업데이트: OUT 선수를 제외하고, IN 선수를 추가
    const newTeamB = [
        ...teams.teamB.filter(p => !subs.teamB.out.some(outP => outP.id === p.id)),
        ...subs.teamB.in
    ];
    
    // Bench A (벤치) 업데이트: IN 선수를 제외하고, OUT 선수를 추가
    const newBenchA = [
        ...benchPlayers.teamA.filter(p => !subs.teamA.in.some(inP => inP.id === p.id)),
        ...subs.teamA.out
    ];
    
    // Bench B (벤치) 업데이트: IN 선수를 제외하고, OUT 선수를 추가
    const newBenchB = [
        ...benchPlayers.teamB.filter(p => !subs.teamB.in.some(inP => inP.id === p.id)),
        ...subs.teamB.out
    ];
    
    setTeams({ teamA: newTeamA, teamB: newTeamB });
    setBenchPlayers({ teamA: newBenchA, teamB: newBenchB });
    setCurrentView('teams');
  };

  const resetAllData = () => {
      if (window.confirm("모든 선수 데이터, 팀 구성, 경기 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
          setPlayers([]);
          setTeams({ teamA: [], teamB: [] });
          setBenchPlayers({ teamA: [], teamB: [] });
          setTimerCount(0);
          setIsTimerRunning(false);
          setIsKeeperChangeTime(false);
          setCurrentHalf(1);
          setTotalGameTime(0);
          setKeeperRotation({ teamA: 1, teamB: 1 });
          setCurrentGame(1);
          setPlayerStats({});
          setScore({ teamA: 0, teamB: 0 });
          setGameHistory([]); 
          setDebugLog('모든 데이터 초기화 완료');
          setCurrentView('players');
      }
  };


  // --- 렌더링 시작 ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-orange-500 to-yellow-600 p-2">
      {/* ... (상단 탭 메뉴 생략) ... */}

      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* ... (탭 메뉴) ... */}

          <div className="p-4">
            
            {/* ... (선수 관리 뷰) ... */}
            
            {/* ... (팀 편성 뷰) ... */}

            {/* 경기 진행 뷰: 골키퍼 정보 위치 변경됨 */}
            {currentView === 'game' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-center">경기 {currentGame}</h2>
                
                {/* 1. 스코어 및 타이머 UI (상단 유지) */}
                <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                  <div className="text-sm text-gray-600 mb-2">{debugLog}</div>
                  <div className="text-4xl font-bold mb-2">{formatTime(timerCount)}</div>
                  <div className="text-lg text-gray-600">
                    {currentHalf === 1 ? '전반' : '후반'} 
                    (총 {formatTime(totalGameTime)} / {formatTime(gameDurationSeconds * 2)})
                  </div>
                  
                  {/* 스코어 보드 (동일) */}
                  <div className="flex justify-center items-center gap-6 my-4">
                    <div className="flex flex-col items-center">
                      <h3 className="text-xl font-bold text-yellow-800 mb-2">옐로</h3>
                      <div className="text-6xl font-extrabold text-yellow-600">{score.teamA}</div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => updateScore('teamA', 1)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-lg">+</button>
                        <button onClick={() => updateScore('teamA', -1)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-lg">-</button>
                      </div>
                    </div>
                    <span className="text-4xl font-extrabold text-gray-500">:</span>
                    <div className="flex flex-col items-center">
                      <h3 className="text-xl font-bold text-blue-800 mb-2">블루</h3>
                      <div className="text-6xl font-extrabold text-blue-600">{score.teamB}</div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => updateScore('teamB', 1)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-lg">+</button>
                        <button onClick={() => updateScore('teamB', -1)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-lg">-</button>
                      </div>
                    </div>
                  </div>

                  {isKeeperChangeTime ? (
                    <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mt-4">
                      <div className="text-xl font-bold text-yellow-800 mb-2">키퍼 교체!</div>
                      <button 
                        onClick={stopAlarm}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold mb-4 block mx-auto"
                      >
                        소리 끄기
                      </button>
                      <button
                        onClick={completeKeeperChange}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold"
                      >
                        {totalGameTime >= gameDurationSeconds * 2 ? '경기 종료 확정' : '교체 완료 및 후반 시작'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-3 mt-4">
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`px-6 py-2 rounded-lg font-medium ${
                          isTimerRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                        }`}
                      >
                        {isTimerRunning ? <Pause className="w-4 h-4 inline" /> : <Play className="w-4 h-4 inline" />}
                      </button>
                      <button
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerCount(0);
                          setTotalGameTime(0);
                          setIsKeeperChangeTime(false);
                          setScore({ teamA: 0, teamB: 0 });
                        }}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg"
                      >
                        <RotateCcw className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => endGame(false)}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg"
                      >
                        강제 종료
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 2. 🥅 골키퍼 로테이션 정보 (하단으로 이동) */}
                {allPlayers.length >= 18 && (() => {
                    const keeperA = getKeeperInfo(allPlayers, currentGame, 1);
                    const keeperB = getKeeperInfo(allPlayers, currentGame, 10);
                    return (
                        <div className="keeper-rotation-info p-4 rounded-lg border-2 border-red-400 bg-red-50 mt-4">
                            <h3 className="text-xl font-bold text-red-700 mb-3 text-center">
                                🥅 골키퍼 로테이션 정보
                            </h3>
                            <div className="flex justify-between font-bold gap-3">
                                <div className="text-yellow-800 flex-1 text-center bg-white p-3 rounded-lg border border-yellow-300">
                                    <h4 className="text-base font-extrabold mb-1">🟡 옐로팀 (A)</h4>
                                    <p className="text-sm">
                                        현재 키퍼: 
                                        <span className="text-lg text-orange-600 ml-1">
                                            {keeperA.currentName}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        다음 키퍼: 
                                        <span className="text-sm text-gray-800 ml-1">
                                            {keeperA.nextName}
                                        </span>
                                    </p>
                                </div>
                                <div className="text-blue-800 flex-1 text-center bg-white p-3 rounded-lg border border-blue-300">
                                    <h4 className="text-base font-extrabold mb-1">🔵 블루팀 (B)</h4>
                                    <p className="text-sm">
                                        현재 키퍼: 
                                        <span className="text-lg text-blue-600 ml-1">
                                            {keeperB.currentName}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        다음 키퍼: 
                                        <span className="text-sm text-gray-800 ml-1">
                                            {keeperB.nextName}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()}
              </div>
            )}

            {/* ... (팀 교체 뷰) ... */}

            {/* ... (경기 기록 뷰) ... */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FutsalTeamManagerDebug;