// Words of the sages for each topic, in plain renderings of public-domain
// translations (Legge and others), and the Wikipedia articles the reading may
// fetch for each topic and trigram.

export const SAGES = {
  love: [
    ['From compassion comes courage.', 'Laozi, Daodejing 67'],
    ['Fan Chi asked about goodness. The Master said: it is to love others.', 'Analects 12.22'],
    ['What you would not want done to yourself, do not do to others.', 'Analects 15.24'],
  ],
  work: [
    ['Do the difficult while it is still easy; do the great while it is still small.', 'Laozi, Daodejing 63'],
    ['When you see someone of worth, think of becoming their equal; when you see someone unworthy, look within yourself.', 'Analects 4.17'],
    ['The cook carved the ox by following its grain, and in nineteen years his knife never dulled.', 'after Zhuangzi, ch. 3'],
  ],
  money: [
    ['Whoever knows they have enough is rich.', 'Laozi, Daodejing 33'],
    ['To fill a vessel to the brim is not as good as stopping in time.', 'Laozi, Daodejing 9'],
    ['The noble person understands what is right; the petty person understands what pays.', 'Analects 4.16'],
  ],
  health: [
    ['The soft and supple are companions of life; the stiff and hard are companions of death.', 'Laozi, Daodejing 76'],
    ['The sages did not treat illness once it had come, but before it arrived.', 'after the Huangdi Neijing'],
    ['Know when to stop, and you will meet no danger; so you can last long.', 'Laozi, Daodejing 44'],
  ],
  family: [
    ['The great person is one who has not lost the heart of a child.', 'Mencius 4B.12'],
    ['Filial devotion and care for one\'s brothers and sisters: are these not the root of goodness?', 'Analects 1.2'],
    ['Govern a great state as you would cook a small fish: gently.', 'Laozi, Daodejing 60'],
  ],
  creativity: [
    ['Thirty spokes share one hub; it is the empty space that makes the cart useful.', 'Laozi, Daodejing 11'],
    ['Once Zhuang Zhou dreamed he was a butterfly, fluttering about, happy with himself.', 'Zhuangzi, ch. 2'],
    ['The wheelwright said: the knack is in the hand and answers the heart; I cannot put it into words.', 'after Zhuangzi, ch. 13'],
  ],
  study: [
    ['To know what you know and to know what you do not know: that is knowledge.', 'Analects 2.17'],
    ['Learning without thought is labour lost; thought without learning is perilous.', 'Analects 2.15'],
    ['Is it not a joy to learn, and to practise in season what you have learned?', 'Analects 1.1'],
  ],
  travel: [
    ['A journey of a thousand li begins beneath your feet.', 'Laozi, Daodejing 64'],
    ['Without going out of the door, one may know the whole world.', 'Laozi, Daodejing 47'],
    ['The great Peng bird rises ninety thousand li on the whirlwind and heads for the southern sea.', 'after Zhuangzi, ch. 1'],
  ],
  spirit: [
    ['The highest good is like water: it benefits all things and does not compete.', 'Laozi, Daodejing 8'],
    ['Who can make muddy water clear? Let it be still, and it will slowly clear.', 'Laozi, Daodejing 15'],
    ['Knowing others is wisdom; knowing yourself is enlightenment.', 'Laozi, Daodejing 33'],
  ],
  conflict: [
    ['Know the other and know yourself, and in a hundred battles you will not be in danger.', 'Sunzi, The Art of War 3'],
    ['Nothing in the world is softer than water, yet nothing is better at overcoming the hard.', 'Laozi, Daodejing 78'],
    ['The best victory is to win without fighting.', 'after Sunzi, The Art of War 3'],
  ],
  decision: [
    ['Who can wait quietly until the mud settles and the right action arises by itself?', 'after Laozi, Daodejing 15'],
    ['Do not be in a hurry; do not look for small advantages.', 'Analects 13.17'],
    ['Act before things take shape; set them in order before there is confusion.', 'Laozi, Daodejing 64'],
  ],
  timing: [
    ['Standing by a stream, the Master said: it flows on like this, never ceasing, day or night.', 'Analects 9.17'],
    ['A tree you can barely reach around grew from a tiny shoot.', 'Laozi, Daodejing 64'],
    ['Haste brings failure; small gains prevent great things.', 'Analects 13.17'],
  ],
  open: [
    ['The Way that can be spoken is not the constant Way.', 'Laozi, Daodejing 1'],
    ['Returning is the motion of the Way; yielding is its method.', 'Laozi, Daodejing 40'],
    ['In change there is the great beginning; it brings forth the two forms.', 'after the Great Commentary (Xici)'],
  ],
};

