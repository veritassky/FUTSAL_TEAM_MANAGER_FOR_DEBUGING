import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Timer, Play, Pause, RotateCcw, Trash2, CheckCircle, AlertTriangle, ChevronsRight, Home, Trophy, Minus, Plus } from 'lucide-react';

// ==============================================================================
// 1. 상수 정의 및 스케줄 테이블 (최종 확정)
// ==============================================================================

type ViewType = 'players' | 'teams' | 'game_play' | 'keeper_alert' | 'player_alert' | 'results_summary' | 'game_end';

interface Player {
    id: number; 
    name: string;
    level: number;
    team: 'yellow' | 'blue';
    isKeeper: boolean;
    onField: boolean;
    goals: number; 
    timePlayed: number; 
}

const GAME_TOTAL_DURATION_SECONDS = 14; 
const KEEPER_CHANGE_INTERVAL_SECONDS = 7; 
const TOTAL_PLAYERS_PER_TEAM = 9; 
const TOTAL_GAMES_TO_PLAY = 8; 

// 사용자 제공 '게임 참가 번호' 표 (자동 로테이션 스케줄)
const GAME_SCHEDULE: { [game: number]: number[] } = {
    1: [1, 2, 3, 4, 5, 6], 
    2: [3, 9, 1, 4, 7, 8],
    3: [7, 8, 2, 5, 6, 9],
    4: [4, 5, 1, 2, 3, 6],
    5: [7, 9, 1, 3, 4, 8],
    6: [6, 8, 2, 5, 7, 9],
    7: [3, 5, 1, 2, 6, 4],
    8: [1, 4, 3, 7, 8, 9],
};

const ALARM_SOUND_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';


// ==============================================================================
// 2. 메인 컴포넌트: FutsalTeamManager
// ==============================================================================

