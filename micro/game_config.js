// Micro Zoom: the game dynamics worth tuning by hand, in one place.
//
// How to edit: change a number and save; nothing else needs to change. Keep
// the keys (the names before the colons) as they are, because the game asks
// for each value by key: 'mite.southWallSeconds' is the `southWallSeconds`
// line inside `mite` below. Every value says its unit in its name or in the
// comment beside it:
//   seconds, s      time
//   µm              micrometres (a box mite is ~350 µm long)
//   µm/s            speed
//   share 0..1      a fraction (0.25 = a quarter)
// A key you delete (or mistype) falls back to the game's own default, the
// value written here when this file was made, and the console says so once.
//
// The lookup helper is micro/game/shared/config.js (conf('mite.eatSeconds')),
// the same way the player-facing text in text_config.js is read through
// shared/text.js. Only the worlds listed here read this file so far; the
// others keep their numbers in their own code.
export const GAME = {

  // --------------------------------------------------------------------
  // Shared by every world that reads this file.
  shared: {
    // Creatures push each other instead of walking through each other: how
    // much of the push a body keeps as a slide after the contact, share 0..1
    // (0: they only part; higher: a shove carries on a little).
    pushCarry: 0.35,
  },

  // --------------------------------------------------------------------
  // World II: the box mite in the moss (micro/game/mite/).
  mite: {
    // ---- The walls: the moss is a corridor running "north" (straight up the
    // screen, the way the locked camera looks). Each wall is so many seconds
    // of walking away, at walkingSpeedForWallSeconds.
    walkingSpeedForWallSeconds: 878, // µm/s: the walk the seconds are counted at (the stick at full tilt)
    southWallSeconds: 10,            // s: from the start straight south (backwards) to the south wall
    sideWallSeconds: 10,             // s: from the straight route east or west to the side walls
    northWallSecondsPastPortal: 10,  // s: from the portal (the water) on north to the north wall

    // ---- Walking (µm/s). The stick runs from the slowest walk (a slight push)
    // to full tilt; the keyboard walks at keyboardWalkShare of that curve.
    walkSlowestSpeed: 418,
    walkFullTiltSpeed: 878,
    keyboardWalkShare: 0.65,         // share 0..1 of the stick's range the keys walk at (~610 µm/s)
    scrambleSpeed: 1493,             // B, held
    scrambleEmptySeconds: 1.6,       // s: a full scramble meter empties in this long
    scrambleRefillSeconds: 2.8,      // s: and refills in this long

    // ---- Jumping (A): distance on level ground from a standstill, µm.
    jumpTapDistance: 1000,           // a quick tap
    jumpFullChargeDistance: 2100,    // A held for the full charge
    jumpChargeSeconds: 0.45,         // s: how long A can be held to charge

    // ---- Eating (X near a springtail): one press grabs it and eating starts;
    // it goes on by itself, and every further press takes a bite out of it.
    eatSeconds: 3,                   // s: a meal with no further presses
    eatPressShare: 0.25,             // share 0..1 of the meal each further press eats
    eatWalkOffDistance: 140,         // µm: walking this far from where the meal began lets it wriggle free

    // ---- The jump attack (X as a jump comes down): the way to fight the
    // predatory mite, whose body stands too high for a bite from the ground.
    jumpAttackBeforeLandingSeconds: 0.25, // s: X this soon before touchdown counts (earlier in the air: the pounce dive)
    jumpAttackAfterLandingSeconds: 0.15,  // s: and this long after touchdown
    jumpAttackReach: 460,            // µm: from your body's centre to the predator's body or mouth
    jumpAttackInterest: 0.4,         // share 0..1 of the predator's interest each jump attack takes (3 drive it off)
    groundBiteReach: 110,            // µm over the moss under you that a bite from the ground reaches (the predator's belly stands ~130-155 µm up)

    // ---- The predatory mite, the three times you meet it (first, second, third).
    predatorHuntSpeeds: [760, 900, 1020],     // µm/s: how fast it runs you down
    predatorFeelDistances: [950, 1150, 1350], // µm: how far away it feels a hurrying mite
    predatorBlockInterest: 0.3,      // share 0..1 of its interest a blocked strike (Y) takes
    predatorFacingInterestPerSecond: 0.06, // share 0..1 per second: facing it close by wears it down

    // ---- Encounter spacing: seconds of moving over open moss before each.
    warmupSeconds: 4,                // before the first (the box-mite family)
    calmSeconds: 4.5,                // between encounters
    calmBeforeDropSeconds: 3,        // before a falling drop or the shower
    calmBeforePortalSeconds: 6,      // before the water and its guard
  },
};
