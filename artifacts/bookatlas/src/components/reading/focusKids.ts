/**
 * The children's focus gym in the five young readers' languages (2026-11-27): the game names and help, the results,
 * and the children's breathing practices with every cue, so a child (or the grown-up beside them) can follow along
 * and hear each step said aloud. The teens and adults' gym stays in English. Tested in focusKids.test.ts.
 */
import type { GameId } from './focusGym';
import type { YoungLangId } from './youngLang';
import type { Practice } from './breathing';

export interface GymText {
  games: Record<GameId, { name: string; what: string; trains: string }>;
  when: { all: string; reading: string; restless: string; bedtime: string };
  /** Children's practices by id: name, intro and one cue per phase. English uses the practices as written. */
  practices: Record<string, { name: string; intro: string; cues: string[] }>;
  breathOf: (round: number, rounds: number) => string;
  calmDone: (name: string) => string;
  safety: string; chooseAnother: string; sayAloud: string; left: string;
  start: string; again: string; allExercises: string; stop: string; today: string; doneToday: string;
  find: string; findEvery: string; of: (a: number, b: number) => string;
  getReady: string; starAria: string; moonAria: string; starHelp: string; numbersHelp: string;
  numbersNote: (n: number, s: number, wrong: number, aim: number) => string;
  starsNote: (hits: number, wrong: number, misses: number) => string;
  huntNote: (n: number, s: number, wrong: number) => string;
  streak: (n: number) => string; focusLevel: (n: number) => string; level: (n: number) => string;
  plan: (names: string) => string; trains: string; footer: string; starsAria: (n: number) => string;
}

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const GYM_EN: GymText = {
  games: {
    breath: { name: 'Calm breathing', what: 'Balloon, bunny, bumblebee, snake and more: breathe like an animal and feel calm.', trains: 'Calm and settling down' },
    numbers: { name: 'Number hunt', what: 'Find 1, then 2, then 3… and tap them in order.', trains: 'Steady scanning' },
    stars: { name: 'Star catcher', what: 'Tap the stars! Don’t tap the sleepy moons.', trains: 'Holding back the impulse' },
    words: { name: 'Picture hunt', what: 'Find every picture that matches. Look closely!', trains: 'Careful looking' },
  },
  when: { all: 'All', reading: 'Before reading', restless: 'When restless', bedtime: 'At bedtime' },
  practices: {},
  breathOf: (r, n) => `breath ${r} of ${n}`,
  calmDone: (name) => `Well done! ${name} finished. You are calm and ready to read.`,
  safety: 'Breathe gently and never strain. If you feel dizzy, stop and breathe normally. These calm the body before reading or sleep; they are not a treatment.',
  chooseAnother: 'Choose another', sayAloud: 'Say the steps aloud', left: 'left',
  start: 'Start', again: 'Again', allExercises: 'All exercises', stop: 'Stop', today: 'Today', doneToday: 'Done today',
  find: 'Find', findEvery: 'Find every', of: (a, b) => `${a} of ${b}`,
  getReady: 'Get ready…', starAria: 'A star: tap!', moonAria: 'A moon: do not tap',
  starHelp: 'Tap (or press Space) for a star. Let the moons pass.',
  numbersHelp: 'Keep your eyes near the middle and let them find the next number.',
  numbersNote: (n, sec, w, aim) => `${n} numbers in ${sec} s${w ? `, ${w} wrong tap${s(w, '', 's')}` : ''}. Aim: ${aim} s.`,
  starsNote: (h, w, m) => `${h} stars caught, ${w} moon${s(w, '', 's')} tapped, ${m} star${s(m, '', 's')} missed.`,
  huntNote: (n, sec, w) => `All ${n} found in ${sec} s${w ? `, ${w} wrong` : ''}.`,
  streak: (n) => `${n} day${s(n, '', 's')} in a row`, focusLevel: (n) => `Focus level ${n}`, level: (n) => `Level ${n}`,
  plan: (names) => `Today: ${names}, then read.`, trains: 'Trains:',
  footer: 'A few minutes a day, then read: attention grows with practice, like a muscle. These are exercises for fun and practice, not a test or a diagnosis.',
  starsAria: (n) => `${n} stars`,
};

