import { cap, makeSounds, type YoungTranslation } from '../youngLang';

/** Young readers in French (Reading Intelligence phase 5). Written for BooksAtlas, in the order of the English. */
const fr: YoungTranslation = {
  voice: 'fr-FR',
  find: (w) => `Où est ${w} ?`,
  right: (w) => `Oui ! ${cap(w)} !`,
  tryAgain: (w) => `Ça, c’est ${w}. Essaie encore !`,
  // Letter sounds in French (phase 6): each letter with a word, then letters that work together and vowel sounds.
  sounds: makeSounds([
    ['a', 'ananas', '🍍'], ['b', 'ballon', '🎈'], ['c', 'canard', '🦆'], ['d', 'dauphin', '🐬'], ['e', 'escargot', '🐌'], ['f', 'fraise', '🍓'],
    ['g', 'gâteau', '🎂'], ['h', 'hibou', '🦉'], ['i', 'île', '🏝️'], ['j', 'jus', '🧃'], ['k', 'kiwi', '🥝'], ['l', 'lion', '🦁'],
    ['m', 'maison', '🏠'], ['n', 'nuage', '☁️'], ['o', 'orange', '🍊'], ['p', 'pomme', '🍎'], ['q', 'quatre', '4️⃣'], ['r', 'robot', '🤖'],
    ['s', 'soleil', '☀️'], ['t', 'tortue', '🐢'], ['u', 'usine', '🏭'], ['v', 'vache', '🐄'], ['w', 'wagon', '🚃'], ['x', 'taxi', '🚕'],
    ['y', 'yoyo', '🪀'], ['z', 'zèbre', '🦓'],
  ], [
    ['ch', 'chat', '🐱', 'pairs'], ['gn', 'montagne', '⛰️', 'pairs'], ['ph', 'photo', '📷', 'pairs'], ['qu', 'quille', '🎳', 'pairs'],
    ['ou', 'loup', '🐺', 'vowels'], ['oi', 'roi', '👑', 'vowels'], ['on', 'pont', '🌉', 'vowels'], ['an', 'maman', '👩', 'vowels'],
    ['in', 'lapin', '🐰', 'vowels'], ['eau', 'bateau', '⛵', 'vowels'], ['ai', 'lait', '🥛', 'vowels'], ['eu', 'feu', '🔥', 'vowels'],
  ], (l, w) => `${l}, comme dans ${w}.`),
  levelWords: {
    1: ['chat', 'chien', 'soleil', 'bus', 'chapeau', 'cochon', 'lit', 'tasse', 'œuf', 'renard', 'voiture', 'carte'],
    2: ['poisson', 'grenouille', 'arbre', 'étoile', 'navire', 'gâteau', 'lune', 'bateau', 'canard', 'pluie', 'livre', 'cerf-volant'],
    3: ['fusée', 'tortue', 'crayon', 'jardin', 'lapin', 'planète', 'château', 'dragon', 'banane', 'île', 'photo', 'guitare'],
  },
  groups: {
    animals: { name: 'Animaux', words: ['le chien', 'le chat', 'la vache', 'le canard', 'le lion', 'le poisson', 'l’oiseau', 'l’éléphant'] },
    colours: { name: 'Couleurs', words: ['le rouge', 'le bleu', 'le jaune', 'le vert', 'l’orange', 'le violet', 'le marron', 'le noir'] },
    food: { name: 'À manger', words: ['la pomme', 'la banane', 'le pain', 'le lait', 'l’œuf', 'le riz', 'la carotte', 'l’orange'] },
    family: { name: 'Famille', words: ['maman', 'papa', 'le bébé', 'mamie', 'papi', 'la sœur', 'le frère', 'la famille'] },
    nature: { name: 'Nature', words: ['le soleil', 'la lune', 'l’étoile', 'l’arbre', 'la fleur', 'la pluie', 'la mer', 'la montagne'] },
    vehicles: { name: 'Véhicules', words: ['la voiture', 'le bus', 'le train', 'le bateau', 'l’avion', 'le vélo', 'le tracteur', 'la fusée'] },
  },
  books: {
    'good-night': { title: 'Bonne nuit, lune et étoiles', pages: ['Le soleil se couche.', 'Bonjour, la lune !', 'Une petite étoile. Deux petites étoiles.', 'Le hibou fait hou, hou.', 'Au lit, on y va.', 'Bonne nuit !'] },
    'at-the-farm': { title: 'À la ferme', pages: ['La vache fait meuh.', 'Le cochon fait groin groin.', 'La poule fait cot cot.', 'Le mouton fait bêê.', 'Le tracteur fait vroum !', 'Au revoir, la ferme !'] },
    'colours-everywhere': { title: 'Des couleurs partout', pages: ['Une pomme rouge.', 'Une banane jaune.', 'Une grenouille verte.', 'Une baleine bleue.', 'Des raisins violets.', 'Toutes les couleurs ensemble !'] },
  },
  stories: {
    'red-hat': {
      title: 'Le chapeau rouge',
      paragraphs: ['Sam a un chapeau rouge.', 'Le vent prend le chapeau. Il monte, il monte !', 'Un chien court et court. Le chien attrape le chapeau.', 'Sam est content. « Bon chien ! » dit Sam.'],
      questions: [
        { question: 'De quelle couleur est le chapeau ?', options: ['Bleu', 'Rouge', 'Vert'] },
        { question: 'Qu’est-ce qui prend le chapeau ?', options: ['Le vent', 'Un chat', 'La pluie'] },
        { question: 'Qui rapporte le chapeau ?', options: ['Un oiseau', 'Sam', 'Un chien'] },
      ],
    },
    'big-pot': {
      title: 'Maman et la grande marmite',
      paragraphs: ['Maman a une grande marmite.', 'Dedans, les haricots. Dedans, le riz et le maïs.', 'Ada sent la bonne odeur. Miam !', 'On s’assoit et on mange. La marmite est vide.'],
      questions: [
        { question: 'Qu’est-ce que Maman a ?', options: ['Une grande marmite', 'Un grand sac', 'Une grande boîte'] },
        { question: 'Qu’est-ce qui va d’abord dans la marmite ?', options: ['Le maïs', 'Les haricots', 'Le poisson'] },
        { question: 'Qu’y a-t-il dans la marmite à la fin ?', options: ['Du riz', 'De la soupe', 'Rien, elle est vide'] },
      ],
    },
    'lost-kite': {
      title: 'Le cerf-volant perdu',
      paragraphs: [
        'Kofi a fabriqué un cerf-volant avec du papier et deux petits bâtons. Il a peint un soleil jaune dessus.',
        'Samedi, il a couru jusqu’à la colline. Le vent a tiré le cerf-volant très haut au-dessus des arbres.',
        'Puis la ficelle a cassé ! Le cerf-volant s’est envolé au-dessus de la rivière.',
        'Kofi était triste, mais sa sœur a eu une idée. « Fabriquons-en un nouveau ensemble », a-t-elle dit. Cette fois, ils l’ont fait encore plus grand.',
      ],
      questions: [
        { question: 'Qu’est-ce que Kofi a peint sur son cerf-volant ?', options: ['Une lune', 'Un soleil jaune', 'Un oiseau'] },
        { question: 'Pourquoi le cerf-volant s’est-il envolé ?', options: ['La ficelle a cassé', 'Kofi l’a lâché', 'Il a commencé à pleuvoir'] },
        { question: 'Quelle était l’idée de sa sœur ?', options: ['Acheter un cerf-volant', 'Rentrer à la maison', 'Fabriquer un nouveau cerf-volant ensemble'] },
      ],
    },
    'garden-surprise': {
      title: 'Une surprise au jardin',
      paragraphs: [
        'Papi a donné à Lina une toute petite graine marron. « Plante-la, arrose-la et attends », a-t-il dit.',
        'Lina arrosait la graine tous les matins. Pendant des jours, rien ne s’est passé.',
        'Puis un jour, une pousse verte est sortie de la terre. Elle a grandi, grandi.',
        'À la fin de l’été, c’était un tournesol, plus grand que Papi ! Lina a ri et a pris une photo.',
      ],
      questions: [
        { question: 'Qui a donné la graine à Lina ?', options: ['Sa maîtresse', 'Papi', 'Son amie'] },
        { question: 'Que faisait Lina tous les matins ?', options: ['Elle arrosait la graine', 'Elle lui chantait une chanson', 'Elle la changeait de place'] },
        { question: 'Qu’est devenue la graine ?', options: ['Une tomate', 'Un pommier', 'Un tournesol'] },
      ],
    },
    'quiet-library': {
      title: 'La bibliothèque silencieuse',
      paragraphs: [
        'Chaque jeudi après l’école, Maya allait à la bibliothèque de la ville. Elle aimait l’odeur des vieilles pages et le bourdonnement des lampes.',
        'Un après-midi, elle a trouvé un livre sans titre sur la couverture. À l’intérieur, la première page disait : « Toi qui lis ceci, termine l’histoire, s’il te plaît. »',
        'Les autres pages étaient vides. Maya a regardé autour d’elle, mais la bibliothécaire a seulement souri et montré un crayon sur le bureau.',
        'Alors Maya a commencé à écrire. Elle a écrit l’histoire d’une fille qui pouvait parler aux rivières. Quand elle a levé les yeux, la bibliothèque fermait, et trois autres enfants attendaient pour lire ce qu’elle avait écrit.',
      ],
      questions: [
        { question: 'Quand Maya allait-elle à la bibliothèque ?', options: ['Chaque jeudi après l’école', 'Le dimanche matin', 'Seulement pendant les vacances'] },
        { question: 'Qu’est-ce qui était étrange dans ce livre ?', options: ['Il était très lourd', 'Ses pages étaient vides après la première', 'Il était écrit dans une autre langue'] },
        { question: 'À ton avis, comment Maya se sentait-elle à la fin ?', options: ['Elle s’ennuyait', 'Elle était en colère', 'Fière que d’autres veuillent lire son histoire'] },
      ],
    },
    'storm-night': {
      title: 'La nuit de l’orage',
      paragraphs: [
        'L’orage est arrivé juste après le dîner. Le tonnerre a grondé sur le toit, et les lumières ont clignoté puis se sont éteintes.',
        'Tomás avait peur du noir, mais il s’est souvenu du conseil de son oncle : quand quelque chose te fait peur, trouve un moyen d’aider quelqu’un d’autre.',
        'Il a trouvé une lampe de poche dans le tiroir de la cuisine et il est allé dans la chambre de son petit frère. Leo se cachait sous la couverture.',
        'Tomás a fait des ombres d’animaux sur le mur : un lapin, un crabe et un chien très rigolo. Bientôt Leo riait, et Tomás a remarqué qu’il n’avait plus peur.',
      ],
      questions: [
        { question: 'Qu’est-il arrivé aux lumières ?', options: ['Elles ont brillé plus fort', 'Elles se sont éteintes', 'Elles ont changé de couleur'] },
        { question: 'Quel était le conseil de son oncle ?', options: ['Se coucher tôt', 'Trouver un moyen d’aider quelqu’un d’autre', 'Se cacher sous une couverture'] },
        { question: 'Pourquoi Tomás n’avait-il plus peur ?', options: ['Aider Leo lui a fait oublier le noir', 'L’orage s’est arrêté', 'Ses parents sont rentrés'] },
      ],
    },
    'little-boat': {
      title: 'Le petit bateau',
      paragraphs: ['Tom a un petit bateau.', 'Il le met dans la mare. Il flotte !', 'Une grenouille saute sur le bateau. Plouf !', 'Tom et la grenouille rient. C’est un bateau à grenouille maintenant.'],
      questions: [
        { question: 'Qu’est-ce que Tom a ?', options: ['Un petit bateau', 'Une grande voiture', 'Un ballon rouge'] },
        { question: 'Où Tom met-il le bateau ?', options: ['Dans le bain', 'Dans la mare', 'Dans la mer'] },
        { question: 'Qui saute sur le bateau ?', options: ['Un canard', 'Un poisson', 'Une grenouille'] },
      ],
    },
    'market-day': {
      title: 'Jour de marché',
      paragraphs: ['C’est jour de marché.', 'Mamie prend un grand panier.', 'On prend des tomates rouges et des mangues jaunes.', 'Le panier est plein. Mamie me donne une mangue. Miam !'],
      questions: [
        { question: 'Qui prend un panier ?', options: ['Mamie', 'Papa', 'Un chat'] },
        { question: 'De quelle couleur sont les mangues ?', options: ['Rouges', 'Jaunes', 'Bleues'] },
        { question: 'Qu’est-ce que Mamie me donne ?', options: ['Une tomate', 'Un panier', 'Une mangue'] },
      ],
    },
    'brave-hen': {
      title: 'La petite poule courageuse',
      paragraphs: [
        'Chaque matin, la petite poule faisait le tour de la ferme et comptait ses cinq poussins.',
        'Un jour, elle n’en a compté que quatre. Où était le plus petit poussin ?',
        'Elle a regardé dans la grange et derrière le puits. Puis elle a entendu un tout petit « piou » dans les hautes herbes.',
        'Le poussin était coincé dans un trou ! La poule a creusé avec ses pattes jusqu’à ce qu’il soit libre. Ce soir-là, elle a de nouveau compté cinq poussins.',
      ],
      questions: [
        { question: 'Combien de poussins la poule avait-elle ?', options: ['Trois', 'Cinq', 'Dix'] },
        { question: 'Où a-t-elle entendu le poussin ?', options: ['Dans les hautes herbes', 'Dans la grange', 'Sur le toit'] },
        { question: 'Comment la poule a-t-elle aidé ?', options: ['Elle a appelé le fermier', 'Elle s’est envolée', 'Elle a creusé jusqu’à ce que le poussin soit libre'] },
      ],
    },
    'rainy-picnic': {
      title: 'Le pique-nique sous la pluie',
      paragraphs: [
        'Ama et son papa ont préparé des sandwichs, des oranges et une grande couverture pour un pique-nique au parc.',
        'Juste au moment où ils se sont assis, des nuages noirs sont arrivés et il s’est mis à pleuvoir.',
        'Papa a ri. « Faisons notre pique-nique à la maison », a-t-il dit. Ils sont rentrés en courant, tout mouillés.',
        'Ils ont mis la couverture par terre dans le salon et ont mangé leurs sandwichs pendant que la pluie tapait à la fenêtre. C’était le plus beau pique-nique de tous.',
      ],
      questions: [
        { question: 'Où voulaient-ils faire le pique-nique ?', options: ['À l’école', 'Au parc', 'À la plage'] },
        { question: 'Que s’est-il passé quand ils se sont assis ?', options: ['Il s’est mis à pleuvoir', 'Un chien est arrivé', 'Le soleil s’est couché'] },
        { question: 'Où ont-ils fait le pique-nique à la fin ?', options: ['Dans la voiture', 'Au parc', 'Par terre dans le salon'] },
      ],
    },
    'new-girl': {
      title: 'La nouvelle',
      paragraphs: [
        'Lundi, une nouvelle élève est arrivée dans la classe de Kwame. Elle s’appelait Sofia et venait d’arriver d’un autre pays. Elle ne parlait pas encore beaucoup français.',
        'À la récréation, Sofia restait seule près de la grille. Kwame voulait lui dire bonjour, mais il ne savait pas comment parler à quelqu’un qui ne le comprendrait peut-être pas.',
        'Puis il a eu une idée. Il a sorti son ballon et l’a fait rouler doucement vers elle. Sofia a souri, l’a arrêté avec le pied et le lui a renvoyé.',
        'Ils ont joué jusqu’à la sonnerie. Personne n’avait besoin de beaucoup de mots. Vendredi, Sofia apprenait à Kwame à compter jusqu’à dix dans sa langue, et il lui apprenait le nom de ses joueurs préférés.',
      ],
      questions: [
        { question: 'Pourquoi Sofia ne parlait-elle pas beaucoup français ?', options: ['Elle était timide', 'Elle venait d’arriver d’un autre pays', 'Elle avait un rhume'] },
        { question: 'Comment Kwame a-t-il commencé à jouer avec elle ?', options: ['Il lui a fait rouler son ballon', 'Il a demandé à la maîtresse', 'Il lui a donné un bonbon'] },
        { question: 'Que montre cette histoire ?', options: ['Le football est le meilleur jeu', 'La récréation est trop courte', 'On peut se faire des amis sans beaucoup de mots'] },
      ],
    },
    'old-clock': {
      title: 'La vieille horloge de Mamie',
      paragraphs: [
        'Dans un coin du couloir de Mamie se tenait une grande horloge en bois. Elle s’était arrêtée il y a des années, à trois heures sept exactement.',
        'Un après-midi de pluie, Jun a demandé pourquoi personne ne l’avait réparée. Mamie a souri. « Elle s’est arrêtée le jour où ta maman est née, a-t-elle dit. J’aimais me souvenir de ce moment. »',
        'Jun y a réfléchi longtemps. Puis il a trouvé une petite clé sur l’horloge et a demandé s’ils pouvaient la remettre en marche, pour qu’elle compte aussi de nouveaux moments.',
        'Ensemble, ils l’ont remontée avec soin. Avec un petit clic, l’horloge s’est mise à faire tic-tac. Mamie a ri et a dit que maintenant elle se souviendrait de deux jours : le jour où sa maman est née, et le jour où Jun lui a rendu la vie.',
      ],
      questions: [
        { question: 'À quelle heure l’horloge s’était-elle arrêtée ?', options: ['À midi', 'À trois heures sept', 'À six heures et demie'] },
        { question: 'Pourquoi Mamie ne l’avait-elle pas réparée ?', options: ['Elle lui rappelait le jour où la maman de Jun est née', 'Elle n’avait pas d’argent', 'Elle n’aimait pas les horloges'] },
        { question: 'De quoi l’horloge se souvient-elle à la fin ?', options: ['Seulement de l’après-midi de pluie', 'De rien du tout', 'De deux jours spéciaux'] },
      ],
    },
  },
};
export default fr;
