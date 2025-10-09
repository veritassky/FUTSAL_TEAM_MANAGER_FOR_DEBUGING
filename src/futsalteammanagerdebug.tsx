import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Timer, Play, Pause, RotateCcw, Trash2, CheckCircle, AlertTriangle, ChevronsRight, Home } from 'lucide-react';

// ==============================================================================
// 1. 상수 정의 (디버그 모드 시간 단축)
// ==============================================================================

// 섹션 뷰 타입 정의
type ViewType = 'players' | 'teams' | 'game_play' | 'keeper_alert' | 'player_alert' | 'game_end';

// 플레이어 타입 정의
interface Player {
    id: number;
    name: string;
    level: number;
    team: 'yellow' | 'blue';
    timePlayed: number; // 총 출전 시간 (초)
    isKeeper: boolean;
    onField: boolean;
    isBench: boolean;
    goals: number;
}

// 디버그용 시간 설정 (초 단위)
const GAME_TOTAL_DURATION_SECONDS = 28; // 총 경기 시간 28초 (기존 28분)
const KEEPER_CHANGE_INTERVAL_SECONDS = 7; // 키퍼 교체 주기 7초 (기존 7분)

// 초기 상태 상수
const INITIAL_PLAYER_STATE: Player[] = [];
const TOTAL_GAMES_TO_PLAY = 8; // 총 8경기 반복

// 사운드 경로 (실제 환경에 맞게 변경 필요)
const ALARM_SOUND_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // 알람용 MP3 파일 URL

// ==============================================================================
// 2. 메인 컴포넌트: FutsalTeamManager
// ==============================================================================

