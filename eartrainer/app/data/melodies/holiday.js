// Holiday songs: Christmas carols, hymns, seasonal and celebration songs.
// Only tunes whose notes could be checked degree by degree are included;
// the few 20th-century seasonal songs are short opening hooks only.
export default [
  // --- Christmas carols ---
  { id: 'hol-jingle-bells', title: 'Jingle Bells', by: 'James Lord Pierpont', cat: 'holiday', bpm: 120, notes: 'B4 B4 B4:2 B4 B4 B4:2 B4 D5 G4:1.5 A4:0.5 B4:4' },
  { id: 'hol-jingle-bells-oh-what-fun', title: 'Jingle Bells (Oh, What Fun It Is to Ride)', by: 'James Lord Pierpont', cat: 'holiday', bpm: 120, notes: 'C5 C5 C5:1.5 C5:0.5 C5 B4 B4 B4:0.5 B4:0.5 B4 A4 A4 B4 A4:2 D5:2' },
  { id: 'hol-jingle-bells-dashing', title: 'Jingle Bells (Dashing Through the Snow)', by: 'James Lord Pierpont', cat: 'holiday', bpm: 120, notes: 'G3 E4 D4 C4 G3:3 G3:0.5 G3:0.5 G3 E4 D4 C4 A3:3' },
  { id: 'hol-silent-night', title: 'Silent Night', by: 'Franz Xaver Gruber', cat: 'holiday', bpm: 150, notes: 'F4:1.5 G4:0.5 F4 D4:3 F4:1.5 G4:0.5 F4 D4:3 C5:2 C5 A4:3 Bb4:2 Bb4 F4:3' },
  { id: 'hol-silent-night-round-yon-virgin', title: 'Silent Night (Round Yon Virgin)', by: 'Franz Xaver Gruber', cat: 'holiday', bpm: 150, notes: 'A4:2 A4 C5:1.5 B4:0.5 A4 G4:1.5 A4:0.5 G4 E4:3' },
  { id: 'hol-joy-to-the-world', title: 'Joy to the World', by: 'Lowell Mason (after Handel)', cat: 'holiday', bpm: 190, notes: 'D5:2 C#5:1.5 B4:0.5 A4:3 G4 F#4:2 E4:2 D4:3 A4 B4:2 B4 C#5:2 C#5 D5:3' },
  { id: 'hol-deck-the-halls', title: 'Deck the Halls', by: 'Traditional (Welsh)', cat: 'holiday', bpm: 120, notes: 'C5:1.5 Bb4:0.5 A4 G4 F4 G4 A4 F4 G4:0.5 A4:0.5 Bb4:0.5 G4:0.5 A4:1.5' },
  { id: 'hol-we-wish-you-a-merry-christmas', title: 'We Wish You a Merry Christmas', by: 'Traditional (English)', cat: 'holiday', bpm: 120, notes: 'D4 G4 G4:0.5 A4:0.5 G4:0.5 F#4:0.5 E4 E4 E4 A4 A4:0.5 B4:0.5 A4:0.5 G4:0.5 F#4 D4' },
  { id: 'hol-we-wish-you-happy-new-year', title: 'We Wish You a Merry Christmas (And a Happy New Year)', by: 'Traditional (English)', cat: 'holiday', bpm: 120, notes: 'D4 B4 B4:0.5 C5:0.5 B4:0.5 A4:0.5 G4 E4 D4:0.5 D4:0.5 E4 A4 F#4 G4:2' },
  { id: 'hol-o-christmas-tree', title: 'O Christmas Tree (O Tannenbaum)', by: 'Traditional (German)', cat: 'holiday', bpm: 90, notes: 'D4 G4:0.75 G4:0.25 G4:1.5 A4:0.5 B4:0.75 B4:0.25 B4:1.5 B4:0.5 A4:0.5 B4:0.5 C5 F#4 A4 G4:2' },
  { id: 'hol-hark-the-herald', title: 'Hark! The Herald Angels Sing', by: 'Felix Mendelssohn', cat: 'holiday', bpm: 100, notes: 'D4 G4 G4:1.5 F#4:0.5 G4 B4 B4 A4:2 D5 D5 D5:1.5 C5:0.5 B4 A4 B4:2' },
  { id: 'hol-o-come-all-ye-faithful', title: 'O Come, All Ye Faithful (Adeste Fideles)', by: 'John Francis Wade', cat: 'holiday', bpm: 90, notes: 'G4 G4:2 D4 G4 A4:2 D4:2 B4 A4 B4 C5 B4:2 A4:2' },
  { id: 'hol-good-king-wenceslas', title: 'Good King Wenceslas', by: 'Traditional (Piae Cantiones)', cat: 'holiday', bpm: 110, notes: 'G4 G4 G4 A4 G4 G4 D4:2 E4 D4 E4 F#4 G4:2 G4:2' },
  { id: 'hol-the-first-noel', title: 'The First Noel', by: 'Traditional (English carol)', cat: 'holiday', bpm: 100, notes: 'F#4:0.5 E4:0.5 D4:1.5 E4:0.5 F#4 G4 A4:2 B4:0.5 C#5:0.5 D5 C#5 B4 A4:2' },
  { id: 'hol-god-rest-ye-merry-gentlemen', title: 'God Rest Ye Merry, Gentlemen', by: 'Traditional (English carol)', cat: 'holiday', bpm: 110, notes: 'E4 E4 B4 B4 A4 G4 F#4 E4 D4 E4 F#4 G4 A4 B4:3' },
  { id: 'hol-we-three-kings', title: 'We Three Kings', by: 'John Henry Hopkins Jr.', cat: 'holiday', bpm: 170, notes: 'B4:2 A4 G4:2 E4 F#4 G4 F#4 E4:3' },
  { id: 'hol-carol-of-the-bells', title: 'Carol of the Bells (Shchedryk)', by: 'Mykola Leontovych', cat: 'holiday', bpm: 110, notes: 'Bb4 A4:0.5 Bb4:0.5 G4 Bb4 A4:0.5 Bb4:0.5 G4 Bb4 A4:0.5 Bb4:0.5 G4' },
  { id: 'hol-jolly-old-st-nicholas', title: 'Jolly Old St. Nicholas', by: 'Traditional (American)', cat: 'holiday', bpm: 110, notes: 'B4 B4 B4 B4 A4 A4 A4:2 G4 G4 G4 G4 B4:4' },
  { id: 'hol-twelve-days-of-christmas', title: 'The Twelve Days of Christmas', by: 'Traditional (English)', cat: 'holiday', bpm: 110, notes: 'C4:0.5 C4:0.5 C4 F4:0.5 F4:0.5 F4 E4:0.5 F4:0.5 G4:0.5 A4:0.5 Bb4:0.5 G4:0.5 A4:2' },
  { id: 'hol-twelve-days-partridge', title: 'The Twelve Days of Christmas (A Partridge in a Pear Tree)', by: 'Traditional (English)', cat: 'holiday', bpm: 110, notes: 'C5 D5:0.5 Bb4:0.5 A4:0.5 F4:0.5 G4 F4:2' },

  // --- Hymns ---
  { id: 'hol-holy-holy-holy', title: 'Holy, Holy, Holy', by: 'John Bacchus Dykes', cat: 'holiday', bpm: 80, notes: 'D4 D4 F#4 F#4 A4:2 A4:2' },
  { id: 'hol-abide-with-me', title: 'Abide with Me', by: 'William Henry Monk', cat: 'holiday', bpm: 72, notes: 'G4:2 G4 F4 Eb4:2 Bb4:2 C5 Bb4 Bb4 Ab4 G4:4' },

  // --- Celebrations ---
  { id: 'hol-for-hes-a-jolly-good-fellow', title: 'For He\'s a Jolly Good Fellow', by: 'Traditional (French)', cat: 'holiday', bpm: 130, notes: 'C4:0.5 E4 E4:0.5 E4 D4:0.5 E4 F4:0.5 E4:1.5 E4:0.5 D4 D4:0.5 D4 C4:0.5 D4 E4:0.5 C4:1.5' },

  // --- 20th-century seasonal hooks (opening only) ---
  { id: 'hol-rudolph', title: 'Rudolph the Red-Nosed Reindeer', by: 'Johnny Marks', cat: 'holiday', bpm: 120, notes: 'G4 A4:0.5 G4 E4:0.5 C5 A4 G4:3' },
  { id: 'hol-frosty-the-snowman', title: 'Frosty the Snowman', by: 'Steve Nelson & Jack Rollins', cat: 'holiday', bpm: 120, notes: 'G4:2 E4:1.5 F4:0.5 G4 C5:2' },
  { id: 'hol-santa-claus-is-comin', title: 'Santa Claus Is Comin\' to Town', by: 'J. Fred Coots', cat: 'holiday', bpm: 120, notes: 'G4:0.5 E4:0.5 F4:0.5 G4 G4:1.5' },
  { id: 'hol-white-christmas', title: 'White Christmas', by: 'Irving Berlin', cat: 'holiday', bpm: 80, notes: 'E4:2 F4 E4 D#4 E4 F4:2 F#4 G4:3' },
];
