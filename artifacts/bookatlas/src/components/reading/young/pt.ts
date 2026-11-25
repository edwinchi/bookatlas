import { cap, makeSounds, type YoungTranslation } from '../youngLang';

/**
 * Young readers in Portuguese (Reading Intelligence phase 5), in European Portuguese as used in Portugal and in
 * Africa. Written for BooksAtlas, in the order of the English.
 */
const pt: YoungTranslation = {
  voice: 'pt-PT',
  find: (w) => `Onde está ${w}?`,
  right: (w) => `Sim! ${cap(w)}!`,
  tryAgain: (w) => `Isso é ${w}. Tenta outra vez!`,
  // Letter sounds in Portuguese (phase 6).
  sounds: makeSounds([
    ['a', 'abelha', '🐝'], ['b', 'bola', '⚽'], ['c', 'casa', '🏠'], ['d', 'dado', '🎲'], ['e', 'escola', '🏫'], ['f', 'faca', '🔪'],
    ['g', 'gato', '🐱'], ['h', 'hipopótamo', '🦛'], ['i', 'ilha', '🏝️'], ['j', 'janela', '🪟'], ['k', 'kiwi', '🥝'], ['l', 'lua', '🌙'],
    ['m', 'mão', '✋'], ['n', 'navio', '🚢'], ['o', 'ovo', '🥚'], ['p', 'pato', '🦆'], ['q', 'queijo', '🧀'], ['r', 'rato', '🐭'],
    ['s', 'sol', '☀️'], ['t', 'tartaruga', '🐢'], ['u', 'uva', '🍇'], ['v', 'vaca', '🐄'], ['x', 'peixe', '🐟'], ['z', 'zebra', '🦓'],
  ], [
    ['ch', 'chave', '🔑', 'pairs'], ['lh', 'coelho', '🐰', 'pairs'], ['nh', 'ninho', '🪺', 'pairs'], ['rr', 'carro', '🚗', 'pairs'],
    ['ss', 'pássaro', '🐦', 'pairs'], ['ç', 'maçã', '🍎', 'pairs'], ['ão', 'cão', '🐶', 'vowels'], ['õe', 'limões', '🍋', 'vowels'],
    ['ei', 'leite', '🥛', 'vowels'], ['ou', 'ouro', '🥇', 'vowels'],
  ], (l, w) => `${l}, como em ${w}.`),
  levelWords: {
    1: ['gato', 'cão', 'sol', 'autocarro', 'chapéu', 'porco', 'cama', 'caneca', 'ovo', 'raposa', 'carro', 'mapa'],
    2: ['peixe', 'sapo', 'árvore', 'estrela', 'navio', 'bolo', 'lua', 'barco', 'pato', 'chuva', 'livro', 'papagaio'],
    3: ['foguetão', 'tartaruga', 'lápis', 'jardim', 'coelho', 'planeta', 'castelo', 'dragão', 'banana', 'ilha', 'câmara', 'guitarra'],
  },
  groups: {
    animals: { name: 'Animais', words: ['o cão', 'o gato', 'a vaca', 'o pato', 'o leão', 'o peixe', 'o pássaro', 'o elefante'] },
    colours: { name: 'Cores', words: ['o vermelho', 'o azul', 'o amarelo', 'o verde', 'o laranja', 'o roxo', 'o castanho', 'o preto'] },
    food: { name: 'Comida', words: ['a maçã', 'a banana', 'o pão', 'o leite', 'o ovo', 'o arroz', 'a cenoura', 'a laranja'] },
    family: { name: 'Família', words: ['a mãe', 'o pai', 'o bebé', 'a avó', 'o avô', 'a irmã', 'o irmão', 'a família'] },
    nature: { name: 'Natureza', words: ['o sol', 'a lua', 'a estrela', 'a árvore', 'a flor', 'a chuva', 'o mar', 'a montanha'] },
    vehicles: { name: 'Veículos', words: ['o carro', 'o autocarro', 'o comboio', 'o barco', 'o avião', 'a bicicleta', 'o trator', 'o foguetão'] },
  },
  books: {
    'good-night': { title: 'Boa noite, lua e estrelas', pages: ['O sol põe-se.', 'Olá, lua!', 'Uma estrelinha. Duas estrelinhas.', 'O mocho faz uu, uu.', 'Vamos para a cama.', 'Boa noite!'] },
    'at-the-farm': { title: 'Na quinta', pages: ['A vaca faz muu.', 'O porco faz oinc.', 'A galinha faz có-có.', 'A ovelha faz mé.', 'O trator faz brrum!', 'Adeus, quinta!'] },
    'colours-everywhere': { title: 'Cores por todo o lado', pages: ['Uma maçã vermelha.', 'Uma banana amarela.', 'Um sapo verde.', 'Uma baleia azul.', 'Uvas roxas.', 'Todas as cores juntas!'] },
  },
  stories: {
    'red-hat': {
      title: 'O chapéu vermelho',
      paragraphs: ['O Sam tem um chapéu vermelho.', 'O vento leva o chapéu. Sobe, sobe!', 'Um cão corre e corre. O cão apanha o chapéu.', 'O Sam fica contente. «Bom cão!», diz o Sam.'],
      questions: [
        { question: 'De que cor é o chapéu?', options: ['Azul', 'Vermelho', 'Verde'] },
        { question: 'O que leva o chapéu?', options: ['O vento', 'Um gato', 'A chuva'] },
        { question: 'Quem traz o chapéu de volta?', options: ['Um pássaro', 'O Sam', 'Um cão'] },
      ],
    },
    'big-pot': {
      title: 'A mãe e a panela grande',
      paragraphs: ['A mãe tem uma panela grande.', 'Lá dentro vai o feijão. Lá dentro vão o arroz e o milho.', 'A Ada sente o cheirinho. Que bom!', 'Sentamo-nos e comemos. A panela está vazia.'],
      questions: [
        { question: 'O que tem a mãe?', options: ['Uma panela grande', 'Um saco grande', 'Uma caixa grande'] },
        { question: 'O que vai primeiro para a panela?', options: ['O milho', 'O feijão', 'O peixe'] },
        { question: 'O que há na panela no fim?', options: ['Arroz', 'Sopa', 'Nada, está vazia'] },
      ],
    },
    'lost-kite': {
      title: 'O papagaio perdido',
      paragraphs: [
        'O Kofi fez um papagaio de papel com dois paus finos. Pintou nele um sol amarelo.',
        'No sábado, correu até à colina. O vento levou o papagaio lá para cima, acima das árvores.',
        'De repente, o fio partiu-se! O papagaio voou para longe, por cima do rio.',
        'O Kofi ficou triste, mas a irmã teve uma ideia. «Vamos fazer um novo juntos», disse ela. Desta vez fizeram-no ainda maior.',
      ],
      questions: [
        { question: 'O que pintou o Kofi no papagaio?', options: ['Uma lua', 'Um sol amarelo', 'Um pássaro'] },
        { question: 'Porque voou o papagaio para longe?', options: ['O fio partiu-se', 'O Kofi largou-o', 'Começou a chover'] },
        { question: 'Qual foi a ideia da irmã?', options: ['Comprar um papagaio', 'Ir para casa', 'Fazer um papagaio novo juntos'] },
      ],
    },
    'garden-surprise': {
      title: 'Uma surpresa no jardim',
      paragraphs: [
        'O avô deu à Lina uma sementinha castanha. «Planta-a, rega-a e espera», disse ele.',
        'A Lina regava a semente todas as manhãs. Durante muitos dias, nada aconteceu.',
        'Um dia, um rebento verde saiu da terra. Cresceu e cresceu.',
        'No fim do verão era um girassol, mais alto do que o avô! A Lina riu-se e tirou uma fotografia.',
      ],
      questions: [
        { question: 'Quem deu a semente à Lina?', options: ['A professora', 'O avô', 'Uma amiga'] },
        { question: 'O que fazia a Lina todas as manhãs?', options: ['Regava a semente', 'Cantava para ela', 'Mudava-a de sítio'] },
        { question: 'Em que se transformou a semente?', options: ['Num tomate', 'Numa macieira', 'Num girassol'] },
      ],
    },
    'quiet-library': {
      title: 'A biblioteca silenciosa',
      paragraphs: [
        'Todas as quintas-feiras, depois da escola, a Maya ia à biblioteca da cidade. Gostava do cheiro das páginas antigas e do zumbido das luzes.',
        'Numa tarde, encontrou um livro sem título na capa. Lá dentro, a primeira página dizia: «Quem ler isto, por favor, termine a história.»',
        'As outras páginas estavam em branco. A Maya olhou à volta, mas a bibliotecária só sorriu e apontou para um lápis em cima da secretária.',
        'Então a Maya começou a escrever. Escreveu sobre uma menina que conseguia falar com os rios. Quando levantou os olhos, a biblioteca estava a fechar, e três outras crianças esperavam para ler o que ela tinha escrito.',
      ],
      questions: [
        { question: 'Quando ia a Maya à biblioteca?', options: ['Todas as quintas-feiras depois da escola', 'Aos domingos de manhã', 'Só nas férias'] },
        { question: 'O que tinha o livro de estranho?', options: ['Era muito pesado', 'As páginas estavam em branco depois da primeira', 'Estava escrito noutra língua'] },
        { question: 'Como achas que a Maya se sentiu no fim?', options: ['Aborrecida', 'Zangada', 'Orgulhosa por outros quererem ler a sua história'] },
      ],
    },
    'storm-night': {
      title: 'A noite da tempestade',
      paragraphs: [
        'A tempestade chegou logo depois do jantar. Os trovões ribombaram sobre o telhado, e as luzes piscaram e apagaram-se.',
        'O Tomás tinha medo do escuro, mas lembrou-se do conselho do tio: quando alguma coisa te assusta, encontra uma maneira de ajudar outra pessoa.',
        'Encontrou uma lanterna na gaveta da cozinha e foi ao quarto do irmão mais novo. O Leo estava escondido debaixo do cobertor.',
        'O Tomás fez sombras de animais na parede: um coelho, um caranguejo e um cão muito divertido. Pouco depois o Leo ria-se, e o Tomás reparou que já não tinha medo.',
      ],
      questions: [
        { question: 'O que aconteceu às luzes?', options: ['Ficaram mais fortes', 'Apagaram-se', 'Mudaram de cor'] },
        { question: 'Qual era o conselho do tio?', options: ['Deitar-se cedo', 'Encontrar uma maneira de ajudar outra pessoa', 'Esconder-se debaixo de um cobertor'] },
        { question: 'Porque é que o Tomás já não tinha medo?', options: ['Ajudar o Leo fê-lo esquecer o escuro', 'A tempestade parou', 'Os pais voltaram para casa'] },
      ],
    },
  },
};
export default pt;