const FutsalTeamManager = () => {
    // 섹션 상태 관리
    const [currentView, setCurrentView] = useState<ViewType>('players');
    
    // 게임 상태 관리
    const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYER_STATE);
    const [nextPlayerName, setNextPlayerName] = useState('');
    const [nextPlayerLevel, setNextPlayerLevel] = useState(3);
    const [nextPlayerTeam, setNextPlayerTeam] = useState<'yellow' | 'blue'>('yellow');
    
    // 팀 및 경기 상태
    const [teams, setTeams] = useState<{ yellow: Player[], blue: Player[] }>({ yellow: [], blue: [] });
    const [score, setScore] = useState({ yellow: 0, blue: 0 });
    const [gameCounter, setGameCounter] = useState(1); // 현재 몇 번째 경기인지
    
    // 타이머 및 알람 상태
    const [timerCount, setTimerCount] = useState(GAME_TOTAL_DURATION_SECONDS); // 초 단위로 초기화
    const [isRunning, setIsRunning] = useState(false);
    const [isKeeperAlert, setIsKeeperAlert] = useState(false); // 섹션 4 상태
    const [isPlayerAlert, setIsPlayerAlert] = useState(false); // 섹션 5 상태
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const alarmIntervalRef = useRef<number | null>(null);

    // ==========================================================================
    // 3. 헬퍼 함수 및 로직
    // ==========================================================================

    const getActivePlayers = (team: 'yellow' | 'blue') => teams[team].filter(p => p.onField && !p.isBench);
    const getKeeper = (team: 'yellow' | 'blue') => teams[team].find(p => p.isKeeper);

    // 알람 사운드 시작/중지 로직 (섹션 4, 5용)
    const startAlarm = useCallback(() => {
        // 기존 알람 중지 (안전 확보)
        stopAlarm();
        
        if (!audioRef.current) {
            audioRef.current = new Audio(ALARM_SOUND_URL);
            audioRef.current.loop = true;
        }
        
        const playSound = () => {
             // 사용자 제스처 없이는 자동 재생이 막힐 수 있음 (웹뷰 문제 발생 가능성 있음)
            audioRef.current?.play().catch(error => {
                console.warn("Audio playback failed, possibly due to user gesture requirement:", error);
                // 여기에 사용자에게 직접 재생 버튼을 누르도록 유도하는 UI를 띄울 수 있음
            });
        };

        playSound();

        // 5초마다 알람을 반복하여 확실하게 사용자에게 알림
        // TypeScript의 window.setInterval 타입 문제가 있으므로 number로 강제 캐스팅
        alarmIntervalRef.current = window.setInterval(playSound, 5000) as unknown as number; 
    }, []);

    const stopAlarm = useCallback(() => {
        if (alarmIntervalRef.current !== null) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
        audioRef.current?.pause();
        // audioRef.current = null; // 오디오 객체를 재사용하지 않도록 초기화
    }, []);

    // ==========================================================================
    // 4. 섹션 간 이동 함수
    // ==========================================================================

    const goToSection = (view: ViewType) => {
        stopAlarm();
        setCurrentView(view);
    };
    
    // 섹션 6: 앱 초기화 함수
    const resetApp = () => {
        setPlayers(INITIAL_PLAYER_STATE);
        setTeams({ yellow: [], blue: [] });
        setScore({ yellow: 0, blue: 0 });
        setGameCounter(1);
        setTimerCount(GAME_TOTAL_DURATION_SECONDS);
        setIsRunning(false);
        goToSection('players'); // 섹션 1로 돌아가기
    };

    // ==========================================================================
    // 5. 타이머 및 교체 로직 (useEffect)
    // ==========================================================================

    useEffect(() => {
        if (isRunning && timerCount > 0 && !isKeeperAlert && !isPlayerAlert) {
            const timer = setInterval(() => {
                setTimerCount(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timerCount === 0 && isRunning) {
            setIsRunning(false);
            
            // 8번째 경기가 종료되었는지 확인 (Game Counter 기준)
            if (gameCounter >= TOTAL_GAMES_TO_PLAY) {
                goToSection('game_end'); // 섹션 6: 경기 종료
            } else {
                // 섹션 5: 경기 종료 후 선수 교체 알림
                setIsPlayerAlert(true);
                startAlarm();
            }
        }
    }, [isRunning, timerCount, isKeeperAlert, isPlayerAlert, gameCounter, startAlarm, goToSection]);

    // 키퍼 교체 시간 알림 로직 (7초 주기)
    useEffect(() => {
        const elapsedSeconds = GAME_TOTAL_DURATION_SECONDS - timerCount;

        // 7초 경과 시 (전반 7초, 후반 21초)
        if (isRunning && 
            (elapsedSeconds === KEEPER_CHANGE_INTERVAL_SECONDS || 
             elapsedSeconds === GAME_TOTAL_DURATION_SECONDS - KEEPER_CHANGE_INTERVAL_SECONDS)
        ) {
            setIsRunning(false);
            setIsKeeperAlert(true); // 섹션 4 활성화
            startAlarm();
            setCurrentView('game_play'); // 섹션 3 화면에서 모달로 처리될 예정
        }
    }, [timerCount, isRunning, startAlarm]);

    // ==========================================================================
    // 6. 섹션 1: [선수 관리 섹션]
    // ==========================================================================

    const handleAddPlayer = () => {
        if (!nextPlayerName.trim()) return;
        const newPlayer: Player = {
            id: Date.now(),
            name: nextPlayerName.trim(),
            level: nextPlayerLevel,
            team: nextPlayerTeam,
            timePlayed: 0,
            isKeeper: false,
            onField: false,
            isBench: true,
            goals: 0,
        };
        setPlayers([...players, newPlayer]);
        setNextPlayerName('');
    };

    const handleDeletePlayer = (id: number) => {
        setPlayers(players.filter(p => p.id !== id));
    };
    
    // 섹션 2로 이동 (팀 구성 시작)
    const handleStartTeamSetup = () => {
        if (players.length < 10) {
            // 디버그를 위해 인원 제한을 4명으로 낮춤 (실제는 10명 이상)
            if (players.length < 4) {
                alert('디버그를 위해 최소 4명 이상의 선수가 필요합니다.');
                return;
            }
        }
        goToSection('teams');
    };
    
    // ==========================================================================
    // 7. 섹션 2: [팀 구성 섹션]
    // ==========================================================================
    
    // 레벨에 따라 팀을 나누는 로직 (가장 단순한 버전)
    const handleBalanceTeams = () => {
        const sortedPlayers = [...players].sort((a, b) => b.level - a.level);
        
        let teamA: Player[] = [];
        let teamB: Player[] = [];
        let scoreA = 0;
        let scoreB = 0;
        
        // 지그재그 방식으로 분배하여 밸런스 맞추기
        sortedPlayers.forEach((player, index) => {
            if (scoreA <= scoreB) {
                teamA.push({ ...player, team: 'yellow' });
                scoreA += player.level;
            } else {
                teamB.push({ ...player, team: 'blue' });
                scoreB += player.level;
            }
        });

        setTeams({ yellow: teamA, blue: teamB });
        setPlayers([...teamA, ...teamB]); // 전체 선수 목록도 업데이트
        
        alert(`팀 구성 완료! 옐로 Lv 합계: ${scoreA}, 블루 Lv 합계: ${scoreB}`);
        
        // 섹션 3로 이동 준비 (라인업 확정 후 '경기 진행' 버튼이 나오도록 유도)
        setCurrentView('game_play'); 
    };
    
    const renderTeamSetup = () => {
        const scoreA = teams.yellow.reduce((sum, p) => sum + p.level, 0);
        const scoreB = teams.blue.reduce((sum, p => sum + p.level, 0);
        
        return (
            <div className="p-4 space-y-4">
                <h2 className="text-2xl font-bold">섹션 2: 팀 구성</h2>
                
                {teams.yellow.length === 0 ? (
                    <button 
                        onClick={handleBalanceTeams} 
                        className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                    >
                        팀 자동 배분 실행
                    </button>
                ) : (
                    <>
                        <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                            <h3 className="text-lg font-semibold">밸런스 현황</h3>
                            <p>옐로 총 Lv: **{scoreA}** vs 블루 총 Lv: **{scoreB}**</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded-lg">
                                <h3 className="font-bold text-yellow-800">💛 옐로 팀 ({teams.yellow.length}명)</h3>
                                <ul className="mt-2 space-y-1 text-sm">
                                    {teams.yellow.map(p => <li key={p.id}>{p.name} (Lv {p.level})</li>)}
                                </ul>
                            </div>
                            <div className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded-lg">
                                <h3 className="font-bold text-blue-800">💙 블루 팀 ({teams.blue.length}명)</h3>
                                <ul className="mt-2 space-y-1 text-sm">
                                    {teams.blue.map(p => <li key={p.id}>{p.name} (Lv {p.level})</li>)}
                                </ul>
                            </div>
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

    // ==========================================================================
    // 8. 섹션 3: [경기 진행 섹션] (하위 탭: 경기진행, 통계)
    // ==========================================================================

    const formatTime = (totalSeconds: number) => {
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleTimerControl = () => {
        setIsRunning(prev => !prev);
    };

    const handleScore = (team: 'yellow' | 'blue') => {
        setScore(prev => ({
            ...prev,
            [team]: prev[team] + 1
        }));
    };
    
    // ==========================================================================
    // 9. 섹션 4: [키퍼 교체 알림 섹션] (모달 형태)
    // ==========================================================================

    const handleKeeperChangeComplete = () => {
        // 1. 알람 중지
        stopAlarm();
        // 2. 키퍼 교체 로직 (생략 - 디버그)
        
        // 3. 상태 해제 및 타이머 재시작
        setIsKeeperAlert(false);
        setIsRunning(true);
    };
    
    const renderKeeperAlert = () => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl text-center border-4 border-red-500 space-y-4">
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto animate-pulse" />
                <h2 className="text-3xl font-extrabold text-red-600">🚨 섹션 4: 키퍼 교체 시간입니다!</h2>
                <p className="text-lg text-gray-700">교체 완료 전까지 알람이 계속 울립니다.</p>
                
                <div className="bg-gray-100 p-3 rounded-lg text-left">
                    <p className="font-semibold text-green-700">IN: [다음 키퍼 선수 이름] (수동 지정 필요)</p>
                    <p className="font-semibold text-red-700">OUT: [현재 키퍼 선수 이름] (수동 지정 필요)</p>
                </div>
                
                <button 
                    onClick={handleKeeperChangeComplete} 
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition"
                >
                    <CheckCircle className="inline w-5 h-5 mr-2" /> 교체 완료 및 경기 재개
                </button>
            </div>
        </div>
    );

    // ==========================================================================
    // 10. 섹션 5: [선수 교체 알림 섹션] (모달 형태)
    // ==========================================================================

    const handlePlayerChangeComplete = () => {
        // 1. 알람 중지
        stopAlarm();
        // 2. 선수 교체 로직 (생략 - 디버그)
        
        // 3. 경기 카운터 증가 및 타이머 초기화
        setGameCounter(prev => prev + 1);
        setTimerCount(GAME_TOTAL_DURATION_SECONDS);
        
        // 4. 상태 해제 및 다음 경기 시작 준비
        setIsPlayerAlert(false);
        setIsRunning(false); 
        alert(`경기 ${gameCounter} 종료. 경기 ${gameCounter + 1} 준비 완료.`);
    };

    const renderPlayerAlert = () => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl text-center border-4 border-blue-500 space-y-4">
                <AlertTriangle className="w-16 h-16 text-blue-600 mx-auto animate-pulse" />
                <h2 className="text-3xl font-extrabold text-blue-600">🔁 섹션 5: 선수 로테이션 시간입니다!</h2>
                <p className="text-lg text-gray-700">다음 경기를 위해 선수 교체를 완료해주세요. 알람이 계속 울립니다.</p>
                
                <div className="bg-gray-100 p-3 rounded-lg text-left">
                    <p className="font-semibold text-green-700">IN 명단: [다음 순서 선수들]</p>
                    <p className="font-semibold text-red-700">OUT 명단: [쉬어야 할 선수들]</p>
                </div>
                
                <button 
                    onClick={handlePlayerChangeComplete} 
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition"
                >
                    <CheckCircle className="inline w-5 h-5 mr-2" /> 선수 교체 완료 및 다음 경기 준비
                </button>
            </div>
        </div>
    );

    // ==========================================================================
    // 11. 섹션 6: [경기 종료 섹션]
    // ==========================================================================
    
    const renderGameEnd = () => (
        <div className="p-8 text-center bg-white rounded-lg shadow-xl space-y-6">
            <h2 className="text-4xl font-extrabold text-indigo-600">🏆 섹션 6: 모든 경기 종료! 🏆</h2>
            <p className="text-xl text-gray-700">총 {TOTAL_GAMES_TO_PLAY} 경기가 성공적으로 완료되었습니다.</p>
            
            <div className="text-lg font-semibold bg-gray-100 p-4 rounded-lg">
                <p>최종 스코어: 옐로 {score.yellow} vs 블루 {score.blue}</p>
                {/* 여기에 최종 통계 요약을 추가할 수 있습니다. */}
            </div>
            
            <button 
                onClick={resetApp} 
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition"
            >
                <Home className="inline w-5 h-5 mr-2" /> 처음으로 돌아가기 (앱 초기화)
            </button>
        </div>
    );

    // ==========================================================================
    // 12. 메인 렌더링 함수
    // ==========================================================================
    
    // 섹션 1 렌더링
    const renderPlayersSection = () => (
        <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
            <h2 className="text-2xl font-bold">섹션 1: 선수 관리</h2>
            
            {/* 선수 추가 입력 영역 (잘림 방지) */}
            <div className="flex flex-wrap items-center space-x-2 space-y-2 md:space-y-0 w-full p-2 bg-gray-50 rounded-lg shadow-md max-w-full">
                <input 
                    type="text" 
                    placeholder="이름" 
                    value={nextPlayerName} 
                    onChange={(e) => setNextPlayerName(e.target.value)} 
                    className="flex-grow p-2 border border-gray-300 rounded-lg min-w-[80px]"
                />
                <select 
                    value={nextPlayerTeam} 
                    onChange={(e) => setNextPlayerTeam(e.target.value as 'yellow' | 'blue')} 
                    className="p-2 border border-gray-300 rounded-lg"
                >
                    <option value="yellow">💛 옐로</option>
                    <option value="blue">💙 블루</option>
                </select>
                <select 
                    value={nextPlayerLevel} 
                    onChange={(e) => setNextPlayerLevel(Number(e.target.value))} 
                    className="p-2 border border-gray-300 rounded-lg"
                >
                    {[1, 2, 3, 4, 5].map(lv => <option key={lv} value={lv}>Lv {lv}</option>)}
                </select>
                <button 
                    onClick={handleAddPlayer} 
                    className="p-2 bg-orange-500 text-white font-bold rounded-lg flex-shrink-0 hover:bg-orange-600 transition"
                >
                    +
                </button>
            </div>
            
            {/* 선수 명단 */}
            <ul className="space-y-2">
                {players.map(p => (
                    <li key={p.id} className="flex justify-between items-center p-3 bg-white border-l-4 border-gray-300 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.team === 'yellow' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'}`}>
                                Lv {p.level}
                            </span>
                            <span className="font-semibold">{p.name}</span>
                        </div>
                        <button onClick={() => handleDeletePlayer(p.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </li>
                ))}
            </ul>

            {players.length >= 4 && ( // 디버그를 위해 4명 이상이면 활성화
                <button 
                    onClick={handleStartTeamSetup} 
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition mt-4"
                >
                    <ChevronsRight className="inline w-5 h-5 mr-2" /> 섹션 2: 팀 구성 시작
                </button>
            )}
        </div>
    );
    
    // 섹션 3 렌더링
    const renderGamePlaySection = () => (
        <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold">섹션 3: 경기 진행 ({gameCounter}/{TOTAL_GAMES_TO_PLAY} 경기)</h2>
            
            {/* 타이머 및 스코어 */}
            <div className="text-center bg-gray-100 p-6 rounded-xl shadow-lg space-y-4">
                {/* 28초를 00:28로 포맷팅 */}
                <p className="text-6xl font-extrabold text-gray-800">{formatTime(timerCount)}</p>
                <div className="flex justify-center space-x-4">
                    <button 
                        onClick={handleTimerControl} 
                        className={`p-3 rounded-full text-white font-bold ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <button onClick={() => setTimerCount(GAME_TOTAL_DURATION_SECONDS)} className="p-3 bg-gray-500 text-white rounded-full hover:bg-gray-600">
                        <RotateCcw className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex justify-around items-center mt-4">
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-yellow-600">💛 {score.yellow}</span>
                        <button onClick={() => handleScore('yellow')} className="mt-2 px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition">+1</button>
                    </div>
                    <span className="text-2xl font-bold mx-4">-</span>
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-blue-600">💙 {score.blue}</span>
                        <button onClick={() => handleScore('blue')} className="mt-2 px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition">+1</button>
                    </div>
                </div>
            </div>
            
            {/* 여기에 경기진행 및 통계 하위 영역 UI가 추가될 예정 */}
            <div className="mt-6">
                <h3 className="text-xl font-semibold border-b pb-2">경기진행 및 통계</h3>
                <p className="mt-2 text-gray-600">타이머를 시작하면 **7초에 섹션 4 (키퍼 교체)**, **28초에 섹션 5 (선수 교체)** 알림이 뜹니다.</p>
            </div>
        </div>
    );


    // ==========================================================================
    // 13. 전체 UI 렌더링
    // ==========================================================================

    return (
        <div className="min-h-screen bg-gray-50 p-0 sm:p-4 font-sans max-w-md mx-auto">
            {/* 섹션 헤더 (현재 상태 표시) */}
            <div className="bg-red-600 text-white p-4 text-center rounded-t-lg shadow-md">
                <h1 className="text-xl font-bold">Futsal Team Manager</h1>
                <p className="text-sm mt-1">현재 섹션: **{currentView.toUpperCase()}**</p>
            </div>

            {/* 섹션 콘텐츠 */}
            <div className="bg-white shadow-xl rounded-b-lg min-h-[600px]">
                {currentView === 'players' && renderPlayersSection()}
                {currentView === 'teams' && renderTeamSetup()}
                {currentView === 'game_play' && renderGamePlaySection()}
                {currentView === 'game_end' && renderGameEnd()}
            </div>

            {/* 섹션 4 및 5 모달은 최상위에서 렌더링하여 모든 뷰 위에 나타나게 합니다. */}
            {isKeeperAlert && renderKeeperAlert()}
            {isPlayerAlert && renderPlayerAlert()}
            
        </div>
    );
};

export default FutsalTeamManager;