const FR: GymText = {
  games: {
    breath: { name: 'Respiration calme', what: 'Ballon, lapin, bourdon, serpent et plus encore : respire comme un animal et sens-toi calme.', trains: 'Le calme' },
    numbers: { name: 'Chasse aux nombres', what: 'Trouve 1, puis 2, puis 3… et touche-les dans l’ordre.', trains: 'Regarder avec méthode' },
    stars: { name: 'Attrape les étoiles', what: 'Touche les étoiles ! Ne touche pas les lunes endormies.', trains: 'Savoir attendre' },
    words: { name: 'Chasse aux images', what: 'Trouve toutes les images pareilles. Regarde bien !', trains: 'Bien regarder' },
  },
  when: { all: 'Tout', reading: 'Avant de lire', restless: 'Quand on s’agite', bedtime: 'Au coucher' },
  practices: {
    balloon: { name: 'Le ballon', intro: 'Pose tes mains sur ton ventre. Inspire et gonfle ton ventre comme un gros ballon, puis laisse l’air sortir doucement.', cues: ['Gonfle ton ballon', 'Laisse l’air sortir doucement'] },
    flower: { name: 'Sentir la fleur, souffler la bougie', intro: 'Tiens une fleur et une bougie imaginaires. Sens la fleur par le nez, puis souffle doucement la bougie.', cues: ['Sens la fleur', 'Souffle la bougie, doucement'] },
    bunny: { name: 'Les respirations du lapin', intro: 'Fais le lapin : trois petits reniflements par le nez, puis une longue expiration par la bouche.', cues: ['Renifle', 'Renifle', 'Renifle', 'Une longue expiration'] },
    starfish: { name: 'La main étoile de mer', intro: 'Écarte ta main comme une étoile de mer. Monte le long d’un doigt en inspirant, redescends en expirant, pour les cinq doigts.', cues: ['Monte le long du doigt, inspire', 'Redescends, expire'] },
    bee: { name: 'Le bourdon qui fredonne', intro: 'Inspire, puis fredonne comme un bourdon en expirant, mmmm. Sens la vibration dans ton visage.', cues: ['Inspire', 'Mmmm comme un bourdon'] },
    snake: { name: 'Le serpent', intro: 'Inspire lentement, puis expire avec un long sss tout doux, comme un serpent.', cues: ['Inspire', 'Sssss comme un serpent'] },
    teddy: { name: 'Le nounours sur le ventre', intro: 'Allonge-toi avec un nounours sur le ventre. Inspire et fais monter le nounours, expire et laisse-le descendre. Berce-le jusqu’à ce qu’il s’endorme.', cues: ['Fais monter le nounours', 'Le nounours redescend'] },
  },
  breathOf: (r, n) => `respiration ${r} sur ${n}`,
  calmDone: (name) => `Bravo ! ${name} : c’est fini. Te voilà calme, c’est le moment de lire.`,
  safety: 'Respire doucement, sans forcer. Si la tête te tourne, arrête et respire normalement. Ces exercices aident à se calmer avant de lire ou de dormir ; ce ne sont pas des soins.',
  chooseAnother: 'En choisir un autre', sayAloud: 'Dire les étapes à voix haute', left: 'restantes',
  start: 'Commencer', again: 'Encore', allExercises: 'Tous les exercices', stop: 'Arrêter', today: 'Aujourd’hui', doneToday: 'Fait aujourd’hui',
  find: 'Trouve le', findEvery: 'Trouve chaque', of: (a, b) => `${a} sur ${b}`,
  getReady: 'Prépare-toi…', starAria: 'Une étoile : touche !', moonAria: 'Une lune : ne touche pas',
  starHelp: 'Touche (ou appuie sur Espace) pour une étoile. Laisse passer les lunes.',
  numbersHelp: 'Garde les yeux près du milieu et laisse-les trouver le nombre suivant.',
  numbersNote: (n, sec, w, aim) => `${n} nombres en ${sec} s${w ? `, ${w} ${s(w, 'erreur', 'erreurs')}` : ''}. Objectif : ${aim} s.`,
  starsNote: (h, w, m) => `${h} étoiles attrapées, ${w} ${s(w, 'lune touchée', 'lunes touchées')}, ${m} ${s(m, 'étoile manquée', 'étoiles manquées')}.`,
  huntNote: (n, sec, w) => `Les ${n} trouvées en ${sec} s${w ? `, ${w} ${s(w, 'erreur', 'erreurs')}` : ''}.`,
  streak: (n) => `${n} ${s(n, 'jour', 'jours')} de suite`, focusLevel: (n) => `Niveau d’attention ${n}`, level: (n) => `Niveau ${n}`,
  plan: (names) => `Aujourd’hui : ${names}, puis on lit.`, trains: 'Entraîne :',
  footer: 'Quelques minutes par jour, puis on lit : l’attention grandit avec l’entraînement, comme un muscle. Ce sont des jeux pour s’amuser et s’entraîner, pas un test ni un diagnostic.',
  starsAria: (n) => `${n} étoiles`,
};

