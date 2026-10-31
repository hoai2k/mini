// Dedicated plates in the order of the repeating title sequence.
const names = ["springtail-bog", "mite-moss", "tardigrade-film", "amoeba-water", "paramecium-drop", "bacterial-host", "phage-normal", "water-return"];
export const TITLE_ZOOM_PLATES = names.map((name) => new URL(`../../prototypes/assets/game/title-zoom/${name}.webp`, import.meta.url).href);
