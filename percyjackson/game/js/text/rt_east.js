// Road West stop text (rt_east; merged into js/text_config.js when the open world is finished).
// The eastern half of the road: the Turnpike, Aunty Em's, St. Louis and Denver.
export default {
  places: {
    rt_tollplaza: 'Turnpike Toll Plaza', rt_drachmainn: 'The Drachma Inn',
    rt_petesgas: 'Pete’s Last Gas', rt_pruittfarm: 'The Pruitt Farm',
    rt_grandhotel: 'The Gateway Grand Hotel', rt_ravioli: 'Tony’s Toasted Ravioli', rt_ballpark: 'River City Ballpark',
    rt_railyard: 'The Rail Yard', rt_gatewaymotel: 'The Gateway Motel',
    rt_tunneloflove: 'The Tunnel of Love', rt_milehigh: 'The Mile High Motor Lodge', rt_mountainpass: 'Mountain Pass Truck Stop',
  },
  people: {
    rt_turnpike_earl: 'Big Earl, Trucker',
    rt_auntyem_pruitt: 'Mrs. Pruitt',
    rt_stlouis_mae: 'Ranger Mae',
    rt_denver_chad: 'Chad, Ex-Lifeguard',
  },
  champions: {
    rt_turnpike_diesel: { name: 'Diesel, the Turnpike Hound' },
    rt_auntyem_hissy: { name: 'Hissy Lou, Queen of the Corn' },
    rt_stlouis_widow: { name: 'Old Silk, the Rail Yard Widow' },
    rt_denver_rigor: { name: 'Captain Rigor, Skeleton Lifeguard' },
  },
  sq: {
    // ---------------- the Turnpike: Big Earl
    rt_turnpike_chickens: {
      title: 'Lost Load',
      offer: [
        'Kid, you would not believe my morning. Bird-ladies. Big ugly ones. They tore the back off my trailer like it was a bag of chips.',
        'I was hauling rubber chickens. Five crates. Don’t ask who orders that many rubber chickens. A guy in a cave, apparently.',
        'They dropped them all over the Turnpike. Find five for me? They squeak, so you’ll hear them.',
      ],
      steps: ['Find Earl’s rubber chickens: {n}/{count}', 'Bring the chickens back to Big Earl'],
      thanks: [
        'Squeak! Ha! That’s the sound of me getting paid.',
        'Here. Buy yourself a milkshake. Buy two. You look like you’re walking to California.',
      ],
    },
    rt_turnpike_nest: {
      title: 'Bird Ladies',
      offer: [
        'Those bird-ladies built a nest in the woods north of the road. Right behind a billboard. Who builds a nest behind a billboard?',
        'And there are little red-eyed dogs chewing the tyres off every rig in the lot. Every. Single. Rig.',
        'Clear out that nest, and chase off a few of those puppies while you’re at it.',
      ],
      steps: ['Clear out the harpy nest behind the billboard', 'Chase off hellhound pups on the Turnpike: {n}/{count}', 'Tell Big Earl the lot is safe'],
      thanks: [
        'Quiet. Real quiet. I almost miss the squawking. Almost.',
        'You’re all right, kid. Take this. It’s the good kind of souvenir: the kind that’s sharp.',
      ],
    },
    rt_turnpike_diesel: {
      title: 'Diesel',
      offer: [
        'One more thing, and then I’ll let you go. There’s a dog. A big one. Bigger than my cab.',
        'Truckers call him Diesel. He sleeps in the woods behind the toll plaza and he eats exhaust pipes for breakfast.',
        'Go past the toll plaza, find his clearing, and… do whatever it is you kids do. With the swords.',
      ],
      steps: ['Go to the toll plaza', 'Beat Diesel, the Turnpike Hound', 'Tell Big Earl the road is clear'],
      thanks: [
        'You beat Diesel? With that little sword? Remind me never to cut you off in traffic.',
        'Take this. I found it in his clearing years ago. It hums. I don’t like things that hum.',
      ],
    },
    // ---------------- Aunty Em's: Mrs. Pruitt
    rt_auntyem_gnomes: {
      title: 'Gnome Sweet Gnome',
      offer: [
        'Oh, dearie, you look like you have good young eyes. My garden gnomes have gone walking again.',
        'Every night they wander off towards that Emporium down the road. I don’t like that place. Everyone who goes in comes out… heavier.',
        'Five gnomes. Red hats, blue hats, one with a fishing rod. Fetch them home before they get any ideas?',
      ],
      steps: ['Find Mrs. Pruitt’s gnomes: {n}/{count}', 'Bring the gnomes home to Mrs. Pruitt'],
      thanks: [
        'There they are, my little rascals. Look at their faces. They look relieved.',
        'Take this for your trouble. And don’t eat the burgers at Aunty Em’s. Nobody ever finishes one.',
      ],
    },
    rt_auntyem_barn: {
      title: 'Something in the Barn',
      offer: [
        'Now there’s something in my barn. Lots of legs. Too many legs. My cow has gone to live with the neighbours.',
        'Clear the barn out for me, and squash a few of those leggy things while you’re about it.',
      ],
      steps: ['Clear the monsters out of the red barn', 'Beat spiders round Aunty Em’s: {n}/{count}', 'Tell Mrs. Pruitt the barn is safe'],
      thanks: [
        'Oh, well done! Daisy can come home. She’ll be so pleased. She doesn’t show it. She’s a cow.',
        'Here: I found this in the hayloft years ago. I always knew it was waiting for somebody.',
      ],
    },
    rt_auntyem_corn: {
      title: 'Hissy Lou',
      offer: [
        'Last thing, dearie, and it’s a big one. Something hisses in my corn.',
        'It has a woman’s face and two snakes where legs ought to be, and it calls itself the Queen of the Corn. My corn!',
        'Go into the field and send her packing. Mind the stalks. They’re very nearly ready.',
      ],
      steps: ['Go into the corn field', 'Beat Hissy Lou, Queen of the Corn', 'Go back to Mrs. Pruitt'],
      thanks: [
        'Queen of the Corn, my foot. You showed her.',
        'Take this, and a bag of corn for the road. It’s a long way to anywhere from here.',
      ],
    },
    // ---------------- St. Louis: Ranger Mae
    rt_stlouis_birds: {
      title: 'Bird Brains',
      offer: [
        'Welcome to the Gateway Arch! Six hundred and thirty feet of stainless steel. Please don’t climb it. People keep trying.',
        'We have a bird problem. Bronze birds. They peck the Arch and it goes “bonnnng”. All. Day. Long.',
        'Chase six of them out of St. Louis and I’ll find you something nicer than a souvenir keychain.',
      ],
      steps: ['Beat Stymphalian birds in St. Louis: {n}/{count}', 'Tell Ranger Mae the birds are gone'],
      thanks: [
        'Listen. No bonnnng. Beautiful.',
        'Here you go. It isn’t a keychain. I promise. Okay, there’s a keychain too.',
      ],
    },
    rt_stlouis_tickets: {
      title: 'Ticket to Ride',
      offer: [
        'Next problem: the wind blew away a stack of tram tickets. The trams are the little egg-shaped cars that go up the legs.',
        'Four tickets. I saw them fly towards the rail yard, the ballpark, the alleys downtown and the ponds in the park.',
      ],
      steps: ['Find the tram tickets: {n}/{count}', 'Bring the tickets back to Ranger Mae'],
      thanks: [
        'All four! Not even creased. You should be a ranger.',
        'Take this. And keep one ticket. You never know when you’ll need to get somewhere high up in a hurry.',
      ],
    },
    rt_stlouis_widow: {
      title: 'The Rail Yard Widow',
      offer: [
        'The night guard at the rail yard quit. He says there’s a spider down there the size of a boxcar. He says she knits.',
        'I don’t believe him. But I also don’t want to go and look.',
        'Clear the rail yard for me, and if there really is a big one, deal with her.',
      ],
      steps: ['Clear the monsters out of the rail yard', 'Beat Old Silk, the Rail Yard Widow', 'Go back to Ranger Mae'],
      thanks: [
        'She was real? And she knitted? I owe that guard an apology. And a sweater, probably.',
        'Here: the best thing in the lost-and-found. It has been waiting for a hero for a very long time.',
      ],
    },
    // ---------------- Denver: Chad
    rt_denver_floaties: {
      title: 'Floatie Patrol',
      offer: [
        'Hey. Hey, dude. I’m Chad. I was a lifeguard here. Then Waterland closed. I didn’t really… leave.',
        'Nobody ever picked up the floaties. Five of them, all over the park. It’s been bugging me for, like, three years.',
        'Could you grab them? The gate’s chained, but the chain is mostly decorative.',
      ],
      steps: ['Collect the lost floaties in Waterland: {n}/{count}', 'Bring the floaties back to Chad'],
      thanks: [
        'Duuude. That’s all of them. Safety first.',
        'Take this. Employee of the Month, three years running. Because nobody else works here.',
      ],
    },
    rt_denver_hounds: {
      title: 'No Dogs in the Pool',
      offer: [
        'Big black dogs keep coming down off the mountain and drinking out of the wave pool. With bony guys. Walking guys made of bones.',
        'There’s a whole pack up the slope north of the motel. Rule one of Waterland: no dogs in the pool.',
      ],
      steps: ['Clear the camp on the mountainside', 'Beat hellhounds round Denver: {n}/{count}', 'Tell Chad the pool is dog-free'],
      thanks: [
        'You did it! The pool is officially dog-free. Still closed. But dog-free.',
        'Here, dude. I found it in the lost-and-found. It was next to a single flip-flop.',
      ],
    },
    rt_denver_rigor: {
      title: 'Captain Rigor',
      offer: [
        'Okay. Don’t freak out. There’s a skeleton in a lifeguard whistle patrolling the wave pool. He keeps blowing it at me.',
        'He says I’m “running on the deck”. I am not running. I am walking briskly.',
        'Go to the wave pool and tell him his shift is over. Forever.',
      ],
      steps: ['Go to the wave pool', 'Beat Captain Rigor, Skeleton Lifeguard', 'Go back to Chad'],
      thanks: [
        'No more whistle. Dude. You are the best lifeguard this park ever had, and you never even got a chair.',
        'Take this. It’s the last thing in Waterland worth having. Except the slide. The slide is still awesome.',
      ],
    },
  },
  rt: {
    signs: {
      // the Turnpike
      tpGantryL: 'WEST\nI-78 · ALL POINTS WEST', tpGantryR: 'ST. LOUIS 950\nLOS ANGELES 2,790',
      tpToll: 'TOLL · EXACT CHANGE\nNO DRACHMAS', tpOffice: 'OFFICE', tpDrachmaInn: 'DRACHMA INN\nVACANCY · COLOR TV',
      tpDiner: 'DINER · OPEN 24 HRS', tpGas: 'GAS · SNACKS · ICE',
      tpDelphi: 'DELPHI STRAWBERRY SERVICE', tpHermesExpress: 'HERMES EXPRESS\nWE DELIVER. EVENTUALLY.', tpMonsterDonut: 'MONSTER DONUT\nNOW WITH MORE MONSTERS',
      tpBbStrawberries: 'DELPHI STRAWBERRIES\nPICKED BY SATYRS · 2 MI', tpBbAuntyEm: 'AUNTY EM’S GARDEN GNOMES\nSTATUES! BURGERS! · 40 MI',
      tpBbHermes: 'LOST SOMETHING?\nHERMES EXPRESS FINDS IT', tpBbCrustys: 'CRUSTY’S WATER BED PALACE\nONE SIZE FITS ALL · 2,600 MI',
      tpSpeed: 'SPEED\nLIMIT\n65', tpAccidentAhead: 'ACCIDENT\nAHEAD',
      // Aunty Em's
      aeBurgers: 'BURGERS', aeSmile: 'SMILE!', aeAuntyEmRoad: 'AUNTY EM’S\nGNOMES · STATUES · BURGERS',
      aePetesGas: 'PETE’S\nLAST GAS FOR 40 MI', aeCorn: 'FRESH CORN · NOT A TRAP',
      aeGantryL: 'AUNTY EM’S\nNEXT RIGHT', aeGantryR: 'ST. LOUIS 870\nAMTRAK STATION 2',
      aeBbPhoto: 'AUNTY EM’S\nFREE PHOTO WITH EVERY BURGER', aeBbHungry: 'YOU ARE GETTING\nVERY HUNGRY…', aeBbTrain: 'BRIDGE OUT AHEAD\nTAKE THE TRAIN',
      // St. Louis
      stlArchMuseum: 'MUSEUM · TRAM TO THE TOP', stlNoSwimming: 'MISSISSIPPI RIVER\nNO SWIMMING', stlHotel: 'GATEWAY GRAND HOTEL',
      stlRavioli: 'TONY’S TOASTED RAVIOLI', stlBallpark: 'RIVER CITY BALLPARK', stlScoreboard: 'HOME 0 · MONSTERS 3\nNEXT GAME: NEVER',
      stlGatewayMotel: 'GATEWAY MOTEL\nLAST BEDS BEFORE\nTHE PLAINS', stlLastGasPlains: 'LAST GAS BEFORE THE PLAINS',
      stlGantryL: 'WEST · GATEWAY ARCH\nRIVER CROSSING 1', stlGantryR: 'DENVER 850\nLOS ANGELES 1,840',
      stlBbArch: 'SEE THE ARCH!\n630 FEET OF AWESOME', stlBbPlains: 'THE GREAT PLAINS\nBRIDGE OUT · TAKE THE TRAIN',
      // Denver
      dnClosedSeason: 'CLOSED FOR THE SEASON', dnSlide: 'THE PLUNGE', dnTunnelOfLove: 'TUNNEL OF LOVE',
      dnRoadsideDiner: 'ROADSIDE DINER · EAT', dnReservedAres: 'RESERVED\nGOD OF WAR', dnMileHigh: 'MILE HIGH\nMOTOR LODGE\nVACANCY',
      dnKindness: 'KINDNESS INTERNATIONAL\nZOO TRANSPORT', dnLotusTruck: 'LOTUS HOTEL & CASINO\nSTAY A WHILE',
      dnGantryL: 'ROCKIES TUNNEL 1\nTRUCKS ONLY', dnGantryR: 'LAS VEGAS 750\nLOS ANGELES 1,020',
      dnCityLimits: 'DENVER\nELEV. 5,280 FT',
      dnBbLotus: 'LOTUS HOTEL & CASINO\nLAS VEGAS · STAY FOREVER!', dnBbWaterland: 'WATERLAND\nFUN FOR THE WHOLE FAMILY! (CLOSED)',
      dnBbKindness: 'KINDNESS INTERNATIONAL\nWE LOVE ANIMALS!',
    },
  },
};
