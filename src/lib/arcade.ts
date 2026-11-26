import { api } from './api';
import type { ArcadeScoreResponse } from '../../shared/types';
import type { ArcadeGame } from '../../shared/arcade';

/**
 * A side-table score is a nice-to-have: if the API is unreachable the game is
 * still finished and kept on the device, so a failed post is never an error.
 */
export async function postArcadeScore(game: ArcadeGame, score: number): Promise<ArcadeScoreResponse | null> {
  try {
    return await api.arcadeScore(game, score);
  } catch {
    return null;
  }
}
