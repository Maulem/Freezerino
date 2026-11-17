// Food categories, guessed from the name by keywords (no internet or AI needed).
// Order matters: the first category with a matching word wins, so ready meals and breads come before
// the ingredients they contain ("Asa de frango com arroz" is a ready meal, "Pão de queijo" is bread).
// Keywords are matched as whole words, without accents or case, and also in the plural (+s / +es).

export const CATEGORIES = [
  {
    id: "prontos", icon: "🍲", label: "Comidas prontas", words: [
      "strogonoff", "estrogonofe", "estrogonoff", "feijao", "feijoada", "arroz", "risoto", "sopa", "caldo", "canja",
      "molho", "lasanha", "escondidinho", "pure", "marmita", "refeicao", "ensopado", "guisado", "bolonhesa", "ragu",
      "farofa", "quibe", "kibe", "yakisoba", "galinhada", "moqueca", "empadao", "quiche", "chili", "curry",
      "dobradinha", "mocoto", "lentilha", "grao de bico", "grao-de-bico", "sobra", "sobras", "almondega",
      "guioza", "gyoza", "dumpling", "rolinho primavera", "harumaki", "nhoque", "ravioli", "capeletti", "canelone",
      "panqueca", "omelete", "torta salgada", "baiao", "tutu", "virado", "picadinho", "carne de panela", "salpicao",
      "pizza", "hamburguer pronto", "lanche", "sanduiche", "nuggets", "empanado", "empanados", "steak de frango",
    ],
  },
  {
    id: "paes", icon: "🥖", label: "Pães e massas", words: [
      "pao", "paes", "pao de queijo", "croissant", "baguete", "bisnaga", "broa", "brioche", "ciabatta", "bagel",
      "tortilla", "tortilha", "wrap", "rap10", "pita", "sirio", "esfiha", "esfirra", "salgado", "salgadinho",
      "coxinha", "pastel", "empada", "empadinha", "enroladinho", "folhado", "massa", "massa de pastel",
      "massa de pizza", "disco de pizza", "macarrao", "espaguete", "talharim", "fettuccine", "penne", "lasanha massa",
      "waffle", "torrada", "bolinho", "pao de batata", "pao frances", "pao integral", "pao de forma", "biscoito",
    ],
  },
  {
    id: "doces", icon: "🍨", label: "Sorvetes e doces", words: [
      "sorvete", "picole", "gelato", "sobremesa", "pudim", "mousse", "brigadeiro", "doce", "chocolate", "cheesecake",
      "pave", "bolo", "torta doce", "torta de limao", "petit gateau", "brownie", "cookie", "cookies", "trufa",
      "bombom", "geleia", "chantilly", "sorbet", "frozen", "milkshake", "acai na tigela",
    ],
  },
  {
    id: "bebidas", icon: "🧊", label: "Bebidas e gelo", words: [
      "gelo", "cubo de gelo", "suco", "cerveja", "refrigerante", "vodka", "agua", "agua de coco", "cha", "cafe",
      "vinho", "espumante", "drink", "caipirinha", "isotonico", "energetico",
    ],
  },
  {
    id: "frios", icon: "🧀", label: "Queijos e frios", words: [
      "queijo", "mussarela", "mucarela", "muçarela", "parmesao", "provolone", "gorgonzola", "ricota", "requeijao",
      "cream cheese", "catupiry", "queijo coalho", "queijo minas", "queijo prato", "manteiga", "margarina", "iogurte", "leite",
      "creme de leite", "nata", "presunto", "mortadela", "salame", "peito de peru", "blanquet", "lombo canadense",
      "apresuntado", "pepperoni",
    ],
  },
  {
    id: "peixe", icon: "🐟", label: "Peixes e frutos do mar", words: [
      "peixe", "tilapia", "salmao", "atum", "bacalhau", "merluza", "pescada", "sardinha", "truta", "cacao", "robalo",
      "linguado", "pintado", "tambaqui", "tucunare", "dourado", "pargo", "namorado", "polaca", "panga", "saint peter",
      "camarao", "lula", "polvo", "marisco", "mexilhao", "vieira", "siri", "caranguejo", "lagosta", "ostra", "kani",
      "kani kama", "surimi", "file de peixe", "anel de lula",
    ],
  },
  {
    id: "frango", icon: "🍗", label: "Frango e aves", words: [
      "frango", "galinha", "galeto", "coxa", "sobrecoxa", "asa", "asinha", "drumet", "tulipa", "sassami", "peito",
      "file de frango", "coracao", "coracao de frango", "moela", "figado de frango", "peru", "chester", "pato",
      "codorna", "ave", "aves",
    ],
  },
  {
    id: "carne", icon: "🥩", label: "Carnes", words: [
      "carne", "bife", "alcatra", "patinho", "picanha", "maminha", "fraldinha", "contrafile", "contra file", "file mignon",
      "mignon", "acem", "musculo", "costela", "cupim", "coxao", "coxao mole", "coxao duro", "lagarto", "paleta",
      "moida", "moido", "carne moida", "hamburguer", "hamburger", "almondegas", "carne seca", "charque", "jerked beef",
      "figado", "bisteca", "lombo", "pernil", "porco", "suino", "barriga", "barriga de porco", "panceta", "torresmo",
      "linguica", "salsicha", "bacon", "costelinha", "cordeiro", "carneiro", "cabrito", "vitela", "rabada",
      "ossobuco", "kafta", "chuleta", "t-bone", "ancho", "chorizo", "prime rib", "tomahawk", "steak", "espetinho", "churrasco",
    ],
  },
  {
    id: "vegetais", icon: "🥦", label: "Legumes e verduras", words: [
      "brocolis", "couve", "couve flor", "couve-flor", "espinafre", "ervilha", "vagem", "milho", "cenoura", "abobora",
      "abobrinha", "berinjela", "legume", "legumes", "seleta", "seleta de legumes", "mandioca", "aipim", "macaxeira",
      "batata", "batata doce", "batata-doce", "batata palito", "batata frita", "inhame", "cara", "quiabo", "pimentao",
      "cebola", "alho", "tomate", "chuchu", "beterraba", "jilo", "vegetais", "verdura", "verduras", "edamame",
      "cheiro verde", "salsinha", "cebolinha", "coentro", "manjericao", "gengibre", "pimenta", "palmito", "cogumelo",
      "champignon", "shimeji", "shitake", "repolho", "acelga", "rucula", "alface", "pupunha", "maxixe",
    ],
  },
  {
    id: "frutas", icon: "🍓", label: "Frutas e polpas", words: [
      "fruta", "frutas", "polpa", "acai", "morango", "manga", "maracuja", "acerola", "goiaba", "caja", "caju",
      "abacaxi", "uva", "banana", "framboesa", "mirtilo", "blueberry", "amora", "cupuacu", "graviola", "limao",
      "laranja", "pessego", "coco", "frutas vermelhas", "cereja", "kiwi", "melancia", "melao", "mamao", "pitaya",
      "tamarindo", "seriguela", "umbu", "jabuticaba", "abacate", "maca", "pera", "ameixa", "figo",
    ],
  },
  { id: "outros", icon: "📦", label: "Outros", words: [] },
];

const BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
export const catById = id => BY_ID[id] || BY_ID.outros;

// Also folds the -ões / -ães plurals into -ão ("camarões" → "camarao", "pães" → "pao").
const clean = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").replace(/(oes|aes)(?= |$)/g, "ao").trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One regex per category: any keyword as whole words, optional plural ending.
const MATCHERS = CATEGORIES.filter(c => c.words.length).map(c => ({
  id: c.id,
  re: new RegExp(`(?:^| )(?:${[...new Set(c.words.map(clean))].sort((a, b) => b.length - a.length).map(esc).join("|")})(?:s|es)?(?= |$)`),
}));

export function guessCategory(name) {
  const n = clean(name);
  if (!n) return "outros";
  for (const m of MATCHERS) if (m.re.test(n)) return m.id;
  return "outros";
}

// The category to show: the one picked by hand, or the guess from the name.
export const categoryOf = it => (it.cat && BY_ID[it.cat] ? it.cat : guessCategory(it.name));
