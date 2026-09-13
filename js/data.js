/* Static data — champions only (no towers/objectives) */
/* Optimized for GitHub Pages: primary WebP (JPG fallback only for basemap) */
const MAP_IMAGE = "resources/map-map-icons/mapcanvas.webp";
const MAP_IMAGE_FALLBACK = "resources/map-map-icons/mapcanvas.jpg";

const CHAMPIONS = [
  "aatrox","ahri","akali","akshan","alistar","ambessa","amumu","annie","ashe",
  "aurelion-sol","aurora","bard","blitzcrank","brand","braum","caitlyn","camille",
  "chogath","corki","darius","diana","dr-mundo","draven","ekko","evelynn","ezreal",
  "fiddlesticks","fiora","fizz","galio","garen","gnar","gragas","graves","gwen",
  "hecarim","heimerdinger","hwei","irelia","janna","jarvan-iv","jax","jayce","jhin",
  "jinx","kaisa","kalista","karma","kassadin","katarina","kayle","kayn","kennen",
  "khazix","kindred","kogmaw","ksante","lee-sin","leona","lillia","lissandra",
  "lucian","lulu","lux","malphite","maokai","master-yi","mel","milio","miss-fortune",
  "mordekaiser","morgana","nami","nasus","nautilus","nidalee","nilah","nocturne",
  "norra","nunu-amp-willump","olaf","orianna","ornn","pantheon","poppy","pyke",
  "rakan","rammus","rell","renekton","rengar","riven","rumble","ryze","samira",
  "senna","seraphine","sett","shen","shyvana","singed","sion","sivir","skarner",
  "smolder","sona","soraka","swain","syndra","taliyah","talon","teemo","thresh",
  "tristana","tryndamere","twisted-fate","twitch","urgot","varus","vayne","veigar",
  "velkoz","vex","vi","viego","viktor","vladimir","volibear","warwick","wukong",
  "xayah","xin-zhao","yasuo","yone","yunara","yuumi","zed","zeri","ziggs","zilean","zoe","zyra",
];

const championSrc = (slug) => `resources/champions/${slug}.webp`;
const WARD_SRC = "resources/champions/ward.webp";
const X_MARK_SRC = "resources/map-map-icons/x-mark.webp";

/* Compat: old boards exported with .png → remap to .webp */
const migrateSrc = (src) => {
  if (typeof src !== "string") return src;
  return src
    .replace(/\.png$/i, ".webp")
    .replace("map-map-icons/mapcanvas.png", "map-map-icons/mapcanvas.webp")
    .replace("map-map-icons/x-mark.png", "map-map-icons/x-mark.webp")
    .replace("map-map-icons/blue-tower-icon.png", "map-map-icons/blue-tower-icon.webp")
    .replace("map-map-icons/red-tower-icon.png", "map-map-icons/red-tower-icon.webp")
    .replace("map-map-icons/blue-nexus-icon.png", "map-map-icons/blue-nexus-icon.webp")
    .replace("map-map-icons/red-nexus-icon.png", "map-map-icons/red-nexus-icon.webp");
};
/* Runtime fallback: if .webp fails (old browser), try the legacy .png/.jpg */
const withImgFallback = (img, webpSrc) => {
  img.onerror = () => {
    img.onerror = null;
    if (webpSrc.endsWith(".webp")) {
      const legacy = webpSrc === MAP_IMAGE
        ? MAP_IMAGE_FALLBACK
        : webpSrc.replace(/\.webp$/i, ".png");
      img.src = legacy;
    }
  };
  return img;
};

