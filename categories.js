// Food categories, guessed from the name by keywords (no internet or AI needed).
// Order matters: the first category with a matching word wins, so dishes come before the ingredients
// they contain ("Asa de frango com arroz" is a ready meal, "Massa de pastel" is pasta, "Peito de peru" is a cold cut).
// Keywords are matched as whole words, without accents or case, also in the plural (+s, +es, -ões/-ães → -ão).
// months = suggested freezer time for the category; `long`/`short` list words that change it.

export const CATEGORIES = [
  {
    id: "prontos", icon: "🍲", label: "Comidas prontas", months: 3, words: [
      "strogonoff", "estrogonofe", "estrogonoff", "feijoada", "arroz", "risoto", "sopa", "caldo", "canja", "creme de abobora",
      "ao molho", "lasanha a bolonhesa", "escondidinho", "pure", "marmita", "refeicao", "ensopado", "guisado", "bolonhesa",
      "ragu", "farofa", "yakisoba", "galinhada", "moqueca", "empadao", "quiche", "chili", "curry", "dobradinha", "mocoto",
      "sobra", "sobras", "almondega", "almondegas", "omelete", "torta salgada", "baiao", "tutu", "virado", "picadinho",
      "carne de panela", "salpicao", "fricasse", "bobo", "vatapa", "xinxim", "sarapatel", "rabada", "cozido", "panelada",
      "frango assado", "frango xadrez", "frango com", "carne com", "com arroz", "com batata", "com legumes",
      "parmegiana", "a parmegiana", "milanesa", "empanado", "steak de frango", "cordon bleu",
      "feijao tropeiro", "tropeiro", "arroz carreteiro", "carreteiro", "polenta", "angu", "cuscuz", "pirao", "tapioca recheada",
      "comida", "prato pronto", "congelado pronto", "sopao", "minestrone",
    ],
  },
  {
    id: "massas", icon: "🍝", label: "Massas", months: 3, words: [
      "massa", "massas", "macarrao", "espaguete", "spaghetti", "talharim", "fettuccine", "penne", "parafuso", "fusilli",
      "lasanha", "nhoque", "gnocchi", "ravioli", "capeletti", "cappelletti", "canelone", "rondelli", "tortei", "conchiglione",
      "massa fresca", "massa de pastel", "massa de pizza", "disco de pizza", "massa de lasanha", "massa folhada", "talharine",
      "udon", "lamen", "ramen", "miojo", "bifum",
    ],
  },
  {
    id: "salgados", icon: "🥟", label: "Salgados e petiscos", months: 3, words: [
      "guioza", "gyoza", "dumpling", "rolinho", "rolinho primavera", "harumaki", "pastel", "pasteis", "coxinha",
      "esfiha", "esfirra", "empada", "empadinha", "quibe", "kibe", "enroladinho", "risole", "risoles", "bolinha de queijo",
      "bolinho", "bolinho de bacalhau", "croquete", "salgado", "salgadinho", "petisco",
      "nugget", "pao de queijo", "chipa", "pizza", "mini pizza", "calzone", "sanduiche", "misto", "lanche",
      "hot pocket", "burrito", "taco", "samosa", "spring roll", "shumai", "baozi", "onion rings",
      "batata smile", "smile", "tequeno", "dadinho", "dadinho de tapioca", "acaraje", "trouxinha", "folhado",
    ],
  },
  {
    id: "paes", icon: "🥖", label: "Pães", months: 3, words: [
      "pao", "croissant", "baguete", "bisnaga", "bisnaguinha", "broa", "brioche", "ciabatta", "bagel", "tortilla",
      "tortilha", "wrap", "rap10", "pita", "pao sirio", "sirio", "focaccia", "pao frances", "pao de forma", "pao integral",
      "pao de batata", "pao de hamburguer", "pao de hot dog", "pao australiano", "pao de leite", "sovado", "torrada",
      "waffle", "panqueca", "crepe", "massa de crepe", "tapioca", "goma de tapioca", "biscoito", "bolacha", "muffin",
      "rosca", "cuca", "sonho",
    ],
  },
  {
    id: "doces", icon: "🍨", label: "Sorvetes e doces", months: 2, words: [
      "sorvete", "picole", "gelato", "sobremesa", "pudim", "mousse", "brigadeiro", "doce", "chocolate", "cheesecake",
      "pave", "bolo", "torta doce", "torta de limao", "petit gateau", "brownie", "cookie", "trufa", "bombom", "geleia",
      "chantilly", "sorbet", "frozen", "milkshake", "acai na tigela", "acai com", "creme de acai", "sacole", "geladinho",
      "chup chup", "dindin", "gelinho", "torta de morango", "banoffee", "tiramisu", "profiterole", "churros", "beijinho",
      "doce de leite", "leite condensado", "cobertura", "massa de bolo", "cupcake", "donut", "rosquinha", "pao de mel",
    ],
  },
  {
    id: "bebidas", icon: "🧊", label: "Bebidas e gelo", months: 12, words: [
      "gelo", "cubo de gelo", "gelo de coco", "suco", "cerveja", "refrigerante", "vodka", "agua",
      "agua de coco", "cha", "cafe", "vinho", "espumante", "drink", "caipirinha", "isotonico", "energetico", "leite de coco",
      "kombucha", "limonada", "batida", "gin", "whisky", "licor", "cachaca", "smoothie",
    ],
  },
  {
    id: "embutidos", icon: "🌭", label: "Embutidos e frios", months: 2, words: [
      "linguica", "salsicha", "salsichao", "calabresa", "bacon", "presunto", "apresuntado", "mortadela", "salame", "copa",
      "peito de peru", "blanquet", "lombo canadense", "pepperoni", "chorizo", "paio", "toucinho", "torresmo", "salaminho",
      "frios", "hot dog", "cachorro quente", "kassler", "fiambre", "pastrami", "jamon", "presunto parma", "parma",
      "linguica toscana", "linguica de frango", "linguica portuguesa", "linguica calabresa", "chourico",
    ],
  },
  {
    id: "frios", icon: "🧀", label: "Queijos e laticínios", months: 4, words: [
      "queijo", "mussarela", "mucarela", "parmesao", "provolone", "gorgonzola", "ricota", "requeijao", "cream cheese",
      "catupiry", "coalho", "queijo minas", "queijo prato", "cheddar", "brie", "camembert", "gouda", "emmental",
      "mascarpone", "burrata", "manteiga", "margarina", "iogurte", "leite", "creme de leite", "nata", "coalhada", "kefir",
      "leite em po", "ghee",
    ],
  },
  {
    id: "graos", icon: "🌾", label: "Feijão e grãos", months: 6, words: [
      "feijao", "feijao preto", "feijao carioca", "feijao branco", "feijao fradinho", "feijao verde", "lentilha",
      "grao de bico", "grao-de-bico", "ervilha seca", "ervilha partida", "soja", "edamame", "milho cozido", "canjica",
      "quinoa", "aveia", "trigo", "cevada", "hummus", "homus",
    ],
  },
  {
    id: "temperos", icon: "🧄", label: "Temperos e molhos", months: 6, words: [
      "alho", "alho picado", "alho poro", "cebola", "cebola picada", "cheiro verde", "salsinha", "cebolinha", "coentro",
      "manjericao", "hortela", "alecrim", "tomilho", "louro", "oregano", "gengibre", "pimenta", "pimenta dedo de moca",
      "molho", "molho de tomate", "molho branco", "molho pesto", "pesto", "extrato de tomate", "polpa de tomate",
      "tempero", "tempero caseiro", "refogado", "sofrito", "pasta de alho", "caldo caseiro", "fundo", "demi glace",
      "chimichurri", "vinagrete", "suco de limao", "raspas",
    ],
  },
  {
    id: "peixe", icon: "🐟", label: "Peixes e frutos do mar", months: 4, words: [
      "peixe", "tilapia", "salmao", "atum", "bacalhau", "merluza", "pescada", "sardinha", "truta", "cacao", "robalo",
      "linguado", "pintado", "tambaqui", "tucunare", "dourado", "pargo", "namorado", "polaca", "panga", "saint peter",
      "pirarucu", "pacu", "badejo", "garoupa", "corvina", "anchova", "cavala", "camarao", "lula", "polvo", "marisco",
      "mexilhao", "vieira", "siri", "caranguejo", "lagosta", "ostra", "kani", "kani kama", "surimi", "file de peixe",
      "anel de lula", "frutos do mar", "posta", "lombo de bacalhau", "sashimi", "sushi", "temaki",
    ],
  },
  {
    id: "frango", icon: "🍗", label: "Frango e aves", months: 9,
    long: { "frango inteiro": 12, "galinha inteira": 12, "peru inteiro": 12, "chester": 12 },
    short: { "frango moido": 3, "frango desfiado": 3, "coracao": 3, "moela": 3, "figado de frango": 3 },
    words: [
      "frango", "galinha", "galeto", "coxa", "sobrecoxa", "asa", "asinha", "drumet", "tulipa", "sassami", "peito",
      "file de frango", "coracao", "coracao de frango", "moela", "figado de frango", "peru", "chester", "pato",
      "codorna", "ave", "frango inteiro", "frango a passarinho", "meio da asa", "pe de galinha", "pescoco",
      "frango desfiado", "frango moido",
    ],
  },
  {
    id: "porco", icon: "🐖", label: "Carne de porco", months: 6, words: [
      "porco", "suino", "suina", "barriga", "barriga de porco", "pernil", "lombo", "lombo suino", "bisteca", "costelinha",
      "costela suina", "costelinha de porco", "panceta", "picanha suina", "pe de porco", "orelha", "rabo de porco",
      "pururuca", "leitao", "file suino", "file mignon suino", "carre", "secreto", "pancetta",
    ],
  },
  {
    id: "carne", icon: "🥩", label: "Carne bovina", months: 9,
    short: { "moida": 3, "moido": 3, "hamburguer": 3, "hamburger": 3, "figado": 3, "kafta": 3, "lingua": 3, "bucho": 3 },
    words: [
      "carne", "bife", "alcatra", "patinho", "picanha", "maminha", "fraldinha", "contrafile", "contra file", "file mignon",
      "mignon", "acem", "musculo", "costela", "costela bovina", "cupim", "coxao", "coxao mole", "coxao duro", "lagarto",
      "paleta", "moida", "moido", "carne moida", "hamburguer", "hamburger", "carne seca", "charque", "jerked beef",
      "figado", "cordeiro", "carneiro", "cabrito", "vitela", "ossobuco", "kafta", "chuleta", "t-bone", "ancho",
      "prime rib", "tomahawk", "steak", "espetinho", "churrasco", "bombom de alcatra", "miolo da alcatra",
      "assado", "cubos de carne", "carne em cubos", "carne em tiras", "iscas", "lingua", "rim", "bucho",
      "denver", "flat iron", "short rib", "brisket", "peito bovino", "fraldao", "capa de file", "file de costela",
    ],
  },
  {
    id: "vegetais", icon: "🥦", label: "Legumes e verduras", months: 12, words: [
      "brocolis", "couve", "couve flor", "couve-flor", "couve de bruxelas", "espinafre", "ervilha", "vagem", "milho",
      "milho verde", "cenoura", "abobora", "abobrinha", "berinjela", "legume", "seleta", "seleta de legumes",
      "mandioca", "aipim", "macaxeira", "batata", "batata doce", "batata-doce", "batata palito", "batata frita",
      "batata pre frita", "inhame", "cara", "quiabo", "pimentao", "tomate", "chuchu", "beterraba", "jilo", "vegetais",
      "verdura", "palmito", "cogumelo", "champignon", "shimeji", "shitake", "repolho", "acelga", "rucula",
      "alface", "pupunha", "maxixe", "aspargo", "alcachofra", "mix de legumes", "mix de vegetais", "jardineira", "nabo",
      "rabanete", "mandioquinha", "batata baroa", "taioba", "ora pro nobis", "tofu",
    ],
  },
  {
    id: "frutas", icon: "🍓", label: "Frutas e polpas", months: 9, words: [
      "fruta", "polpa", "acai", "morango", "manga", "maracuja", "acerola", "goiaba", "caja", "caju", "abacaxi",
      "uva", "banana", "framboesa", "mirtilo", "blueberry", "amora", "cupuacu", "graviola", "limao", "laranja", "pessego",
      "coco", "coco ralado", "frutas vermelhas", "cereja", "kiwi", "melancia", "melao", "mamao", "pitaya", "tamarindo",
      "seriguela", "umbu", "jabuticaba", "abacate", "maca", "pera", "ameixa", "figo", "caqui", "lichia", "carambola",
      "bacuri", "buriti", "murici", "mangaba", "taperaba", "jaca", "pinha", "fruta do conde", "atemoia", "tangerina",
      "mexerica", "bergamota", "cranberry",
    ],
  },
  { id: "outros", icon: "📦", label: "Outros", months: 3, words: [] },
];

const BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
export const catById = id => BY_ID[id] || BY_ID.outros;

// Lower case, no accents, only letters/digits/spaces, -ões/-ães folded into -ão ("camarões" → "camarao").
export const clean = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").replace(/(oes|aes)(?= |$)/g, "ao").trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordsRe = list => new RegExp(`(?:^| )(?:${[...new Set(list.map(clean))].sort((a, b) => b.length - a.length).map(esc).join("|")})(?:s|es)?(?= |$)`);

const MATCHERS = CATEGORIES.filter(c => c.words.length).map(c => ({ id: c.id, re: wordsRe(c.words) }));

/* ---------- what the family taught the app ---------- */
// learned = { "cleaned food name": categoryId }, shared through the database (meta/cats).
let learned = {};
let learnedList = [];
export function setLearned(map) {
  learned = map || {};
  // longest names first, so "pao de mel caseiro" wins over "pao de mel"
  learnedList = Object.entries(learned).filter(([k, v]) => k && BY_ID[v]).sort((a, b) => b[0].length - a[0].length)
    .map(([k, v]) => ({ id: v, re: new RegExp(`(?:^| )${esc(k)}(?:s|es)?(?= |$)`) }));
}

export function guessCategory(name) {
  const n = clean(name);
  if (!n) return "outros";
  if (learned[n] && BY_ID[learned[n]]) return learned[n];
  for (const m of learnedList) if (m.re.test(n)) return m.id;
  for (const m of MATCHERS) if (m.re.test(n)) return m.id;
  return "outros";
}

// The category to show: the one picked by hand for this food, or the guess from the name.
export const categoryOf = it => (it.cat && BY_ID[it.cat] ? it.cat : guessCategory(it.name));

// Suggested freezer time in months for a food name (+ optional category picked by hand).
export function suggestMonths(name, catId) {
  const c = catById(catId || guessCategory(name));
  const n = clean(name);
  for (const table of [c.short, c.long]) {
    if (!table) continue;
    const hit = Object.keys(table).sort((a, b) => b.length - a.length).find(k => wordsRe([k]).test(n));
    if (hit) return table[hit];
  }
  return c.months;
}
