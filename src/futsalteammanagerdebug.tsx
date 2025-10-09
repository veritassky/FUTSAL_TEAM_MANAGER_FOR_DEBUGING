import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Timer, Play, Pause, RotateCcw, Trash2, CheckCircle, AlertTriangle, ChevronsRight, Home, Trophy } from 'lucide-react';

// ==============================================================================
// 1. 상수 정의 및 스케줄 테이블
// ==============================================================================

// ViewType에 results_summary 추가
type ViewType = 'players' | 'teams' | 'game_play' | 'keeper_alert' | 'player_alert' | 'results_summary' | 'game_end';

interface Player {
    id: number; 
    name: string;
    level: number;
    team: 'yellow' | 'blue';
    isKeeper: boolean;
    onField: boolean;
    goals: number; // 개인 득점 기록
    timePlayed: number; // 개인 출전 시간 기록
}

const GAME_TOTAL_DURATION_SECONDS = 14; 
const KEEPER_CHANGE_INTERVAL_SECONDS = 7; 
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
    // ... (상태 관리 로직은 이전과 동일)
    const [currentView, setCurrentView] = useState<ViewType>('players');
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<{ yellow: Player[], blue: Player[] }>({ yellow: [], blue: [] });
    const [score, setScore] = useState({ yellow: 0, blue: 0 });
    const [gameCounter, setGameCounter] = useState(1); 
    const [timerCount, setTimerCount] = useState(GAME_TOTAL_DURATION_SECONDS);
    const [isRunning, setIsRunning] = useState(false);
    const [isKeeperAlert, setIsKeeperAlert] = useState(false); 
    const [isPlayerAlert, setIsPlayerAlert] = useState(false);
    const [isSecondHalf, setIsSecondHalf] = useState(false); 
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const alarmIntervalRef = useRef<number | null>(alarmIntervalRef);
    
    // ... (stopAlarm, startAlarm, goToSection, formatTime, resetApp 함수는 이전과 동일) ...
    const goToSection = (view: ViewType) => { /* ... */ };
    const formatTime = (totalSeconds: number) => String(Math.floor(totalSeconds / 60)).padStart(2, '0') + ':' + String(totalSeconds % 60).padStart(2, '0');
    
    // ==========================================================================
    // 3. 타이머 및 교체 알림 로직 (useEffect)
    // ==========================================================================

    useEffect(() => {
        if (isRunning && timerCount > 0 && !isKeeperAlert && !isPlayerAlert) {
            const timer = setInterval(() => {
                setTimerCount(prev => prev - 1);
                
                // 🚨 출전 시간 기록 업데이트 🚨
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
            
            // 🚨 흐름 변경: 8번째 경기 종료 시 결과 요약 섹션으로 이동 🚨
            if (gameCounter >= TOTAL_GAMES_TO_PLAY) {
                goToSection('results_summary'); // 새 섹션으로 이동
            } else {
                // 섹션 5: 경기 종료 후 선수 로테이션 알림
                setIsPlayerAlert(true);
                startAlarm();
            }
        }
    }, [isRunning, timerCount, isKeeperAlert, isPlayerAlert, gameCounter, goToSection]);
    
    // ... (7초 키퍼 교체 알림 useEffect는 이전과 동일) ...

    // ==========================================================================
    // 4. 스코어링 함수 추가
    // ==========================================================================
    const handleScore = (team: 'yellow' | 'blue') => {
        setScore(prev => ({
            ...prev,
            [team]: prev[team] + 1,
        }));
        
        // 득점한 선수에게 개인 기록 추가
        setTeams(prevTeams => {
            const teamToUpdate = prevTeams[team];
            // 현재 필드 선수 중 임의의 선수에게 득점 부여 (실제 UI에서는 터치로 지정 필요)
            const scorer = teamToUpdate.find(p => p.onField && !p.isKeeper); 
            if (scorer) {
                scorer.goals += 1;
                // 상태 업데이트를 위해 새 객체를 생성
                return { 
                    ...prevTeams, 
                    [team]: prevTeams[team].map(p => p.id === scorer.id ? scorer : p)
                };
            }
            return prevTeams;
        });
    };

    // ... (updateTeamRosterForNextGame, handleKeeperSwap, handleKeeperChangeComplete, handlePlayerChangeComplete, getCurrentSubstitutionInfo 함수는 이전과 동일) ...
    // NOTE: updateTeamRosterForNextGame 및 handleBalanceTeams에서 timePlayed를 0으로 초기화하는 부분이 누락되었다면, 
    // resetApp 함수에서만 timePlayed를 초기화하도록 합니다.

    // ==========================================================================
    // 5. 섹션 6: [최종 결과 요약] 렌더링 함수 추가
    // ==========================================================================

    const renderResultsSummary = () => {
        const totalScore = score.yellow + score.blue;
        const winner = score.yellow > score.blue ? '💛 옐로 팀' : (score.blue > score.yellow ? '💙 블루 팀' : '무승부');
        
        const allPlayers = [...teams.yellow, ...teams.blue].sort((a, b) => b.goals - a.goals || b.timePlayed - a.timePlayed);
        
        return (
            <div className="p-4 space-y-6">
                <h2 className="text-3xl font-extrabold text-center text-green-700">🏆 섹션 6: 최종 경기 결과 요약</h2>
                <p className="text-sm text-center text-gray-500">모든 8경기 결과입니다.</p>
                
                {/* 최종 스코어 */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 text-center">
                    <h3 className="text-xl font-bold mb-2">최종 점수: {score.yellow} : {score.blue}</h3>
                    <p className={`text-3xl font-extrabold ${winner === '무승부' ? 'text-gray-600' : 'text-yellow-600'}`}>{winner} 우승!</p>
                </div>

                {/* 개인 기록 */}
                <div className="space-y-3">
                    <h3 className="text-xl font-bold border-b pb-2 text-indigo-700">🥇 개인 기록 순위 (득점/출전 시간)</h3>
                    {allPlayers.map((p, index) => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                            <span className="font-semibold">{index + 1}. {p.name} ({p.team === 'yellow' ? '💛' : '💙'})</span>
                            <span className="text-sm text-gray-700">
                                ⚽ **{p.goals}골** | ⏱️ {Math.floor(p.timePlayed / 60)}분 {p.timePlayed % 60}초
                            </span>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => goToSection('game_end')} 
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition"
                >
                    <ChevronsRight className="inline w-5 h-5 mr-2" /> 다음: 앱 종료 및 초기화 화면
                </button>
            </div>
        );
    };

    // ==========================================================================
    // 6. 섹션 7: [앱 종료 및 초기화] 렌더링 함수 (최종 섹션)
    // ==========================================================================
    
    const renderGameEnd = () => (
        <div className="p-4 space-y-6 text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
            <h2 className="text-3xl font-extrabold text-red-600">🏆 모든 경기 종료!</h2>
            <p className="text-lg text-gray-700">수고하셨습니다. 앱을 초기화하고 처음으로 돌아갈 수 있습니다.</p>
            
            <button 
                onClick={resetApp} 
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition"
            >
                <Home className="inline w-5 h-5 mr-2" /> 처음으로 되돌아가기 (앱 초기화)
            </button>
        </div>
    );
    
    // ==========================================================================
    // 7. 전체 UI 렌더링
    // ==========================================================================

    // ... (renderGamePlaySection 등은 handleScore 함수가 추가된 것 외에 UI는 이전과 유사) ...

    return (
        <div className="min-h-screen bg-gray-50 p-0 sm:p-4 font-sans max-w-md mx-auto">
            {/* ... (헤더) ... */}
            
            <div className="bg-white shadow-xl rounded-b-lg min-h-[600px]">
                {/* ... (섹션 렌더링 로직) ... */}
                {currentView === 'players' && <div>선수 관리 섹션 (ID 1~18)</div>} 
                {currentView === 'teams' && renderTeamSetup()}
                {currentView === 'game_play' && renderGamePlaySection()}
                
                {/* 🚨 새로운 섹션 추가 🚨 */}
                {currentView === 'results_summary' && renderResultsSummary()} 
                {currentView === 'game_end' && renderGameEnd()}
            </div>

            {/* ... (모달 렌더링) ... */}
            
        </div>
    );
};

export default FutsalTeamManager;
