import { useEffect, useState } from 'react';
import { NetworkManager } from '../../network/NetworkManager';
import type { TeamId } from '../../types/entities';

interface Props {
  network: NetworkManager;
  isHost: boolean;
  roomCode: string;
  onGameStart: (seed: number, team: TeamId) => void;
  onCancel: () => void;
}

export function LobbyScreen({ network, isHost, roomCode, onGameStart, onCancel }: Props) {
  const [status, setStatus] = useState('Connecting to server...');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await network.connect();
        if (cancelled) return;

        network.onRoomCreated((rc) => {
          if (!cancelled) {
            setCode(rc);
            setStatus('Waiting for opponent...');
          }
        });

        network.onOpponentJoined(() => {
          if (!cancelled) setStatus('Opponent joined! Starting game...');
        });

        network.onGameStart((seed, team, _turnInterval) => {
          if (!cancelled) onGameStart(seed, team);
        });

        network.onError((msg) => {
          if (!cancelled) setError(msg);
        });

        network.onOpponentDisconnected(() => {
          if (!cancelled) {
            setError('Opponent disconnected');
            setStatus('');
          }
        });

        if (isHost) {
          network.createRoom();
        } else {
          network.joinRoom(roomCode);
          setStatus('Joining room...');
        }
      } catch {
        if (!cancelled) {
          setError('Failed to connect to server. Is it running?');
        }
      }
    }

    setup();
    return () => { cancelled = true; };
  }, [network, isHost, roomCode, onGameStart]);

  return (
    <div className="start-screen">
      <h1>ZED</h1>
      <div className="subtitle">MULTIPLAYER LOBBY</div>

      {error ? (
        <>
          <p style={{ color: '#f66', fontSize: 16, marginBottom: 20 }}>{error}</p>
          <button onClick={onCancel}>BACK</button>
        </>
      ) : (
        <>
          <p style={{ color: '#aab', fontSize: 16, marginBottom: 20 }}>{status}</p>
          {code && (
            <div style={{ marginBottom: 30 }}>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>Share this code with your opponent:</p>
              <div style={{
                fontSize: 48,
                fontWeight: 'bold',
                letterSpacing: 12,
                color: '#4f4',
                fontFamily: 'monospace',
              }}>
                {code}
              </div>
            </div>
          )}
          <button onClick={onCancel}>CANCEL</button>
        </>
      )}
    </div>
  );
}