const ES: GymText = {
  games: {
    breath: { name: 'Respiración tranquila', what: 'Globo, conejito, abejorro, serpiente y más: respira como un animal y siente la calma.', trains: 'La calma' },
    numbers: { name: 'Caza de números', what: 'Busca el 1, luego el 2, luego el 3… y tócalos en orden.', trains: 'Mirar con orden' },
    stars: { name: 'Atrapa estrellas', what: '¡Toca las estrellas! No toques las lunas dormilonas.', trains: 'Saber esperar' },
    words: { name: 'Caza de dibujos', what: 'Busca todos los dibujos iguales. ¡Mira bien!', trains: 'Mirar con cuidado' },
  },
  when: { all: 'Todas', reading: 'Antes de leer', restless: 'Con inquietud', bedtime: 'Al acostarse' },
  practices: {
    balloon: { name: 'El globo', intro: 'Pon las manos en la barriga. Respira e infla la barriga como un globo grande, y luego deja salir el aire despacio.', cues: ['Infla tu globo', 'Deja salir el aire despacio'] },
    flower: { name: 'Huele la flor, sopla la vela', intro: 'Sostén una flor y una vela imaginarias. Huele la flor por la nariz y luego sopla la vela con suavidad.', cues: ['Huele la flor', 'Sopla la vela, con suavidad'] },
    bunny: { name: 'Respiraciones de conejito', intro: 'Sé un conejito: tres olfateos rápidos por la nariz y luego una espiración larga por la boca.', cues: ['Olfatea', 'Olfatea', 'Olfatea', 'Una espiración larga'] },
    starfish: { name: 'La mano estrella de mar', intro: 'Abre la mano como una estrella de mar. Sube por un dedo al inspirar y baja al espirar, por los cinco dedos.', cues: ['Sube por el dedo, inspira', 'Baja, espira'] },
    bee: { name: 'El zumbido del abejorro', intro: 'Inspira y luego zumba como un abejorro al espirar, mmmm. Siente el cosquilleo en la cara.', cues: ['Inspira', 'Mmmm como un abejorro'] },
    snake: { name: 'La serpiente', intro: 'Inspira despacio y luego espira con un sss largo y suave, como una serpiente.', cues: ['Inspira', 'Sssss como una serpiente'] },
    teddy: { name: 'El osito en la barriga', intro: 'Túmbate con un osito de peluche en la barriga. Al inspirar el osito sube, al espirar baja. Mécelo hasta que se duerma.', cues: ['El osito sube', 'El osito baja'] },
  },
  breathOf: (r, n) => `respiración ${r} de ${n}`,
  calmDone: (name) => `¡Muy bien! ${name}: terminado. Ya hay calma: buen momento para leer.`,
  safety: 'Respira suave y sin forzar. Si te mareas, para y respira con normalidad. Estos ejercicios ayudan a calmarse antes de leer o dormir; no son un tratamiento.',
  chooseAnother: 'Elegir otro', sayAloud: 'Decir los pasos en voz alta', left: 'restantes',
  start: 'Empezar', again: 'Otra vez', allExercises: 'Todos los ejercicios', stop: 'Parar', today: 'Hoy', doneToday: 'Hecho hoy',
  find: 'Busca el', findEvery: 'Busca cada', of: (a, b) => `${a} de ${b}`,
  getReady: 'Prepárate…', starAria: 'Una estrella: ¡toca!', moonAria: 'Una luna: no toques',
  starHelp: 'Toca (o pulsa Espacio) cuando salga una estrella. Deja pasar las lunas.',
  numbersHelp: 'Mantén la vista cerca del centro y deja que encuentre el número siguiente.',
  numbersNote: (n, sec, w, aim) => `${n} números en ${sec} s${w ? `, ${w} ${s(w, 'error', 'errores')}` : ''}. Objetivo: ${aim} s.`,
  starsNote: (h, w, m) => `${h} estrellas atrapadas, ${w} ${s(w, 'luna tocada', 'lunas tocadas')}, ${m} ${s(m, 'estrella perdida', 'estrellas perdidas')}.`,
  huntNote: (n, sec, w) => `Encontrados los ${n} en ${sec} s${w ? `, ${w} ${s(w, 'error', 'errores')}` : ''}.`,
  streak: (n) => `${n} ${s(n, 'día', 'días')} seguidos`, focusLevel: (n) => `Nivel de atención ${n}`, level: (n) => `Nivel ${n}`,
  plan: (names) => `Hoy: ${names}, y luego a leer.`, trains: 'Entrena:',
  footer: 'Unos minutos al día y luego a leer: la atención crece con la práctica, como un músculo. Son juegos para divertirse y practicar, no un examen ni un diagnóstico.',
  starsAria: (n) => `${n} estrellas`,
};

