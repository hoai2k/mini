// Road West stop text (rt_west; merged into js/text_config.js when the open world is finished).
export default {
  places: {
    rt_lucky7: 'Lucky 7 Gas', rt_desertrose: 'The Desert Rose Motel', rt_olympuspalace: 'The Olympus Palace', rt_pyramid: 'The Pyramid',
    rt_lastgas: 'Last Gas', rt_drygulch: 'Dry Gulch', rt_drakon: 'See the Drakon!',
    rt_truckstop_la: "Mom's Diner", rt_la_letters: 'The Big Letters', rt_overpass: 'The Freeway Overpass',
    rt_sm_wreck: 'The Wreck of the Sea Biscuit',
  },
  people: {
    rt_vegas_valet: 'Sal the Valet',
    rt_la_guide: 'Trudy the Tour Guide',
    rt_sm_fisher: 'Grandma Mae',
  },
  champions: {
    rt_vegas_pitboss: { name: 'The Pit Boss' },
    rt_la_nighthound: { name: 'The Night Hound' },
    rt_sm_captain: { name: 'Captain Barnacle' },
  },
  rt: {
    signs: {
      // the roadside, everywhere
      gasPrice: 'GAS 4.99', vacancy: 'VACANCY',
      // Las Vegas
      lotusTag: 'NO CLOCKS · NO WINDOWS · NO WORRIES', bbLotus: 'THE LOTUS CASINO: NOBODY EVER WANTS TO LEAVE!',
      lucky7: 'LUCKY 7 GAS', gasPriceVegas: 'GAS 7.77 · ICE · JERKY', taxi: 'TAXI',
      chapel: 'LITTLE WHITE CHAPEL · OPEN 24 HRS', desertRose: 'DESERT ROSE MOTEL',
      olympusPalace: 'OLYMPUS PALACE · ZEUS-SIZED JACKPOTS', pyramid: 'THE PYRAMID', vegasExit: 'LOS ANGELES 270 →',
      // the desert drive
      laMiles: 'LOS ANGELES 268', leavingVegas: 'LEAVING LAS VEGAS · COME BACK SOON!',
      bbCrustys1: "CRUSTY'S WATER BED PALACE: ONE SIZE FITS ALL! (WE MAKE SURE)",
      bbHermes: 'HERMES EXPRESS: WE DELIVER ANYWHERE. EVEN THERE.',
      lastGas: 'LAST GAS', gasPriceDesert: 'LAST GAS FOR 100 MILES',
      wash: 'DIP · FLOODS', saloon: 'SALOON', store: 'GENERAL STORE', sheriff: 'SHERIFF', hotel: 'HOTEL', bank: 'BANK',
      dryGulch: 'DRY GULCH · POP. 0', drakonGate: 'DRAKON VIEWING $2 · DO NOT FEED',
      bbDrakon: 'SEE THE DRAKON! 100% FAKE. PROBABLY. NEXT EXIT',
      bbHercules: "HERCULES' TIRES: TWELVE LABOURS, ONE LOW PRICE",
      bbCrustys2: "CRUSTY'S WATER BEDS · 5 MILES · STAY THE NIGHT!",
      bbSoda: 'ICE COLD SODA · 40 MILES (WARM SODA · 39 MILES)',
      // Los Angeles
      momsDiner: "MOM'S DINER · PIE", truckersWelcome: 'TRUCKERS WELCOME', laMilesNear: 'LOS ANGELES 12',
      freeway: 'SANTA MONICA · BEACHES →',
      shopBurgers: 'UNDERWORLD BURGERS', shopPets: 'CERBERUS PET SUPPLY · BIG CHEW TOYS',
      shopMaps: "STAR MAPS · SEE WHERE THE STARS LIVE", shopSurf: 'STYX & STONES SURF',
      sunsetPalms: 'SUNSET PALMS MOTEL', starTours: 'STAR TOURS · HOMES OF THE STARS', driveIn: 'DRIVE-IN · SHAKES',
      // Santa Monica
      coaster: 'THE SEA SERPENT', arcade: 'PLAYLAND ARCADE', route66: 'ROUTE 66 · END OF THE TRAIL',
      yachtHarbor: 'SANTA MONICA · YACHT HARBOR · SPORT FISHING · BOATING · CAFES',
      surfShack: 'SURF SHACK', sodaFountain: 'SEASHELL SODA FOUNTAIN', oceanHotel: 'OCEAN VIEW HOTEL',
      endOfRoad: 'END OF THE ROAD · PACIFIC OCEAN',
    },
  },
  sq: {
    // ---------------------------------------------------------------- Las Vegas: Sal the valet
    rt_vegas_valet_keys: {
      title: 'Lost Key Tags',
      offer: [
        'Psst. Hey. You look like you can keep a secret. And find stuff.',
        'I park cars for the Lotus. Last night a big gust of wind (with wings) blew my key tags all over the Strip.',
        'Four of them. If the bosses find out, I’m parking golf carts in Reno. Help a guy out?',
      ],
      steps: ['Find Sal’s key tags on the Strip ({n}/{count})', 'Bring the key tags back to Sal'],
      thanks: ['All four! You’re a lifesaver, kid.', 'Here, a little something. Don’t spend it in there. Seriously. Don’t go in there.'],
    },
    rt_vegas_valet_lot: {
      title: 'Trouble in the Parking Lot',
      offer: [
        'So, uh, about that wind. It wasn’t wind.',
        'There are ladies in the parking lot with one bronze leg and one donkey leg. They keep asking people for "a little bite".',
        'Clear out the lot by the zoo truck, and get rid of five of those empousai. I’ll wash your chariot for free. Forever.',
      ],
      steps: ['Clear the monsters from the parking lot', 'Defeat empousai in Las Vegas ({n}/{count})', 'Tell Sal the lot is safe'],
      thanks: ['They’re gone? You’re telling me they’re actually gone?', 'Kid, you’re the best tip I ever got.'],
    },
    rt_vegas_valet_boss: {
      title: 'The Pit Boss',
      offer: [
        'One more thing. The lady who runs those empousai calls herself the Pit Boss. She hangs out behind the Pyramid.',
        'She says the house always wins. I say the house never met you.',
        'Beat her, then check inside the Pyramid. Rumour says she hid her winnings in there.',
      ],
      steps: ['Defeat the Pit Boss behind the Pyramid', 'Find the chest inside the Pyramid', 'Go back to Sal'],
      thanks: ['The house LOST! Ha! Wait till the guys hear about this.', 'Take this. And kid? When you leave Vegas, don’t look back. Just drive.'],
    },
    // ---------------------------------------------------------------- Los Angeles: Trudy the tour guide
    rt_la_guide_maps: {
      title: 'Star Maps',
      offer: [
        'Welcome to Los Angeles! Home of the stars! Would you like a tour? No? Nobody wants a tour.',
        'Well, I can’t give one anyway. Something with big teeth knocked over my rack and my star maps blew all over town.',
        'Find four of them for me? One went up the hill by the big letters. Of course it did.',
      ],
      steps: ['Find Trudy’s star maps ({n}/{count})', 'Bring the maps back to Trudy'],
      thanks: ['My maps! Now I can show people where the stars live!', 'Between you and me, half of them live in the same three houses.'],
    },
    rt_la_guide_hills: {
      title: 'Up by the Letters',
      offer: [
        'Okay, weird question. Do you believe in ghosts?',
        'Because my tour bus goes up by the big letters on the hill, and lately there are things up there. See-through things. Moaning things.',
        'Go take a look and chase them off? I’ll give you the VIP tour. It’s the same tour, but you get a hat.',
      ],
      steps: ['Climb up to the big letters', 'Clear the ghosts on the hill', 'Tell Trudy the hill is safe'],
      thanks: ['You actually went up there? With the ghosts? Brave kid.', 'Here, VIP hat not included. We ran out of hats.'],
    },
    rt_la_guide_hound: {
      title: 'The Night Hound',
      offer: [
        'Last thing, I promise. Remember the thing with big teeth that wrecked my rack?',
        'It lives in the alley behind the shops. Big as a car. Black as a car. Growls like a car with a bad engine.',
        'The shop owners say it guards a chest back there. Beat the hound and the chest is yours!',
      ],
      steps: ['Defeat the Night Hound in the alley', 'Open the chest in the alley', 'Go back to Trudy'],
      thanks: ['You beat it! The whole street is cheering. Well, the burger guy is cheering.', 'Here. And if you ever need a tour of the Underworld... no, never mind. Nobody needs that.'],
    },
    // ---------------------------------------------------------------- Santa Monica: Grandma Mae
    rt_sm_fisher_lures: {
      title: 'Lucky Lures',
      offer: [
        'Hello, dear. Sixty years I’ve fished off this pier, and I’ve never lost a single lure.',
        'Then this morning a bird with a lady’s face snatched my tackle box and dropped it all over the beach.',
        'Four lucky lures. They’re shiny. You can’t miss them. Well, I did, but my eyes aren’t what they were.',
      ],
      steps: ['Find Grandma Mae’s lures on the beach ({n}/{count})', 'Bring the lures back to Grandma Mae'],
      thanks: ['Oh, my lucky lures! You’re a treasure.', 'Here, take this. And take a cookie. You’re too skinny for a hero.'],
    },
    rt_sm_fisher_harpies: {
      title: 'Bird Trouble',
      offer: [
        'Those birds are back. Harpies, my late husband called them. He was a funny man. Also very good with a harpoon.',
        'They’ve made a nest by the old wreck on the north beach and they steal every fish I catch.',
        'Shoo off six of them and clear out their nest, would you, dear?',
      ],
      steps: ['Defeat harpies at Santa Monica ({n}/{count})', 'Clear the nest by the wreck', 'Tell Grandma Mae'],
      thanks: ['Listen to that. Quiet. Just the waves.', 'A fish just bit. A fish just BIT! Here, dear, for your trouble.'],
    },
    rt_sm_fisher_captain: {
      title: 'Captain Barnacle',
      offer: [
        'One more story, dear. That wreck is the Sea Biscuit. She sank in a storm when I was a little girl.',
        'Her captain never left her. He’s all bones now, and grumpy about it, and he guards the old ship’s chest.',
        'Lay him to rest and open his chest. He always said he’d share his treasure with somebody brave.',
      ],
      steps: ['Defeat Captain Barnacle by the wreck', 'Open the chest inside the wreck', 'Go back to Grandma Mae'],
      thanks: ['So he’s finally at peace. Good. He owed me a dollar.', 'You’ve gone a long way, haven’t you? All the way from the other ocean. Go on home now, dear.'],
    },
  },
};
