import { useState } from 'react';

interface Props {
  onSinglePlayer: () => void;
  onCreateGame: () => void;
  onJoinGame: (code: string) => void;
}

export function StartScreen({ onSinglePlayer, onCreateGame, onJoinGame }: Props) {
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      onJoinGame(joinCode.trim());
    }
  }

  return (
    <div className="start-screen">
      <h1>ZED</h1>
      <div className="subtitle">TERRITORY CONTROL RTS</div>

      {!showJoin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
          <button onClick={onSinglePlayer}>SINGLE PLAYER</button>
          <button onClick={onCreateGame}>CREATE GAME</button>
          <button onClick={() => setShowJoin(true)}>JOIN GAME</button>
        </div>
      ) : (
        <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30, alignItems: 'center' }}>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={4}
            autoFocus
            style={{
              fontSize: 24,
              letterSpacing: 8,
              textAlign: 'center',
              width: 180,
              padding: '8px 12px',
              background: '#1a1a2e',
              border: '2px solid #445',
              color: '#fff',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit">JOIN</button>
            <button type="button" onClick={() => setShowJoin(false)}>BACK</button>
          </div>
        </form>
      )}

      <div className="controls-hint">
        LEFT CLICK — Select units &amp; buildings<br />
        RIGHT CLICK — Move / Attack<br />
        DRAG — Box select multiple units<br />
        WASD / Arrow keys / Edge scroll — Pan camera<br />
        CLICK FACTORY — Change production
      </div>
    </div>
  );
}
