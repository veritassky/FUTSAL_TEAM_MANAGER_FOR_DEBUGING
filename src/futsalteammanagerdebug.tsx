import React, { useState, useEffect } from 'react';
import { Users, Timer, Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';

const FutsalTeamManagerDebug = () => {
  const KEEPER_ROTATION_SCHEDULE = [
    [1, 2],  // 1경기: 양팀 모두 1번 -> 2번
    [3, 9],  // 2경기: 양팀 모두 3번 -> 9번
    [7, 8],  // 3경기: 양팀 모두 7번 -> 8번
    [4, 5],  // 4경기: 양팀 모두 4번 -> 5번
    [7, 9],  // 5경기: 양팀 모두 7번 -> 9번
    [6, 8],  // 6경기: 양팀 모두 6번 -> 8번
    [3, 5],  // 7경기: 양팀 모두 3번 -> 5번
    [1, 4],  // 8경기: 양팀 모두 1번 -> 4번
  ];

  const KEEPER_CHANGE_INTERVAL = 6;
  const GAME_DURATION = 12;

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
  const [newPlayer, setNewPlayer] = useState({ name: '', level: 1, team: 'yellow' });
  const [debugLog, setDebugLog] = useState('디버깅 모드');

  useEffect(() => {
    if (!isTimerRunning || isKeeperChangeTime) return;
    
    const timer = setTimeout(() => {
      setTimerCount(prev => {
        const next = prev + 1;
        setDebugLog(`${next}초 진행중`);
        
        if (next % KEEPER_CHANGE_INTERVAL === 0) {
          setIsKeeperChangeTime(true);
          setIsTimerRunning(false);
          setDebugLog('키퍼 교체 시간!');
        }
        return next;
      });
      setTotalGameTime(prev => prev + 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timerCount, isTimerRunning, isKeeperChangeTime]);

  useEffect(() => {
    const samplePlayers = [
      { id: 1, name: '옐로1', level: 3, team: 'yellow' },
      { id: 2, name: '옐로2', level: 2, team: 'yellow' },
      { id: 3, name: '옐로3', level: 2, team: 'yellow' },
      { id: 4, name: '옐로4', level: 1, team: 'yellow' },
      { id: 5, name: '옐로5', level: 3, team: 'yellow' },
      { id: 6, name: '옐로6', level: 2, team: 'yellow' },
      { id: 7, name: '옐로7', level: 1, team: 'yellow' },
      { id: 8, name: '옐로8', level: 2, team: 'yellow' },
      { id: 9, name: '옐로9', level: 3, team: 'yellow' },
      { id: 10, name: '블루1', level: 1, team: 'blue' },
      { id: 11, name: '블루2', level: 2, team: 'blue' },
      { id: 12, name: '블루3', level: 1, team: 'blue' },
      { id: 13, name: '블루4', level: 3, team: 'blue' },
      { id: 14, name: '블루5', level: 2, team: 'blue' },
      { id: 15, name: '블루6', level: 1, team: 'blue' },
      { id: 16, name: '블루7', level: 2, team: 'blue' },
      { id: 17, name: '블루8', level: 3, team: 'blue' },
      { id: 18, name: '블루9', level: 1, team: 'blue' },
    ];
    
    setPlayers(samplePlayers);
    
    const initialStats = {};
    samplePlayers.forEach(player => {
      initialStats[player.id] = { fieldTime: 0, keeperTime: 0, totalGames: 0 };
    });
    setPlayerStats(initialStats);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    setTeams({ 
      teamA: sortedYellow.slice(0, 6), 
      teamB: sortedBlue.slice(0, 6) 
    });
    setBenchPlayers({ 
      teamA: sortedYellow.slice(6, 9), 
      teamB: sortedBlue.slice(6, 9) 
    });
    setCurrentView('teams');
  };

  const startGame = () => {
    setCurrentView('game');
    setTimerCount(0);
    setTotalGameTime(0);
    setCurrentHalf(1);
    
    const gameIndex = (currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length;
    const keepers = KEEPER_ROTATION_SCHEDULE[gameIndex];
    const scheduleGame = (gameIndex % 8) + 1;
    
    setKeeperRotation({ teamA: keepers[0], teamB: keepers[0] });
    setIsKeeperChangeTime(false);
    setIsTimerRunning(false);
    setDebugLog(`경기 ${currentGame} (순서표 ${scheduleGame}경기): 양팀 ${keepers[0]}→${keepers[1]}번 키퍼`);
    
    const newStats = { ...playerStats };
    [...teams.teamA, ...teams.teamB].forEach(player => {
      newStats[player.id].totalGames += 1;
    });
    setPlayerStats(newStats);
  };

  const completeKeeperChange = () => {
    const newStats = { ...playerStats };
    
    const keeperA = teams.teamA[keeperRotation.teamA - 1];
    const keeperB = teams.teamB[keeperRotation.teamB - 1];
    
    if (keeperA) newStats[keeperA.id].keeperTime += KEEPER_CHANGE_INTERVAL / 60;
    if (keeperB) newStats[keeperB.id].keeperTime += KEEPER_CHANGE_INTERVAL / 60;
    
    teams.teamA.forEach((player, idx) => {
      if (idx + 1 !== keeperRotation.teamA) {
        newStats[player.id].fieldTime += KEEPER_CHANGE_INTERVAL / 60;
      }
    });
    teams.teamB.forEach((player, idx) => {
      if (idx + 1 !== keeperRotation.teamB) {
        newStats[player.id].fieldTime += KEEPER_CHANGE_INTERVAL / 60;
      }
    });
    
    setPlayerStats(newStats);
    
    const gameIndex = (currentGame - 1) % KEEPER_ROTATION_SCHEDULE.length;
    const keepers = KEEPER_ROTATION_SCHEDULE[gameIndex];
    
    if (currentHalf === 1) {
      setKeeperRotation({ teamA: keepers[1], teamB: keepers[1] });
      setCurrentHalf(2);
    }
    
    setIsKeeperChangeTime(false);
    setDebugLog(`키퍼 교체 완료: 양팀 ${keepers[1]}번`);
    
    if (totalGameTime >= GAME_DURATION) {
      endGame();
      return;
    }
    
    setIsTimerRunning(true);
  };

  const endGame = () => {
    setIsTimerRunning(false);
    setIsKeeperChangeTime(false);
    
    const newStats = { ...playerStats };
    const remaining = timerCount % KEEPER_CHANGE_INTERVAL;
    
    if (remaining > 0) {
      const keeperA = teams.teamA[keeperRotation.teamA - 1];
      const keeperB = teams.teamB[keeperRotation.teamB - 1];
      
      if (keeperA) newStats[keeperA.id].keeperTime += remaining / 60;
      if (keeperB) newStats[keeperB.id].keeperTime += remaining / 60;
      
      teams.teamA.forEach((p, idx) => {
        if (idx + 1 !== keeperRotation.teamA) {
          newStats[p.id].fieldTime += remaining / 60;
        }
      });
      teams.teamB.forEach((p, idx) => {
        if (idx + 1 !== keeperRotation.teamB) {
          newStats[p.id].fieldTime += remaining / 60;
        }
      });
    }
    
    setPlayerStats(newStats);
    setCurrentGame(prev => prev + 1);
    setDebugLog('경기 종료');
    setCurrentView('rotation');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-orange-500 to-yellow-600 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6">
            <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Timer className="w-8 h-8" />
              디버깅용 (6초)
            </h1>
            <div className="flex justify-center mt-4 space-x-2">
              {['players', 'teams', 'game', 'rotation'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    currentView === view ? 'bg-white text-red-600' : 'bg-red-500 text-white'
                  }`}
                >
                  {view === 'players' && '선수'}
                  {view === 'teams' && '팀'}
                  {view === 'game' && '경기'}
                  {view === 'rotation' && '교체'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {currentView === 'players' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">선수 관리</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
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
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 mb-6">
                  {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          player.team === 'yellow' ? 'bg-yellow-200' : 'bg-blue-200'
                        }`}>
                          {player.team === 'yellow' ? '옐로' : '블루'}
                        </span>
                        <span className="font-medium">{player.name}</span>
                        <span className="text-xs text-gray-500">
                          {((playerStats[player.id]?.fieldTime || 0) + (playerStats[player.id]?.keeperTime || 0)).toFixed(1)}분
                        </span>
                      </div>
                      <button onClick={() => deletePlayer(player.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={generateBalancedTeams}
                  disabled={players.length < 18}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"
                >
                  팀 구성 ({players.length}/18)
                </button>
              </div>
            )}

            {currentView === 'teams' && teams.teamA.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">팀 구성</h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-400">
                    <h3 className="text-xl font-bold text-yellow-800 mb-4">옐로팀</h3>
                    {teams.teamA.map((p, idx) => (
                      <div key={p.id} className="p-2 bg-white rounded mb-2">
                        #{idx + 1}. {p.name}
                      </div>
                    ))}
                    {benchPlayers.teamA.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium mb-2">벤치</div>
                        {benchPlayers.teamA.map(p => (
                          <div key={p.id} className="p-1 bg-gray-100 rounded text-sm mb-1">
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-400">
                    <h3 className="text-xl font-bold text-blue-800 mb-4">블루팀</h3>
                    {teams.teamB.map((p, idx) => (
                      <div key={p.id} className="p-2 bg-white rounded mb-2">
                        #{idx + 1}. {p.name}
                      </div>
                    ))}
                    {benchPlayers.teamB.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium mb-2">벤치</div>
                        {benchPlayers.teamB.map(p => (
                          <div key={p.id} className="p-1 bg-gray-100 rounded text-sm mb-1">
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={startGame}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
                  >
                    <Play className="w-5 h-5 inline mr-2" />
                    경기 {currentGame} 시작
                  </button>
                  {currentGame > 8 && (
                    <div className="mt-2 text-sm text-gray-600">
                      (순서표는 8경기마다 반복됩니다)
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'game' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-center">경기 {currentGame}</h2>
                
                <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                  <div className="text-sm text-gray-600 mb-2">
                    {debugLog}
                    {currentGame > 8 && (
                      <span className="ml-2 text-xs text-orange-600">
                        (순서표 {((currentGame - 1) % 8) + 1}경기 반복)
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-bold mb-2">{formatTime(timerCount)}</div>
                  <div className="text-lg text-gray-600">
                    {currentHalf === 1 ? '전반' : '후반'} (총 {formatTime(totalGameTime)} / 0:12)
                  </div>
                  
                  {isKeeperChangeTime ? (
                    <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mt-4">
                      <div className="text-xl font-bold text-yellow-800 mb-2">키퍼 교체!</div>
                      <button
                        onClick={completeKeeperChange}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold"
                      >
                        교체 완료
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
                        }}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg"
                      >
                        <RotateCcw className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={endGame}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg"
                      >
                        종료
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-yellow-800 mb-3">옐로팀 키퍼</h3>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {teams.teamA[keeperRotation.teamA - 1]?.name || '-'}
                      </div>
                      <div className="text-sm text-gray-600">
                        #{keeperRotation.teamA}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-blue-800 mb-3">블루팀 키퍼</h3>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {teams.teamB[keeperRotation.teamB - 1]?.name || '-'}
                      </div>
                      <div className="text-sm text-gray-600">
                        #{keeperRotation.teamB}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 text-center">키퍼 순서표</h3>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    {KEEPER_ROTATION_SCHEDULE.map((keepers, idx) => (
                      <div key={idx} className={`p-2 rounded ${
                        currentGame === idx + 1 ? 'bg-yellow-200 border-2 border-yellow-500' : 'bg-gray-100'
                      }`}>
                        <div className="font-bold">경기 {idx + 1}</div>
                        <div className="text-xs text-gray-700">양팀: {keepers[0]}→{keepers[1]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentView === 'rotation' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">교체 관리</h2>
                
                {(() => {
                  const subs = suggestSubstitutions();
                  return (
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-yellow-800 mb-3">옐로팀</h3>
                        <div className="mb-3">
                          <div className="font-medium text-red-600 mb-2">OUT</div>
                          {subs.teamA.out.map(p => (
                            <div key={p.id} className="p-2 bg-red-100 rounded mb-1">
                              {p.name} ({p.totalTime.toFixed(1)}분)
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="font-medium text-green-600 mb-2">IN</div>
                          {subs.teamA.in.map(p => (
                            <div key={p.id} className="p-2 bg-green-100 rounded mb-1">
                              {p.name} ({p.totalTime.toFixed(1)}분)
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-blue-800 mb-3">블루팀</h3>
                        <div className="mb-3">
                          <div className="font-medium text-red-600 mb-2">OUT</div>
                          {subs.teamB.out.map(p => (
                            <div key={p.id} className="p-2 bg-red-100 rounded mb-1">
                              {p.name} ({p.totalTime.toFixed(1)}분)
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="font-medium text-green-600 mb-2">IN</div>
                          {subs.teamB.in.map(p => (
                            <div key={p.id} className="p-2 bg-green-100 rounded mb-1">
                              {p.name} ({p.totalTime.toFixed(1)}분)
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-center gap-4">
                  <button
                    onClick={applySubstitutions}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"
                  >
                    교체 적용
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
