// What each model in the workbench is meant to be: who or what it is (in Percy
// Jackson / Greek-myth terms), what it looks like by design (its concept sheet
// in design/concept/, the comment above its builder) and where the game uses
// it. Keyed exactly as the workbench keys a model (item.key: the id, or
// 'kind:<kind>' for a Road West champion look). Pure data with no imports, so
// the node test (test/workbench.test.mjs) can load it. The workbench shows the
// text under the model's name (workbench.js showDescription).

// The Road West champion looks (entities/champions.js KIND_LOOKS): a crowned,
// recoloured, glowing version of an ordinary kind.
const crowned = (plain, look) => `The look a Road West champion ${plain} wears. ${look} A gold crown, an outline glow and a trail of particles in its colour mark it as a champion.`;

export const DESCRIPTIONS = {
  // ---- heroes (the playable demigods)
  percy: 'Percy Jackson, son of Poseidon, the sea hero who fights with the sword Riptide. Messy black hair, sea-green eyes, an orange Camp Half-Blood T-shirt, jeans and high-top sneakers. Playable.',
  annabeth: 'Annabeth Chase, daughter of Athena, quick with a bronze dagger and the invisibility cap. Blonde curls tied back in a ponytail under a navy cap, grey eyes, camp shirt, cargo shorts and a camp bead necklace. Playable.',
  grover: 'Grover Underwood, a satyr and protector who plays reed pipes and wears winged sneakers. Curly brown afro, a small goatee, little horns and goat legs ending in hooves under camp shorts. Playable.',
  tyson: 'Tyson, a young Cyclops and Percy’s half-brother, the big brawler of the party. Much bigger and bulkier than the others, with one large eye, shaggy brown hair and a torn red plaid jacket. Playable.',
  clarisse: 'Clarisse La Rue, daughter of Ares, who fights with an electric spear and a boar shield. Long brown hair under a plumed bronze helmet, a scowl, a camo jacket and heavy boots. Playable.',
  thalia: 'Thalia Grace, daughter of Zeus, a spear fighter whose lightning chains between foes. Short spiky black hair, bright blue eyes, freckles, a studded black punk jacket and boots. Playable.',
  nico: 'Nico di Angelo, son of Hades, who wields a Stygian iron sword and commands the dead. Messy black hair, pale skin, an aviator-style brown jacket over black, and a skull ring. Playable.',

  // ---- camp NPCs
  chiron: 'Chiron, the centaur and activities director of Camp Half-Blood, who also teaches as the wheelchair-bound Mr. Brunner. Curly brown hair and a full beard, a tweed jacket over a green vest, a bow and quiver, and a shaggy white horse’s body. Not playable.',
  mr_d: 'Mr. D, the camp director, who is really Dionysus, god of wine, exiled to run a summer camp. Short and round, with curly black hair crowned with grapes and vine leaves, a leopard-print shirt and a can of Diet Coke. Not playable.',
  dummy: 'The straw training dummy in the camp hub and the test room: an unkillable target that wobbles, flashes and shows damage numbers so you can practise combos. A straw head with a painted red mouth on a stuffed body.',

  // ---- monsters
  pup: 'A hellhound pup, a young monster dog from the Underworld: a puppy the way Mrs O’Leary is one, a head taller than Percy, half a grown hellhound. A big round head, a short muzzle, molten eyes, ears that flop at the tips, a thick fluffy soot-black coat with lava cracks, oversized paws and a stubby smouldering tail. A fast, weak rusher in swarms; an Empousa, Alecto and the alpha hellhound call them.',
  rat: 'A New York sewer rat from the prologue. Grey-brown fur, a pink nose, ears and tail, and eyes that are a little too red. A small, quick rusher that hangs around until it notices you; the Mist says “just rats”.',
  serpent: 'A great serpent out of the Mist: what a harmless-looking person may really be under True Sight. By design a long green snake banded in gold, rearing its hooded head like a cobra, with fangs and a flickering forked tongue; it slithers in S-curves and strikes low and fast. A poisonous melee fodder in the Mist chapters.',
  mortal: 'A real mortal in the Mist: an ordinary museum visitor who never fights, a grown-up about 1.2-1.3 times Percy’s height. It always looks like a person and cannot be hurt. If you swing at one, it scolds you instead. Shown here as the tourist; in game it is drawn as one of the Mist’s mortal people.',
  spider: 'One of Hephaestus’s bronze mechanical spiders, the size of a dog. A boxy riveted body in bronze and dark-bronze bands, a chequered abdomen, glowing furnace eyes and eight arching jointed legs. A quick melee rusher that swarms in the Labyrinth, and is one of the true forms behind the Mist in the museum chapter.',
  harpy: 'A wild harpy, a bird-woman of Greek myth. A scrawny woman with a pale grey-green face, tangled storm-grey hair and yellow eyes, ragged dark wings, a torn feathered rag and long scaly yellow legs, a little taller than Percy. A ranged monster that screeches and flings fans of feathers; found on the shore, Mount Othrys and the Road West.',
  stymphalian: 'A Stymphalian bird, the man-eating bronze-feathered birds Heracles drove out. A sleek, level bronze bird of prey with knife-sharp metal feathers and a long bronze beak. A ranged monster that fires volleys of feathers.',
  automaton: 'A Greek-fire automaton, a bronze walker built to explode. A squat six-legged body of riveted bronze plates gone green with verdigris, one glowing green eye in a crested head, pincers, and an amphora of Greek fire on its back. It runs in, swells and bursts; found in the Labyrinth and Mount Othrys.',
  ghost: 'A restless spirit of the dead, the grown person it was, about 1.25 times Percy’s height. A drowned-pale ghost with long drifting hair, hollow glowing eyes and a gaping mouth, in a tattered shroud that thins into wisps instead of legs, with broken shackles on its wrists. A ranged caster that throws homing wisps; seen in the Mist chapters and the Fields of Asphodel.',
  fury: 'A Fury, one of the Kindly Ones, the winged torturers of the Underworld. A grey hag with wild white curls, burning yellow eyes and a fanged grin, in a ragged black dress with huge tattered leather wings and a whip of fire. An elite trickster that teleports and slashes.',
  dracaena: 'A dracaena, a snake-woman of Greek myth. A snake-haired woman in a black and gold top with a skirt of leather strips, reared up on one long dark-green serpent tail with gold belly plates, nearly twice Percy’s height, with a gold-tipped spear and a bronze buckler. A heavily armoured elite tank, found in the Canyon, the Woods and the Labyrinth.',
  hellhound: 'A full-grown hellhound, a monster dog of the Underworld as big as a truck. A lean black hound with lava running in its cracks, a gold-studded collar and a smoking aura. An elite bruiser that shrugs off knock-back.',
  empousa: 'An empousa, a shape-changing vampire spirit of Hecate. A cheerleader with a mane of flame, a white crop top with an orange V, a pleated orange skirt, pom-poms, and one bronze leg and one shaggy donkey leg. An elite summoner that calls hellhound pups and throws fire.',
  scorpion: 'A giant scorpion, bigger than a person: its back stands over Percy’s waist and its tail arches the sting over his head. Glossy chitin plates, big claws, four glowing eyes and a long tail arcing over its back to a dripping venom stinger. An elite bruiser that alternates a quick claw pinch with a slow, poisonous sting; found in the Red Canyon and on the shore, and summoned by Luke.',
  skeleton: 'A skeleton warrior, a dead soldier risen to fight, a grown man’s skeleton about 1.25 times Percy’s height without the helmet (about 1.3 with it): bigger than Percy, not a giant. Bare bones in an olive combat helmet with goggles, a camo plate carrier with the ribs, spine and pelvis showing under it, camo shorts and tan boots, with a rifle across the body. An elite ranged monster that shoots; it falls apart and gets back up unless hit again while down.',
  spartoi: 'A spartoi, one of the sown men: skeleton soldiers grown from dragon’s teeth, grown men about 1.25 times Percy’s height without the crested helmet (under 1.4 with it). Old ivory bones in a bronze Corinthian helmet with a tall teal crest, a tattered tunic and cloak, a curved bronze kopis and a round hoplite shield with a black dragon. Steady melee fodder of the skeleton armies of the beach, the Underworld and the desert.',
  telekhine: 'A telekhine, a sea-demon smith of Rhodes and Hephaestus’s old forge hand. Half dog, half seal and, like the grown ones of The Battle of the Labyrinth, taller than a man: a grey-blue hide, sits up on wide flippers, a dog’s head with fangs and orange eyes, a smith’s apron and a cauldron of Greek fire on its back. A lobber that throws fire in an arc; found on the shore and Mount Othrys.',
  gorgon_statue: 'A living statue: a grown hoplite Medusa turned to stone and woken again, about 1.25 times Percy’s height without the helmet (under 1.4 with it). Grey stone in a crested Corinthian helmet and cuirass, with a round shield bearing a gorgon’s face, cracks and moss, on a broken plinth. An elite ambusher that stands frozen until a hero comes close; found in the Canyon, Aunty Em’s garden and the Road West.',
  cyclops: 'A Cyclops, a one-eyed giant of Greek myth and Tyson’s kin. A hulking giant with one huge blue eye under a heavy brow, a curly black mane and beard, a white wool fleece over one shoulder with a ram’s skull, and a studded club. A champion-tier bruiser found on Mount Othrys.',
  karpos: 'A karpos, a grain spirit of the fields. A gangly creature about four-fifths of Percy’s height, with a straw hood, glowing green eyes, a spray of wheat ears behind its head that rises over Percy’s, bound-straw limbs and long clawed fingers. Swarm melee fodder in Strawberry Fields.',
  karpos_slinger: 'A karpos slinger, a grain spirit that fights from range. A karpos with a twine sling and a glowing golden seed pod, and a string of more pods at its belt. Ranged fodder in Strawberry Fields that lobs seed pods.',
  colchis_calf: 'A Colchis bull calf, a young bronze-hoofed bull of Colchis. A boxy automaton calf in riveted bronze plates over an iron frame, smoking vents on its back, cream horns and glowing orange eyes. A larger charging bruiser in Strawberry Fields that paws, charges and breathes a jet of fire.',
  myrmex: 'A myrmex, a giant ant of Greek myth. A round head with an orange face band, glowing orange eyes, curved bronze mandibles, banded antennae and a big abdomen striped black and orange-bronze, on six legs. Swarm melee fodder in the Camp Woods and the Canyon.',
  myrmex_spitter: 'A myrmex spitter, a giant ant that fights from range. A myrmex with a huge glowing green sac for an abdomen, green eyes and green drips from its jaws. A lobber in the Camp Woods and the Red Canyon that sprays arcs of acid.',
  boarlet: 'A Calydonian boarlet, a young cousin of the great Calydonian boar. A big shaggy rust-brown boar with a bristling mane of cream-tipped spines, curved tusks and glowing orange eyes. A larger charging bruiser in the Camp Woods.',
  crab: 'A giant crab of the North Shore. A domed red shell crusted with barnacles and weed, eyes on glowing stalks and two big orange claws. Steady melee fodder that scuttles sideways and turns to pinch.',
  king_crab: 'A king crab, a rare monster of the North Shore. A hulking crab twice a hero’s height with a mossy shell sprouting coral and kelp, and one giant crusher claw raised high to slam down. An elite tank.',
  basilisk: 'A basilisk at its size in the books (The Son of Neptune): a little green snake as long as a man’s arm, with an expandable collar of white spikes, a small white crown, glowing pale yellow eyes, an ember-hot mouth and a tongue of flame. Fast fodder in threes on Mount Othrys and the Road West: it rears, puffs fire at the spot in front of it and poisons what it touches.',
  earthborn: 'An Earthborn, a six-armed giant born of Gaia. A hulking giant of brown stone and green moss with glowing orange eyes under a heavy brow and six arms with block fists. A rare elite lobber in the Canyon that hurls balls of mud.',
  daedalus_drone: 'A Daedalus drone, a clockwork bird made in the Labyrinth. A bronze eagle with spread wings of plate feathers, a glowing blue core on its chest, a gold hooked beak and blue lens eyes. Ranged fodder in the Labyrinth that hovers and fires blue bolts.',
  laistrygonian: 'A Laistrygonian, a giant cannibal of Greek myth. A huge tan giant covered in grey-blue spiral tattoos, a wild black beard, a fur kilt with skull buckles, and a cracked bronze ball streaming fire in its raised hand. A rare elite lobber on Mount Othrys.',
  shade: 'A shade, a wraith of the dead, a grown person’s size, about 1.25 times Percy’s height. A tall figure in a pointed hood and a slate-blue robe that thins into cold cyan motes, with glowing cyan eyes, a gaping mouth and reaching bony hands. Slow, slightly see-through fodder that drifts in crowds in the Fields of Asphodel.',
  keres: 'A ker, a death spirit of the battlefield, a grown woman’s size, about 1.25 times Percy’s height. A mane of wild white hair, a skull-like face with red eyes and fangs, a ragged black dress with no feet, red talons and great black bat wings veined in red. A fast flier in the Fields of Asphodel that hangs in the air, then drops to strike.',

  // ---- bosses
  alecto: 'Alecto, the Fury who posed as Mrs. Dodds, the pre-algebra teacher, the first chapter’s boss. A grey hag with wild white curls, burning eyes, a ragged black dress, huge leathery wings and a fiery whip. She whips, swoops and rings the floor with fire, and calls hellhound pups.',
  minotaur: 'The Minotaur, the bull-headed man-eater of the Labyrinth, the chapter 2 boss on Half-Blood Hill. A towering brown bull-man with a cream loincloth hanging front and back from a gold belt and medallion, cream horns, a gold nose ring and red eyes. Beat him by making him charge into the pine tree.',
  hellhound_alpha: 'The Hellhound, the great pack leader summoned into camp (chapter 3). A hellhound as big as a house: soot-black, with lava in its cracks, a burning ridge down its back, a gold spiked collar and a furnace for a mouth. It shadow-travels, mauls and howls up pups.',
  furies: 'The Furies, the Kindly Ones: Alecto, Megaera and Tisiphone, who share one health bar (chapter 4). Three grey, white-haired hags with leathery wings and fiery whips, each in her own colours. One fights on the ground while her sisters circle and take turns.',
  medusa: 'Medusa, the Gorgon whose gaze turns heroes to stone, who runs a statue garden as Aunty Em (chapter 5). Veiled in black and gold with green snakes writhing under her hood; her face is never shown, only her glowing eyes when she stares. Turn away when she lifts her veil.',
  chimera: 'The Chimera, Echidna’s “chihuahua” (chapter 6), about 7 m tall, more than three times Percy. A lion’s body with a deep chest and heavy haunches on long legs set wide, two heads side by side on twin necks (a lion’s in a fiery mane and a horned, bearded goat’s, both breathing fire) and a diamondback rattlesnake for a tail. It breathes fire, lobs fireballs from both mouths, pounces and strikes with the tail.',
  spiders: 'The Spider Queen, Hephaestus’s mechanical bronze queen (chapter 7). The bronze spider at boss size, with a crown of spikes, gears turning in her abdomen and a furnace glow. She spits nets that root heroes and calls her swarm; destroying her ends it.',
  procrustes: 'Procrustes, “Crusty”, the bandit of Greek myth who stretched or cut guests to fit his bed, here a salesman at Crusty’s Water Bed Palace (chapter 9). A big smooth man in a white suit and red tie with a red robe, a huge grin and a woodsman’s axe. He sweeps his axe and straps heroes to water beds; mash free to tip him onto his own bed.',
  cerberus: 'Cerberus, the three-headed hound who guards the Underworld (chapter 10). Three huge black heads with burning eyes, red mouths, drool and gold spiked collars on one enormous body. His heads breathe fire, bite and lunge, and he gets sleepy when they droop.',
  ares: 'Ares, god of war (chapter 11). A huge biker in a spiked black leather jacket and a black T-shirt with a red Spartan helmet, ripped trousers, boots, red-hot sunglasses and a burning sword. He fights with sword combos, spear thrusts and motorcycle charges; the sea heals the heroes.',
  luke: 'Luke Castellan, the sandy-haired son of Hermes who betrayed the camp, the last boss (chapter 12). Sandy curls, a scar down his cheek, the orange camp shirt, and Backbiter, a blade half steel and half celestial bronze. A fast duelist who parries and ripostes, and summons pit scorpions.',

  // ---- champions: the seven named champions of the open world
  fields_bronzebeak: 'Bronzebeak, the champion of Strawberry Fields. A huge Stymphalian bird in razor bronze feathers with red-tipped wings, a tall red crest, burning red eyes and knife-quills. Triple health and an epic chest when beaten.',
  woods_shadowfang: 'Shadowfang, the champion of the Camp Woods. A scarred black hellhound with lava cracks all over, a broken iron collar trailing chains and smoking red eyes. Triple health and an epic chest when beaten.',
  shore_queen_gale: 'Queen Gale, the champion of the North Shore. A storm-grey harpy queen with gold-tipped plumage, a crown of gold and white plumes, and lightning crackling from her talons and along her wings. Triple health and an epic chest when beaten.',
  canyon_red_king: 'The Red King, the champion of the Red Canyon. A crimson giant scorpion the size of a pickup truck, half again the size of the ordinary kind, in gold-edged plates with a crown of gold spines, gold spikes down its back, gold-tipped pincers and a golden stinger. Triple health and an epic chest when beaten.',
  lab_bronze_warden: 'The Bronze Warden, the champion of the Labyrinth. A hulking bronze automaton of riveted plates crusted with teal patina, one glowing blue eye behind the visor of a squared helm, a glowing core at its waist, a broad bronze sword and a tall tower shield with a Greek key and a sun-crowned face. Triple health and an epic chest when beaten.',
  oth_gorgos: 'Gorgos the Giant Chief, the champion of Mount Othrys. A huge two-eyed giant chieftain in a bear pelt with the bear’s head worn as a hood, burning orange-red eyes, a big black beard, a necklace of fangs, bones and skulls, a skull buckle, a red loincloth, fur-wrapped legs and a mossy tree-trunk club studded with stones. Triple health and an epic chest when beaten.',
  asphodel_pale_king: 'The Pale King, the champion of the Fields of Asphodel. A skeleton king a step above the skeleton warriors, about 1.5 times Percy’s height (the crown aside), in tarnished black armour with a gold crown set with green gems, green fire in his eyes and over his crown, a tattered dark cloak and a black sword edged with green flame. Triple health and an epic chest when beaten.',

  // ---- champions: Road West looks of the ordinary kinds
  'kind:hellhound': crowned('hellhound', 'A hellhound whose lava burns blue-cyan instead of red, with a blue outline and smoke from its head, and bigger than the ordinary kind.'),
  'kind:pup': crowned('pup', 'A hellhound pup whose fire burns blue-cyan, with a blue outline glow and smoke, and bigger than a plain pup: about 1.7 times Percy’s height, still well under a grown hellhound.'),
  'kind:skeleton': crowned('skeleton warrior', 'A bone-white skeleton in crimson armour with a red outline and red wisps, a fifth bigger than the ordinary kind, about 1.5 times Percy’s height: a step above it, not a giant.'),
  'kind:spartoi': crowned('spartoi', 'A sown skeleton soldier with crimson armour, a red outline and red wisps, a fifth bigger than the ordinary kind, about 1.5 times Percy’s height: a step above it, not a giant.'),
  'kind:spider': crowned('bronze spider', 'An obsidian-black spider burning with violet fire, with a purple outline and sparks, much bigger than the bronze kind.'),
  'kind:dracaena': crowned('dracaena', 'A dracaena in royal purple scales, with a violet outline and sparks.'),
  'kind:empousa': crowned('empousa', 'An empousa whose hair and flames burn blue, with a blue outline and drifting embers.'),
  'kind:harpy': crowned('harpy', 'A bigger harpy with a golden outline and golden sparks.'),
  'kind:stymphalian': crowned('Stymphalian bird', 'A much bigger Stymphalian bird with an orange outline and rising embers.'),
  'kind:scorpion': crowned('giant scorpion', 'A third bigger than the giant scorpion, with a golden outline and golden dust round its feet.'),
  'kind:cyclops': crowned('Cyclops', 'A slightly bigger Cyclops with an orange outline and rising embers.'),

  // ---- mortal disguises (what the Mist shows in place of a monster)
  teacher: 'Mrs. Dodds as the Mist shows her: a pre-algebra teacher who looks at you like you owe her homework. Grey hair, a scowl, a dark red knit top under a black leather jacket and a long skirt. In the museum chapter she is really the Fury Alecto.',
  student: 'A student on the museum field trip, a mortal disguise the Mist can put on a monster. A kid with brown hair and a big smile, a navy jumper over a white shirt with a red tie, blue jeans and red shoes.',
  guard: 'A museum guard, a mortal disguise: navy uniform jacket over a pale shirt, a peaked cap and a radio. Has seen everything. Not this.',
  tourist: 'A tourist, a mortal disguise: a sun hat and camera, a bright orange floral shirt, khaki shorts, white socks and a smile that is slightly too wide.',
  farmer: 'A farmer, a mortal disguise seen out checking the fences in a thunderstorm: a red plaid shirt under blue overalls, a grey beard and a weathered face.',
  old_lady: 'An old lady, a mortal disguise: silver hair, a purple knit cardigan with a cream collar, a long skirt and tights. Knitting socks; very large socks, with very sharp scissors.',
  bellhop: 'A bellhop of the Lotus Hotel and Casino, a mortal disguise: a red uniform with gold buttons and collar, a big grin and black trousers with a red stripe. “Your stay is on the house. For ever.”',
  salesman: 'A salesman, a mortal disguise: a gold-checked jacket over a white shirt and red tie, a moustache, a gold tooth and a big smile. A deal you can’t refuse.',

  // ---- open-world people (side-quest givers)
  fields_katie: 'Katie Gardner, a daughter of Demeter, the quest giver in Strawberry Fields. A girl with a brown braid, a straw hat, green overalls over the orange camp shirt, and a trowel.',
  fields_travis: 'Travis Stoll, a son of Hermes and prankster, in Strawberry Fields. A lanky camper with curly brown hair, a mischievous grin and a torn camp shirt.',
  woods_juniper: 'Juniper, a tree nymph (and Grover’s girlfriend), in the Camp Woods. Green-tinged skin, leaf-green hair and a dress of juniper needles.',
  woods_beckendorf: 'Charles Beckendorf, a big son of Hephaestus, in the Camp Woods. A tall, broad camper with a short black afro, a camp shirt and cargo trousers.',
  shore_lee: 'Lee Fletcher, a son of Apollo and the archery champion, on the North Shore. A camper with sandy hair and blue eyes in the orange camp shirt.',
  shore_nereid: 'Galene the Nereid, a sea nymph on the North Shore. Sea-green hair and a robe like white foam.',
  canyon_hedge: 'Coach Gleeson Hedge, a loud satyr who coaches the camp, in the Red Canyon. Short, wide and stocky in a red tracksuit and a cap, with a whistle and a wooden club.',
  zoe: 'Zoë Nightshade, lieutenant of the Hunters of Artemis, on Mount Othrys. Dark braided hair, a silver circlet and a silver parka, with a silver bow.',
  rachel: 'Rachel Elizabeth Dare, the mortal girl who sees through the Mist and later becomes the Oracle, in the Labyrinth. Frizzy red hair, freckles and paint-splattered jeans.',
  quintus: 'Quintus, a grizzled swordsman in the Labyrinth who is secretly the inventor Daedalus. Grey hair and beard, a knit top under a dark jacket, with a rapier.',
  canyon_phoebe: 'Phoebe, a Hunter of Artemis, in the Red Canyon. A young archer with golden hair and blue eyes in a silver Hunter parka.',
  bianca: 'Bianca di Angelo, Nico’s sister and a Hunter of Artemis, on Mount Othrys. A young archer with black hair in a silver Hunter parka.',
  asphodel_charon: 'Charon, the ferryman of the dead, in the Fields of Asphodel. A tall, dark man in a sharp black suit and tie with dark sunglasses.',
  asphodel_sisyphus: 'Sisyphus, the king punished to push a boulder uphill for ever, in the Fields of Asphodel. A weary, broad old man with grey hair and beard in a pale tunic.',
  camp_argus: 'Argus, the camp’s huge blond security chief, in camp. Covered all over in blue eyes (on his face, arms and neck), in a white polo and khakis.',
  camp_silena: 'Silena Beauregard, a pretty daughter of Aphrodite, in camp. Long dark hair, pink lip gloss and the orange camp shirt.',
  rt_turnpike_earl: 'Big Earl, a burly bearded trucker on the New Jersey Turnpike stop of the Road West. A red plaid shirt, a trucker cap and suspenders.',
  rt_auntyem_pruitt: 'Mrs. Pruitt, a stout New Jersey farm wife at Aunty Em’s on the Road West. A flowered apron, headscarf and rubber boots.',
  rt_stlouis_mae: 'Ranger Mae, a cheerful park ranger at the Gateway Arch in St. Louis on the Road West. A green ranger uniform and flat hat.',
  rt_denver_chad: 'Chad, a sunburnt teenage ex-lifeguard in Denver on the Road West. Red swim shorts, a whistle and an inflatable flamingo.',
  rt_vegas_valet: 'Sal the Valet, a slick valet at the Lotus in Las Vegas on the Road West. A maroon uniform with gold buttons and a pillbox cap.',
  rt_la_guide: 'Trudy the Tour Guide, a Hollywood tour guide in Los Angeles on the Road West. A sun visor, a star-print shirt and a fold-out star map.',
  rt_sm_fisher: 'Grandma Mae, a tiny old fisherwoman at Santa Monica on the Road West. A yellow raincoat and bucket hat, with a fishing rod.',
};
