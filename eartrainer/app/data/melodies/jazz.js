// Jazz standards, songbook tunes and Latin jazz: the opening phrase of each.
// Only tunes whose notes could be checked note by note are listed; copyrighted
// tunes are kept to their opening phrase.
export default [
  // Em: pickup 1 2 b3 to 6 (3rd of Am7), then 7 1 2 to 5 (3rd of Gmaj7).
  { id: 'autumn-leaves', title: 'Autumn Leaves', by: 'Joseph Kosma', cat: 'jazz', bpm: 120,
    notes: 'E4 F#4 G4 C5:4 r:1 D4 E4 F#4 B4:4' },
  // Am: 5 b3 5, then 4 b3 4 5 b3.
  { id: 'summertime', title: 'Summertime', by: 'George Gershwin', cat: 'jazz', bpm: 80,
    notes: 'E5:1.5 C5:0.5 E5:4 D5:0.5 C5:0.5 D5:1 E5:0.5 C5:1.5' },
  // F major: 9 7 7 6, twice.
  { id: 'girl-from-ipanema', title: 'The Girl from Ipanema', by: 'Antônio Carlos Jobim', cat: 'jazz', bpm: 130,
    notes: 'G4:1.5 E4:0.5 E4:1 D4:1 G4:1.5 E4:0.5 E4:1 D4:1' },
  // C major (Am7 Dm7 G7 Cmaj7): stepwise descent C B A G F, then G A C.
  { id: 'fly-me-to-the-moon', title: 'Fly Me to the Moon', by: 'Bart Howard', cat: 'jazz', bpm: 120,
    notes: 'C5:1.5 B4:0.5 A4:0.5 G4:1.5 F4:2 G4:0.5 A4:0.5 C5:1' },
  // Em: chromatic approaches D#-E, F#-G, then D# E F# G C B E G B, settling on Bb.
  { id: 'pink-panther', title: 'The Pink Panther Theme', by: 'Henry Mancini', cat: 'jazz', bpm: 110,
    notes: 'D#4:0.5 E4:1.5 r:1 F#4:0.5 G4:1.5 r:1 D#4:0.5 E4:0.5 F#4:0.5 G4:0.5 C5:0.5 B4:0.5 E4:0.5 G4:0.5 B4:0.5 Bb4:3' },
  // B major cycle: F# over Bmaj7, D over D7, B G over Gmaj7, Bb over Bb7, Eb over Ebmaj7.
  { id: 'giant-steps', title: 'Giant Steps', by: 'John Coltrane', cat: 'jazz', bpm: 160,
    notes: 'F#5:2 D5:2 B4:1 G4:1 Bb4:2 Eb5:4' },
  // The famous two-note head: the fifth repeated, then up to the root.
  { id: 'c-jam-blues', title: 'C Jam Blues', by: 'Duke Ellington', cat: 'jazz', bpm: 140,
    notes: 'G4:0.5 G4:0.5 G4:0.5 G4:0.5 G4:0.5 C5:2.5' },
  // Eb major: octave leap 1 8, then 7 5 6 7 8.
  { id: 'over-the-rainbow', title: 'Over the Rainbow', by: 'Harold Arlen', cat: 'jazz', bpm: 80,
    notes: 'Eb4:2 Eb5:2 D5:1 Bb4:0.5 C5:0.5 D5:1 Eb5:1' },
];
