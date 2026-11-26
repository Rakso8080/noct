import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACES } from '../src/lib/atlas.ts';
import { CREATURE_ART, PLACE_ART, artFor } from '../src/lib/placeArt.ts';
import { SCENES } from '../src/lib/scenes.ts';

test('every place has its own piece of the valley', () => {
  for (const place of PLACES) {
    const art = PLACE_ART[place.id];
    assert.ok(art, `${place.id} has no scene`);
    assert.ok(art.far.length >= 1, `${place.id} needs a far layer`);
    assert.ok(art.mid.length >= 1, `${place.id} needs a mid layer`);
    assert.ok(art.near.length >= 1, `${place.id} needs a near layer`);
    assert.ok(art.light.x >= 0 && art.light.x <= 100);
    assert.ok(art.light.y >= 0 && art.light.y <= 100);
    assert.ok(art.ground > 0 && art.ground < 50);
  }
  assert.ok(PLACE_ART.home && PLACE_ART.arcade && PLACE_ART.atlas);
});

test('every scene stays small, on the pixel grid and inside the plate', () => {
  for (const [key, art] of Object.entries(PLACE_ART)) {
    const bytes = JSON.stringify(art).length;
    assert.ok(bytes <= 4096, `${key} is ${bytes} bytes, over the 4 KB budget`);
    for (const piece of [...art.far, ...art.mid, ...art.near]) {
      assert.ok(piece.x >= -5 && piece.x <= 105, `${key} piece leaves the plate sideways`);
      assert.ok(piece.y >= 0 && piece.y <= 100, `${key} piece leaves the plate vertically`);
      assert.ok(piece.w > 0 && piece.w <= 100);
      assert.ok(piece.grid.length >= 2, `${key} piece is too small to read`);
      for (const row of piece.grid) {
        assert.match(row, /^[.X]+$/, `${key} grid must be dots and X only`);
      }
      if (piece.tone) assert.ok(['ink', 'glow'].includes(piece.tone), `${key} unknown tone`);
      if (piece.color) assert.match(piece.color, /^#[0-9a-f]{6}$/i, `${key} pigment is not a hex`);
      if (piece.fx) {
        assert.ok(
          ['smoke', 'flicker', 'sway', 'bob', 'flag', 'drift'].includes(piece.fx),
          `${key} unknown fx ${piece.fx}`,
        );
      }
    }
    for (const glint of art.glints ?? []) {
      assert.ok(glint.x >= 0 && glint.x <= 100, `${key} glint leaves the plate sideways`);
      assert.ok(glint.y >= 0 && glint.y <= 100, `${key} glint leaves the plate vertically`);
      assert.ok(glint.size > 0 && glint.size <= 40);
      if (glint.fx) {
        assert.ok(
          ['flicker', 'firefly', 'ripple', 'halo'].includes(glint.fx),
          `${key} unknown glint fx ${glint.fx}`,
        );
      }
    }
  }
});

test('every scene has at least one warm glint and one moving piece', () => {
  for (const [key, art] of Object.entries(PLACE_ART)) {
    assert.ok((art.glints ?? []).length >= 1, `${key} has no glints`);
    assert.ok(
      [...art.far, ...art.mid, ...art.near].some((piece) => piece.fx),
      `${key} has nothing that moves`,
    );
  }
});

test('every world has a creature and a wind, and every creature has a silhouette', () => {
  for (const [key, art] of Object.entries(PLACE_ART)) {
    assert.ok(art.wind, `${key} has no wind`);
    assert.ok(['calm', 'breeze', 'gust'].includes(art.wind ?? ''), `${key} has an unknown wind`);
    assert.ok((art.creatures ?? []).length >= 1, `${key} has no creatures`);
    for (const creature of art.creatures ?? []) {
      assert.ok(CREATURE_ART[creature.kind], `${key} has an unknown creature ${creature.kind}`);
      assert.ok(creature.x >= -10 && creature.x <= 110, `${key} creature leaves sideways`);
      assert.ok(creature.y >= 0 && creature.y <= 100, `${key} creature leaves vertically`);
      assert.ok(creature.size > 0 && creature.size <= 20, `${key} creature has an odd size`);
    }
  }
});

test('Candle Keep is the picture: moon, keep, bridge, houses and water', () => {
  const keep = PLACE_ART.chess;
  const mid = keep.mid;
  const all = [...keep.far, ...keep.mid, ...keep.near];
  assert.ok(all.some((piece) => piece.grid[0] === '..XXX..' && piece.w === 13), 'moon');
  assert.ok(
    mid.some((piece) => piece.grid[0] === '..X.X..' && piece.grid.length === 8),
    'keep tower',
  );
  assert.ok(
    mid.some((piece) => piece.grid.includes('XXXXXXXXXXXXXXXXXXXXXXX')),
    'three-arch bridge',
  );
  assert.equal(mid.filter((piece) => piece.grid[0] === '....X....').length, 3, 'village houses');
  assert.ok(mid.filter((piece) => piece.tone === 'ink').length >= 8);
  assert.ok(keep.glints && keep.glints.length >= 12);
  assert.ok(keep.glints.some((glint) => glint.fx === 'halo'), 'moon halo');
  assert.ok(keep.glints.filter((glint) => glint.fx === 'flicker').length >= 8, 'lit windows');
  assert.ok(keep.glints.some((glint) => glint.fx === 'ripple'), 'water reflections');
  assert.ok(keep.glints.some((glint) => glint.fx === 'firefly'));
  assert.ok(mid.some((piece) => piece.fx === 'flag'));
  assert.ok(mid.some((piece) => piece.fx === 'smoke'));
});

test('a place keeps the palette of its own room', () => {
  for (const place of PLACES) {
    const scene = SCENES[place.id];
    assert.ok(scene, `${place.id} has no atmosphere`);
    assert.equal(scene.sky.length, 2);
    assert.ok(scene.glow.startsWith('#'));
  }
  assert.deepEqual(artFor('common'), PLACE_ART.common);
  assert.deepEqual(artFor('home'), PLACE_ART.home);
});