const PT: GymText = {
  games: {
    breath: { name: 'Respiração calma', what: 'Balão, coelhinho, abelhão, cobra e mais: respira como um animal e sente a calma.', trains: 'A calma' },
    numbers: { name: 'Caça aos números', what: 'Encontra o 1, depois o 2, depois o 3… e toca-lhes por ordem.', trains: 'Olhar com ordem' },
    stars: { name: 'Apanha estrelas', what: 'Toca nas estrelas! Não toques nas luas dorminhocas.', trains: 'Saber esperar' },
    words: { name: 'Caça às imagens', what: 'Encontra todas as imagens iguais. Olha bem!', trains: 'Olhar com atenção' },
  },
  when: { all: 'Todas', reading: 'Antes de ler', restless: 'Com agitação', bedtime: 'Na hora de dormir' },
  practices: {
    balloon: { name: 'O balão', intro: 'Põe as mãos na barriga. Inspira e enche a barriga como um balão grande, depois deixa o ar sair devagar.', cues: ['Enche o teu balão', 'Deixa o ar sair devagar'] },
    flower: { name: 'Cheira a flor, sopra a vela', intro: 'Segura numa flor e numa vela a fingir. Cheira a flor pelo nariz, depois sopra a vela com cuidado.', cues: ['Cheira a flor', 'Sopra a vela, devagarinho'] },
    bunny: { name: 'Respirações de coelhinho', intro: 'Sê um coelhinho: três fungadelas rápidas pelo nariz, depois uma expiração longa pela boca.', cues: ['Funga', 'Funga', 'Funga', 'Uma expiração longa'] },
    starfish: { name: 'A mão estrela-do-mar', intro: 'Abre a mão como uma estrela-do-mar. Sobe por um dedo ao inspirar e desce ao expirar, pelos cinco dedos.', cues: ['Sobe pelo dedo, inspira', 'Desce, expira'] },
    bee: { name: 'O zumbido do abelhão', intro: 'Inspira e depois zumbe como um abelhão ao expirar, mmmm. Sente a vibração na cara.', cues: ['Inspira', 'Mmmm como um abelhão'] },
    snake: { name: 'A cobra', intro: 'Inspira devagar e depois expira com um sss longo e baixinho, como uma cobra.', cues: ['Inspira', 'Sssss como uma cobra'] },
    teddy: { name: 'O ursinho na barriga', intro: 'Deita-te com um ursinho de peluche na barriga. Ao inspirar o ursinho sobe, ao expirar desce. Embala o ursinho até ele adormecer.', cues: ['O ursinho sobe', 'O ursinho desce'] },
  },
  breathOf: (r, n) => `respiração ${r} de ${n}`,
  calmDone: (name) => `Muito bem! ${name}: terminado. Que calma: é um bom momento para ler.`,
  safety: 'Respira com suavidade, sem forçar. Se sentires tonturas, para e respira normalmente. Estes exercícios ajudam a acalmar antes de ler ou dormir; não são um tratamento.',
  chooseAnother: 'Escolher outro', sayAloud: 'Dizer os passos em voz alta', left: 'restantes',
  start: 'Começar', again: 'Outra vez', allExercises: 'Todos os exercícios', stop: 'Parar', today: 'Hoje', doneToday: 'Feito hoje',
  find: 'Encontra o', findEvery: 'Encontra cada', of: (a, b) => `${a} de ${b}`,
  getReady: 'Prepara-te…', starAria: 'Uma estrela: toca!', moonAria: 'Uma lua: não toques',
  starHelp: 'Toca (ou carrega na barra de espaço) quando aparecer uma estrela. Deixa passar as luas.',
  numbersHelp: 'Mantém os olhos perto do meio e deixa-os encontrar o número seguinte.',
  numbersNote: (n, sec, w, aim) => `${n} números em ${sec} s${w ? `, ${w} ${s(w, 'erro', 'erros')}` : ''}. Objetivo: ${aim} s.`,
  starsNote: (h, w, m) => `${h} estrelas apanhadas, ${w} ${s(w, 'lua tocada', 'luas tocadas')}, ${m} ${s(m, 'estrela falhada', 'estrelas falhadas')}.`,
  huntNote: (n, sec, w) => `Encontradas as ${n} em ${sec} s${w ? `, ${w} ${s(w, 'erro', 'erros')}` : ''}.`,
  streak: (n) => `${n} ${s(n, 'dia', 'dias')} seguidos`, focusLevel: (n) => `Nível de atenção ${n}`, level: (n) => `Nível ${n}`,
  plan: (names) => `Hoje: ${names}, e depois ler.`, trains: 'Treina:',
  footer: 'Uns minutos por dia e depois ler: a atenção cresce com a prática, como um músculo. São jogos para brincar e praticar, não um teste nem um diagnóstico.',
  starsAria: (n) => `${n} estrelas`,
};

