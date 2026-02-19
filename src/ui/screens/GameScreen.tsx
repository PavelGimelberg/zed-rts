import { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../../game/GameEngine';
import { createInitialState } from '../../game/GameState';
import { GameRenderer } from '../../rendering/GameRenderer';
import { Camera } from '../../rendering/Camera';
import { TileAtlas } from '../../rendering/TileAtlas';
import { InputHandler } from '../../input/InputHandler';
import { CommandQueue } from '../../input/CommandQueue';
import { SelectionManager } from '../../input/SelectionManager';
import { AudioManager } from '../../audio/AudioManager';
import { NetworkManager } from '../../network/NetworkManager';
import { TURN_INTERVAL } from '../../network/protocol';
import { ResourceBar } from '../hud/ResourceBar';
import { HUDPanel } from '../hud/HUDPanel';
import { Minimap } from '../hud/Minimap';
import { SelectionInfo } from '../hud/SelectionInfo';
import { ProductionPanel } from '../hud/ProductionPanel';
import { Toast } from '../hud/Toast';
import { TEAM, TeamId } from '../../types/entities';
import { GameState, UnitType, Command } from '../../types';
import { createProduceCommand } from '../../input/CommandFactory';

interface Props {
  onGameOver: (winner: number, reason: string) => void;
  localTeam?: TeamId;
  seed?: number;
  gameMode?: 'singleplayer' | 'multiplayer';
  network?: NetworkManager;
}

export function GameScreen({ onGameOver, localTeam = TEAM.RED, seed, gameMode = 'singleplayer', network }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [hudState, setHudState] = useState<GameState | null>(null);
  const [toast, setToast] = useState({ message: '', visible: false });

  // Refs for game loop (not React state — too slow for 60fps)
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const cameraRef = useRef<Camera>(new Camera());
  const inputRef = useRef<InputHandler | null>(null);
  const commandQueueRef = useRef(new CommandQueue());
  const selectionRef = useRef(new SelectionManager());
  const audioRef = useRef(new AudioManager());
  const frameRef = useRef<number>(0);
  const gameTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const isMultiplayer = gameMode === 'multiplayer';

    // Resize canvas to fill window
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Initialize game
    const initialState = createInitialState(seed);
    const engine = new GameEngine(initialState, isMultiplayer);
    const renderer = new GameRenderer();
    const camera = cameraRef.current;
    const commandQueue = commandQueueRef.current;
    const selection = selectionRef.current;
    const audio = audioRef.current;

    // Centre camera based on team
    if (localTeam === TEAM.BLUE) {
      // Position camera at BLUE base (bottom-right)
      const cols = initialState.worldWidth / 40;
      const rows = initialState.worldHeight / 40;
      camera.x = (cols + rows - 6) * 64;
      camera.y = (rows - cols + 6) * 32;
    } else {
      camera.centreOnMap();
    }

    // Init audio on user gesture (this component mounts on click)
    audio.init();
    audio.startMusic();

    // Load tile atlas (SBS isometric sprites) in the background
    const tileAtlas = new TileAtlas();
    tileAtlas.load().then(() => {
      renderer.setTileAtlas(tileAtlas);
    }).catch((err) => {
      console.warn('Tile atlas failed to load, using fallback tiles:', err);
    });

    // Setup input
    const input = new InputHandler(canvas, camera, commandQueue, selection, () => engine.state, localTeam);

    engineRef.current = engine;
    rendererRef.current = renderer;
    inputRef.current = input;

    let lastHudUpdate = 0;

    // Shared render function
    function renderFrame() {
      const state = engine.state;

      // Update camera
      const scrollDx = input.scrollDx;
      const scrollDy = input.scrollDy;
      const zoomDelta = input.zoomDelta;
      input.scrollDx = 0;
      input.scrollDy = 0;
      input.zoomDelta = 0;

      camera.update(
        input.keys,
        input.mouseX,
        input.mouseY,
        canvas.width,
        canvas.height,
        state.worldWidth,
        state.worldHeight,
        scrollDx,
        scrollDy,
        zoomDelta
      );

      // Render
      const miniCtx = minimapRef.current?.getContext('2d') ?? null;
      renderer.render(
        ctx,
        miniCtx,
        state,
        camera,
        canvas.width,
        canvas.height,
        gameTimeRef.current,
        input.dragStart,
        input.dragEnd,
        selection.getSelectedBuildingId(),
        selection.getSelectedUnitIds(),
        180,
        120
      );

      gameTimeRef.current++;

      // Update React HUD (throttled to ~10fps)
      if (gameTimeRef.current - lastHudUpdate > 6) {
        lastHudUpdate = gameTimeRef.current;
        setHudState({ ...state });
      }
    }

    function handleEvents(state: GameState) {
      audio.handleEvents(state.events);
      for (const event of state.events) {
        if (event.type === 'sectorCaptured') {
          const teamName = event.team === 1 ? 'RED' : 'BLUE';
          showToast(`${teamName} captured sector ${event.sectorId}!`);
        }
      }
    }

    if (isMultiplayer && network) {
      // ── Multiplayer lockstep game loop ──
      const net = network; // narrowed for closures
      const turnInterval = TURN_INTERVAL;
      let currentTurn = 0;
      let frameInTurn = 0;
      let waitingForTurnData = false;
      let turnDataReceived: Command[] | null = null;
      let localCommandsThisTurn: Command[] = [];

      net.onTurnData((_turn, commands) => {
        turnDataReceived = commands;
        waitingForTurnData = false;
      });

      net.onOpponentDisconnected(() => {
        showToast('Opponent disconnected!');
        setTimeout(() => onGameOver(localTeam, 'Opponent disconnected'), 2000);
      });

      function multiplayerLoop() {
        const state = engine.state;

        if (!state.isRunning) {
          onGameOver(state.winner, state.winReason);
          return;
        }

        // Always collect local commands
        const newCommands = commandQueue.drain();
        localCommandsThisTurn.push(...newCommands);

        // If we have turn data, process it
        if (turnDataReceived !== null) {
          const combined = turnDataReceived;
          turnDataReceived = null;

          // Run turnInterval ticks — commands on first tick
          for (let i = 0; i < turnInterval; i++) {
            const tickCommands = i === 0 ? combined : [];
            engine.tick(tickCommands);
          }
          handleEvents(engine.state);

          currentTurn++;
          frameInTurn = 0;
        }

        // Submit turn commands when it's time
        if (!waitingForTurnData) {
          frameInTurn++;
          if (frameInTurn >= turnInterval) {
            net.submitTurnCommands(currentTurn, localCommandsThisTurn);
            localCommandsThisTurn = [];
            waitingForTurnData = true;
            frameInTurn = 0;
          }
        }

        renderFrame();
        frameRef.current = requestAnimationFrame(multiplayerLoop);
      }

      // Submit initial empty turn to kick off the lockstep
      net.submitTurnCommands(0, []);
      waitingForTurnData = true;

      frameRef.current = requestAnimationFrame(multiplayerLoop);
    } else {
      // ── Single-player game loop (unchanged) ──
      function singlePlayerLoop() {
        const state = engine.state;

        if (!state.isRunning) {
          onGameOver(state.winner, state.winReason);
          return;
        }

        // Drain commands and tick engine
        const commands = commandQueue.drain();
        const newState = engine.tick(commands);

        handleEvents(newState);
        renderFrame();
        frameRef.current = requestAnimationFrame(singlePlayerLoop);
      }

      frameRef.current = requestAnimationFrame(singlePlayerLoop);
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      audio.stopMusic();
      input.destroy();
      window.removeEventListener('resize', resize);
    };
  }, [onGameOver, localTeam, seed, gameMode, network]);

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
  }

  function handleMinimapClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const state = engineRef.current?.state;
    if (!state) return;
    const scaleX = state.worldWidth / 180;
    const scaleY = state.worldHeight / 120;
    const worldX = mx * scaleX;
    const worldY = my * scaleY;
    const col = worldX / 40;
    const row = worldY / 40;
    const camera = cameraRef.current;
    camera.x = (col + row) * 64;
    camera.y = (row - col) * 32;
  }

  function handleProduce(buildingId: string, unitType: UnitType) {
    commandQueueRef.current.enqueue(
      createProduceCommand(buildingId, unitType, localTeam)
    );
  }

  return (
    <>
      <canvas ref={canvasRef} />
      {hudState && (
        <>
          <ResourceBar state={hudState} />
          <HUDPanel>
            <Minimap canvasRef={minimapRef} onClick={handleMinimapClick} />
            <SelectionInfo
              state={hudState}
              selectedUnitIds={selectionRef.current.getSelectedUnitIds()}
              selectedBuildingId={selectionRef.current.getSelectedBuildingId()}
            />
            <ProductionPanel
              state={hudState}
              selectedBuildingId={selectionRef.current.getSelectedBuildingId()}
              onProduce={handleProduce}
              localTeam={localTeam}
            />
          </HUDPanel>
          <Toast message={toast.message} visible={toast.visible} />
        </>
      )}
    </>
  );
}