const FutsalTeamManager = () => {
    
    // 🚨 2-1. 상태 (useState) 정의 블록 (가장 먼저 위치) 🚨
    const [currentView, setCurrentView] = useState<ViewType>('players');
    const [players, setPlayers] = useState<Player[]>([]);
    const [nextPlayerName, setNextPlayerName] = useState('');
    const [nextPlayerLevel, setNextPlayerLevel] = useState(3);
    const [teams, setTeams] = useState<{ yellow: Player[], blue: Player[] }>({ yellow: [], blue: [] });
    const [score, setScore] = useState({ yellow: 0, blue: 0 });
    const [gameCounter, setGameCounter] = useState(1); 
    const [timerCount, setTimerCount] = useState(GAME_TOTAL_DURATION_SECONDS);
    const [isRunning, setIsRunning] = useState(false);
    const [isKeeperAlert, setIsKeeperAlert] = useState(false); 
    const [isPlayerAlert, setIsPlayerAlert] = useState(false);
    const [isSecondHalf, setIsSecondHalf] = useState(false); 
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const alarmIntervalRef = useRef<number | null>(null);

    // 🚨 2-2. 헬퍼 함수 및 로직 정의 블록 (상태 정의 후 위치) 🚨
    
    // 알람, 이동, 포맷 함수
    const startAlarm = useCallback(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(ALARM_SOUND_URL);
            audioRef.current.loop = true;
        }
        audioRef.current.play().catch(e => console.warn("Audio play failed:", e));
    }, []);

    const stopAlarm = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
    }, []);

    const goToSection = (view: ViewType) => { stopAlarm(); setCurrentView(view); };
    const formatTime = (totalSeconds: number) => String(Math.floor(totalSeconds / 60)).padStart(2, '0') + ':' + String(totalSeconds % 60).padStart(2, '0');
    
    const resetApp = () => {
        setPlayers([]);
        setTeams({ yellow: [], blue: [] });
        setScore({ yellow: 0, blue: 0 });
        setGameCounter(1);
        setTimerCount(GAME_TOTAL_DURATION_SECONDS);
        setIsRunning(false);
        setIsSecondHalf(false);
        goToSection('players');
    };
    
    const getPlayerName = useCallback((id: number): string => {
        const player = teams.yellow.find(p => p.id === id) || teams.blue.find(p => p.id === id);
        return player ? player.name : `선수 ID ${id}`;
    }, [teams]);


    const getCurrentSubstitutionInfo = useCallback((game: number) => {
        const prevSchedule = GAME_SCHEDULE[game - 1] || [];
        const currentSchedule = GAME_SCHEDULE[game] || [];
        
        const playersOut = prevSchedule.filter(id => !currentSchedule.includes(id));
        const playersIn = currentSchedule.filter(id => !prevSchedule.includes(id));
        
        const formatNames = (ids: number[]) => ids.map(id => getPlayerName(id)).join(', ');

        return {
            in: formatNames(playersIn),
            out: formatNames(playersOut),
            keeper1Name: getPlayerName(currentSchedule[0]),
            keeper2Name: getPlayerName(currentSchedule[1]),
        };
    }, [getPlayerName]);
    
    const updateTeamRosterForNextGame = useCallback((nextGameCounter: number) => {
        const schedule = GAME_SCHEDULE[nextGameCounter];
        if (!schedule) return;

        setTeams(prevTeams => {
            const allPlayers = [...prevTeams.yellow, ...prevTeams.blue];
            
            const newPlayers = allPlayers.map(p => {
                const isPlaying = schedule.includes(p.id);
                let isKeeper = false;

                if (isPlaying && nextGameCounter >= 1 && p.id === schedule[0]) {
                    isKeeper = true;
                }
                
                return { ...p, onField: isPlaying, isKeeper: isKeeper };
            });

            const newYellow = newPlayers.filter(p => p.team === 'yellow').sort((a, b) => a.id - b.id);
            const newBlue = newPlayers.filter(p => p.team === 'blue').sort((a, b) => a.id - b.id);

            return { yellow: newYellow, blue: newBlue };
        });
    }, []);

    // 7초 시점 키퍼 교체 로직 (섹션 4 완료 시)
    const handleKeeperSwap = useCallback(() => {
        const schedule = GAME_SCHEDULE[gameCounter];
        if (!schedule || schedule.length < 2) return;

        const keeper1Id = schedule[0]; // 이전 키퍼 (OUT)
        const keeper2Id = schedule[1]; // 다음 키퍼 (IN)

        setTeams(prevTeams => {
            const updateTeam = (team: Player[]): Player[] => team.map(p => {
                if (p.id === keeper1Id) { 
                    return { ...p, isKeeper: false }; // OUT
                }
                if (p.id === keeper2Id) { 
                    return { ...p, isKeeper: true }; // IN
                }
                return p;
            });

            return { yellow: updateTeam(prevTeams.yellow), blue: updateTeam(prevTeams.blue) };
        });
    }, [gameCounter]);

    // 스코어링
    const handleScore = (team: 'yellow' | 'blue', amount: 1 | -1) => {
        setScore(prev => ({
            ...prev,
            [team]: Math.max(0, prev[team] + amount),
        }));
        
        if (amount === 1) {
            setTeams(prevTeams => {
                // 현재 필드 선수 중 임의의 선수에게 득점 부여
                const scorer = prevTeams[team].find(p => p.onField && !p.isKeeper); 
                if (scorer) {
                    const updatedPlayer = { ...scorer, goals: scorer.goals + 1 };
                    return { 
                        ...prevTeams, 
                        [team]: prevTeams[team].map(p => p.id === scorer.id ? updatedPlayer : p)
                    };
                }
                return prevTeams;
            });
        }
    };
    
    // ==========================================================================
    // 3. 타이머 및 알림 로직 (useEffect)
    // ==========================================================================

    useEffect(() => {
        if (isRunning && timerCount > 0 && !isKeeperAlert && !isPlayerAlert) {
            const timer = setInterval(() => {
                setTimerCount(prev => prev - 1);
                
                // 출전 시간 기록 업데이트 
                setTeams(prev => {
                    const updateTeam = (team: Player[]) => team.map(p => 
                        p.onField ? { ...p, timePlayed: p.timePlayed + 1 } : p
                    );
                    return { yellow: updateTeam(prev.yellow), blue: updateTeam(prev.blue) };
                });
                
            }, 1000);
            return () => clearInterval(timer);
        } else if (timerCount === 0 && isRunning) {
            setIsRunning(false);
            
            if (gameCounter >= TOTAL_GAMES_TO_PLAY) {
                goToSection('results_summary'); 
            } else {
                setIsPlayerAlert(true);
                startAlarm();
            }
        }
    }, [isRunning, timerCount, isKeeperAlert, isPlayerAlert, gameCounter, goToSection, startAlarm]);

    useEffect(() => {
        const elapsedSeconds = GAME_TOTAL_DURATION_SECONDS - timerCount;

        if (isRunning && elapsedSeconds === KEEPER_CHANGE_INTERVAL_SECONDS && !isSecondHalf) {
            setIsRunning(false);
            setIsKeeperAlert(true); 
            startAlarm();
            setIsSecondHalf(true); 
        }
    }, [timerCount, isRunning, startAlarm, isSecondHalf]);

    // ==========================================================================
    // 4. 이벤트 핸들러 및 렌더링 (간소화)
    // ==========================================================================

    const handleKeeperChangeComplete = () => {
        handleKeeperSwap(); 
        stopAlarm();
        setIsKeeperAlert(false);
        setIsRunning(true);
    };
    
    const handlePlayerChangeComplete = () => {
        updateTeamRosterForNextGame(gameCounter + 1); 
        
        stopAlarm();
        setGameCounter(prev => prev + 1);
        setTimerCount(GAME_TOTAL_DURATION_SECONDS);
        setIsPlayerAlert(false);
        setIsRunning(false); 
        setIsSecondHalf(false);
        // alert(`경기 ${gameCounter} 종료. 경기 ${gameCounter + 1} 준비 완료.`);
    };

    const handleAddPlayer = () => {
        if (!nextPlayerName.trim()) return; 
        const newPlayer: Player = {
            id: players.length + 1, 
            name: nextPlayerName.trim(),
            level: nextPlayerLevel,
            team: 'yellow',
            isKeeper: false,
            onField: false,
            goals: 0,
            timePlayed: 0,
        };
        setPlayers([...players, newPlayer]);
        setNextPlayerName('');
    };
    
    const handleBalanceTeams = () => {
        if (players.length < TOTAL_PLAYERS_PER_TEAM * 2) {
             // 9명씩 2팀을 만들지 않고, 9명의 선수가 양 팀을 번갈아 뛴다고 가정 (디버그 단순화)
            const allNinePlayers = players.slice(0, 9);
            if (allNinePlayers.length < TOTAL_PLAYERS_PER_TEAM) {
                alert(`최소 9명 이상의 선수를 등록해야 합니다.`);
                return;
            }
            
            // ID 1~9로 재설정하여 스케줄 표와 연동
            const teamYellow = allNinePlayers.map((p, i) => ({ ...p, team: 'yellow', id: i + 1 }));
            const teamBlue = allNinePlayers.map((p, i) => ({ ...p, team: 'blue', id: i + 1 }));
            setTeams({ yellow: teamYellow, blue: teamBlue });
        } else {
            // 18명 기준의 로직이 있다면 여기에 구현
        }

        updateTeamRosterForNextGame(1);
        setCurrentView('game_play'); 
    };

    // 렌더링 함수들 (이전 답변과 동일)
    const renderResultsSummary = () => { /* ... (이전 답변과 동일) ... */ };
    const renderGameEnd = () => { /* ... (이전 답변과 동일) ... */ };
    const renderKeeperAlert = () => { /* ... (이전 답변과 동일) ... */ };
    const renderPlayerAlert = () => { /* ... (이전 답변과 동일) ... */ };
    
    const renderTeamSetup = () => {
        // ... (섹션 2 라인업 UI - 이전 답변과 동일) ...
        const scoreY = teams.yellow.reduce((sum, p) => sum + p.level, 0);
        const scoreB = teams.blue.reduce((sum, p) => sum + p.level, 0);
        
        return (
            <div className="p-4 space-y-4">
                <h2 className="text-2xl font-bold text-indigo-700">섹션 2: 라인업 및 팀 구성</h2>
                
                {teams.yellow.length === 0 ? (
                    <>
                    <div className="border p-4 rounded bg-red-50">
                        <h3 className="font-bold text-red-700">선수 등록 (ID 1~9)</h3>
                         <input
                            type="text"
                            placeholder="이름"
                            value={nextPlayerName}
                            onChange={(e) => setNextPlayerName(e.target.value)}
                            className="p-2 border rounded w-full mb-2"
                        />
                        <button onClick={handleAddPlayer} className="w-full py-2 bg-indigo-500 text-white rounded">선수 추가 ({players.length}명)</button>
                        <ul className="mt-3 text-sm">
                            {players.map(p => <li key={p.id}>{p.name} (ID {p.id})</li>)}
                        </ul>
                    </div>
                    
                    <button 
                        onClick={handleBalanceTeams} 
                        className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                    >
                        총 9명으로 팀 자동 배분 실행 (1경기 명단 설정)
                    </button>
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                            <h3 className="text-lg font-semibold">밸런스 현황</h3>
                            <p>💛 Lv: **{scoreY}** vs 💙 Lv: **{scoreB}**</p>
                        </div>
                        <button 
                            onClick={() => goToSection('game_play')} 
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                        >
                            <ChevronsRight className="inline w-5 h-5 mr-2" /> 섹션 3: 경기 진행 시작
                        </button>
                    </>
                )}
            </div>
        );
    };

    const renderGamePlaySection = () => {
        const activePlayersY = teams.yellow.filter(p => p.onField);
        const keeperY = activePlayersY.find(p => p.isKeeper);

        return (
            <div className="p-4 space-y-4">
                <h2 className="text-2xl font-bold text-indigo-700">섹션 3: 경기 진행 ({gameCounter}/{TOTAL_GAMES_TO_PLAY} 경기)</h2>
                
                {/* 타이머 및 스코어 */}
                <div className="text-center bg-gray-100 p-6 rounded-xl shadow-lg space-y-4">
                    <p className="text-5xl font-extrabold text-gray-800">{formatTime(timerCount)}</p>
                    <p className="text-sm font-semibold text-red-500">{isSecondHalf ? '후반전 (7초)' : '전반전 (7초)'}</p>

                    <p className="text-lg font-bold text-blue-600">
                        키퍼: 💛 **{keeperY?.name || '미정'}** (ID: {keeperY?.id})
                    </p>
                    
                    <div className="flex justify-around items-center space-x-4">
                        <div className="w-1/2 p-3 bg-yellow-200 rounded-lg">
                            <p className="font-bold text-xl">💛 {score.yellow}</p>
                            <div className="flex justify-center space-x-2 mt-2">
                                <button onClick={() => handleScore('yellow', 1)} className="p-1 bg-yellow-500 text-white rounded"><Plus size={20} /></button>
                                <button onClick={() => handleScore('yellow', -1)} className="p-1 bg-yellow-700 text-white rounded"><Minus size={20} /></button>
                            </div>
                        </div>
                        <div className="w-1/2 p-3 bg-blue-200 rounded-lg">
                            <p className="font-bold text-xl">💙 {score.blue}</p>
                            <div className="flex justify-center space-x-2 mt-2">
                                <button onClick={() => handleScore('blue', 1)} className="p-1 bg-blue-500 text-white rounded"><Plus size={20} /></button>
                                <button onClick={() => handleScore('blue', -1)} className="p-1 bg-blue-700 text-white rounded"><Minus size={20} /></button>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsRunning(prev => !prev)} 
                        className={`w-full py-3 font-bold rounded-lg shadow-md transition ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white mt-4`}
                    >
                        {isRunning ? <Pause className="inline w-5 h-5 mr-2" /> : <Play className="inline w-5 h-5 mr-2" />} 
                        {isRunning ? '일시정지' : '타이머 시작'}
                    </button>
                </div>
                
                {/* 현재 경기 명단 (옐로팀 예시) */}
                {/* 블루팀 명단도 여기에 표시해야 합니다. */}
                <div className="mt-6">
                    <h3 className="text-xl font-semibold border-b pb-2">💛 옐로팀 현재 명단 (6명)</h3>
                    <ul className="mt-2 text-gray-700 list-disc pl-5">
                        {activePlayersY.map(p => (
                            <li key={p.id}>{p.name} (ID {p.id}) {p.isKeeper ? '(KEEPER)' : ''}</li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-0 sm:p-4 font-sans max-w-md mx-auto">
            
            <div className="bg-red-600 text-white p-4 text-center rounded-t-lg shadow-md">
                <h1 className="text-xl font-bold">Futsal Team Manager</h1>
                <p className="text-sm mt-1">현재 섹션: **{currentView.toUpperCase()}** (경기 {gameCounter}/{TOTAL_GAMES_TO_PLAY})</p>
            </div>

            <div className="bg-white shadow-xl rounded-b-lg min-h-[600px]">
                {currentView === 'players' && renderTeamSetup()} 
                {currentView === 'teams' && renderTeamSetup()}
                {currentView === 'game_play' && renderGamePlaySection()}
                {currentView === 'results_summary' && renderResultsSummary()} 
                {currentView === 'game_end' && renderGameEnd()}
            </div>

            {isKeeperAlert && renderKeeperAlert()}
            {isPlayerAlert && renderPlayerAlert()}
            
        </div>
    );
};

export default FutsalTeamManager;
