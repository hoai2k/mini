// Jazz and blues vocabulary: idiomatic phrases that are not songs, ordered from
// easy (3-5 notes) to hard (12-16 notes, chromatic).
const J = 'Jazz vocabulary';
const B = 'Blues vocabulary';
const lick = (id, title, by, bpm, notes) => ({ id: `lick-${id}`, title, by, cat: 'licks', bpm, notes });

export default [
  // --- Easy: 3-5 notes ---
  lick('blue-third-to-root', 'Blue third slide to the root (C)', B, 90, 'Eb4:0.5 E4:0.5 C4:2'),
  lick('enclosure-root', 'Bebop enclosure to the root (C)', J, 100, 'D4:0.5 B3:0.5 C4:2'),
  lick('enclosure-third', 'Bebop enclosure to the 3rd (C)', J, 100, 'F4:0.5 D#4:0.5 E4:2'),
  lick('enclosure-fifth', 'Bebop enclosure to the 5th (C)', J, 100, 'A4:0.5 F#4:0.5 G4:2'),
  lick('coltrane-1235', 'Coltrane 1-2-3-5 cell (C)', J, 100, 'C4:0.5 D4:0.5 E4:0.5 G4:1.5'),
  lick('maj7-arpeggio', 'Cmaj7 arpeggio', J, 90, 'C4 E4 G4 B4:2'),
  lick('m7-arpeggio', 'Cm7 arpeggio', J, 90, 'C4 Eb4 G4 Bb4:2'),
  lick('dom7-arpeggio', 'C7 arpeggio', J, 90, 'C4 E4 G4 Bb4:2'),
  lick('m7b5-arpeggio', 'Bm7b5 (half-diminished) arpeggio', J, 90, 'B3 D4 F4 A4:2'),
  lick('dim7-arpeggio', 'Bdim7 arpeggio', J, 90, 'B3 D4 F4 Ab4:2'),
  lick('augmented-arpeggio', 'C augmented arpeggio', J, 90, 'C4 E4 G#4 C5:2'),
  lick('maj9-from-the-third', 'Em7 over C: Cmaj9 from the 3rd', J, 100, 'E4:0.5 G4:0.5 B4:0.5 D5:1.5'),
  lick('bebop-turn', 'Bebop turn around the root (C)', J, 110, 'C5:0.5 D5:0.5 C5:0.5 B4:0.5 C5:2'),
  lick('blue-fifth-slide', 'Blue-fifth slide, down to the minor 3rd and root (C)', B, 90, 'F4:0.5 Gb4:0.5 G4:1 Eb4:1 C4:2'),
  lick('blues-scale-down-g', 'Blues scale down from the 5th (G)', B, 100, 'D5:0.5 Db5:0.5 C5:0.5 Bb4:0.5 G4:2'),

  // --- Medium: 6-9 notes ---
  lick('guide-tones-ii-v-i', 'Guide tones through ii–V–I in C (3rds and 7ths)', J, 80, 'F4 C5 B4 F4 E4:2 B4:2'),
  lick('minor-pentatonic-a', 'A minor pentatonic up', B, 100, 'A3:0.5 C4:0.5 D4:0.5 E4:0.5 G4:0.5 A4:1.5'),
  lick('blues-turnaround-chromatic', 'Blues turnaround: root down chromatically to the 5th (C)', B, 90, 'C5 B4 Bb4 A4 Ab4 G4:2'),
  lick('lydian-descent', 'Lydian line on Cmaj7#11', J, 100, 'C5:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 E4:1.5'),
  lick('the-lick-d-minor', 'The Lick (in D minor)', J, 120, 'D4:0.5 E4:0.5 F4:0.5 G4:0.5 E4:1 C4:0.5 D4:1.5'),
  lick('the-lick-g-minor', 'The Lick (in G minor)', J, 120, 'G4:0.5 A4:0.5 Bb4:0.5 C5:0.5 A4:1 F4:0.5 G4:1.5'),
  lick('the-lick-c-major', 'The Lick, major version (C)', J, 120, 'C4:0.5 D4:0.5 E4:0.5 F4:0.5 D4:1 B3:0.5 C4:1.5'),
  lick('blues-call-response', 'Blues call and response (C)', B, 90, 'G4:0.5 Bb4:0.5 C5:2 r:1 Eb5:0.5 C5:0.5 Bb4:0.5 G4:2.5'),
  lick('blues-scale-up-c', 'C blues scale up', B, 100, 'C4:0.5 Eb4:0.5 F4:0.5 F#4:0.5 G4:0.5 Bb4:0.5 C5:2'),
  lick('major-blues-c', 'Major blues scale lick (C)', B, 100, 'C4:0.5 D4:0.5 Eb4:0.5 E4:0.5 G4:0.5 A4:0.5 C5:2'),
  lick('gospel-pentatonic-fill', 'Gospel major-pentatonic fill (C)', B, 90, 'G4:0.5 A4:0.5 C5:0.5 D5:0.5 C5:0.5 A4:0.5 C5:2'),
  lick('whole-tone-scale', 'Whole-tone scale up (C)', J, 100, 'C4:0.5 D4:0.5 E4:0.5 F#4:0.5 G#4:0.5 Bb4:0.5 C5:2'),
  lick('fourths-d-dorian', 'Stacked fourths up and back (D Dorian)', J, 100, 'D4 G4 C5 F5 C5 G4 D4:2'),
  lick('tritone-sub', 'Tritone substitute: Db7 arpeggio resolving to C', J, 100, 'Db4:0.5 F4:0.5 Ab4:0.5 Cb5:0.5 C5:2'),
  lick('g7b9-dim-resolve', 'G7b9 as Bdim7, resolving to C', J, 110, 'B4:0.5 D5:0.5 F5:0.5 Ab5:0.5 G5:0.5 E5:0.5 C5:2'),
  lick('boogie-bass-c', 'Boogie-woogie bass (C)', B, 120, 'C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5'),
  lick('boogie-right-hand', 'Boogie-woogie right-hand riff (C6)', B, 120, 'Eb4:0.25 E4:0.75 G4:0.5 A4:0.5 C5:1 A4:0.5 G4:0.5 E4:1'),
  lick('walking-bass-f7-bb7', 'Walking bass: F7 to Bb7 arpeggios', J, 120, 'F2 A2 C3 Eb3 Bb2 D3 F3 Ab3'),
  lick('chromatic-approach-cmaj7', 'Chromatic approach from below to each note of Cmaj7', J, 100, 'B3:0.5 C4:1 D#4:0.5 E4:1 F#4:0.5 G4:1 A#4:0.5 B4:2'),
  lick('altered-g7', 'Altered scale on G7, resolving to the 3rd of C', J, 110, 'G4:0.5 Ab4:0.5 Bb4:0.5 B4:0.5 Db5:0.5 Eb5:0.5 F5:0.5 E5:2'),
  lick('ii-v-i-c-arpeggios', 'ii–V–I in C: Dm7 arpeggio to G7 to Cmaj7', J, 120, 'D4:0.5 F4:0.5 A4:0.5 C5:0.5 B4:0.5 G4:0.5 F4:0.5 D4:0.5 E4:2'),
  lick('ii-v-i-f-arpeggios', 'ii–V–I in F: Gm7 arpeggio to C7 to Fmaj7', J, 120, 'G4:0.5 Bb4:0.5 D5:0.5 F5:0.5 E5:0.5 C5:0.5 Bb4:0.5 G4:0.5 A4:2'),
  lick('minor-ii-v-i-d', 'Minor ii–V–i in D: Em7b5 to A7b9 to Dm', J, 110, 'E4:0.5 G4:0.5 Bb4:0.5 D5:0.5 C#5:0.5 Bb4:0.5 G4:0.5 E4:0.5 F4:2'),
  lick('minor-ii-v-i-c', 'Minor ii–V–i in C: Dm7b5 to G7b9 to Cm', J, 110, 'D4:0.5 F4:0.5 Ab4:0.5 C5:0.5 B4:0.5 Ab4:0.5 F4:0.5 D4:0.5 Eb4:2'),
  lick('bebop-dominant-down', 'Dominant bebop scale down from G (G7)', J, 130, 'G5:0.5 F#5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:2'),
  lick('bebop-major-down', 'Major bebop scale down from C', J, 130, 'C5:0.5 B4:0.5 A4:0.5 Ab4:0.5 G4:0.5 F4:0.5 E4:0.5 D4:0.5 C4:2'),
  lick('diminished-scale-g7', 'Half-whole diminished scale on G7', J, 120, 'G4:0.5 Ab4:0.5 Bb4:0.5 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 F5:0.5 G5:2'),

  // --- Hard: 11-16 notes, chromatic ---
  lick('major-pentatonic-up-down', 'C major pentatonic up and back down', J, 120, 'C4:0.5 D4:0.5 E4:0.5 G4:0.5 A4:0.5 C5:0.5 A4:0.5 G4:0.5 E4:0.5 D4:0.5 C4:2'),
  lick('pentatonic-threes-a-minor', 'A minor pentatonic down in groups of three', B, 110, 'E5:0.5 D5:0.5 C5:0.5 D5:0.5 C5:0.5 A4:0.5 C5:0.5 A4:0.5 G4:0.5 A4:0.5 G4:0.5 E4:1.5'),
  lick('coltrane-ii-v-i', 'Coltrane 1-2-3-5 cells through ii–V–I in C', J, 120, 'D4:0.5 E4:0.5 F4:0.5 A4:0.5 G3:0.5 A3:0.5 B3:0.5 D4:0.5 C4:0.5 D4:0.5 E4:0.5 G4:1.5'),
  lick('enclosure-chain-cmaj7', 'Enclosure chain on Cmaj7: root, 3rd, 5th, 7th', J, 110, 'D4:0.5 B3:0.5 C4:1 F4:0.5 D#4:0.5 E4:1 A4:0.5 F#4:0.5 G4:1 C5:0.5 A#4:0.5 B4:2'),
  lick('bebop-g7-enclosure-to-c', 'G7 bebop line with an enclosure into the 3rd of C', J, 140, 'G5:0.5 F#5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F4:0.5 D#4:0.5 E4:2'),
  lick('blues-scale-a-up-down', 'A blues scale up and down', B, 120, 'A3:0.5 C4:0.5 D4:0.5 Eb4:0.5 E4:0.5 G4:0.5 A4:1 G4:0.5 E4:0.5 Eb4:0.5 D4:0.5 C4:0.5 A3:2'),
  lick('chromatic-octave-down-g', 'Chromatic run down an octave (G)', J, 130, 'G5:0.5 F#5:0.5 F5:0.5 E5:0.5 Eb5:0.5 D5:0.5 Db5:0.5 C5:0.5 B4:0.5 Bb4:0.5 A4:0.5 Ab4:0.5 G4:2'),
  lick('bebop-ii-v-i-f', 'Bebop ii–V–I in F with a chromatic descent and enclosure', J, 140, 'G4:0.5 A4:0.5 Bb4:0.5 D5:0.5 F5:0.5 E5:0.5 Eb5:0.5 D5:0.5 C5:0.5 Bb4:0.5 A4:0.5 G4:0.5 Bb4:0.5 G#4:0.5 A4:2'),
  lick('turnaround-arpeggios-c', 'I–VI–ii–V turnaround arpeggios: Cmaj7, A7, Dm7, G7', J, 130, 'C4:0.5 E4:0.5 G4:0.5 B4:0.5 A4:0.5 G4:0.5 E4:0.5 C#4:0.5 D4:0.5 F4:0.5 A4:0.5 C5:0.5 B4:0.5 G4:0.5 F4:0.5 D4:0.5'),
];
