import React, { useState, useEffect, useRef } from 'react';
import { Users, Play, Pause, RotateCcw, Plus, Edit2, Trash2, Save, Send, Clock } from 'lucide-react';

// 14분 경기에 맞게 수정
const TOTAL_GAME_TIME_SECONDS = 840; // 14분
const KEEPER_CHANGE_INTERVAL_SECONDS = 420; // 7분 (420초)
// 7분 단위로 2명의 키퍼 로테이션 (1, 2번 선수)
const KEEPER_ROTATION_SCHEDULE = [
  [1, 2], 
  [3, 4],
  [5, 6],
  [1, 2],
  [3, 4],
  [5, 6]
];

const FutsalTeamManager = () => {
  const [currentView, setCurrentView] = useState('players');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({ teamA: [], teamB: [] });
  const [benchPlayers, setBenchPlayers] = useState({ teamA: [], teamB: [] });
  
  const [timerCount, setTimerCount] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isKeeperChangeTime, setIsKeeperChangeTime] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1);
  const [totalGameTime, setTotalGameTime] = useState(0);
  
  const [keeperRotation, setKeeperRotation] = useState({ teamA: 1, teamB: 1 });
  const [currentGame, setCurrentGame] = useState(1);
  const [playerStats, setPlayerStats] = useState({});
  
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [newPlayer, setNewPlayer] = useState({ name: '', level: 1, team: 'blue' });
  // 모바일 환경에 맞게 debugLog를 조금 더 간단하게 표시합니다.
  const [debugLog, setDebugLog] = useState('경기 대기중');
  
  const audioContextRef = useRef(null);

  // 사운드 재생 함수 (사용자 코드)
  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 800;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 600);
    } catch (error) {
      console.log('오디오 재생 실패:', error);
      setDebugLog('🔔 오디오 재생 실패!');
    }
  };

  // 타이머 로직 수정 (7분 교체 시간 및 14분 종료)
  useEffect(() => {
    if (!isTimerRunning || isKeeperChangeTime) return;
    
    const timer = setTimeout(() => {
      setTimerCount(prev => {
        const next = prev + 1;
        const mins = Math.floor(next / 60);
        const secs = next % 60;
        setDebugLog(`${mins}:${secs.toString().padStart(2, '0')} 진행중`);
        
        // 7분 (420초) 교체 시간
        if (next % KEEPER_CHANGE_INTERVAL_SECONDS === 0 && next < TOTAL_GAME_TIME_SECONDS) {
          playNotificationSound();
          setIsKeeperChangeTime(true);
          setIsTimerRunning(false);
          setDebugLog('7분 완료! 키퍼 교체 시간!');
        }
        
        // 14분 (840초) 종료
        if (next === TOTAL_GAME_TIME_SECONDS) {
          playNotificationSound();
          endGame();
        }
        
        return next;
      });
      
      setTotalGameTime(prev => prev + 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timerCount, isTimerRunning, isKeeperChangeTime, playNotificationSound]);


  // 초기 데이터 로드 및 통계 설정 (생략된 부분)
  useEffect(() => {
    const samplePlayers = [
      { id: 1, name: '박진하', level: 3, team: 'blue' },
      { id: 2, name: '김한주', level: 2, team: 'blue' },
      // ... (나머지 16명의 선수 데이터)
      // 필요한 경우 18명 선수 데이터를 여기에 채워 넣으세요.
      { id: 17, name: '우람', level: 3, team: 'gold' },
      { id: 18, name: '김성인', level: 1, team: 'gold' }
    ];
    
    // 임시로 18명 데이터가 없는 경우를 대비해 샘플 선수 수를 늘립니다.
    if (samplePlayers.length < 18) {
      const needed = 18 - samplePlayers.length;
      for (let i = 0; i < needed; i++) {
        samplePlayers.push({
          id: samplePlayers.length + 1 + i, 
          name: `샘플${i + 1}`, 
          level: (i % 3) + 1, 
          team: i % 2 === 0 ? 'blue' : 'gold'
        });
      }
    }

    setPlayers(samplePlayers);
    
    const initialStats = {};
    samplePlayers.forEach(player => {
      initialStats[player.id] = { fieldTime: 0, keeperTime: 0, totalGames: 0 };
    });
    setPlayerStats(initialStats);
  }, []);

  // --- 함수 로직 (이전과 동일하거나 7분 로직에 맞게 조정) ---

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  const calculateTeamStrength = (team) => {
    return team.reduce((sum, player) => {
      const weights = { 1: 1, 2: 1.5, 3: 2 };
      return sum + weights[player.level];
    }, 0);
  };

  const addPlayer = () => {
    if (newPlayer.name.trim()) {
      const newId = Math.max(...players.map(p => p.id), 0) + 1;
      const player = { ...newPlayer, id: newId };
      setPlayers([...players, player]);
      
      setPlayerStats(prev => ({
        ...prev,
        [newId]: { fieldTime: 0, keeperTime: 0, totalGames: 0 }
      }));
      
      setNewPlayer({ name: '', level: 1, team: 'blue' });
    }
  };

  const updatePlayer = (id, updatedPlayer) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updatedPlayer } : p));
    setEditingPlayer(null);
  };

  const deletePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const generateBalancedTeams = () => {
    if (players.length < 18) {
      alert('18명의 선수가 필요합니다.');
      return;
    }

    const bluePlayers = players.filter(p => p.team === 'blue');
    const goldPlayers = players.filter(p => p.team === 'gold');

    const sortByPlayTime = (playersList) => {
      return [...playersList].sort((a, b) => {
        const aTotal = (playerStats[a.id]?.fieldTime || 0) + (playerStats[a.id]?.keeperTime || 0);
        const bTotal = (playerStats[b.id]?.fieldTime || 0) + (playerStats[b.id]?.keeperTime || 0);
        return aTotal - bTotal;
      });
    };

    const sortedBlue = sortByPlayTime(bluePlayers);
    const sortedGold = sortByPlayTime(goldPlayers);

    const teamA = sortedBlue.slice(0, 6);
    const benchA = sortedBlue.slice(6, 9);
    
    const teamB = sortedGold.slice(0, 6);
    const benchB = sortedGold.slice(6, 9);

    setTeams({ teamA, teamB });
    setBenchPlayers({ teamA: benchA, teamB: benchB });
    setCurrentView('lineup');
  };

  const startGame = () => {
    setCurrentView('game');
    setTimerCount(0);
    setTotalGameTime(0);
    setCurrentHalf(1);
    
    const gameIndex = (currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length;
    const keeperNumbers = KEEPER_ROTATION_SCHEDULE[gameIndex];
    
    setKeeperRotation({ 
      teamA: keeperNumbers[0], 
      teamB: keeperNumbers[0]
    });
    setIsKeeperChangeTime(false);
    setIsTimerRunning(true); // 바로 시작하도록 수정
    setDebugLog('경기 시작!');
    
    const newStats = { ...playerStats };
    [...teams.teamA, ...teams.teamB].forEach(player => {
      newStats[player.id].totalGames += 1;
    });
    setPlayerStats(newStats);
  };

  const completeKeeperChange = () => {
    const newStats = { ...playerStats };
    const intervalMinutes = KEEPER_CHANGE_INTERVAL_SECONDS / 60; // 7분

    // 이전 키퍼에게 시간 추가
    const currentKeeperA = teams.teamA[keeperRotation.teamA - 1];
    const currentKeeperB = teams.teamB[keeperRotation.teamB - 1];
    
    if (currentKeeperA) {
      newStats[currentKeeperA.id].keeperTime += intervalMinutes;
    }
    if (currentKeeperB) {
      newStats[currentKeeperB.id].keeperTime += intervalMinutes;
    }
    
    // 나머지 필드 플레이어에게 시간 추가
    teams.teamA.forEach((player, index) => {
      if (index + 1 !== keeperRotation.teamA) {
        newStats[player.id].fieldTime += intervalMinutes;
      }
    });
    teams.teamB.forEach((player, index) => {
      if (index + 1 !== keeperRotation.teamB) {
        newStats[player.id].fieldTime += intervalMinutes;
      }
    });
    
    setPlayerStats(newStats);
    
    // 키퍼 로테이션
    const gameIndex = (currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length;
    const keeperNumbers = KEEPER_ROTATION_SCHEDULE[gameIndex];
    
    setKeeperRotation({
      teamA: keeperNumbers[1],
      teamB: keeperNumbers[1]
    });
    
    setIsKeeperChangeTime(false);
    setDebugLog('키퍼 교체 완료, 후반 시작!');
    
    // 7분 경과 후, 전체 14분 중 남은 시간 확인
    if (totalGameTime < TOTAL_GAME_TIME_SECONDS) {
        // 후반 시작 (14분 경기가 7분 경과 후)
        setCurrentHalf(2);
        setTimerCount(0); // 타이머를 다시 0부터 시작
        setIsTimerRunning(true);
    } else {
      endGame();
      return;
    }
  };

  const toggleTimer = () => {
    if (isKeeperChangeTime) return;
    
    setIsTimerRunning(prev => {
      const newState = !prev;
      setDebugLog(newState ? '타이머 시작!' : '타이머 일시정지');
      return newState;
    });
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerCount(0);
    setTotalGameTime(0);
    setIsKeeperChangeTime(false);
    setKeeperRotation({ teamA: 1, teamB: 1 });
    setCurrentHalf(1);
    setDebugLog('타이머 리셋 완료');
  };

  const endGame = () => {
    setIsTimerRunning(false);
    setIsKeeperChangeTime(false);
    
    const newStats = { ...playerStats };
    const remainingTime = timerCount; // 남은 시간 (7분 이후에만 해당)
    const timeInMinutes = remainingTime / 60;
    
    if (remainingTime > 0) {
      const currentKeeperA = teams.teamA[keeperRotation.teamA - 1];
      const currentKeeperB = teams.teamB[keeperRotation.teamB - 1];
      
      if (currentKeeperA) {
        newStats[currentKeeperA.id].keeperTime += timeInMinutes;
      }
      if (currentKeeperB) {
        newStats[currentKeeperB.id].keeperTime += timeInMinutes;
      }
      
      teams.teamA.forEach((player, index) => {
        if (index + 1 !== keeperRotation.teamA) {
          newStats[player.id].fieldTime += timeInMinutes;
        }
      });
      teams.teamB.forEach((player, index) => {
        if (index + 1 !== keeperRotation.teamB) {
          newStats[player.id].fieldTime += timeInMinutes;
        }
      });
    }
    
    setPlayerStats(newStats);
    setCurrentGame(prev => prev + 1);
    setDebugLog('경기 종료!');
    setCurrentView('rotation');
  };

  const suggestSubstitutions = () => {
    const getPlayersWithTime = (playersList) => {
      return playersList.map(player => ({
        ...player,
        totalTime: (playerStats[player.id]?.fieldTime || 0) + (playerStats[player.id]?.keeperTime || 0)
      }));
    };

    const teamAWithTime = getPlayersWithTime(teams.teamA).sort((a, b) => b.totalTime - a.totalTime);
    const teamBWithTime = getPlayersWithTime(teams.teamB).sort((a, b) => b.totalTime - a.totalTime);
    const benchAWithTime = getPlayersWithTime(benchPlayers.teamA).sort((a, b) => a.totalTime - b.totalTime);
    const benchBWithTime = getPlayersWithTime(benchPlayers.teamB).sort((a, b) => a.totalTime - b.totalTime);

    return {
      teamA: { out: teamAWithTime.slice(0, 3), in: benchAWithTime.slice(0, 3) },
      teamB: { out: teamBWithTime.slice(0, 3), in: benchBWithTime.slice(0, 3) }
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
    setKeeperRotation({ teamA: 1, teamB: 1 });
    setCurrentView('teams');
  };

  // --- 렌더링 컴포넌트들 (스마트폰 최적화) ---

  const PlayerItem = ({ player, actions }) => (
    <div key={player.id} className="flex items-center justify-between p-2 sm:p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
        <span className="font-bold text-sm sm:text-base text-gray-800 truncate">{player.name}</span>
        <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (player.team === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800')}>
          {player.team === 'blue' ? '블루' : '골드'}
        </span>
        <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (player.level === 3 ? 'bg-red-100 text-red-800' : player.level === 2 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800')}>
          Lv {player.level}
        </span>
        <span className="text-xs text-gray-500 ml-auto">
          {((playerStats[player.id]?.fieldTime || 0) + (playerStats[player.id]?.keeperTime || 0)).toFixed(0)}분
        </span>
      </div>
      <div className="flex gap-1 ml-2">
        {actions}
      </div>
    </div>
  );

  const TeamView = ({ teamName, teamData, benchData, isTeamA }) => (
    <div className={'p-4 rounded-lg border-2 ' + (isTeamA ? 'bg-blue-50 border-blue-500' : 'bg-yellow-50 border-yellow-500')}>
      <h3 className={'text-lg font-bold mb-3 text-center ' + (isTeamA ? 'text-blue-800' : 'text-yellow-800')}>
        {teamName} ({calculateTeamStrength(teamData).toFixed(1)})
      </h3>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold mt-4">🏃‍♂️ 필드 선수 (6명)</h4>
        {teamData.map((player, index) => (
          <div key={player.id} className="bg-white p-2 rounded shadow text-sm flex justify-between items-center">
            <div className="font-bold">{player.name}</div>
            <div className="text-xs text-gray-600">#{index + 1}</div>
          </div>
        ))}
        <h4 className="text-sm font-semibold mt-4 pt-2 border-t border-gray-200">💺 벤치 선수 ({benchData.length}명)</h4>
        {benchData.map((player) => (
          <div key={player.id} className="bg-gray-100 p-2 rounded text-xs text-gray-600">
            {player.name}
          </div>
        ))}
      </div>
    </div>
  );

  const RotationView = () => {
    const subs = suggestSubstitutions();
    
    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 text-center">선수 교체 제안</h2>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center text-sm">
                다음 경기에 대한 교체 제안입니다. (총 플레이 시간이 많은 선수가 OUT, 적은 선수가 IN)
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* 블루팀 교체 */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-500">
                    <h3 className="text-lg font-bold text-blue-800 mb-3 text-center">블루팀 교체</h3>
                    <div className="space-y-3">
                        <div className="bg-red-100 p-2 rounded">
                            <h4 className="font-semibold text-red-800 mb-1">⬇️ OUT (플레이 시간 多)</h4>
                            {subs.teamA.out.map(p => <div key={p.id} className="text-sm">{p.name} ({p.totalTime.toFixed(0)}분)</div>)}
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                            <h4 className="font-semibold text-green-800 mb-1">⬆️ IN (플레이 시간 少)</h4>
                            {subs.teamA.in.map(p => <div key={p.id} className="text-sm">{p.name} ({p.totalTime.toFixed(0)}분)</div>)}
                        </div>
                    </div>
                </div>

                {/* 골드팀 교체 */}
                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-500">
                    <h3 className="text-lg font-bold text-yellow-800 mb-3 text-center">골드팀 교체</h3>
                    <div className="space-y-3">
                        <div className="bg-red-100 p-2 rounded">
                            <h4 className="font-semibold text-red-800 mb-1">⬇️ OUT (플레이 시간 多)</h4>
                            {subs.teamB.out.map(p => <div key={p.id} className="text-sm">{p.name} ({p.totalTime.toFixed(0)}분)</div>)}
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                            <h4 className="font-semibold text-green-800 mb-1">⬆️ IN (플레이 시간 少)</h4>
                            {subs.teamB.in.map(p => <div key={p.id} className="text-sm">{p.name} ({p.totalTime.toFixed(0)}분)</div>)}
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={applySubstitutions} className="w-full px-4 py-2.5 text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-1">
                <Send className="w-5 h-5" />
                교체 확정 및 다음 팀 생성
            </button>
        </div>
    );
  };

  const StatsView = () => (
    <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 text-center">선수별 누적 통계</h2>
        <div className="bg-gray-100 p-3 rounded-lg mb-4">
            <div className="grid grid-cols-5 text-sm font-bold text-gray-700 pb-1 border-b border-gray-300">
                <div className="col-span-2">이름</div>
                <div className="text-center">총 경기</div>
                <div className="text-center">필드(분)</div>
                <div className="text-center">키퍼(분)</div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto space-y-1 mt-2">
                {players.sort((a, b) => {
                    const aTime = (playerStats[a.id]?.fieldTime || 0) + (playerStats[a.id]?.keeperTime || 0);
                    const bTime = (playerStats[b.id]?.fieldTime || 0) + (playerStats[b.id]?.keeperTime || 0);
                    return bTime - aTime; // 플레이 시간 많은 순으로 정렬
                }).map(player => (
                    <div key={player.id} className="grid grid-cols-5 text-xs py-2 border-b border-gray-100 bg-white hover:bg-gray-50 rounded">
                        <div className="col-span-2 pl-2 font-medium text-gray-800 truncate">{player.name}</div>
                        <div className="text-center text-gray-600">{playerStats[player.id]?.totalGames || 0}</div>
                        <div className="text-center text-gray-600">{(playerStats[player.id]?.fieldTime || 0).toFixed(0)}</div>
                        <div className="text-center text-gray-600">{(playerStats[player.id]?.keeperTime || 0).toFixed(0)}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );


  // --- 메인 렌더링 ---

  return (
    // max-w-full과 overflow-x-hidden을 추가하여 웹뷰 너비 초과를 방지
    <div className="max-w-full overflow-x-hidden min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-2 sm:p-4">
      <div className="max-w-xl mx-auto"> {/* 모바일 화면에 맞게 최대 너비를 제한 */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-3 sm:p-4">
            <h1 className="text-xl sm:text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Users className="w-6 h-6" />
              풋살팀 매니저 v2.0
            </h1>
            <div className="flex flex-wrap justify-center mt-3 gap-1 sm:gap-2">
              {['players', 'lineup', 'teams', 'game', 'rotation', 'stats'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={'px-2 py-1 text-xs sm:text-sm rounded-lg font-medium transition-all ' + (currentView === view ? 'bg-white text-blue-600 shadow-lg' : 'bg-blue-500 hover:bg-blue-400 text-white')}
                >
                  {view === 'players' ? '선수' : view === 'lineup' ? '라인업' : view === 'teams' ? '팀 구성' : view === 'game' ? '경기 진행' : view === 'rotation' ? '교체 제안' : '통계'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {currentView === 'players' && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">선수 관리</h2>
                
                {/* 새 선수 추가 */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="선수 이름"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newPlayer.team}
                        onChange={(e) => setNewPlayer({...newPlayer, team: e.target.value})}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="blue">블루팀</option>
                        <option value="gold">골드팀</option>
                      </select>
                      <select
                        value={newPlayer.level}
                        onChange={(e) => setNewPlayer({...newPlayer, level: parseInt(e.target.value)})}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>Lv 1</option>
                        <option value={2}>Lv 2</option>
                        <option value={3}>Lv 3</option>
                      </select>
                      <button
                        onClick={addPlayer}
                        className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        추가
                      </button>
                    </div>
                  </div>
                </div>

                {/* 선수 목록 */}
                <div className="grid gap-2 max-h-80 overflow-y-auto">
                  {players.map(player => (
                    <PlayerItem 
                      key={player.id} 
                      player={player} 
                      actions={(
                        <button onClick={() => deletePlayer(player.id)} className="p-1 text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={generateBalancedTeams}
                  className="w-full mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
                  disabled={players.length < 18}
                >
                  밸런스 팀 구성 ({players.length}/18명)
                </button>
              </div>
            )}

            {currentView === 'lineup' && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 text-center">경기 {currentGame} 라인업</h2>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <TeamView 
                    teamName="블루팀" 
                    teamData={teams.teamA} 
                    benchData={benchPlayers.teamA} 
                    isTeamA={true}
                  />
                  <TeamView 
                    teamName="골드팀" 
                    teamData={teams.teamB} 
                    benchData={benchPlayers.teamB} 
                    isTeamA={false}
                  />
                </div>

                <div className="bg-gray-100 p-3 rounded-lg mb-4 text-center text-xs sm:text-sm">
                  <div>⏱️ **총 14분** (전반 7분 + 후반 7분)</div>
                  <div className="mt-1">
                    🔄 키퍼 교체: **{KEEPER_ROTATION_SCHEDULE[(currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length][0]}번** → **{KEEPER_ROTATION_SCHEDULE[(currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length][1]}번**
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setCurrentView('teams')} className="flex-1 px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    팀 상세
                  </button>
                  <button onClick={startGame} className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-1">
                    <Play className="w-4 h-4" />
                    경기 시작
                  </button>
                </div>
              </div>
            )}

            {currentView === 'teams' && (
                <div>
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 text-center">팀 상세 구성</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <TeamView 
                            teamName="블루팀" 
                            teamData={teams.teamA} 
                            benchData={benchPlayers.teamA} 
                            isTeamA={true}
                        />
                        <TeamView 
                            teamName="골드팀" 
                            teamData={teams.teamB} 
                            benchData={benchPlayers.teamB} 
                            isTeamA={false}
                        />
                    </div>
                </div>
            )}
            
            {currentView === 'game' && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 text-center">경기 진행</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center">
                  <div className="bg-green-100 border border-green-400 rounded p-2 mb-3">
                    <span className="text-green-800 font-bold text-sm">⚽ 경기 {currentGame}</span>
                    <div className="text-xs text-green-600 mt-1">{debugLog}</div>
                  </div>
                  
                  <div className="text-4xl font-bold text-gray-800 mb-2">
                    {formatTime(timerCount)}
                  </div>
                  <div className="text-base font-medium text-gray-600 mb-3">
                    {currentHalf === 1 ? '전반 (7분)' : '후반 (7분)'} (총 {formatTime(totalGameTime)} / 14:00)
                  </div>
                  
                  {isKeeperChangeTime ? (
                    <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-3">
                      <div className="text-xl font-bold text-yellow-800 mb-2">🔄 키퍼 교체!</div>
                      <button
                        onClick={completeKeeperChange}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                      >
                        교체 완료 → 후반 시작
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-2">
                      <button onClick={toggleTimer} className={'px-4 py-2 rounded-lg font-medium flex items-center gap-1 text-sm ' + (isTimerRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white')}>
                        {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isTimerRunning ? '정지' : '시작'}
                      </button>
                      <button onClick={resetTimer} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-1 text-sm">
                        <RotateCcw className="w-4 h-4" />
                        리셋
                      </button>
                      <button onClick={endGame} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm">
                        <Clock className="w-4 h-4" />
                        종료
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h3 className="text-sm font-bold text-blue-800 mb-2 text-center">블루팀 키퍼</h3>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-800">{teams.teamA[keeperRotation.teamA - 1]?.name || '선수 없음'}</div>
                      <div className="text-xs text-gray-600">#{keeperRotation.teamA} 선수</div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h3 className="text-sm font-bold text-yellow-800 mb-2 text-center">골드팀 키퍼</h3>
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-800">{teams.teamB[keeperRotation.teamB - 1]?.name || '선수 없음'}</div>
                      <div className="text-xs text-gray-600">#{keeperRotation.teamB} 선수</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentView === 'rotation' && <RotationView />}
            {currentView === 'stats' && <StatsView />}

            {/* 임시 디버그 로그 (하단 고정) */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-xs p-1 text-center sm:hidden">
                {debugLog}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FutsalTeamManager;
