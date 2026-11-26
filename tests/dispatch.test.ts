import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, nightRoute, routeWeather } from '../src/lib/atlas.ts';
import { DISPATCH_FRAGMENTS, SEASON_LENGTH, nightDispatch, seasonNight, wordCount } from '../src/lib/dispatch.ts';

const stops = ['The Night Choir', 'The Candle Keep', 'The Long Bridge'];

function dispatch(day: number, lang: 'en' | 'nb' = 'en') {
  return nightDispatch({ day, weatherName: 'Quiet snow', stops, lang });
}

test('the season is ninety nights long and rolls into a second volume', () => {
  assert.equal(SEASON_LENGTH, 90);
  assert.deepEqual(seasonNight(1), { season: 1, night: 1 });
  assert.deepEqual(seasonNight(90), { season: 1, night: 90 });
  assert.deepEqual(seasonNight(91), { season: 2, night: 1 });
  assert.deepEqual(seasonNight(181), { season: 3, night: 1 });
});

test('the same night reads the same, twice and in both languages', () => {
  for (const day of [1, 2, 37, 90, 91, 500]) {
    const a = dispatch(day);
    const b = dispatch(day);
    assert.equal(a.body, b.body);
    assert.equal(a.title, b.title);
    assert.equal(a.voice, b.voice);
    assert.equal(a.season, seasonNight(day).season);
    assert.equal(a.night, seasonNight(day).night);

    const nb = dispatch(day, 'nb');
    assert.notEqual(nb.body, a.body);
    assert.ok(nb.body.length > 400);
  }
});

test('a dispatch is a full night’s read, not a caption', () => {
  let shortest = Infinity;
  let longest = 0;
  for (let day = 1; day <= SEASON_LENGTH; day++) {
    const count = wordCount(dispatch(day).body);
    shortest = Math.min(shortest, count);
    longest = Math.max(longest, count);
    assert.ok(count >= 110, `night ${day} is only ${count} words`);
    assert.ok(count <= 190, `night ${day} is ${count} words, too long`);
  }
  assert.ok(longest - shortest > 0);
  assert.ok(DISPATCH_FRAGMENTS >= 60, 'the season is written from enough authored fragments');
});

test('the dispatch names tonight’s first stop and the weather', () => {
  for (const day of [3, 17, 44]) {
    const text = nightDispatch({ day, weatherName: 'Long rain', stops, lang: 'en' }).body;
    assert.ok(text.includes('The Night Choir'), 'the first stop belongs in the dispatch');
    assert.ok(text.toLowerCase().includes('long rain'), 'the weather belongs in the dispatch');
    assert.ok(!text.includes('{stop}') && !text.includes('{weather}'), 'no placeholder survives');
  }
});

test('voices rotate night by night', () => {
  const voices = [1, 2, 3, 4, 5, 6].map((day) => dispatch(day).voice);
  assert.deepEqual(voices.slice(0, 3), ['keeper', 'walker', 'choir']);
  assert.deepEqual(voices.slice(3), voices.slice(0, 3));
});

test('the dispatches follow the road’s own weather', () => {
  for (const day of [1, 30, 89]) {
    const weather = routeWeather(day);
    const stop = nightRoute(day)[0];
    const text = nightDispatch({
      day,
      weatherName: weather.name,
      stops: [stop.placeName],
      lang: 'en',
    }).body;
    assert.ok(text.toLowerCase().includes(weather.name.toLowerCase()));
    assert.ok(text.includes(stop.placeName));
  }
  assert.ok(PLACES.length >= 13);
});