// Wikipedia articles (English titles) that the reading may draw on.
export const TOPIC_ARTICLES = {
  love: ['Red thread of fate', 'Qixi Festival', 'Butterfly Lovers', 'Mandarin duck'],
  work: ['Lu Ban', 'Four Great Inventions', 'Guan Zhong', 'Bian Que'],
  money: ['Caishen', 'Cash (Chinese coin)', 'Fu Lu Shou', 'Jiaozi (currency)'],
  health: ['Tai chi', 'Qigong', 'Huangdi Neijing', 'Hua Tuo'],
  family: ['Filial piety', 'Mid-Autumn Festival', 'Chinese New Year', 'Qingming Festival'],
  creativity: ['Chinese calligraphy', 'Guqin', 'Wang Xizhi', 'Shan shui'],
  study: ['Imperial examination', 'Confucius', 'Four Books and Five Classics', 'Hanlin Academy'],
  travel: ['Silk Road', 'Journey to the West', 'Zheng He', 'Xuanzang'],
  spirit: ['Tao', 'Wu wei', 'Yin and yang', 'Zhuangzi (book)'],
  conflict: ['The Art of War', 'Sun Tzu', 'Romance of the Three Kingdoms', 'Zhuge Liang'],
  decision: ['Doctrine of the Mean', 'Oracle bone', 'Zhuge Liang', 'Wu wei'],
  timing: ['Solar term', 'Chinese calendar', 'Earthly Branches', 'Heavenly Stems'],
  open: ['I Ching', 'Bagua', 'Fuxi', 'King Wen of Zhou'],
};

export const TRIGRAM_ARTICLES = {
  qian: 'Chinese dragon',
  kun: 'Houtu',
  zhen: 'Lei Gong',
  kan: 'Yellow River',
  gen: 'Mount Tai',
  xun: 'Fengbo',
  li: 'Zhurong',
  dui: 'West Lake',
};

// Words each trigram brings to matching the day's news and events.
export const TRIGRAM_WORDS = {
  qian: ['sky', 'heaven', 'king', 'emperor', 'leader', 'dragon', 'power', 'founded', 'crowned', 'space', 'flight'],
  kun: ['earth', 'land', 'mother', 'harvest', 'field', 'farm', 'people', 'nation', 'territory'],
  zhen: ['thunder', 'earthquake', 'storm', 'revolution', 'shock', 'launch', 'first', 'born', 'began'],
  kan: ['water', 'river', 'sea', 'ocean', 'flood', 'rain', 'ship', 'danger', 'sank', 'navy'],
  gen: ['mountain', 'peak', 'summit', 'stone', 'temple', 'monastery', 'wall', 'border', 'halt'],
  xun: ['wind', 'tree', 'forest', 'trade', 'treaty', 'spread', 'air', 'hurricane', 'typhoon', 'merchant'],
  li: ['fire', 'sun', 'light', 'burn', 'eclipse', 'art', 'painting', 'film', 'published', 'discovered'],
  dui: ['lake', 'joy', 'song', 'music', 'festival', 'celebration', 'speech', 'marriage', 'married', 'opera'],
};

export const TOPIC_WORDS_ONLINE = {
  love: ['married', 'marriage', 'wedding', 'love', 'romance', 'couple', 'queen', 'princess'],
  work: ['founded', 'company', 'invented', 'invention', 'opened', 'industry', 'labor', 'workers', 'engineer'],
  money: ['bank', 'currency', 'stock', 'market', 'trade', 'economic', 'gold', 'treasury', 'coin'],
  health: ['medicine', 'vaccine', 'hospital', 'disease', 'doctor', 'health', 'epidemic', 'surgery'],
  family: ['born', 'children', 'family', 'mother', 'father', 'son', 'daughter', 'school'],
  creativity: ['novel', 'album', 'film', 'painting', 'published', 'premiered', 'opera', 'composer', 'artist', 'poet'],
  study: ['university', 'school', 'discovered', 'scientist', 'theory', 'published', 'academy', 'college'],
  travel: ['expedition', 'voyage', 'flight', 'explorer', 'railway', 'arrived', 'crossed', 'landed', 'ship'],
  spirit: ['temple', 'church', 'saint', 'pope', 'monk', 'religious', 'philosopher', 'peace'],
  conflict: ['battle', 'war', 'treaty', 'court', 'trial', 'siege', 'army', 'independence', 'revolt'],
  decision: ['elected', 'signed', 'declared', 'vote', 'referendum', 'decided', 'treaty'],
  timing: ['calendar', 'eclipse', 'comet', 'first', 'anniversary', 'began', 'ended'],
  open: [],
};
