import { cap, makeSounds, type YoungTranslation } from '../youngLang';
import { shapes, shapesBook, stories as moreStories } from './more/nl';

/** Young readers in Dutch (Reading Intelligence phase 5). Written for BooksAtlas, in the order of the English. */
const nl: YoungTranslation = {
  voice: 'nl-NL',
  find: (w) => `Waar is ${w}?`,
  right: (w) => `Ja! ${cap(w)}!`,
  tryAgain: (w) => `Dat is ${w}. Probeer het nog eens!`,
  // Letter sounds in Dutch (phase 6).
  sounds: makeSounds([
    ['a', 'aap', '🐒'], ['b', 'bal', '⚽'], ['c', 'citroen', '🍋'], ['d', 'dino', '🦕'], ['e', 'eend', '🦆'], ['f', 'fiets', '🚲'],
    ['g', 'geit', '🐐'], ['h', 'hond', '🐶'], ['i', 'inktvis', '🐙'], ['j', 'jas', '🧥'], ['k', 'kat', '🐱'], ['l', 'leeuw', '🦁'],
    ['m', 'maan', '🌙'], ['n', 'neus', '👃'], ['o', 'olifant', '🐘'], ['p', 'peer', '🍐'], ['r', 'raket', '🚀'], ['s', 'sok', '🧦'],
    ['t', 'tent', '⛺'], ['u', 'uil', '🦉'], ['v', 'vis', '🐟'], ['w', 'wolk', '☁️'], ['x', 'taxi', '🚕'], ['z', 'zon', '☀️'],
  ], [
    ['ch', 'acht', '8️⃣', 'pairs'], ['sch', 'school', '🏫', 'pairs'], ['ng', 'ring', '💍', 'pairs'], ['aa', 'kaas', '🧀', 'vowels'],
    ['ee', 'been', '🦵', 'vowels'], ['oo', 'boom', '🌳', 'vowels'], ['uu', 'vuur', '🔥', 'vowels'], ['oe', 'boek', '📖', 'vowels'],
    ['eu', 'deur', '🚪', 'vowels'], ['ui', 'huis', '🏠', 'vowels'], ['ij', 'ijs', '🍦', 'vowels'], ['ou', 'hout', '🪵', 'vowels'],
  ], (l, w) => `${l}, zoals in ${w}.`),
  levelWords: {
    1: ['kat', 'hond', 'zon', 'bus', 'hoed', 'varken', 'bed', 'beker', 'ei', 'vos', 'auto', 'kaart'],
    2: ['vis', 'kikker', 'boom', 'ster', 'schip', 'taart', 'maan', 'boot', 'eend', 'regen', 'boek', 'vlieger'],
    3: ['raket', 'schildpad', 'potlood', 'tuin', 'konijn', 'planeet', 'kasteel', 'draak', 'banaan', 'eiland', 'camera', 'gitaar'],
  },
  groups: {
    shapes,
    animals: { name: 'Dieren', words: ['de hond', 'de kat', 'de koe', 'de eend', 'de leeuw', 'de vis', 'de vogel', 'de olifant'] },
    colours: { name: 'Kleuren', words: ['rood', 'blauw', 'geel', 'groen', 'oranje', 'paars', 'bruin', 'zwart'] },
    food: { name: 'Eten', words: ['de appel', 'de banaan', 'het brood', 'de melk', 'het ei', 'de rijst', 'de wortel', 'de sinaasappel'] },
    family: { name: 'Familie', words: ['mama', 'papa', 'de baby', 'oma', 'opa', 'de zus', 'de broer', 'het gezin'] },
    nature: { name: 'Natuur', words: ['de zon', 'de maan', 'de ster', 'de boom', 'de bloem', 'de regen', 'de zee', 'de berg'] },
    vehicles: { name: 'Voertuigen', words: ['de auto', 'de bus', 'de trein', 'de boot', 'het vliegtuig', 'de fiets', 'de tractor', 'de raket'] },
  },
  books: {
    'shapes-around': shapesBook,
    'good-night': { title: 'Welterusten, maan en sterren', pages: ['De zon gaat onder.', 'Hallo, maan!', 'Eén klein sterretje. Twee kleine sterretjes.', 'De uil zegt oehoe, oehoe.', 'We gaan naar bed.', 'Welterusten!'] },
    'at-the-farm': { title: 'Op de boerderij', pages: ['De koe zegt boe.', 'Het varken zegt knor.', 'De kip zegt tok tok.', 'Het schaap zegt bè.', 'De tractor doet brrrm!', 'Dag, boerderij!'] },
    'colours-everywhere': { title: 'Overal kleuren', pages: ['Een rode appel.', 'Een gele banaan.', 'Een groene kikker.', 'Een blauwe walvis.', 'Paarse druiven.', 'Alle kleuren samen!'] },
  },
  stories: {
    ...moreStories,
    'red-hat': {
      title: 'De rode hoed',
      paragraphs: ['Sam heeft een rode hoed.', 'De wind pakt de hoed. Omhoog, omhoog!', 'Een hond rent en rent. De hond pakt de hoed.', 'Sam is blij. "Goede hond!" zegt Sam.'],
      questions: [
        { question: 'Welke kleur heeft de hoed?', options: ['Blauw', 'Rood', 'Groen'] },
        { question: 'Wat pakt de hoed?', options: ['De wind', 'Een kat', 'De regen'] },
        { question: 'Wie brengt de hoed terug?', options: ['Een vogel', 'Sam', 'Een hond'] },
      ],
    },
    'big-pot': {
      title: 'Mama en de grote pan',
      paragraphs: ['Mama heeft een grote pan.', 'Erin gaan de bonen. Erin gaan de rijst en de maïs.', 'Ada ruikt het al. Mmm!', 'We gaan zitten en eten. De pan is leeg.'],
      questions: [
        { question: 'Wat heeft mama?', options: ['Een grote pan', 'Een grote tas', 'Een grote doos'] },
        { question: 'Wat gaat er eerst in de pan?', options: ['De maïs', 'De bonen', 'De vis'] },
        { question: 'Wat zit er aan het eind in de pan?', options: ['Rijst', 'Soep', 'Niets, hij is leeg'] },
      ],
    },
    'lost-kite': {
      title: 'De verloren vlieger',
      paragraphs: [
        'Kofi maakte een vlieger van papier en twee dunne stokjes. Hij schilderde er een gele zon op.',
        'Op zaterdag rende hij naar de heuvel. De wind trok de vlieger hoog boven de bomen.',
        'Toen knapte het touwtje! De vlieger vloog weg over de rivier.',
        'Kofi was verdrietig, maar zijn zus had een idee. "Laten we samen een nieuwe maken," zei ze. Deze keer maakten ze hem nog groter.',
      ],
      questions: [
        { question: 'Wat schilderde Kofi op zijn vlieger?', options: ['Een maan', 'Een gele zon', 'Een vogel'] },
        { question: 'Waarom vloog de vlieger weg?', options: ['Het touwtje knapte', 'Kofi liet hem los', 'Het begon te regenen'] },
        { question: 'Wat was het idee van zijn zus?', options: ['Een vlieger kopen', 'Naar huis gaan', 'Samen een nieuwe vlieger maken'] },
      ],
    },
    'garden-surprise': {
      title: 'Een verrassing in de tuin',
      paragraphs: [
        'Opa gaf Lina een piepklein bruin zaadje. "Plant het, geef het water en wacht," zei hij.',
        'Lina gaf het zaadje elke ochtend water. Dagenlang gebeurde er niets.',
        'Toen kwam er op een dag een groen sprietje uit de grond. Het groeide en groeide.',
        'Aan het eind van de zomer was het een zonnebloem, groter dan opa! Lina lachte en maakte een foto.',
      ],
      questions: [
        { question: 'Wie gaf Lina het zaadje?', options: ['Haar juf', 'Opa', 'Haar vriendin'] },
        { question: 'Wat deed Lina elke ochtend?', options: ['Ze gaf het zaadje water', 'Ze zong ervoor', 'Ze zette het ergens anders neer'] },
        { question: 'Wat werd het zaadje?', options: ['Een tomaat', 'Een appelboom', 'Een zonnebloem'] },
      ],
    },
    'quiet-library': {
      title: 'De stille bibliotheek',
      paragraphs: [
        'Elke donderdag na school ging Maya naar de bibliotheek in de stad. Ze hield van de geur van oude bladzijden en het zoemen van de lampen.',
        'Op een middag vond ze een boek zonder titel op de kaft. Op de eerste bladzijde stond: "Wie dit leest, maak alsjeblieft het verhaal af."',
        'De rest van de bladzijden was leeg. Maya keek om zich heen, maar de bibliothecaris glimlachte alleen en wees naar een potlood op het bureau.',
        'Dus begon Maya te schrijven. Ze schreef over een meisje dat met rivieren kon praten. Toen ze opkeek, ging de bibliotheek dicht en stonden er drie andere kinderen te wachten om te lezen wat ze had geschreven.',
      ],
      questions: [
        { question: 'Wanneer ging Maya naar de bibliotheek?', options: ['Elke donderdag na school', 'Op zondagochtend', 'Alleen in de vakantie'] },
        { question: 'Wat was er vreemd aan het boek?', options: ['Het was heel zwaar', 'Na de eerste bladzijde waren alle bladzijden leeg', 'Het was in een andere taal geschreven'] },
        { question: 'Hoe denk jij dat Maya zich aan het eind voelde?', options: ['Verveeld', 'Boos', 'Trots dat anderen haar verhaal wilden lezen'] },
      ],
    },
    'storm-night': {
      title: 'De nacht van het onweer',
      paragraphs: [
        'Het onweer kwam vlak na het eten. De donder rommelde over het dak, en de lampen flikkerden en gingen uit.',
        'Tomás was bang in het donker, maar hij dacht aan de raad van zijn oom: als iets je bang maakt, zoek dan een manier om iemand anders te helpen.',
        'Hij vond een zaklamp in de keukenla en ging naar de kamer van zijn kleine broertje. Leo zat verstopt onder de deken.',
        'Tomás maakte schaduwdieren op de muur: een konijn, een krab en een heel gekke hond. Al snel lachte Leo, en Tomás merkte dat hij zelf niet meer bang was.',
      ],
      questions: [
        { question: 'Wat gebeurde er met de lampen?', options: ['Ze gingen feller branden', 'Ze gingen uit', 'Ze veranderden van kleur'] },
        { question: 'Wat was de raad van zijn oom?', options: ['Vroeg naar bed gaan', 'Een manier zoeken om iemand anders te helpen', 'Onder een deken kruipen'] },
        { question: 'Waarom was Tomás niet meer bang?', options: ['Door Leo te helpen vergat hij het donker', 'Het onweer hield op', 'Zijn ouders kwamen thuis'] },
      ],
    },
    'little-boat': {
      title: 'Het kleine bootje',
      paragraphs: ['Tom heeft een klein bootje.', 'Hij zet het in de vijver. Het drijft!', 'Een kikker springt op het bootje. Plons!', 'Tom en de kikker lachen. Nu is het een kikkerboot.'],
      questions: [
        { question: 'Wat heeft Tom?', options: ['Een klein bootje', 'Een grote auto', 'Een rode bal'] },
        { question: 'Waar zet Tom het bootje?', options: ['In bad', 'In de vijver', 'In de zee'] },
        { question: 'Wie springt op het bootje?', options: ['Een eend', 'Een vis', 'Een kikker'] },
      ],
    },
    'market-day': {
      title: 'Marktdag',
      paragraphs: ['Het is marktdag.', 'Oma pakt een grote mand.', 'We halen rode tomaten en gele mango’s.', 'De mand is vol. Oma geeft me een mango. Mmm!'],
      questions: [
        { question: 'Wie pakt een mand?', options: ['Oma', 'Papa', 'Een kat'] },
        { question: 'Welke kleur hebben de mango’s?', options: ['Rood', 'Geel', 'Blauw'] },
        { question: 'Wat geeft oma mij?', options: ['Een tomaat', 'Een mand', 'Een mango'] },
      ],
    },
    'brave-hen': {
      title: 'Het dappere kipje',
      paragraphs: [
        'Elke ochtend liep het kipje over de boerderij en telde ze haar vijf kuikentjes.',
        'Op een dag telde ze er maar vier. Waar was het kleinste kuikentje?',
        'Ze keek in de schuur en achter de put. Toen hoorde ze een heel zacht „piep” uit het hoge gras.',
        'Het kuikentje zat vast in een gat! Het kipje krabde met haar poten tot het kuikentje vrij was. Die avond telde ze weer vijf.',
      ],
      questions: [
        { question: 'Hoeveel kuikentjes had het kipje?', options: ['Drie', 'Vijf', 'Tien'] },
        { question: 'Waar hoorde ze het kuikentje?', options: ['In het hoge gras', 'In de schuur', 'Op het dak'] },
        { question: 'Hoe hielp het kipje?', options: ['Ze riep de boer', 'Ze vloog weg', 'Ze krabde tot het kuikentje vrij was'] },
      ],
    },
    'rainy-picnic': {
      title: 'De regenpicknick',
      paragraphs: [
        'Ama en haar papa pakten broodjes, sinaasappels en een grote deken in voor een picknick in het park.',
        'Net toen ze gingen zitten, kwamen er donkere wolken en begon het te regenen.',
        'Papa lachte. "Laten we thuis picknicken," zei hij. Ze renden terug, helemaal nat.',
        'Ze legden de deken op de vloer van de woonkamer en aten hun broodjes terwijl de regen tegen het raam tikte. Het was de leukste picknick ooit.',
      ],
      questions: [
        { question: 'Waar wilden ze picknicken?', options: ['Op school', 'In het park', 'Op het strand'] },
        { question: 'Wat gebeurde er toen ze gingen zitten?', options: ['Het begon te regenen', 'Er kwam een hond', 'De zon ging onder'] },
        { question: 'Waar picknickten ze uiteindelijk?', options: ['In de auto', 'In het park', 'Op de vloer van de woonkamer'] },
      ],
    },
    'new-girl': {
      title: 'Het nieuwe meisje',
      paragraphs: [
        'Op maandag kwam er een nieuw meisje in de klas van Kwame. Ze heette Sofia en was net verhuisd uit een ander land. Ze sprak nog niet veel Nederlands.',
        'In de pauze stond Sofia alleen bij het hek. Kwame wilde haar gedag zeggen, maar hij wist niet hoe hij moest praten met iemand die hem misschien niet verstond.',
        'Toen kreeg hij een idee. Hij pakte zijn voetbal en rolde die zachtjes naar haar toe. Sofia glimlachte, stopte de bal met haar voet en schopte hem terug.',
        'Ze speelden tot de bel ging. Niemand had veel woorden nodig. Op vrijdag leerde Sofia Kwame tot tien tellen in haar taal, en hij leerde haar de namen van zijn favoriete spelers.',
      ],
      questions: [
        { question: 'Waarom sprak Sofia nog niet veel Nederlands?', options: ['Ze was verlegen', 'Ze was net verhuisd uit een ander land', 'Ze was verkouden'] },
        { question: 'Hoe begon Kwame met haar te spelen?', options: ['Hij rolde zijn voetbal naar haar toe', 'Hij vroeg het aan de juf', 'Hij gaf haar een snoepje'] },
        { question: 'Wat laat het verhaal zien?', options: ['Voetbal is het leukste spel', 'De pauze is te kort', 'Je kunt vrienden maken zonder veel woorden'] },
      ],
    },
    'old-clock': {
      title: 'De oude klok van oma',
      paragraphs: [
        'In de hoek van oma’s gang stond een hoge houten klok. Hij was jaren geleden stil blijven staan, om precies zeven over drie.',
        'Op een regenachtige middag vroeg Jun waarom niemand hem had gerepareerd. Oma glimlachte. "Hij bleef stilstaan op de dag dat je mama geboren werd," zei ze. "Ik vond het fijn om aan dat moment te denken."',
        'Jun dacht er lang over na. Toen vond hij een klein sleuteltje boven op de klok en vroeg hij of ze hem weer konden laten lopen, zodat hij ook nieuwe momenten kon tellen.',
        'Samen draaiden ze hem voorzichtig op. Met een zachte klik begon de klok te tikken. Oma lachte en zei dat hij nu twee dagen zou onthouden: de dag dat zijn mama geboren werd, en de dag dat Jun hem weer tot leven bracht.',
      ],
      questions: [
        { question: 'Hoe laat was de klok stil blijven staan?', options: ['Om twaalf uur', 'Om zeven over drie', 'Om half zeven'] },
        { question: 'Waarom had oma hem niet laten repareren?', options: ['Hij deed haar denken aan de dag dat Juns mama geboren werd', 'Ze had geen geld', 'Ze hield niet van klokken'] },
        { question: 'Wat onthoudt de klok aan het eind?', options: ['Alleen de regenachtige middag', 'Helemaal niets', 'Twee bijzondere dagen'] },
      ],
    },
  },
};
export default nl;
