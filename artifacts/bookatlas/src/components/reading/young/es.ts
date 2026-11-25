import { cap, makeSounds, type YoungTranslation } from '../youngLang';

/** Young readers in Spanish (Reading Intelligence phase 5). Written for BooksAtlas, in the order of the English. */
const es: YoungTranslation = {
  voice: 'es-ES',
  find: (w) => `¿Dónde está ${w}?`,
  right: (w) => `¡Sí! ¡${cap(w)}!`,
  tryAgain: (w) => `Eso es ${w}. ¡Inténtalo otra vez!`,
  // Letter sounds in Spanish (phase 6).
  sounds: makeSounds([
    ['a', 'abeja', '🐝'], ['b', 'barco', '🚢'], ['c', 'casa', '🏠'], ['d', 'dedo', '☝️'], ['e', 'estrella', '⭐'], ['f', 'flor', '🌸'],
    ['g', 'gato', '🐱'], ['h', 'helado', '🍦'], ['i', 'isla', '🏝️'], ['j', 'jirafa', '🦒'], ['k', 'kiwi', '🥝'], ['l', 'luna', '🌙'],
    ['m', 'mano', '✋'], ['n', 'nube', '☁️'], ['ñ', 'niño', '👦'], ['o', 'oso', '🐻'], ['p', 'perro', '🐶'], ['q', 'queso', '🧀'],
    ['r', 'ratón', '🐭'], ['s', 'sol', '☀️'], ['t', 'tomate', '🍅'], ['u', 'uva', '🍇'], ['v', 'vaca', '🐄'], ['x', 'taxi', '🚕'],
    ['y', 'yoyó', '🪀'], ['z', 'zapato', '👞'],
  ], [
    ['ch', 'chocolate', '🍫', 'pairs'], ['ll', 'lluvia', '🌧️', 'pairs'], ['rr', 'burro', '🫏', 'pairs'], ['qu', 'paquete', '📦', 'pairs'],
    ['gu', 'guitarra', '🎸', 'pairs'], ['ue', 'huevo', '🥚', 'vowels'], ['ie', 'pie', '🦶', 'vowels'], ['au', 'autobús', '🚌', 'vowels'],
    ['ai', 'aire', '🌬️', 'vowels'], ['ei', 'peine', '🪮', 'vowels'],
  ], (l, w) => `${l}, como en ${w}.`),
  levelWords: {
    1: ['gato', 'perro', 'sol', 'autobús', 'sombrero', 'cerdo', 'cama', 'taza', 'huevo', 'zorro', 'coche', 'mapa'],
    2: ['pez', 'rana', 'árbol', 'estrella', 'buque', 'pastel', 'luna', 'barca', 'pato', 'lluvia', 'libro', 'cometa'],
    3: ['cohete', 'tortuga', 'lápiz', 'jardín', 'conejo', 'planeta', 'castillo', 'dragón', 'plátano', 'isla', 'cámara', 'guitarra'],
  },
  groups: {
    animals: { name: 'Animales', words: ['el perro', 'el gato', 'la vaca', 'el pato', 'el león', 'el pez', 'el pájaro', 'el elefante'] },
    colours: { name: 'Colores', words: ['el rojo', 'el azul', 'el amarillo', 'el verde', 'el naranja', 'el morado', 'el marrón', 'el negro'] },
    food: { name: 'Comida', words: ['la manzana', 'el plátano', 'el pan', 'la leche', 'el huevo', 'el arroz', 'la zanahoria', 'la naranja'] },
    family: { name: 'Familia', words: ['mamá', 'papá', 'el bebé', 'la abuela', 'el abuelo', 'la hermana', 'el hermano', 'la familia'] },
    nature: { name: 'Naturaleza', words: ['el sol', 'la luna', 'la estrella', 'el árbol', 'la flor', 'la lluvia', 'el mar', 'la montaña'] },
    vehicles: { name: 'Vehículos', words: ['el coche', 'el autobús', 'el tren', 'el barco', 'el avión', 'la bici', 'el tractor', 'el cohete'] },
  },
  books: {
    'good-night': { title: 'Buenas noches, luna y estrellas', pages: ['El sol se esconde.', '¡Hola, luna!', 'Una estrellita. Dos estrellitas.', 'El búho hace uh, uh.', 'Nos vamos a la cama.', '¡Buenas noches!'] },
    'at-the-farm': { title: 'En la granja', pages: ['La vaca hace muu.', 'El cerdo hace oinc.', 'La gallina hace cocó.', 'La oveja hace bee.', '¡El tractor hace brrum!', '¡Adiós, granja!'] },
    'colours-everywhere': { title: 'Colores por todas partes', pages: ['Una manzana roja.', 'Un plátano amarillo.', 'Una rana verde.', 'Una ballena azul.', 'Uvas moradas.', '¡Todos los colores juntos!'] },
  },
  stories: {
    'red-hat': {
      title: 'El sombrero rojo',
      paragraphs: ['Sam tiene un sombrero rojo.', 'El viento se lleva el sombrero. ¡Sube y sube!', 'Un perro corre y corre. El perro atrapa el sombrero.', 'Sam está contento. «¡Buen perro!», dice Sam.'],
      questions: [
        { question: '¿De qué color es el sombrero?', options: ['Azul', 'Rojo', 'Verde'] },
        { question: '¿Qué se lleva el sombrero?', options: ['El viento', 'Un gato', 'La lluvia'] },
        { question: '¿Quién recupera el sombrero?', options: ['Un pájaro', 'Sam', 'Un perro'] },
      ],
    },
    'big-pot': {
      title: 'Mamá y la olla grande',
      paragraphs: ['Mamá tiene una olla grande.', 'Dentro van los frijoles. Dentro van el arroz y el maíz.', 'Ada huele la comida. ¡Ñam!', 'Nos sentamos a comer. La olla está vacía.'],
      questions: [
        { question: '¿Qué tiene Mamá?', options: ['Una olla grande', 'Una bolsa grande', 'Una caja grande'] },
        { question: '¿Qué va primero en la olla?', options: ['El maíz', 'Los frijoles', 'El pescado'] },
        { question: '¿Qué hay en la olla al final?', options: ['Arroz', 'Sopa', 'Nada, está vacía'] },
      ],
    },
    'lost-kite': {
      title: 'La cometa perdida',
      paragraphs: [
        'Kofi hizo una cometa con papel y dos palitos finos. Le pintó un sol amarillo.',
        'El sábado corrió hasta la colina. El viento subió la cometa muy alto, por encima de los árboles.',
        '¡Entonces el hilo se rompió! La cometa se fue volando sobre el río.',
        'Kofi estaba triste, pero su hermana tuvo una idea. «Hagamos una nueva juntos», dijo. Esta vez la hicieron aún más grande.',
      ],
      questions: [
        { question: '¿Qué pintó Kofi en su cometa?', options: ['Una luna', 'Un sol amarillo', 'Un pájaro'] },
        { question: '¿Por qué se fue volando la cometa?', options: ['Se rompió el hilo', 'Kofi la soltó', 'Empezó a llover'] },
        { question: '¿Cuál fue la idea de su hermana?', options: ['Comprar una cometa', 'Volver a casa', 'Hacer una cometa nueva juntos'] },
      ],
    },
    'garden-surprise': {
      title: 'Una sorpresa en el jardín',
      paragraphs: [
        'El abuelo le dio a Lina una semilla marrón muy pequeña. «Plántala, riégala y espera», le dijo.',
        'Lina regaba la semilla todas las mañanas. Durante muchos días no pasó nada.',
        'Un día, un brote verde salió de la tierra. Creció y creció.',
        'Al final del verano era un girasol, ¡más alto que el abuelo! Lina se rio y le hizo una foto.',
      ],
      questions: [
        { question: '¿Quién le dio la semilla a Lina?', options: ['Su maestra', 'El abuelo', 'Su amiga'] },
        { question: '¿Qué hacía Lina todas las mañanas?', options: ['Regaba la semilla', 'Le cantaba', 'La cambiaba de sitio'] },
        { question: '¿En qué se convirtió la semilla?', options: ['En un tomate', 'En un manzano', 'En un girasol'] },
      ],
    },
    'quiet-library': {
      title: 'La biblioteca silenciosa',
      paragraphs: [
        'Todos los jueves después del colegio, Maya iba a la biblioteca del pueblo. Le gustaba el olor de las páginas viejas y el zumbido de las luces.',
        'Una tarde encontró un libro sin título en la portada. Dentro, la primera página decía: «Quien lea esto, que termine la historia, por favor».',
        'El resto de las páginas estaban en blanco. Maya miró a su alrededor, pero la bibliotecaria solo sonrió y señaló un lápiz sobre la mesa.',
        'Así que Maya empezó a escribir. Escribió sobre una niña que podía hablar con los ríos. Cuando levantó la vista, la biblioteca estaba cerrando y otros tres niños esperaban para leer lo que había escrito.',
      ],
      questions: [
        { question: '¿Cuándo iba Maya a la biblioteca?', options: ['Todos los jueves después del colegio', 'Los domingos por la mañana', 'Solo en vacaciones'] },
        { question: '¿Qué tenía de raro el libro?', options: ['Pesaba mucho', 'Sus páginas estaban en blanco después de la primera', 'Estaba escrito en otro idioma'] },
        { question: '¿Cómo crees que se sintió Maya al final?', options: ['Aburrida', 'Enfadada', 'Orgullosa de que otros quisieran leer su historia'] },
      ],
    },
    'storm-night': {
      title: 'La noche de la tormenta',
      paragraphs: [
        'La tormenta llegó justo después de cenar. Los truenos retumbaron sobre el tejado, y las luces parpadearon y se apagaron.',
        'Tomás tenía miedo a la oscuridad, pero recordó el consejo de su tío: cuando algo te asuste, busca la manera de ayudar a otra persona.',
        'Encontró una linterna en el cajón de la cocina y fue al cuarto de su hermano pequeño. Leo estaba escondido debajo de la manta.',
        'Tomás hizo sombras de animales en la pared: un conejo, un cangrejo y un perro muy gracioso. Pronto Leo se reía, y Tomás se dio cuenta de que ya no tenía miedo.',
      ],
      questions: [
        { question: '¿Qué pasó con las luces?', options: ['Brillaron más', 'Se apagaron', 'Cambiaron de color'] },
        { question: '¿Cuál era el consejo de su tío?', options: ['Acostarse temprano', 'Buscar la manera de ayudar a otra persona', 'Esconderse debajo de una manta'] },
        { question: '¿Por qué Tomás ya no tenía miedo?', options: ['Ayudar a Leo le hizo olvidar la oscuridad', 'La tormenta paró', 'Sus padres volvieron a casa'] },
      ],
    },
  },
};
export default es;
