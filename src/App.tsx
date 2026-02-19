import { useState, useCallback, useRef } from 'react';
import { StartScreen } from './ui/screens/StartScreen';
import { LobbyScreen } from './ui/screens/LobbyScreen';
import { GameScreen } from './ui/screens/GameScreen';
import { GameOverScreen } from './ui/screens/GameOverScreen';
import { NetworkManager } from './network/NetworkManager';
import { TEAM } from './types/entities';
import type { TeamId } from './types/entities';
import './ui/styles/App.css';
import './ui/styles/Screens.css';
import './ui/styles/HUD.css';

type Screen = 'start' | 'lobby' | 'playing' | 'gameover';
type GameMode = 'singleplayer' | 'multiplayer';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [gameResult, setGameResult] = useState({ winner: 0, reason: '' });
  const [gameMode, setGameMode] = useState<GameMode>('singleplayer');
  const [localTeam, setLocalTeam] = useState<TeamId>(TEAM.RED);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const networkRef = useRef<NetworkManager>(new NetworkManager());

  const handleSinglePlayer = useCallback(() => {
    setGameMode('singleplayer');
    setLocalTeam(TEAM.RED);
    setSeed(undefined);
    setScreen('playing');
  }, []);

  const handleCreateGame = useCallback(() => {
    setGameMode('multiplayer');
    setIsHost(true);
    setScreen('lobby');
  }, []);

  const handleJoinGame = useCallback((code: string) => {
    setGameMode('multiplayer');
    setIsHost(false);
    setRoomCode(code);
    setScreen('lobby');
  }, []);

  const handleGameStart = useCallback((gameSeed: number, team: TeamId) => {
    setLocalTeam(team);
    setSeed(gameSeed);
    setScreen('playing');
  }, []);

  const handleLobbyCancel = useCallback(() => {
    networkRef.current.disconnect();
    setScreen('start');
  }, []);

  const handleGameOver = useCallback((winner: number, reason: string) => {
    setGameResult({ winner, reason });
    setScreen('gameover');
  }, []);

  const handleRestart = useCallback(() => {
    networkRef.current.disconnect();
    setScreen('start');
  }, []);

  return (
    <>
      {screen === 'start' && (
        <StartScreen
          onSinglePlayer={handleSinglePlayer}
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
        />
      )}
      {screen === 'lobby' && (
        <LobbyScreen
          network={networkRef.current}
          isHost={isHost}
          roomCode={roomCode}
          onGameStart={handleGameStart}
          onCancel={handleLobbyCancel}
        />
      )}
      {screen === 'playing' && (
        <GameScreen
          onGameOver={handleGameOver}
          localTeam={localTeam}
          seed={seed}
          gameMode={gameMode}
          network={gameMode === 'multiplayer' ? networkRef.current : undefined}
        />
      )}
      {screen === 'gameover' && (
        <GameOverScreen
          winner={gameResult.winner}
          reason={gameResult.reason}
          onRestart={handleRestart}
          localTeam={localTeam}
        />
      )}
    </>
  );
}
