// Dedicated plates in the order of the repeating title sequence.
const names = ["springtail-bog", "mite-moss", "tardigrade-film", "amoeba-water", "paramecium-drop", "bacterial-host", "phage-normal", "water-return"];
export const TITLE_ZOOM_PLATES = names.map((name) => new URL(`../../prototypes/assets/game/title-zoom/${name}.webp`, import.meta.url).href);
// Where the title opens: on the tardigrade, a middle creature, rather than the
// first plate, so the mite (which can unsettle some players) is only reached
// once the loop comes round, about 70 seconds in. The order itself is the
// nested zoom chain and stays as it is.
export const TITLE_ZOOM_START = names.indexOf("tardigrade-film");
