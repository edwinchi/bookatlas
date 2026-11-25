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
  },
};
export default fr;
