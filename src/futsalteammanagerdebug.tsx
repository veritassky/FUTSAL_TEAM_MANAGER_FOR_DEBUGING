import React, { useState, useEffect, useRef } from 'react';
import { Users, Timer, Play, Pause, RotateCcw, Plus, Trash2, Bell, List } from 'lucide-react';

// --- 상수 설정 (변경됨: GAME_DURATION_SEC 상수는 이제 상태로 관리됨) ---
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

// ✅ 기본 시간 설정 (7분 = 420초) - 코드를 깔끔하게 하기 위해 상수로 정의
const DEFAULT_GAME_TIME_SEC = 7 * 60; 

// ❌ 기존 시간 상수들은 사용하지 않음 (이 값을 사용하는 로직은 gameDurationSeconds 상태로 대체됨)
// const KEEPER_CHANGE_INTERVAL_SEC = 6;
// const GAME_DURATION_SEC = 12;

const ALARM_SOUND_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';


// --- 컴포넌트 시작 ---
const FutsalTeamManagerDebug = () => {
  
  // --- 상태 관리 ---
  const [currentView, setCurrentView] = useState('players'); // 'players', 'teams', 'game', 'rotation', 'history'
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({ teamA: [], teamB: [] });
  const [benchPlayers, setBenchPlayers] = useState({ teamA: [], teamB: [] });
  
  // ✅ 새로운 상태: 한 쿼터의 시간 (초 단위)
  const [gameDurationSeconds, setGameDurationSeconds] = useState(DEFAULT_GAME_TIME_SEC); 
  
  const [timerCount, setTimerCount] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isKeeperChangeTime, setIsKeeperChangeTime] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1);
  const [totalGameTime, setTotalGameTime] = useState(0);
  
  const [keeperRotation, setKeeperRotation] = useState({ teamA: 1, teamB: 1 });
  const [currentGame, setCurrentGame] = useState(1);
  const [playerStats, setPlayerStats] = useState({});
  const [score, setScore] = useState({ teamA: 0, teamB: 0 });
  const [gameHistory, setGameHistory] = useState([]); 
  
  const [newPlayer, setNewPlayer] = useState({ name: '', level: 1, team: 'yellow' });
  const [debugLog, setDebugLog] = useState('디버깅 모드');
  const audioRef = useRef(null); 
  const stopAlarm = () => { 
    if (audioRef.current) { 
      audioRef.current.pause(); 
      audioRef.current.currentTime = 0; 
      audioRef.current = null; 
    } 
  }; 

  // --- 오디오, 타이머, 상태 업데이트 로직 ---
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

  const triggerNotification = (message) => {
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

        // ✅ KEEPER_CHANGE_INTERVAL_SEC 대신 gameDurationSeconds 사용
        if (nextTotal % gameDurationSeconds === 0) {
          setIsTimerRunning(false);
          setIsKeeperChangeTime(true);
          
          // ✅ GAME_DURATION_SEC 대신 gameDurationSeconds * 2 (전후반 총 시간) 사용
          if (nextTotal >= gameDurationSeconds * 2) { 
            triggerNotification(`🔔 경기 ${currentGame} 종료! 최종 스코어 ${score.teamA}:${score.teamB}`);
          } else {
            // ✅ KEEPER_CHANGE_INTERVAL_SEC 대신 gameDurationSeconds 사용
            triggerNotification(`🔔 ${gameDurationSeconds / 60}분 경과! 키퍼 교체 시간!`); 
          }
        }

        return nextTotal;
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timerCount, isTimerRunning, isKeeperChangeTime, totalGameTime, currentGame, score.teamA, score.teamB, gameDurationSeconds]); // ✅ 의존성 배열에 gameDurationSeconds 추가


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateScore = (team, amount) => {
    setScore(prev => ({
      ...prev,
      [team]: Math.max(0, prev[team] + amount)
    }));
  };

  // ... (선수 추가/삭제, 팀 밸런스 로직 동일) ...
  const addPlayer = () => {
    if (newPlayer.name.trim()) {
      const newId = Math.max(...players.map(p => p.id), 0) + 1;
      const player = { ...newPlayer, id: newId };
      setPlayers([...players, player]);
      setPlayerStats(prev => ({
        ...prev,
        [newId]: { fieldTime: 0, keeperTime: 0, totalGames: 0 }
      }));
      setNewPlayer({ name: '', level: 1, team: 'yellow' });
    }
  };

  const deletePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const generateBalancedTeams = () => {
    if (players.length < 18) {
      alert('18명 필요 (옐로9 + 블루9)');
      return;
    }
    const yellowPlayers = players.filter(p => p.team === 'yellow');
    const bluePlayers = players.filter(p => p.team === 'blue');
    const sortByPlayTime = (list) => {
      return [...list].sort((a, b) => {
        const aTotal = (playerStats[a.id]?.fieldTime || 0) + (playerStats[a.id]?.keeperTime || 0);
        const bTotal = (playerStats[b.id]?.fieldTime || 0) + (playerStats[b.id]?.keeperTime || 0);
        return aTotal - bTotal;
      });
    };
    const sortedYellow = sortByPlayTime(yellowPlayers);
    const sortedBlue = sortByPlayTime(bluePlayers);

    setTeams({ teamA: sortedYellow.slice(0, 6), teamB: sortedBlue.slice(0, 6) });
    setBenchPlayers({ teamA: sortedYellow.slice(6, 9), teamB: sortedBlue.slice(6, 9) });
    setCurrentView('teams');
  };

  const startGame = () => {
    if (currentGame > KEEPER_ROTATION_SCHEDULE.length) return;

    setCurrentView('game');
    setTimerCount(0);
    setTotalGameTime(0);
    setCurrentHalf(1);
    setScore({ teamA: 0, teamB: 0 });
    
    const gameIndex = (currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length;
    const keepers = KEEPER_ROTATION_SCHEDULE[gameIndex];
    const scheduleGame = (gameIndex % 8) + 1;
    
    setKeeperRotation({ teamA: keepers[0], teamB: keepers[0] });
    setIsKeeperChangeTime(false);
    setIsTimerRunning(true);
    setDebugLog(`경기 ${currentGame} (순서표 ${scheduleGame}경기): 양팀 ${keepers[0]}→${keepers[1]}번 키퍼`);
    
    const newStats = { ...playerStats };
    // ... (스탯 업데이트 로직 동일) ...
    [...teams.teamA, ...teams.teamB].forEach(player => {
      newStats[player.id].totalGames += 1;
    });
    setPlayerStats(newStats);
  };

  const completeKeeperChange = () => {
    stopAlarm(); 
    const newStats = { ...playerStats };
    // ✅ KEEPER_CHANGE_INTERVAL_SEC 대신 gameDurationSeconds 사용
    const intervalMin = gameDurationSeconds / 60; 
    
    const keeperA = teams.teamA[keeperRotation.teamA - 1];
    const keeperB = teams.teamB[keeperRotation.teamB - 1];
    
    if (keeperA) newStats[keeperA.id].keeperTime += intervalMin;
    if (keeperB) newStats[keeperB.id].keeperTime += intervalMin;
    
    teams.teamA.forEach((player, idx) => {
      if (idx + 1 !== keeperRotation.teamA) newStats[player.id].fieldTime += intervalMin;
    });
    teams.teamB.forEach((player, idx) => {
      if (idx + 1 !== keeperRotation.teamB) newStats[player.id].fieldTime += intervalMin;
    });
    
    setPlayerStats(newStats);
    
    const gameIndex = (currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length;
    const keepers = KEEPER_ROTATION_SCHEDULE[gameIndex];
    
    // ✅ GAME_DURATION_SEC 대신 gameDurationSeconds * 2 사용
    if (totalGameTime < gameDurationSeconds * 2) { // 2쿼터 총 시간을 체크
      setKeeperRotation({ teamA: keepers[1], teamB: keepers[1] });
      setCurrentHalf(2);
      setIsKeeperChangeTime(false);
      setIsTimerRunning(true);
      setDebugLog(`키퍼 교체 완료: 양팀 ${keepers[1]}번, 후반 시작`);
    } else {
      endGame(true);
    }
  };

  const endGame = (completed = false) => {
    stopAlarm(); 
    setIsTimerRunning(false);
    setIsKeeperChangeTime(false);
    
    const newStats = { ...playerStats };
    // ✅ KEEPER_CHANGE_INTERVAL_SEC 대신 gameDurationSeconds 사용
    const intervalSec = gameDurationSeconds;
    const remaining = timerCount % intervalSec;
    
    if (remaining > 0) {
      const remainingMin = remaining / 60;
      const keeperA = teams.teamA[keeperRotation.teamA - 1];
      const keeperB = teams.teamB[keeperRotation.teamB - 1];
      
      if (keeperA) newStats[keeperA.id].keeperTime += remainingMin;
      if (keeperB) newStats[keeperB.id].keeperTime += remainingMin;
      
      teams.teamA.forEach((p, idx) => {
        if (idx + 1 !== keeperRotation.teamA) newStats[p.id].fieldTime += remainingMin;
      });
      teams.teamB.forEach((p, idx) => {
        if (idx + 1 !== keeperRotation.teamB) newStats[p.id].fieldTime += remainingMin;
      });
    }
    
    setPlayerStats(newStats);

    setGameHistory(prev => [...prev, {
        game: currentGame,
        scoreA: score.teamA,
        scoreB: score.teamB,
        winner: score.teamA > score.teamB ? '옐로 승' : score.teamB > score.teamA ? '무승부' : '블루 승' // ✅ 수정: score.teamB > score.teamA ? '블루 승' : '무승부'
    }]);

    const finalLog = `경기 ${currentGame} 종료! 최종 스코어: ${score.teamA} 대 ${score.teamB}`;
    setDebugLog(finalLog);
    setCurrentGame(prev => prev + 1);
    setCurrentView('rotation');
    
    if (currentGame >= KEEPER_ROTATION_SCHEDULE.length) {
        setCurrentView('history'); 
    }
  };

  const suggestSubstitutions = () => {
    const getWithTime = (list) => {
      return list.map(p => ({
        ...p,
        totalTime: (playerStats[p.id]?.fieldTime || 0) + (playerStats[p.id]?.keeperTime || 0)
      }));
    };

    const teamATime = getWithTime(teams.teamA).sort((a, b) => b.totalTime - a.totalTime);
    const teamBTime = getWithTime(teams.teamB).sort((a, b) => b.totalTime - a.totalTime);
    const benchATime = getWithTime(benchPlayers.teamA).sort((a, b) => a.totalTime - b.totalTime);
    const benchBTime = getWithTime(benchPlayers.teamB).sort((a, b) => a.totalTime - b.totalTime);

    return {
      teamA: { out: teamATime.slice(0, 3), in: benchATime.slice(0, 3) },
      teamB: { out: teamBTime.slice(0, 3), in: benchBTime.slice(0, 3) }
    };
  };

  const applySubstitutions = () => {
    const subs = suggestSubstitutions();
    
    const newTeamA = [
      ...teams.teamA.filter(p => !subs.teamA.out.some(out => out.id === p.id)),
      ...subs.teamA.in
    ];
    const newTeamB = [
      ...teams.teamB.filter(p => !subs.teamB.out.some(out => out.id === p.id)),
      ...subs.teamB.in
    ];
    
    const newBenchA = [
      ...benchPlayers.teamA.filter(p => !subs.teamA.in.some(inP => inP.id === p.id)),
      ...subs.teamA.out
    ];
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
                  onClick={() => setCurrentView(view)}
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
              <div>
                <h2 className="text-2xl font-bold mb-6">선수 관리</h2>
                
                {/* ✅ 시간 설정 입력 필드 추가 (쿼터 설정 기능) */}
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
                        // 초 -> 분으로 변환하여 표시
                        value={gameDurationSeconds / 60} 
                        onChange={(e) => {
                            const minutes = parseInt(e.target.value, 10);
                            if (minutes > 0) {
                                // 분 -> 초로 변환하여 저장
                                setGameDurationSeconds(minutes * 60); 
                            }
                        }}
                        placeholder="예: 7 (기본 7분)"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 text-2xl border focus:border-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">※ 쿼터 시간은 키퍼 교체 주기와 동일합니다.</p>
                </div>
                
                {/* 선수 추가 섹션 (동일) */}
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
                      onChange={(e) => setNewPlayer({...newPlayer, team: e.target.value})}
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

                {/* 선수별 누적 기록 (동일) */}
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
                          (총: {((playerStats[player.id]?.fieldTime || 0) + (playerStats[player.id]?.keeperTime || 0)).toFixed(1)}분)
                        </span>
                      </div>
                      <button onClick={() => deletePlayer(player.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 하단 버튼: 팀 구성 및 초기화 (동일) */}
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
                        <List className="w-6 h-6"/> 전체 경기 기록 ({gameHistory.length} / {KEEPER_ROTATION_SCHEDULE.length})
                    </h2>
                    {gameHistory.length === 0 ? (
                        <p className="text-gray-500 text-center py-10">아직 완료된 경기가 없습니다. 경기를 시작하세요.</p>
                    ) : (
                        <div className="grid grid-cols-4 gap-2 text-sm bg-gray-100 p-4 rounded-lg">
                            <div className="font-bold text-center">경기 #</div>
                            <div className="font-bold col-span-2 text-center">스코어</div>
                            <div className="font-bold text-center">승패</div>
                            {/* <div className="font-bold text-center"></div> // 기존 코드가 grid-cols-4에 맞추기 위해 제거 */}
                            {gameHistory.map((h, idx) => (
                                <React.Fragment key={idx}>
                                    <div className="p-2 text-center">{h.game}</div>
                                    <div className="p-2 text-center font-extrabold text-lg col-span-2">
                                        <span className="text-yellow-600">{h.scoreA}</span> : <span className="text-blue-600">{h.scoreB}</span>
                                    </div>
                                    <div className={`p-2 font-medium text-center ${h.winner.includes('승') ? 'text-green-600' : 'text-gray-500'}`}>{h.winner}</div>
                                    {/* <div className="p-2 text-center text-xs text-gray-400">{idx < 8 ? '정규' : '연장'}</div> */}
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
                    {teams.teamA.map((p, idx) => (<div key={p.id} className="p-2 bg-white rounded mb-2">#{idx + 1}. {p.name}</div>))}
                    {benchPlayers.teamA.length > 0 && (<div className="mt-4"><div className="font-medium mb-2">벤치</div>{benchPlayers.teamA.map(p => (<div key={p.id} className="p-1 bg-gray-100 rounded text-sm mb-1">{p.name}</div>))}</div>)}
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-400">
                    <h3 className="text-xl font-bold text-blue-800 mb-4">블루팀 (Team B)</h3>
                    {teams.teamB.map((p, idx) => (<div key={p.id} className="p-2 bg-white rounded mb-2">#{idx + 1}. {p.name}</div>))}
                    {benchPlayers.teamB.length > 0 && (<div className="mt-4"><div className="font-medium mb-2">벤치</div>{benchPlayers.teamB.map(p => (<div key={p.id} className="p-1 bg-gray-100 rounded text-sm mb-1">{p.name}</div>))}</div>)}
                  </div>
                </div>
                <div className="text-center">
                  <button
                    onClick={startGame}
                    disabled={currentGame > KEEPER_ROTATION_SCHEDULE.length}
                    className={`px-6 py-3 rounded-lg font-medium ${
                      currentGame > KEEPER_ROTATION_SCHEDULE.length 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    <Play className="w-5 h-5 inline mr-2" />
                    {currentGame > KEEPER_ROTATION_SCHEDULE.length ? '모든 경기 완료!' : `경기 ${currentGame} 시작`}
                  </button>
                </div>
              </div>
            )}

            {/* 경기 진행 뷰 (동일) */}
            {currentView === 'game' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-center">경기 {currentGame}</h2>
                <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                  <div className="text-sm text-gray-600 mb-2">{debugLog}</div>
                  <div className="text-4xl font-bold mb-2">{formatTime(timerCount)}</div>
                  <div className="text-lg text-gray-600">
                    {currentHalf === 1 ? '전반' : '후반'} 
                    {/* ✅ GAME_DURATION_SEC 대신 gameDurationSeconds * 2 사용 */}
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
                        {/* ✅ GAME_DURATION_SEC 대신 gameDurationSeconds * 2 사용 */}
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

                {currentGame <= KEEPER_ROTATION_SCHEDULE.length && (() => {
                  const subs = suggestSubstitutions();
                  return (
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-yellow-800 mb-3">옐로팀 교체</h3>
                          <div className="mb-3"><div className="font-medium text-red-600 mb-2">OUT (휴식 필요)</div>{subs.teamA.out.map(p => (<div key={p.id} className="p-2 bg-red-100 rounded mb-1">{p.name} ({p.totalTime.toFixed(1)}분)</div>))}</div>
                          <div><div className="font-medium text-green-600 mb-2">IN (대기 최소)</div>{subs.teamA.in.map(p => (<div key={p.id} className="p-2 bg-green-100 rounded mb-1">{p.name} ({p.totalTime.toFixed(1)}분)</div>))}</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-blue-800 mb-3">블루팀 교체</h3>
                        <div className="mb-3"><div className="font-medium text-red-600 mb-2">OUT (휴식 필요)</div>{subs.teamB.out.map(p => (<div key={p.id} className="p-2 bg-red-100 rounded mb-1">{p.name} ({p.totalTime.toFixed(1)}분)</div>))}</div>
                        <div><div className="font-medium text-green-600 mb-2">IN (대기 최소)</div>{subs.teamB.in.map(p => (<div key={p.id} className="p-2 bg-green-100 rounded mb-1">{p.name} ({p.totalTime.toFixed(1)}분)</div>))}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-center gap-4">
                  {currentGame <= KEEPER_ROTATION_SCHEDULE.length && (
                    <button
                      onClick={applySubstitutions}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"
                    >
                      교체 적용 및 팀 확인
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentView('teams')}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium"
                  >
                    {currentGame <= KEEPER_ROTATION_SCHEDULE.length ? '현재 팀 유지' : '최종 통계 보기'}
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