const NL: GymText = {
  games: {
    breath: { name: 'Rustig ademen', what: 'Ballon, konijn, hommel, slang en meer: adem als een dier en voel je rustig.', trains: 'Rust' },
    numbers: { name: 'Getallenjacht', what: 'Zoek 1, dan 2, dan 3… en tik ze op volgorde aan.', trains: 'Rustig rondkijken' },
    stars: { name: 'Sterrenvanger', what: 'Tik op de sterren! Niet op de slaperige manen.', trains: 'Kunnen wachten' },
    words: { name: 'Plaatjesjacht', what: 'Zoek elk plaatje dat hetzelfde is. Kijk goed!', trains: 'Goed kijken' },
  },
  when: { all: 'Alle', reading: 'Voor het lezen', restless: 'Bij onrust', bedtime: 'Voor het slapengaan' },
  practices: {
    balloon: { name: 'De ballon', intro: 'Leg je handen op je buik. Adem in en maak van je buik een grote ballon, laat de lucht dan langzaam ontsnappen.', cues: ['Blaas je ballon op', 'Laat de lucht langzaam ontsnappen'] },
    flower: { name: 'Ruik de bloem, blaas de kaars uit', intro: 'Houd een denkbeeldige bloem en kaars vast. Ruik met je neus aan de bloem en blaas de kaars dan zachtjes uit.', cues: ['Ruik aan de bloem', 'Blaas de kaars uit, zachtjes'] },
    bunny: { name: 'Konijnenademhaling', intro: 'Wees een konijn: drie snelle snuifjes door je neus, dan één lange uitademing door je mond.', cues: ['Snuif', 'Snuif', 'Snuif', 'Een lange uitademing'] },
    starfish: { name: 'De zeesterhand', intro: 'Spreid je hand als een zeester. Ga langs een vinger omhoog terwijl je inademt en omlaag terwijl je uitademt, alle vijf vingers.', cues: ['Langs de vinger omhoog, adem in', 'Omlaag, adem uit'] },
    bee: { name: 'Zoemen als een hommel', intro: 'Adem in en zoem dan als een hommel terwijl je uitademt, mmmm. Voel het kriebelen in je gezicht.', cues: ['Adem in', 'Mmmm als een hommel'] },
    snake: { name: 'De slang', intro: 'Adem langzaam in en adem dan uit met een lange, zachte sss, als een slang.', cues: ['Adem in', 'Sssss als een slang'] },
    teddy: { name: 'Knuffel op je buik', intro: 'Ga liggen met een knuffel op je buik. Adem in en de knuffel gaat omhoog, adem uit en hij gaat omlaag. Wieg je knuffel in slaap.', cues: ['Knuffel gaat omhoog', 'Knuffel gaat omlaag'] },
  },
  breathOf: (r, n) => `ademhaling ${r} van ${n}`,
  calmDone: (name) => `Goed gedaan! ${name} is klaar. Je bent nu rustig en klaar om te lezen.`,
  safety: 'Adem zachtjes en forceer niets. Word je duizelig, stop dan en adem gewoon. Deze oefeningen helpen om tot rust te komen voor het lezen of slapen; het is geen behandeling.',
  chooseAnother: 'Kies een andere', sayAloud: 'Zeg de stappen hardop', left: 'over',
  start: 'Start', again: 'Nog een keer', allExercises: 'Alle oefeningen', stop: 'Stop', today: 'Vandaag', doneToday: 'Vandaag gedaan',
  find: 'Zoek de', findEvery: 'Zoek elke', of: (a, b) => `${a} van ${b}`,
  getReady: 'Maak je klaar…', starAria: 'Een ster: tik!', moonAria: 'Een maan: niet tikken',
  starHelp: 'Tik (of druk op spatie) bij een ster. Laat de manen voorbijgaan.',
  numbersHelp: 'Houd je ogen bij het midden en laat ze het volgende getal vinden.',
  numbersNote: (n, sec, w, aim) => `${n} getallen in ${sec} s${w ? `, ${w} ${s(w, 'fout', 'fouten')}` : ''}. Doel: ${aim} s.`,
  starsNote: (h, w, m) => `${h} sterren gevangen, ${w} ${s(w, 'maan', 'manen')} aangetikt, ${m} ${s(m, 'ster', 'sterren')} gemist.`,
  huntNote: (n, sec, w) => `Alle ${n} gevonden in ${sec} s${w ? `, ${w} ${s(w, 'fout', 'fouten')}` : ''}.`,
  streak: (n) => `${n} ${s(n, 'dag', 'dagen')} op rij`, focusLevel: (n) => `Focusniveau ${n}`, level: (n) => `Niveau ${n}`,
  plan: (names) => `Vandaag: ${names}, en dan lezen.`, trains: 'Traint:',
  footer: 'Elke dag een paar minuten, en dan lezen: aandacht groeit door te oefenen, net als een spier. Dit zijn spelletjes om plezier te hebben en te oefenen, geen test of diagnose.',
  starsAria: (n) => `${n} sterren`,
};

export const GYM_TEXT: Record<YoungLangId, GymText> = { en: GYM_EN, fr: FR, es: ES, pt: PT, nl: NL };

/** A children's practice in a language: its name, intro and cues translated, timings unchanged. */
export function localPractice(p: Practice, t: GymText): Practice {
  const tr = t.practices[p.id];
  if (!tr) return p;
  return { ...p, name: tr.name, intro: tr.intro, phases: p.phases.map((ph, i) => ({ ...ph, cue: tr.cues[i] ?? ph.cue })) };
}

/** The cues worth saying aloud: each phase whose cue differs from the one before (so "Sniff, sniff, sniff" is said once). */
export const spokenCue = (p: Practice, index: number): string | null => {
  const cue = p.phases[index]!.cue;
  const before = p.phases[(index - 1 + p.phases.length) % p.phases.length]!.cue;
  return index === 0 || cue !== before ? cue : null;
};