/* Fixed structures mapped from mapcanvas.png (RGB template matching) */
const STRUCTURES = [
  // BLUE — bottom-left base
  { id: "BTOP-T1", team: "blue", label: "T1 BLUE TOP", x: 18.98, y: 31.22, kind: "tower" },
  { id: "BTOP-T2", team: "blue", label: "T2 BLUE TOP", x: 19.03, y: 52.60, kind: "tower" },
  { id: "BTOP-T3", team: "blue", label: "T3 BLUE TOP", x: 19.03, y: 64.97, kind: "tower" },
  { id: "BMID-T1", team: "blue", label: "T1 BLUE MID", x: 43.63, y: 52.60, kind: "tower" },
  { id: "BMID-T2", team: "blue", label: "T2 BLUE MID", x: 39.40, y: 62.33, kind: "tower" },
  { id: "BMID-T3", team: "blue", label: "T3 BLUE MID", x: 32.60, y: 68.85, kind: "tower" },
  { id: "BBOT-T1", team: "blue", label: "T1 BLUE BOT", x: 66.21, y: 87.12, kind: "tower" },
  { id: "BBOT-T2", team: "blue", label: "T2 BLUE BOT", x: 48.37, y: 86, kind: "tower" },
  { id: "BBOT-T3", team: "blue", label: "T3 BLUE BOT", x: 34.72, y: 84.41, kind: "tower" },
  { id: "B-NX", team: "blue", label: "BLUE NEXUS", x: 21.10, y: 81.81, kind: "nexus" },
  // RED — top-right base
  { id: "RTOP-T1", team: "red", label: "T1 RED TOP", x: 35.20, y: 15, kind: "tower" },
  { id: "RTOP-T2", team: "red", label: "T2 RED TOP", x: 52.11, y: 16.88, kind: "tower" },
  { id: "RTOP-T3", team: "red", label: "T3 RED TOP", x: 64.15, y: 16.88, kind: "tower" },
  { id: "RMID-T1", team: "red", label: "T1 RED MID", x: 57.75, y: 42.15, kind: "tower" },
  { id: "RMID-T2", team: "red", label: "T2 RED MID", x: 62.03, y: 33.89, kind: "tower" },
  { id: "RMID-T3", team: "red", label: "T3 RED MID", x: 70.42, y: 25.87, kind: "tower" },
  { id: "RBOT-T1", team: "red", label: "T1 RED BOT", x: 82.57, y: 66.15, kind: "tower" },
  { id: "RBOT-T2", team: "red", label: "T2 RED BOT", x: 79.50, y: 44.83, kind: "tower" },
  { id: "RBOT-T3", team: "red", label: "T3 RED BOT", x: 79.33, y: 33.89, kind: "tower" },
  { id: "R-NX", team: "red", label: "RED NEXUS", x: 77.22, y: 19.55, kind: "nexus" },
  // Epic river objectives
  { id: "BARON", team: "purple", label: "BARON", x: 38.0, y: 34.0, kind: "baron" },
  { id: "DRAGON", team: "red", label: "DRAGON", x: 63.6, y: 66.6, kind: "dragon" },
];

const structIconFor = (s) => {
  if (s.kind === "nexus")
    return s.team === "blue"
      ? "resources/map-map-icons/blue-nexus-icon.webp"
      : "resources/map-map-icons/red-nexus-icon.webp";
  if (s.kind === "baron") return "resources/map-map-icons/baron_icon.svg";
  if (s.kind === "dragon") return "resources/map-map-icons/dragon_icon.svg";
  return s.team === "blue"
    ? "resources/map-map-icons/blue-tower-icon.webp"
    : "resources/map-map-icons/red-tower-icon.webp";
};

/* Initial board (mirror of main.json) — fallback when fetch fails (e.g. file://) */
const DEFAULT_BOARD = {
  version: 2,
  app: "wild-rift-map-planner",
  cam: { x: 0, y: 0, zoom: 1 },
  structGray: ["BMID-T1"],
  tokens: [
    { name: "fiora", team: "blue", x: 23.781044121543346, y: 24.613473133366476, grayscale: false, src: "resources/champions/fiora.webp" },
    { name: "warwick", team: "blue", x: 30.512554626108695, y: 48.25669993357688, grayscale: false, src: "resources/champions/warwick.webp" },
    { name: "akali", team: "blue", x: 48.89939092302898, y: 49.03777246914578, grayscale: false, src: "resources/champions/akali.webp" },
    { name: "jinx", team: "blue", x: 70.06036845576813, y: 85.32115340153572, grayscale: false, src: "resources/champions/jinx.webp" },
    { name: "nautilus", team: "blue", x: 66.8887899934866, y: 79.532094094478, grayscale: false, src: "resources/champions/nautilus.webp" },
    { name: "jax", team: "red", x: 29.642765084282267, y: 19.26395571897224, grayscale: false, src: "resources/champions/jax.webp" },
    { name: "amumu", team: "red", x: 72.03323538808337, y: 54.617490708822864, grayscale: false, src: "resources/champions/amumu.webp" },
    { name: "ahri", team: "red", x: 53.86662950420562, y: 47.073560015139854, grayscale: false, src: "resources/champions/ahri.webp" },
    { name: "caitlyn", team: "red", x: 79.91813455052136, y: 78.68291980192646, grayscale: false, src: "resources/champions/caitlyn.webp" },
    { name: "seraphine", team: "red", x: 77.30309025755118, y: 71.40196672252269, grayscale: false, src: "resources/champions/seraphine.webp" },
  ],
  labels: [],
};

const cloneBoard = (b) => JSON.parse(JSON.stringify(b));
