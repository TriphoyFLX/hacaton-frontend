import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnhancedAiTags, enhanceAiLyricsPrompt } from './aiPromptEnhancer';

test('buildEnhancedAiTags includes live quality hints', () => {
  const tags = buildEnhancedAiTags({
    genre: 'Симфония',
    userTags: 'эпичный оркестр',
    mood: 'Эпичное',
    energy: 70,
    bpm: 90,
    trackType: 'instrumental',
    voice: 'Женский вокал',
    language: 'Русский',
    duration: 'Длинная',
  });

  assert.match(tags, /live instruments/i);
  assert.match(tags, /instrumental only/i);
});

test('enhanceAiLyricsPrompt is empty for instrumental tracks', () => {
  const text = enhanceAiLyricsPrompt('какой-то текст', 'instrumental');
  assert.equal(text, '');
});
