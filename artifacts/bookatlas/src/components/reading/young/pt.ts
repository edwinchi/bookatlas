import { cap, makeSounds, type YoungTranslation } from '../youngLang';
import { shapes, shapesBook, stories as moreStories } from './more/pt';

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
    shapes,
    animals: { name: 'Animais', words: ['o cão', 'o gato', 'a vaca', 'o pato', 'o leão', 'o peixe', 'o pássaro', 'o elefante'] },
    colours: { name: 'Cores', words: ['o vermelho', 'o azul', 'o amarelo', 'o verde', 'o laranja', 'o roxo', 'o castanho', 'o preto'] },
    food: { name: 'Comida', words: ['a maçã', 'a banana', 'o pão', 'o leite', 'o ovo', 'o arroz', 'a cenoura', 'a laranja'] },
    family: { name: 'Família', words: ['a mãe', 'o pai', 'o bebé', 'a avó', 'o avô', 'a irmã', 'o irmão', 'a família'] },
    nature: { name: 'Natureza', words: ['o sol', 'a lua', 'a estrela', 'a árvore', 'a flor', 'a chuva', 'o mar', 'a montanha'] },
    vehicles: { name: 'Veículos', words: ['o carro', 'o autocarro', 'o comboio', 'o barco', 'o avião', 'a bicicleta', 'o trator', 'o foguetão'] },
  },
  books: {
    'shapes-around': shapesBook,
    'good-night': { title: 'Boa noite, lua e estrelas', pages: ['O sol põe-se.', 'Olá, lua!', 'Uma estrelinha. Duas estrelinhas.', 'O mocho faz uu, uu.', 'Vamos para a cama.', 'Boa noite!'] },
    'at-the-farm': { title: 'Na quinta', pages: ['A vaca faz muu.', 'O porco faz oinc.', 'A galinha faz có-có.', 'A ovelha faz mé.', 'O trator faz brrum!', 'Adeus, quinta!'] },
    'colours-everywhere': { title: 'Cores por todo o lado', pages: ['Uma maçã vermelha.', 'Uma banana amarela.', 'Um sapo verde.', 'Uma baleia azul.', 'Uvas roxas.', 'Todas as cores juntas!'] },
  },
  stories: {
    ...moreStories,
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
    'little-boat': {
      title: 'O barquinho',
      paragraphs: ['O Tom tem um barquinho.', 'Põe-no no lago. Flutua!', 'Um sapo salta para o barco. Chape!', 'O Tom e o sapo riem-se. Agora é um barco de sapo.'],
      questions: [
        { question: 'O que tem o Tom?', options: ['Um barquinho', 'Um carro grande', 'Uma bola vermelha'] },
        { question: 'Onde põe o Tom o barco?', options: ['Na banheira', 'No lago', 'No mar'] },
        { question: 'Quem salta para o barco?', options: ['Um pato', 'Um peixe', 'Um sapo'] },
      ],
    },
    'market-day': {
      title: 'Dia de mercado',
      paragraphs: ['Hoje é dia de mercado.', 'A avó leva um cesto grande.', 'Compramos tomates vermelhos e mangas amarelas.', 'O cesto está cheio. A avó dá-me uma manga. Que bom!'],
      questions: [
        { question: 'Quem leva um cesto?', options: ['A avó', 'O pai', 'Um gato'] },
        { question: 'De que cor são as mangas?', options: ['Vermelhas', 'Amarelas', 'Azuis'] },
        { question: 'O que me dá a avó?', options: ['Um tomate', 'Um cesto', 'Uma manga'] },
      ],
    },
    'brave-hen': {
      title: 'A galinha corajosa',
      paragraphs: [
        'Todas as manhãs, a galinha dava uma volta à quinta e contava os seus cinco pintainhos.',
        'Um dia, só contou quatro. Onde estava o pintainho mais pequeno?',
        'Procurou no celeiro e atrás do poço. Depois ouviu um «piu» muito baixinho na erva alta.',
        'O pintainho estava preso num buraco! A galinha escavou com as patas até ele ficar livre. Nessa noite, voltou a contar cinco.',
      ],
      questions: [
        { question: 'Quantos pintainhos tinha a galinha?', options: ['Três', 'Cinco', 'Dez'] },
        { question: 'Onde ouviu ela o pintainho?', options: ['Na erva alta', 'No celeiro', 'No telhado'] },
        { question: 'Como ajudou a galinha?', options: ['Chamou o agricultor', 'Fugiu a voar', 'Escavou até o pintainho ficar livre'] },
      ],
    },
    'rainy-picnic': {
      title: 'O piquenique à chuva',
      paragraphs: [
        'A Ama e o pai prepararam sanduíches, laranjas e uma manta grande para um piquenique no parque.',
        'Mesmo quando se sentaram, chegaram nuvens escuras e começou a chover.',
        'O pai riu-se. «Vamos fazer o piquenique em casa», disse ele. Voltaram a correr, todos molhados.',
        'Estenderam a manta no chão da sala e comeram as sanduíches enquanto a chuva batia na janela. Foi o melhor piquenique de sempre.',
      ],
      questions: [
        { question: 'Onde queriam fazer o piquenique?', options: ['Na escola', 'No parque', 'Na praia'] },
        { question: 'O que aconteceu quando se sentaram?', options: ['Começou a chover', 'Chegou um cão', 'O sol pôs-se'] },
        { question: 'Onde fizeram o piquenique no fim?', options: ['No carro', 'No parque', 'No chão da sala'] },
      ],
    },
    'new-girl': {
      title: 'A menina nova',
      paragraphs: [
        'Na segunda-feira, chegou uma menina nova à turma do Kwame. Chamava-se Sofia e tinha acabado de se mudar de outro país. Ainda não falava muito português.',
        'No intervalo, a Sofia ficou sozinha junto à vedação. O Kwame queria dizer-lhe olá, mas não sabia como falar com alguém que talvez não o percebesse.',
        'Então teve uma ideia. Tirou a bola e fê-la rolar devagar na direção dela. A Sofia sorriu, parou-a com o pé e chutou-a de volta.',
        'Jogaram até tocar a campainha. Ninguém precisou de muitas palavras. Na sexta-feira, a Sofia ensinava o Kwame a contar até dez na língua dela, e ele ensinava-lhe os nomes dos seus jogadores preferidos.',
      ],
      questions: [
        { question: 'Porque é que a Sofia não falava muito português?', options: ['Era tímida', 'Tinha acabado de se mudar de outro país', 'Estava constipada'] },
        { question: 'Como começou o Kwame a brincar com ela?', options: ['Fez rolar a bola até ela', 'Perguntou à professora', 'Deu-lhe um rebuçado'] },
        { question: 'O que mostra a história?', options: ['O futebol é o melhor jogo', 'O intervalo é curto demais', 'Podemos fazer amigos sem muitas palavras'] },
      ],
    },
    'old-clock': {
      title: 'O relógio antigo da avó',
      paragraphs: [
        'Num canto do corredor da avó havia um relógio alto de madeira. Tinha parado há muitos anos, às três e sete em ponto.',
        'Numa tarde de chuva, o Jun perguntou porque é que ninguém o tinha arranjado. A avó sorriu. «Parou no dia em que a tua mãe nasceu», disse ela. «Gostava de me lembrar desse momento.»',
        'O Jun pensou nisso durante muito tempo. Depois encontrou uma chavezinha em cima do relógio e perguntou se o podiam pôr a trabalhar outra vez, para que contasse também momentos novos.',
        'Juntos, deram-lhe corda com cuidado. Com um pequeno clique, o relógio começou a fazer tiquetaque. A avó riu-se e disse que agora ele ia lembrar-se de dois dias: o dia em que a mãe dele nasceu e o dia em que o Jun lhe devolveu a vida.',
      ],
      questions: [
        { question: 'A que horas tinha parado o relógio?', options: ['Ao meio-dia', 'Às três e sete', 'Às seis e meia'] },
        { question: 'Porque é que a avó não o tinha arranjado?', options: ['Lembrava-lhe o dia em que a mãe do Jun nasceu', 'Não tinha dinheiro', 'Não gostava de relógios'] },
        { question: 'De que se lembra o relógio no fim?', options: ['Só da tarde de chuva', 'De nada', 'De dois dias especiais'] },
      ],
    },
  },
};
export default pt;
