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
const KEEPER_ROTATION_SCHEDULE = [
  [1, 2],
  [3, 9],
  [7, 8],
  [4, 5],
  [7, 9],
  [6, 8],
  [3, 5],
  [1, 4],
];

const DEFAULT_GAME_TIME_SEC = 7 * 60; 
const ALARM_SOUND_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';


// --- 컴포넌트 시작 ---
const FutsalTeamManagerDebug = () => {
  
  // --- 상태 관리 ---
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

  // ... (오디오, 타이머, 상태 업데이트 로직 - 동일) ...
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
  }, [timerCount, isTimerRunning, isKeeperChangeTime, totalGameTime, currentGame, score.teamA, score.teamB, gameDurationSeconds, triggerNotification]); 


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
      // ID는 전체 선수 수 + 1로 순차적으로 부여
      const newId = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.id), 0) + 1 : 1;
      const player: Player = { ...newPlayer, id: newId };
      setPlayers(prev => [...prev, player]); // 'players' 상태를 업데이트 (이제 사용하지 않지만, 데이터 보존을 위해)
      
      // players 상태를 직접 사용하지 않고, teams와 benchPlayers를 구성할 때 allPlayers를 참조합니다.
      // allPlayers에 이 선수를 포함시키기 위해 players 상태에 넣습니다.
      
      setPlayerStats(prev => ({
        ...prev,
        [newId]: { fieldTime: 0, keeperTime: 0, totalGames: 0 }
      }));
      setNewPlayer({ name: '', level: 1, team: 'yellow' });
    }
  };

  const deletePlayer = (id: number) => {
    setPlayers(players.filter(p => p.id !== id));
    // 팀 구성 시 allPlayers가 참조되므로, 재편성 전까지는 남아있을 수 있음
  };
  
  // 1. generateBalancedTeams 함수 수정: ID 순으로 정렬하여 마킹 번호 고정
  const generateBalancedTeams = () => {
    // players 상태가 아닌, 현재 모든 선수를 ID 순으로 정렬하여 사용
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
    
    // 정렬된 목록을 기준으로 필드(1~6번)와 벤치(7~9번)에 순서대로 할당합니다.
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
    // if (currentGame > KEEPER_ROTATION_SCHEDULE.length) return; // 8경기만 하는 경우에 사용
    
    // 키퍼 로테이션 정보 계산 (마킹 번호 1~9 순환)
    const numPlayers = 9;
    const currentKeeperMarker = (currentGame - 1) % numPlayers + 1;

    // 실제 키퍼 ID를 구하는 로직은 getKeeperInfo에서 이미 처리됨.
    // 여기서는 상태 업데이트만 간단히 처리 (현재 로직에서는 사용되지 않음)
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
    
    // ... (플레이 타임 기록 로직 - 생략) ...
    
    if (totalGameTime < gameDurationSeconds * 2) { 
        // 후반 시작 시 키퍼는 바뀌지 않고 그대로 유지됨 (키퍼는 한 경기당 한 명)
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
    
    // ... (남은 시간 기록 로직 - 생략) ...

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
    
    // 무한 로테이션이므로 종료 조건은 제거합니다.
  };

    // ------------------------------------------------------------------
    // 2. 새로운 기능: 골키퍼 정보 계산 함수
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
        
        // 해당 ID를 가진 선수를 찾습니다.
        const currentKeeper = allPlayers.find(p => p.id === currentKeeperID);
        const nextKeeper = allPlayers.find(p => p.id === nextKeeperID);

        return {
            // 현재 키퍼 마킹 번호와 선수 이름
            currentName: currentKeeper 
                ? `#${currentMarker} ${currentKeeper.name}` 
                : `마킹 #${currentMarker} (ID: ${currentKeeperID})`,
            // 다음 키퍼 마킹 번호와 선수 이름
            nextName: nextKeeper 
                ? `#${nextMarker} ${nextKeeper.name}` 
                : `마킹 #${nextMarker} (ID: ${nextKeeperID})`,
        };
    };


  // 3. suggestSubstitutions 함수 수정: 블루팀 ID 계산 오류 수정
  const suggestSubstitutions = () => {
    const rotationCount = (currentGame - 1) % 3; // 1경기 후: 0, 2경기 후: 1, 3경기 후: 2

    let outMarkers: number[] = []; 
    let inMarkers: number[] = [];  

    if (rotationCount === 0) { 
        // 1경기 후 (경기 2 시작): 마킹 7, 8, 9 IN, 마킹 2, 5, 6 OUT
        outMarkers = [2, 5, 6]; 
        inMarkers = [7, 8, 9];  
    } else if (rotationCount === 1) {
        // 2경기 후 (경기 3 시작): 마킹 2, 5, 6 IN, 마킹 1, 3, 4 OUT
        outMarkers = [1, 3, 4]; 
        inMarkers = [2, 5, 6];  
    } else if (rotationCount === 2) {
        // 3경기 후 (경기 4 시작): 마킹 1, 3, 4 IN, 마킹 7, 8, 9 OUT
        outMarkers = [7, 8, 9];
        inMarkers = [1, 3, 4];
    }
    
    // 1. 옐로팀 (Team A): ID 1~9. 마킹 번호 == ID
    const teamAOut = teams.teamA.filter(p => outMarkers.includes(p.id));
    const teamAIn = benchPlayers.teamA.filter(p => inMarkers.includes(p.id));

    // 2. 블루팀 (Team B): ID 10~18. 마킹 번호 = ID - 9
    //    -> 마킹 번호가 'n'이면, 실제 ID는 'n + 9'
    const blueOutIDs = outMarkers.map(marker => marker + 9);
    const blueInIDs = inMarkers.map(marker => marker + 9);

    const teamBOut = teams.teamB.filter(p => blueOutIDs.includes(p.id));
    const teamBIn = benchPlayers.teamB.filter(p => blueInIDs.includes(p.id));

    return {
        teamA: { out: teamAOut, in: teamAIn },
        teamB: { out: teamBOut, in: teamBIn }
    };
  };

  
  // 4. applySubstitutions 함수 (동일)
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


  // --- 렌더링 ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-orange-500 to-yellow-600 p-2">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4">
            <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Timer className="w-8 h-8" />
              풋살팀 매니저
            </h1>
            <div className="flex justify-center mt-4 space-x-2">
              {['players', 'teams', 'game', 'rotation', 'history'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view as any)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    currentView === view ? 'bg-white text-red-600' : 'bg-red-500 text-white'
                  }`}
                >
                  {view === 'players' && '선수 관리'}
                  {view === 'teams' && '팀 편성'}
                  {view === 'game' && '경기 진행'}
                  {view === 'rotation' && '팀 교체'}
                  {view === 'history' && '경기 기록'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            
            {/* 선수 관리 뷰 */}
            {currentView === 'players' && (
              // ... (선수 관리 UI - 동일) ...
              <div>
                <h2 className="text-2xl font-bold mb-6">선수 관리</h2>
                
                {/* 시간 설정 입력 필드 */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-orange-300">
                    <label 
                        htmlFor="gameDurationInput" 
                        className="block text-base font-semibold text-gray-700 mb-2"
                    >
                        ⚽ 한 쿼터 시간 설정 (분)
                    </label>
                    <input
                        id="gameDurationInput"
                        type="number"
                        min="1"
                        value={gameDurationSeconds / 60} 
                        onChange={(e) => {
                            const minutes = parseInt(e.target.value, 10);
                            if (minutes > 0) {
                                setGameDurationSeconds(minutes * 60); 
                            }
                        }}
                        placeholder="예: 7 (기본 7분)"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 text-2xl border focus:border-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">※ 쿼터 시간은 키퍼 교체 주기와 동일합니다.</p>
                </div>
                
                {/* 선수 추가 섹션 */}
                <div className="bg-gray-50 p-3 rounded-lg mb-6">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="이름"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <select
                      value={newPlayer.team}
                      onChange={(e) => setNewPlayer({...newPlayer, team: e.target.value as 'yellow' | 'blue'})}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="yellow">옐로</option>
                      <option value="blue">블루</option>
                    </select>
                    <select
                      value={newPlayer.level}
                      onChange={(e) => setNewPlayer({...newPlayer, level: parseInt(e.target.value)})}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value={1}>Lv1</option>
                      <option value={2}>Lv2</option>
                      <option value={3}>Lv3</option>
                    </select>
                    <button
                      onClick={addPlayer}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 선수별 누적 기록 */}
                <div className="grid gap-3 mb-6">
                  <h3 className="text-xl font-bold mb-3">선수별 누적 기록</h3>
                  {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          player.team === 'yellow' ? 'bg-yellow-200' : 'bg-blue-200'
                        }`}>
                          {player.team === 'yellow' ? '옐로' : '블루'}
                        </span>
                        <span className="font-medium">{player.name}</span>
                        <span className="text-sm text-gray-500">
                          (ID: {player.id}) 
                        </span>
                      </div>
                      <button onClick={() => deletePlayer(player.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 하단 버튼: 팀 구성 및 초기화 */}
                <div className="flex justify-between gap-4">
                  <button
                    onClick={generateBalancedTeams}
                    disabled={players.length < 18}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"
                  >
                    팀 구성 ({players.length}/18)
                  </button>
                  <button
                      onClick={resetAllData}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium"
                  >
                      전체 초기화
                  </button>
                </div>
              </div>
            )}
            
            {/* 경기 기록 뷰 (동일) */}
            {currentView === 'history' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <List className="w-6 h-6"/> 전체 경기 기록
                    </h2>
                    {gameHistory.length === 0 ? (
                        <p className="text-gray-500 text-center py-10">아직 완료된 경기가 없습니다. 경기를 시작하세요.</p>
                    ) : (
                        <div className="grid grid-cols-4 gap-2 text-sm bg-gray-100 p-4 rounded-lg">
                            <div className="font-bold text-center">경기 #</div>
                            <div className="font-bold col-span-2 text-center">스코어</div>
                            <div className="font-bold text-center">승패</div>
                            {gameHistory.map((h, idx) => (
                                <React.Fragment key={idx}>
                                    <div className="p-2 text-center">{h.game}</div>
                                    <div className="p-2 text-center font-extrabold text-lg col-span-2">
                                        <span className="text-yellow-600">{h.scoreA}</span> : <span className="text-blue-600">{h.scoreB}</span>
                                    </div>
                                    <div className={`p-2 font-medium text-center ${h.winner.includes('승') ? 'text-green-600' : 'text-gray-500'}`}>{h.winner}</div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    <div className="mt-6 text-center">
                        <button
                            onClick={resetAllData}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium"
                        >
                            전체 데이터 초기화
                        </button>
                    </div>
                </div>
            )}
            
            {/* 팀 편성 뷰 (동일) */}
            {currentView === 'teams' && teams.teamA.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">팀 구성</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-400">
                    <h3 className="text-xl font-bold text-yellow-800 mb-4">옐로팀 (Team A)</h3>
                    {teams.teamA.map((p, idx) => (<div key={p.id} className="p-2 bg-white rounded mb-2">#{idx + 1}. {p.name} (ID:{p.id})</div>))}
                    {benchPlayers.teamA.length > 0 && (<div className="mt-4"><div className="font-medium mb-2">벤치</div>{benchPlayers.teamA.map((p, idx) => (<div key={p.id} className="p-1 bg-gray-100 rounded text-sm mb-1">#{idx + 7}. {p.name} (ID:{p.id})</div>))}</div>)}
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-400">
                    <h3 className="text-xl font-bold text-blue-800 mb-4">블루팀 (Team B)</h3>
                    {teams.teamB.map((p, idx) => (<div key={p.id} className="p-2 bg-white rounded mb-2">#{idx + 1}. {p.name} (ID:{p.id})</div>))}
                    {benchPlayers.teamB.length > 0 && (<div className="mt-4"><div className="font-medium mb-2">벤치</div>{benchPlayers.teamB.map((p, idx) => (<div key={p.id} className="p-1 bg-gray-100 rounded text-sm mb-1">#{idx + 7}. {p.name} (ID:{p.id})</div>))}</div>)}
                  </div>
                </div>
                <div className="text-center">
                  <button
                    onClick={startGame}
                    className={`px-6 py-3 rounded-lg font-medium ${
                      teams.teamA.length < 6 ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    <Play className="w-5 h-5 inline mr-2" />
                    경기 {currentGame} 시작
                  </button>
                </div>
              </div>
            )}

            {/* 경기 진행 뷰 */}
            {currentView === 'game' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-center">경기 {currentGame}</h2>
                
                {/* ------------------------------------------------------------------ */}
                {/* 2. 골키퍼 로테이션 정보 표시 기능 추가 */}
                {/* ------------------------------------------------------------------ */}
                {allPlayers.length >= 18 && (() => {
                    const keeperA = getKeeperInfo(allPlayers, currentGame, 1);
                    const keeperB = getKeeperInfo(allPlayers, currentGame, 10);
                    return (
                        <div className="keeper-rotation-info p-4 rounded-lg mb-6 border-2 border-red-400 bg-red-50">
                            <h3 className="text-xl font-bold text-red-700 mb-3 text-center">
                                🥅 골키퍼 로테이션 정보
                            </h3>
                            <div className="flex justify-between font-bold gap-3">
                                {/* 옐로팀 키퍼 정보 */}
                                <div className="text-yellow-800 flex-1 text-center bg-white p-3 rounded-lg border border-yellow-300">
                                    <h4 className="text-base font-extrabold mb-1">🟡 옐로팀 (A)</h4>
                                    <p className="text-sm">
                                        현재 키퍼: 
                                        <span className="text-lg text-orange-600 ml-1">
                                            {keeperA.currentName}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        다음 경기 키퍼: 
                                        <span className="text-sm text-gray-800 ml-1">
                                            {keeperA.nextName}
                                        </span>
                                    </p>
                                </div>
                                
                                {/* 블루팀 키퍼 정보 */}
                                <div className="text-blue-800 flex-1 text-center bg-white p-3 rounded-lg border border-blue-300">
                                    <h4 className="text-base font-extrabold mb-1">🔵 블루팀 (B)</h4>
                                    <p className="text-sm">
                                        현재 키퍼: 
                                        <span className="text-lg text-blue-600 ml-1">
                                            {keeperB.currentName}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        다음 경기 키퍼: 
                                        <span className="text-sm text-gray-800 ml-1">
                                            {keeperB.nextName}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()}


                <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                  <div className="text-sm text-gray-600 mb-2">{debugLog}</div>
                  <div className="text-4xl font-bold mb-2">{formatTime(timerCount)}</div>
                  <div className="text-lg text-gray-600">
                    {currentHalf === 1 ? '전반' : '후반'} 
                    (총 {formatTime(totalGameTime)} / {formatTime(gameDurationSeconds * 2)})
                  </div>
                  
                  {/* 스코어 보드 */}
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
              </div>
            )}

            {/* 팀 교체 뷰 (동일) */}
            {currentView === 'rotation' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">팀 교체 관리</h2>
                
                <div className="bg-gray-100 p-4 rounded-lg mb-6 text-center">
                  <div className="text-lg font-bold">직전 경기 ({currentGame - 1}) 결과</div>
                  <div className="text-2xl font-extrabold text-orange-600">
                    옐로 {score.teamA} : {score.teamB} 블루
                  </div>
                </div>

                {(() => {
                  const subs = suggestSubstitutions();
                  return (
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-yellow-800 mb-3">옐로팀 교체</h3>
                          <div className="mb-3"><div className="font-medium text-red-600 mb-2">OUT (선수 ID)</div>{subs.teamA.out.map(p => (<div key={p.id} className="p-2 bg-red-100 rounded mb-1">{p.name} (ID: {p.id})</div>))}</div>
                          <div><div className="font-medium text-green-600 mb-2">IN (선수 ID)</div>{subs.teamA.in.map(p => (<div key={p.id} className="p-2 bg-green-100 rounded mb-1">{p.name} (ID: {p.id})</div>))}</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-blue-800 mb-3">블루팀 교체</h3>
                        <div className="mb-3"><div className="font-medium text-red-600 mb-2">OUT (선수 ID)</div>{subs.teamB.out.map(p => (<div key={p.id} className="p-2 bg-red-100 rounded mb-1">{p.name} (ID: {p.id})</div>))}</div>
                        <div><div className="font-medium text-green-600 mb-2">IN (선수 ID)</div>{subs.teamB.in.map(p => (<div key={p.id} className="p-2 bg-green-100 rounded mb-1">{p.name} (ID: {p.id})</div>))}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-center gap-4">
                  <button
                    onClick={applySubstitutions}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"
                  >
                    교체 적용 및 팀 확인
                  </button>
                  <button
                    onClick={() => setCurrentView('teams')}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium"
                  >
                    현재 팀 유지
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FutsalTeamManagerDebug;