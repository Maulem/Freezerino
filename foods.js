// Food names suggested while typing (autocomplete). Plain list, grouped only to keep it readable.
// Foods already in the freezers and names the family typed before are suggested too (see app.js).

export const FOODS = [
  // Carne bovina
  "Acém", "Acém em cubos", "Alcatra", "Alcatra em bifes", "Alcatra em cubos", "Alcatra fracionada", "Ancho", "Bife",
  "Bife de alcatra", "Bife de contrafilé", "Bife de fígado", "Bife de patinho", "Bife a rolê", "Bombom de alcatra",
  "Brisket", "Capa de filé", "Carne em cubos", "Carne em tiras", "Carne moída", "Carne moída de patinho",
  "Carne moída de acém", "Carne para churrasco", "Carne para estrogonofe", "Carne para picadinho", "Carne seca",
  "Carne seca dessalgada", "Charque", "Chuleta", "Contrafilé", "Contrafilé em bifes", "Costela bovina", "Costela de boi",
  "Costela em tiras", "Coxão duro", "Coxão mole", "Cupim", "Denver steak", "Espetinho de carne", "Fígado bovino",
  "Filé mignon", "Filé mignon em medalhões", "Flat iron", "Fraldinha", "Fraldão", "Hambúrguer", "Hambúrguer artesanal",
  "Hambúrguer bovino", "Iscas de carne", "Iscas de fígado", "Jerked beef", "Kafta", "Lagarto", "Língua bovina", "Maminha",
  "Miolo da alcatra", "Músculo", "Ossobuco", "Paleta bovina", "Patinho", "Patinho moído", "Peito bovino", "Picanha",
  "Picanha fatiada", "Prime rib", "Rabada", "Short rib", "T-bone", "Tomahawk", "Bucho", "Mocotó", "Cordeiro",
  "Costela de cordeiro", "Pernil de cordeiro", "Carré de cordeiro", "Cabrito", "Carneiro", "Vitela",

  // Porco
  "Barriga de porco", "Bisteca suína", "Copa lombo", "Costela suína", "Costelinha de porco", "Costelinha suína",
  "Filé mignon suíno", "Lombo suíno", "Lombo em fatias", "Panceta", "Pé de porco", "Orelha de porco", "Rabo de porco",
  "Pernil suíno", "Pernil desfiado", "Picanha suína", "Secreto suíno", "Carré suíno", "Leitão", "Torresmo",
  "Carne de porco moída", "Lombo recheado",

  // Embutidos e frios
  "Peito de peru assado", "Bacon", "Bacon em cubos", "Bacon fatiado", "Calabresa", "Calabresa fatiada", "Chorizo", "Linguiça", "Linguiça calabresa",
  "Linguiça de frango", "Linguiça de pernil", "Linguiça mineira", "Linguiça portuguesa", "Linguiça toscana", "Linguiça apimentada",
  "Paio", "Salsicha", "Salsicha de frango", "Salsichão", "Salame", "Salaminho", "Presunto", "Presunto parma", "Apresuntado",
  "Mortadela", "Peito de peru", "Blanquet de peru", "Lombo canadense", "Pepperoni", "Pastrami", "Toucinho", "Kassler",

  // Frango e aves
  "Asa de frango", "Asinha de frango", "Coração de frango", "Coxa de frango", "Coxa e sobrecoxa", "Coxinha da asa",
  "Drumet", "Filé de frango", "Filé de peito de frango", "Frango a passarinho", "Frango desfiado", "Frango em cubos",
  "Frango em tiras", "Frango inteiro", "Frango moído", "Frango temperado", "Fígado de frango", "Galeto", "Galinha caipira",
  "Meio da asa", "Moela", "Pé de galinha", "Peito de frango", "Peito de frango com osso", "Peito de frango desfiado",
  "Sassami", "Sobrecoxa", "Sobrecoxa sem osso", "Tulipa", "Chester", "Peru inteiro", "Pato",
  "Magret de pato", "Codorna", "Espetinho de frango", "Hambúrguer de frango", 

  // Peixes e frutos do mar
  "Anchova", "Atum", "Bacalhau", "Bacalhau dessalgado", "Lombo de bacalhau", "Badejo", "Cação", "Cavala", "Corvina",
  "Dourado", "Filé de merluza", "Filé de peixe", "Filé de pescada", "Filé de tilápia", "Garoupa", "Linguado", "Merluza",
  "Namorado", "Pacu", "Panga", "Pargo", "Pescada", "Pintado", "Pirarucu", "Polaca do Alasca", "Posta de peixe", "Robalo",
  "Saint Peter", "Salmão", "Filé de salmão", "Sardinha", "Tambaqui", "Tilápia", "Truta", "Tucunaré", "Camarão",
  "Camarão cinza", "Camarão rosa", "Camarão limpo", "Camarão com casca", "Camarão empanado", "Lula", "Anéis de lula",
  "Polvo", "Mexilhão", "Marisco", "Vieira", "Siri", "Carne de siri", "Caranguejo", "Lagosta", "Ostra", "Kani kama",
  "Surimi", "Frutos do mar", "Mix de frutos do mar", "Peixe empanado", "Iscas de peixe", "Hambúrguer de peixe",
  "Sushi", "Temaki",

  // Queijos e laticínios
  "Queijo", "Queijo minas", "Queijo minas frescal", "Queijo prato", "Queijo coalho", "Queijo muçarela", "Muçarela ralada",
  "Muçarela fatiada", "Queijo parmesão", "Parmesão ralado", "Provolone", "Gorgonzola", "Cheddar", "Brie", "Camembert",
  "Gouda", "Emmental", "Burrata", "Mascarpone", "Ricota", "Requeijão", "Cream cheese", "Catupiry", "Manteiga",
  "Manteiga sem sal", "Margarina", "Ghee", "Iogurte", "Iogurte natural", "Leite", "Creme de leite", "Nata", "Coalhada",
  "Kefir",

  // Feijão e grãos
  "Feijão", "Feijão preto", "Feijão carioca", "Feijão branco", "Feijão fradinho", "Feijão verde", "Feijão cozido",
  "Feijão temperado", "Lentilha", "Lentilha cozida", "Grão-de-bico", "Grão-de-bico cozido", "Ervilha seca", "Soja",
  "Edamame", "Canjica", "Quinoa", "Homus",

  // Temperos e molhos
  "Alho", "Alho picado", "Alho descascado", "Alho-poró", "Cebola", "Cebola picada", "Cebola caramelizada", "Cheiro-verde",
  "Salsinha", "Cebolinha", "Coentro", "Manjericão", "Hortelã", "Alecrim", "Tomilho", "Gengibre", "Gengibre ralado",
  "Pimenta", "Pimenta dedo-de-moça", "Pimenta biquinho", "Molho de tomate", "Molho de tomate caseiro", "Molho branco",
  "Molho bolonhesa", "Molho pesto", "Pesto", "Extrato de tomate", "Polpa de tomate", "Tempero caseiro", "Tempero verde",
  "Refogado", "Pasta de alho", "Caldo caseiro", "Caldo de carne", "Caldo de frango", "Caldo de legumes", "Fundo de carne",
  "Chimichurri", "Vinagrete", "Suco de limão", "Raspas de limão",

  // Legumes e verduras
  "Abóbora", "Abóbora cabotiá", "Abóbora em cubos", "Abobrinha", "Acelga", "Aipim", "Alcachofra", "Aspargo", "Batata",
  "Batata-doce", "Batata frita", "Batata palito", "Batata pré-frita", "Batata rústica", "Berinjela",
  "Beterraba", "Brócolis", "Brócolis ninja", "Cará", "Cenoura", "Cenoura em cubos", "Chuchu", "Cogumelo", "Champignon",
  "Shimeji", "Shiitake", "Couve", "Couve picada", "Couve-flor", "Couve-de-bruxelas", "Ervilha", "Ervilha congelada",
  "Espinafre", "Inhame", "Jardineira de legumes", "Jiló", "Legumes", "Legumes para sopa", "Macaxeira", "Mandioca",
  "Mandioca cozida", "Mandioquinha", "Maxixe", "Milho", "Milho verde", "Milho em espiga", "Mix de legumes",
  "Mix de vegetais", "Nabo", "Palmito", "Palmito pupunha", "Pimentão", "Pimentão vermelho", "Pimentão amarelo",
  "Quiabo", "Rabanete", "Repolho", "Rúcula", "Seleta de legumes", "Taioba", "Tomate", "Tomate pelado", "Tofu", "Vagem",
  "Ora-pro-nóbis",

  // Frutas e polpas
  "Abacate", "Abacaxi", "Abacaxi em cubos", "Açaí", "Polpa de açaí", "Acerola", "Polpa de acerola", "Ameixa", "Amora",
  "Atemoia", "Bacuri", "Banana", "Banana congelada", "Buriti", "Cajá", "Polpa de cajá", "Caju", "Polpa de caju",
  "Caqui", "Carambola", "Cereja", "Coco", "Coco ralado", "Cranberry", "Cupuaçu", "Polpa de cupuaçu", "Figo",
  "Framboesa", "Frutas vermelhas", "Goiaba", "Polpa de goiaba", "Graviola", "Polpa de graviola", "Jabuticaba", "Jaca",
  "Kiwi", "Laranja", "Lichia", "Limão", "Maçã", "Mamão", "Manga", "Polpa de manga", "Maracujá", "Polpa de maracujá",
  "Melancia", "Melão", "Mexerica", "Mirtilo", "Morango", "Polpa de morango", "Pera", "Pêssego", "Pitaya", "Seriguela",
  "Tamarindo", "Polpa de tamarindo", "Tangerina", "Umbu", "Uva", "Uva verde", "Polpa de fruta", "Mix de frutas",

  // Pães
  "Pão ralado", "Massa de pão", "Pão", "Pão francês", "Pão de forma", "Pão integral", "Pão de hambúrguer", "Pão de hot dog", "Pão sírio",
  "Pão australiano", "Pão de batata", "Pão de leite", "Pão sovado", "Pão italiano", "Pão de fermentação natural",
  "Pão de alho", "Pão caseiro", "Baguete", "Bisnaga", "Bisnaguinha", "Broa de milho", "Brioche", "Ciabatta", "Croissant",
  "Focaccia", "Bagel", "Tortilha", "Wrap", "Rap10", "Torrada", "Waffle", "Panqueca", "Crepe", "Massa de tapioca",
  "Biscoito", "Muffin", "Rosca", "Cuca", "Sonho",

  // Massas
  "Massa fresca", "Macarrão", "Espaguete", "Talharim", "Fettuccine", "Penne", "Parafuso", "Nhoque", "Nhoque de batata",
  "Ravioli", "Capeletti", "Canelone", "Rondelli", "Tortei", "Lasanha", "Lasanha de carne", "Lasanha de frango",
  "Lasanha bolonhesa", "Lasanha de berinjela", "Massa de lasanha", "Massa de pastel", "Massa de pizza", "Disco de pizza",
  "Massa folhada", "Massa de torta", "Udon", "Lámen", 

  // Salgados e petiscos
  "Batata smile", "Bolinho de bacalhau", "Nuggets de frango", "Pão de queijo", "Pão de queijo recheado", "Chipa", "Coxinha", "Coxinha de frango", "Mini coxinha", "Esfiha",
  "Esfiha de carne", "Esfiha de queijo", "Empada", "Empadinha", "Pastel", "Pastel de carne", "Pastel de queijo",
  "Pastel de frango", "Risole", "Quibe", "Quibe recheado", "Enroladinho de salsicha", "Bolinha de queijo", "Croquete",
  "Bolinho de arroz", "Bolinho de mandioca", "Salgadinhos", "Mini pizza", "Pizza", "Pizza de calabresa", "Pizza de muçarela",
  "Pizza margherita", "Pizza de frango", "Pizza portuguesa", "Calzone", "Guioza", "Guioza de carne", "Guioza de frango",
  "Guioza de legumes", "Dumpling", "Rolinho primavera", "Harumaki", "Shumai", "Samosa", "Burrito", "Hot pocket",
  "Misto quente", "Sanduíche", "Dadinho de tapioca", "Acarajé", "Tequeño", "Onion rings", "Folhado",

  // Comidas prontas
  "Empadão", "Yakisoba", "Cordon bleu", "Frango à parmegiana", "Frango à milanesa", "Steak de frango", "Empanado de frango", "Arroz", "Arroz branco", "Arroz integral", "Arroz de forno", "Arroz carreteiro", "Risoto", "Risoto de cogumelos",
  "Feijoada", "Feijão tropeiro", "Baião de dois", "Tutu de feijão", "Virado à paulista", "Estrogonofe",
  "Estrogonofe de frango", "Estrogonofe de carne", "Frango (strogonoff)", "Escondidinho", "Escondidinho de carne seca",
  "Escondidinho de frango", "Purê de batata", "Purê de mandioquinha", "Sopa", "Sopa de legumes", "Sopa de feijão",
  "Canja", "Caldo verde", "Creme de abóbora", "Creme de mandioquinha", "Minestrone", "Molho à bolonhesa",
  "Almôndegas", "Almôndegas ao molho", "Carne moída refogada", "Picadinho", "Carne de panela pronta", "Ensopado",
  "Frango ao molho", "Frango assado", "Frango xadrez", "Galinhada", "Moqueca", "Moqueca de peixe", "Bobó de camarão",
  "Vatapá", "Rabada pronta", "Dobradinha", "Panqueca de carne", "Panqueca de frango", "Omelete", "Quiche",
  "Torta salgada", "Torta de frango", "Salpicão", "Farofa", "Polenta", "Cuscuz", "Marmita", "Marmita fit", "Sobras",
  "Parmegiana", "Bife à parmegiana", "Filé à parmegiana", "Bife à milanesa", "Curry", "Chili", "Yakisoba pronto",
  "Asa de frango com arroz",

  // Sorvetes e doces
  "Sorvete", "Sorvete de chocolate", "Sorvete de creme", "Sorvete de morango", "Sorvete napolitano", "Picolé", "Gelato",
  "Açaí na tigela", "Creme de açaí", "Sacolé", "Geladinho", "Bolo", "Bolo de chocolate", "Bolo de cenoura",
  "Bolo de fubá", "Bolo de aniversário", "Fatia de bolo", "Torta doce", "Torta de limão", "Torta de morango",
  "Cheesecake", "Pudim", "Mousse", "Mousse de maracujá", "Pavê", "Brigadeiro", "Beijinho", "Brownie", "Cookie",
  "Massa de cookie", "Petit gâteau", "Trufa", "Bombom", "Churros", "Tiramisù", "Banoffee", "Doce de leite", "Geleia",
  "Chantilly", "Cupcake", "Donut", "Pão de mel",

  // Bebidas e gelo
  "Gelo", "Gelo em cubos", "Gelo de coco", "Gelo saborizado", "Suco", "Suco de laranja", "Suco de uva", "Suco natural",
  "Água de coco", "Leite de coco", "Cerveja", "Vodka", "Refrigerante", "Vinho", "Espumante", "Kombucha", "Limonada",
  "Café", "Chá gelado", "Smoothie",

  // Outros
  "Ração", "Comida do cachorro", "Comida do gato", "Papinha", "Papinha de bebê", "Leite materno", "Fermento", "Fermento fresco",
  "Ovos", "Clara de ovo", "Gema de ovo", "Castanhas", "Nozes", "Amendoim", "Farinha", 
  "Gordura", "Banha", "Bolsa térmica", "Gelo reutilizável",
];
