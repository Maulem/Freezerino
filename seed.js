// Mom's paper list (photo from 2026-11-15), loaded once into Firestore on first login.
// qty null + check true = the count was scribbled or unreadable on paper; confirm in the app.
export const SEED_ITEMS = [
  { id: "alcatra-fracionada", name: "Alcatra fracionada", place: "p1", qty: null, check: true },
  { id: "frango-strogonoff", name: "Frango (strogonoff)", place: "p1", qty: null, check: true },
  { id: "sassami", name: "Sassami", place: "p1", qty: 2, check: false },
  { id: "asa-frango-arroz", name: "Asa de frango com arroz", place: "p1", qty: 1, check: false },
  { id: "pao-hamburguer", name: "Pão de hambúrguer", place: "p1", qty: 2, check: false },
  { id: "croissant", name: "Croissant", place: "p1", qty: 1, check: false },

  { id: "feijao-preto", name: "Feijão preto", place: "p2", qty: 1, check: false },
  { id: "brocolis", name: "Brócolis", place: "p2", qty: null, check: true },
  { id: "alho", name: "Alho", place: "p2", qty: 3, check: false },
  { id: "guioza", name: "Guioza", place: "p2", qty: 2, check: false },
  { id: "lentilha-p2", name: "Lentilha", place: "p2", qty: 1, check: false },

  { id: "pao-de-queijo", name: "Pão de queijo", place: "p3", qty: 2, check: false },
  { id: "barriga-porco", name: "Barriga de porco", place: "p3", qty: 2, check: false },
  { id: "lentilha-p3", name: "Lentilha", place: "p3", qty: 1, check: false },
  { id: "pao-integral-lu", name: "Pão integral Lu", place: "p3", qty: null, check: true },

  { id: "peito-frango", name: "Peito de frango", place: "g1", qty: 3, check: false },
  { id: "moela", name: "Moela", place: "g1", qty: null, check: true },
  { id: "linguica-portuguesa", name: "Linguiça portuguesa", place: "g1", qty: 4, check: false },
  { id: "salsicha", name: "Salsicha", place: "g1", qty: 1, check: false },

  { id: "linguica-calabresa", name: "Linguiça calabresa", place: "g2", qty: 4, check: false },
  { id: "lula", name: "Lula", place: "g2", qty: null, check: true },
  { id: "seleta-legumes", name: "Seleta de legumes", place: "g2", qty: 1, check: false },
];
