import { useCallback, useEffect, useRef, useState } from 'react';
import { joinRoom, type Room } from 'trystero';
import type { ChessMove } from './chess';
import {
  onlineMove,
  type OnlineMove,
  type OnlineResign,
  type OnlineSync,
} from './chessOnline';

export type RoomStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error';

interface ChessRoomOptions {
  active: boolean;
  roomId: string | null;
  moves: ChessMove[];
  onMove: (move: OnlineMove) => void;
  onSync: (moves: OnlineMove[]) => void;
  onRestart: () => void;
  onResign: (side: 'w' | 'b') => void;
}

export interface ChessRoom {
  status: RoomStatus;
  peers: number;
  error: string;
  sendMove: (move: ChessMove) => void;
  restart: () => void;
  resign: (side: 'w' | 'b') => void;
}

function peerCount(room: Room): number {
  return Object.keys(room.getPeers()).length;
}

/**
 * One private two-seat room. Trystero discovers the friend through public
 * relays, then the browsers talk directly; there is no game server to deploy.
 */
export function useChessRoom({
  active,
  roomId,
  moves,
  onMove,
  onSync,
  onRestart,
  onResign,
}: ChessRoomOptions): ChessRoom {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [peers, setPeers] = useState(0);
  const [error, setError] = useState('');
  const movesRef = useRef(moves);
  const callbacks = useRef({ onMove, onSync, onRestart, onResign });
  const moveAction = useRef<((move: ChessMove) => Promise<void>) | null>(null);
  const restartAction = useRef<(() => Promise<void>) | null>(null);
  const resignAction = useRef<((side: 'w' | 'b') => Promise<void>) | null>(null);

  movesRef.current = moves;
  callbacks.current = { onMove, onSync, onRestart, onResign };

  useEffect(() => {
    if (!active || !roomId) {
      setStatus('idle');
      setPeers(0);
      setError('');
      return;
    }

    let alive = true;
    let room: Room | null = null;
    setStatus('connecting');
    setPeers(0);
    setError('');

    try {
      room = joinRoom(
        {
          appId: 'noct.game',
          password: `noct-chess-${roomId}`,
          maxUsers: 2,
        },
        roomId,
      );
    } catch {
      setStatus('error');
      setError('Could not open the room.');
      return;
    }

    const send = room.makeAction<OnlineMove>('move');
    const sync = room.makeAction<OnlineSync>('sync');
    const restart = room.makeAction('restart');
    const resign = room.makeAction<OnlineResign>('resign');
    moveAction.current = (move) => send.send(onlineMove(move));
    restartAction.current = () => restart.send({});
    resignAction.current = (side) => resign.send({ side });

    const refreshPeers = () => {
      if (!alive || !room) return;
      const count = peerCount(room);
      setPeers(count);
      setStatus(count > 0 ? 'connected' : 'waiting');
    };

    const offMove = send.onMessage((move) => {
      if (alive) callbacks.current.onMove(move);
    });
    const offSync = sync.onMessage((payload) => {
      if (alive && Array.isArray(payload?.moves)) callbacks.current.onSync(payload.moves);
    });
    const offRestart = restart.onMessage(() => {
      if (alive) callbacks.current.onRestart();
    });
    const offResign = resign.onMessage((payload) => {
      if (alive && (payload?.side === 'w' || payload?.side === 'b')) {
        callbacks.current.onResign(payload.side);
      }
    });
    const offJoin = room.onUserJoin(
      ({ userId }) => {
        refreshPeers();
        if (movesRef.current.length) {
          void sync.send({ moves: movesRef.current.map(onlineMove) }, { target: userId }).catch(() => undefined);
        }
      },
      { replay: true },
    );
    const offLeave = room.onUserLeave(() => {
      refreshPeers();
    });
    const offError = room.onError((roomError) => {
      if (!alive) return;
      setStatus('error');
      setError(
        roomError.code === 'room-full'
          ? 'That table already has two players.'
          : roomError.code === 'peer-connect-failed'
            ? 'The two browsers could not reach each other. Try another network.'
            : 'The room connection failed.',
      );
    });

    void room.ready.then(refreshPeers).catch(() => {
      if (!alive) return;
      setStatus('error');
      setError('Could not reach the room relays. Check the connection and try again.');
    });

    return () => {
      alive = false;
      offMove();
      offSync();
      offRestart();
      offResign();
      offJoin();
      offLeave();
      offError();
      moveAction.current = null;
      restartAction.current = null;
      resignAction.current = null;
      if (room) void room.leave().catch(() => undefined);
    };
  }, [active, roomId]);

  const sendMove = useCallback((move: ChessMove) => {
    void moveAction.current?.(move).catch(() => undefined);
  }, []);
  const restart = useCallback(() => {
    void restartAction.current?.().catch(() => undefined);
  }, []);
  const resign = useCallback((side: 'w' | 'b') => {
    void resignAction.current?.(side).catch(() => undefined);
  }, []);

  return { status, peers, error, sendMove, restart, resign };
}
