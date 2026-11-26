import type { Level, Story, StoryTopic } from './youngReaders';

/**
 * More Young readers stories (owner request 2026-11-26): 33 at every level, with maths (shapes and geometry
 * symbols), science and bedtime stories. All texts were written for BooksAtlas. Translations: young/more/*.ts.
 */
type Q = [question: string, options: string[], answer: number];
const S = (id: string, level: Level, topic: StoryTopic, title: string, picture: string, symbols: string[], paragraphs: string[], questions: Q[]): Story =>
  ({ id, level, topic, title, picture, ...(symbols.length ? { symbols } : {}), paragraphs, questions: questions.map(([question, options, answer]) => ({ question, options, answer })) });

export const MORE_STORIES: Story[] = [
  // ------------------------------------------------------------------------------------------ level 1: maths
  S('three-ducks', 1, 'maths', 'Three Little Ducks', '🦆', ['1', '2', '3', '−'], [
    'One duck swims. Two ducks swim.', 'Three ducks swim in the pond.', 'Then one duck goes home.', 'Now two ducks swim. Quack, quack!',
  ], [['How many ducks swim at first?', ['Two', 'Three', 'Five'], 1], ['How many ducks go home?', ['One', 'Two', 'Three'], 0], ['How many ducks are left?', ['Three', 'One', 'Two'], 2]]),
  S('shape-hunt', 1, 'maths', 'The Shape Hunt', '🔍', ['○', '□', '△'], [
    'Ben looks for shapes.', 'The clock is a circle.', 'The window is a square. The roof is a triangle.', 'Ben found three shapes!',
  ], [['What shape is the clock?', ['A circle', 'A square', 'A triangle'], 0], ['What shape is the window?', ['A triangle', 'A square', 'A circle'], 1], ['What shape is the roof?', ['A circle', 'A square', 'A triangle'], 2]]),
  S('big-small', 1, 'maths', 'Big and Small', '🐘', ['▲', '▴', '>', '<'], [
    'The elephant is big. The mouse is small.', 'The ball is big. The bead is small.', 'Mia is not big. Mia is not small.', 'Mia is just right!',
  ], [['Who is big?', ['The mouse', 'The elephant', 'The bead'], 1], ['Who is small?', ['The mouse', 'The ball', 'The elephant'], 0], ['What is Mia?', ['Big', 'Small', 'Just right'], 2]]),
  S('five-apples', 1, 'maths', 'Five Red Apples', '🍎', ['5', '−', '1', '='], [
    'There are five apples on the tree.', 'Dad picks one. Now there are four.', 'Lulu picks one. Now there are three.', 'We make an apple pie!',
  ], [['How many apples are on the tree at first?', ['Five', 'Three', 'Ten'], 0], ['Who picks an apple first?', ['Lulu', 'Dad', 'Mum'], 1], ['How many apples are left at the end?', ['Four', 'One', 'Three'], 2]]),
  S('square-cake', 1, 'maths', 'The Square Cake', '🎂', ['□', '½', '¼'], [
    'Gran makes a square cake.', 'She cuts it in two. Now there are two halves.', 'She cuts it again.', 'Now there are four pieces, one for each of us!',
  ], [['What shape is the cake?', ['Round', 'Square', 'A star'], 1], ['How many pieces after the first cut?', ['Two', 'Four', 'Six'], 0], ['How many pieces are there at the end?', ['Two', 'Three', 'Four'], 2]]),
  S('long-snake', 1, 'maths', 'The Long Snake', '🐍', ['📏', '—', '>'], [
    'The snake is long. The worm is short.', 'The snake is longer than the worm.', 'The worm is shorter than the snake.', 'But the worm can dig!',
  ], [['Who is long?', ['The worm', 'The snake', 'The ant'], 1], ['Who is shorter?', ['The worm', 'The snake', 'The tree'], 0], ['What can the worm do?', ['Fly', 'Sing', 'Dig'], 2]]),
  S('star-count', 1, 'maths', 'Counting Stars', '⭐', ['★', '★', '★', '6'], [
    'Zara looks at the sky.', 'One star. Two stars. Three stars.', 'Four, five, six!', 'Six little stars say good night.',
  ], [['Where does Zara look?', ['At the sky', 'At the sea', 'In a box'], 0], ['How many stars are there at the end?', ['Three', 'Six', 'Ten'], 1], ['What do the stars say?', ['Hello', 'Good morning', 'Good night'], 2]]),
  S('round-wheels', 1, 'maths', 'Round and Round', '🚲', ['○', '○', '□'], [
    'A bike has two wheels.', 'A car has four wheels.', 'Wheels are circles. Circles roll round and round.', 'A square cannot roll!',
  ], [['How many wheels does a bike have?', ['Two', 'Four', 'Three'], 0], ['What shape are wheels?', ['Squares', 'Circles', 'Triangles'], 1], ['What cannot roll?', ['A wheel', 'A ball', 'A square'], 2]]),
  S('socks-pairs', 1, 'maths', 'Pairs of Socks', '🧦', ['2', '+', '2', '+', '2'], [
    'Kemi has red socks, blue socks and green socks.', 'Two red. Two blue. Two green.', 'Two socks make a pair.', 'Kemi has three pairs!',
  ], [['How many socks make a pair?', ['One', 'Two', 'Five'], 1], ['Which colour is not there?', ['Red', 'Yellow', 'Green'], 1], ['How many pairs does Kemi have?', ['Three', 'Two', 'Six'], 0]]),
  S('triangle-tent', 1, 'maths', 'The Triangle Tent', '⛺', ['△', '∠', '3'], [
    'We put up a tent.', 'It has three sides. It has three corners.', 'It is a triangle!', 'We sleep in the triangle tent.',
  ], [['How many sides does the tent have?', ['Three', 'Four', 'Five'], 0], ['What shape is the tent?', ['A circle', 'A triangle', 'A square'], 1], ['What do we do in the tent?', ['Cook', 'Swim', 'Sleep'], 2]]),
  // ------------------------------------------------------------------------------------------ level 1: science
  S('ice-melts', 1, 'science', 'The Ice Melts', '🧊', ['❄', '→', '💧'], [
    'Leo has some ice.', 'The ice is cold and hard.', 'The sun is hot. The ice melts.', 'Now it is water!',
  ], [['What is the ice like?', ['Hot and soft', 'Cold and hard', 'Warm and wet'], 1], ['What makes the ice melt?', ['The sun', 'The moon', 'The wind'], 0], ['What is it at the end?', ['Ice', 'Sand', 'Water'], 2]]),
  S('seed-grows', 1, 'science', 'A Seed Grows', '🌱', ['☀', '+', '💧'], [
    'I plant a seed.', 'I give it water. The sun shines.', 'A little plant comes up!', 'Plants need water and sun.',
  ], [['What do I plant?', ['A stone', 'A seed', 'A toy'], 1], ['What do plants need?', ['Water and sun', 'Milk and bread', 'Toys'], 0], ['What comes up?', ['A fish', 'A rock', 'A little plant'], 2]]),
  S('magic-magnet', 1, 'science', 'The Magic Magnet', '🧲', ['N', 'S'], [
    'Ama has a magnet.', 'The magnet picks up a pin. It picks up a nail.', 'It does not pick up paper.', 'Magnets like metal!',
  ], [['What does Ama have?', ['A magnet', 'A ball', 'A pen'], 0], ['What does the magnet pick up?', ['Paper', 'A pin', 'A leaf'], 1], ['What do magnets like?', ['Wood', 'Paper', 'Metal'], 2]]),
  S('float-sink', 1, 'science', 'Float or Sink?', '🛁', ['↑', '↓'], [
    'In the bath, the duck floats.', 'The stone sinks.', 'The leaf floats. The spoon sinks.', 'Splash! What will float next?',
  ], [['What floats?', ['The stone', 'The duck', 'The spoon'], 1], ['What sinks?', ['The stone', 'The duck', 'The leaf'], 0], ['Where are they?', ['In the garden', 'In the car', 'In the bath'], 2]]),
  S('my-shadow', 1, 'science', 'My Shadow', '👤', ['☀'], [
    'The sun is out. I see my shadow.', 'I jump. My shadow jumps too.', 'At night the sun is gone.', 'My shadow goes too.',
  ], [['What makes my shadow?', ['The sun', 'The rain', 'My bed'], 0], ['What does my shadow do when I jump?', ['It sleeps', 'It jumps too', 'It sings'], 1], ['When does my shadow go?', ['In the morning', 'At lunch', 'At night'], 2]]),
  S('five-senses', 1, 'science', 'My Five Senses', '👀', ['👀', '👂', '👃', '👅', '✋'], [
    'I see with my eyes.', 'I hear with my ears.', 'I smell with my nose. I taste with my tongue.', 'I touch with my hands.',
  ], [['What do I see with?', ['My ears', 'My eyes', 'My hands'], 1], ['What do I smell with?', ['My nose', 'My eyes', 'My tongue'], 0], ['What do I touch with?', ['My ears', 'My nose', 'My hands'], 2]]),
  S('rain-cloud', 1, 'science', 'The Rain Cloud', '🌧️', ['☁', '↓', '💧'], [
    'A grey cloud is full of water.', 'Drip, drop, it rains!', 'The rain fills the pond.', 'The frogs are happy.',
  ], [['What colour is the cloud?', ['Grey', 'Pink', 'Green'], 0], ['What does the rain fill?', ['A cup', 'The pond', 'The car'], 1], ['Who is happy?', ['The cat', 'The sun', 'The frogs'], 2]]),
  S('egg-butterfly', 1, 'science', 'From Egg to Butterfly', '🦋', ['🥚', '→', '🐛', '→', '🦋'], [
    'A tiny egg is on a leaf.', 'Out comes a caterpillar. It eats and eats.', 'It makes a case and sleeps.', 'Then out comes a butterfly!',
  ], [['Where is the egg?', ['On a leaf', 'In a nest', 'In a box'], 0], ['What comes out of the egg?', ['A bird', 'A caterpillar', 'A fish'], 1], ['What comes out at the end?', ['A frog', 'A bee', 'A butterfly'], 2]]),
  S('hot-cold', 1, 'science', 'Hot and Cold', '🔥', ['🌡', '+', '−'], [
    'Soup is hot. Ice cream is cold.', 'The sun is hot. Snow is cold.', 'Do not touch hot things.', 'Ask a grown-up!',
  ], [['Which one is hot?', ['Ice cream', 'Soup', 'Snow'], 1], ['Which one is cold?', ['Snow', 'The sun', 'Soup'], 0], ['What do we do with hot things?', ['Touch them', 'Eat them fast', 'Ask a grown-up'], 2]]),
  S('busy-bee', 1, 'science', 'The Busy Bee', '🐝', ['❀', '⬡'], [
    'A bee flies to a flower.', 'It drinks the sweet juice. Yellow dust sticks to its legs.', 'It flies to the next flower.', 'The bee helps flowers grow.',
  ], [['Where does the bee fly?', ['To a flower', 'To a car', 'To a bed'], 0], ['What sticks to its legs?', ['Mud', 'Yellow dust', 'Water'], 1], ['What does the bee help?', ['Cars go', 'Rocks fall', 'Flowers grow'], 2]]),
  // ------------------------------------------------------------------------------------------ level 1: bedtime
  S('sleepy-bear', 1, 'bedtime', 'The Sleepy Bear', '🐻', [], [
    'Little Bear yawns.', 'He has a bath. He puts on his pyjamas.', 'Mum reads a book.', 'Little Bear is asleep.',
  ], [['Who yawns?', ['Little Bear', 'Big Cat', 'Owl'], 0], ['What does he put on?', ['A hat', 'His pyjamas', 'Boots'], 1], ['Who reads a book?', ['Dad', 'Owl', 'Mum'], 2]]),
  S('hello-moon', 1, 'bedtime', 'Hello, Moon', '🌕', ['○'], [
    'The moon comes up. Hello, moon!', 'The moon is big and round.', 'It shines in my window.', 'Good night, moon.',
  ], [['What comes up?', ['The sun', 'The moon', 'A kite'], 1], ['What is the moon like tonight?', ['Big and round', 'Square', 'A triangle'], 0], ['Where does it shine?', ['In the pond', 'On the car', 'In my window'], 2]]),
  S('owl-night', 1, 'bedtime', 'The Owl at Night', '🦉', [], [
    'Owl sleeps in the day.', 'At night she wakes up. Hoo, hoo!', 'She flies over the trees.', 'In the morning, she goes to sleep.',
  ], [['When does Owl sleep?', ['In the day', 'At night', 'Never'], 0], ['What does she say?', ['Moo', 'Hoo, hoo', 'Quack'], 1], ['Where does she fly?', ['Over the sea', 'Into a house', 'Over the trees'], 2]]),
  S('where-teddy', 1, 'bedtime', 'Where Is Teddy?', '🧸', [], [
    'It is bedtime. Where is Teddy?', 'Not in the box. Not under the bed.', 'Here he is, in the bath!', 'Now we can sleep.',
  ], [['Who is lost?', ['Teddy', 'The cat', 'Dad'], 0], ['Is Teddy under the bed?', ['Yes', 'No', 'Maybe'], 1], ['Where is Teddy?', ['In the box', 'In the car', 'In the bath'], 2]]),
  S('counting-sheep', 1, 'bedtime', 'Counting Sheep', '🐑', ['1', '2', '3'], [
    'I cannot sleep.', 'I count sheep.', 'One sheep jumps. Two sheep jump.', 'Three… I am asleep.',
  ], [['What do I count?', ['Cows', 'Sheep', 'Stars'], 1], ['What do the sheep do?', ['Jump', 'Sing', 'Swim'], 0], ['What happens at the end?', ['I wake up', 'I eat', 'I am asleep'], 2]]),
  S('quiet-house', 1, 'bedtime', 'The Quiet House', '🏠', [], [
    'The cat is asleep. The dog is asleep.', 'Baby is asleep.', 'The house is quiet.', 'Shh! Good night, house.',
  ], [['Who is asleep first?', ['The cat', 'The fish', 'Dad'], 0], ['What is the house like?', ['Loud', 'Quiet', 'Cold'], 1], ['What do we say?', ['Hello', 'Run', 'Shh'], 2]]),
  S('little-star', 1, 'bedtime', 'The Little Star', '🌟', ['★'], [
    'A little star is in the sky.', 'It is far, far away.', 'It twinkles and twinkles.', 'It says: sleep well, little one.',
  ], [['Where is the star?', ['In the sea', 'In the sky', 'In a box'], 1], ['What does it do?', ['It twinkles', 'It runs', 'It eats'], 0], ['What does it say?', ['Wake up', 'Go out', 'Sleep well'], 2]]),
  S('warm-milk', 1, 'bedtime', 'Warm Milk', '🥛', [], [
    'Dad makes warm milk.', 'I drink it slowly.', 'I brush my teeth. I get into bed.', 'My bed is warm too.',
  ], [['Who makes the milk?', ['Dad', 'Mum', 'Nana'], 0], ['What do I brush?', ['My hair', 'My teeth', 'The dog'], 1], ['What is warm too?', ['The snow', 'The window', 'My bed'], 2]]),
  S('firefly', 1, 'bedtime', 'The Firefly', '✨', [], [
    'In the garden, a tiny light goes on and off.', 'It is a firefly!', 'It glows like a little lamp.', 'It says good night.',
  ], [['Where is the light?', ['In the garden', 'In the kitchen', 'In the bath'], 0], ['What is it?', ['A car', 'A firefly', 'A star'], 1], ['What does it glow like?', ['The sun', 'A fire', 'A little lamp'], 2]]),

  // ------------------------------------------------------------------------------------------ level 2: maths
  S('shape-town', 2, 'maths', 'The Town of Shapes', '🏘️', ['□', '△', '○', '▭'], [
    'Nia drew a town using only shapes. Each house was a square with a triangle on top for the roof.',
    'The doors were rectangles, and the windows were small squares. The sun in the sky was a big yellow circle.',
    'She drew a long rectangle for the road and circles for the wheels of the cars.',
    'Her teacher counted twelve shapes in the picture. “You are a shape architect!” she said.',
  ], [['What shape were the roofs?', ['Circles', 'Triangles', 'Squares'], 1], ['What shape was the sun?', ['A circle', 'A rectangle', 'A triangle'], 0], ['How many shapes did the teacher count?', ['Five', 'Nine', 'Twelve'], 2]]),
  S('fair-shares', 2, 'maths', 'Fair Shares', '🍬', ['12', '÷', '4', '=', '3'], [
    'Ali had twelve sweets, and three friends came to play.',
    '“Let us share them fairly,” said his mum. Ali gave one sweet to each person, again and again.',
    'Ali and his three friends were four children, so each one got three sweets.',
    'Nobody had more and nobody had less. Sharing fairly is called dividing.',
  ], [['How many sweets did Ali have?', ['Ten', 'Twelve', 'Twenty'], 1], ['How many sweets did each child get?', ['Three', 'Four', 'Six'], 0], ['What is sharing fairly called?', ['Adding', 'Taking away', 'Dividing'], 2]]),
  S('what-time', 2, 'maths', 'What Time Is It?', '🕒', ['🕐', '12', '3'], [
    'Joy has a clock with two hands. The long hand shows the minutes, and the short hand shows the hours.',
    'When the long hand points to twelve and the short hand points to three, it is three o’clock.',
    'At three o’clock, Joy’s football match begins.',
    'When the long hand goes all the way round once, one hour has passed. At four o’clock the match is over.',
  ], [['What does the long hand show?', ['The hours', 'The minutes', 'The days'], 1], ['When does the match begin?', ['At three o’clock', 'At twelve o’clock', 'At four o’clock'], 0], ['How long was the match?', ['Ten minutes', 'A whole day', 'One hour'], 2]]),
  S('bead-pattern', 2, 'maths', 'The Bead Pattern', '📿', ['●', '■', '▲', '●', '■', '▲'], [
    'Rosa was making a necklace with beads in a pattern: circle, square, triangle, circle, square, triangle.',
    '“What comes next?” asked her brother. Rosa looked carefully at the pattern.',
    '“A circle!” she said, because the pattern always starts again with a circle.',
    'When the necklace was finished, it had ten circles, ten squares and ten triangles. That made thirty beads!',
  ], [['What was the pattern?', ['Circle, square, triangle', 'Star, heart, moon', 'Only circles'], 0], ['What came next?', ['A triangle', 'A circle', 'A square'], 1], ['How many beads were there?', ['Ten', 'Twenty', 'Thirty'], 2]]),
  S('tall-bean', 2, 'maths', 'How Tall Is the Bean?', '📏', ['cm', '2', '5', '9'], [
    'Omar planted a bean in a pot and measured it every week with a ruler.',
    'In week one it was two centimetres tall. In week two it was five centimetres.',
    'In week three it was nine centimetres tall, and it had four green leaves.',
    'Omar made a chart. Each week, the bean grew more than the week before!',
  ], [['What did Omar use to measure?', ['A ruler', 'A clock', 'A cup'], 0], ['How tall was the bean in week two?', ['Two centimetres', 'Five centimetres', 'Nine centimetres'], 1], ['How many leaves did it have in week three?', ['Two', 'Nine', 'Four'], 2]]),
  S('toy-shop', 2, 'maths', 'The Toy Shop', '🪙', ['4', '+', '7', '=', '11'], [
    'Eva had ten coins in her purse. At the toy shop, a ball cost four coins and a car cost seven.',
    '“Can I buy both?” she asked. Four and seven make eleven, which is more than ten.',
    'So Eva bought the ball. Ten take away four left six coins.',
    'She saved the six coins. Next week, with her pocket money, she could buy the car too.',
  ], [['How many coins did Eva have?', ['Ten', 'Four', 'Eleven'], 0], ['Why could she not buy both?', ['The shop was closed', 'Together they cost eleven coins', 'She did not like the car'], 1], ['How many coins were left?', ['Four', 'Seven', 'Six'], 2]]),
  S('mirror-butterfly', 2, 'maths', 'The Mirror Butterfly', '🦋', ['|', '⇆', '♥'], [
    'Lena painted spots on one half of a piece of paper. Then she folded it in the middle and pressed hard.',
    'When she opened it, the paint had made the same spots on the other side!',
    '“It is symmetrical,” said Mr Ade. “Both halves match, like a picture in a mirror.”',
    'Lena looked around the room and found more symmetry: a leaf, a heart and her own face.',
  ], [['What did Lena do after painting?', ['She threw it away', 'She folded it', 'She washed it'], 1], ['What does symmetrical mean?', ['Both halves match', 'It is very big', 'It has many colours'], 0], ['What else was symmetrical?', ['A cloud', 'A puddle', 'A leaf'], 2]]),
  S('counting-legs', 2, 'maths', 'Counting Legs', '🕷️', ['8', '+', '8', '=', '16'], [
    'A spider has eight legs. A cat has four legs. A bird has two legs.',
    'Tara saw two spiders in the garden. Eight and eight make sixteen legs!',
    'Then three cats walked by. Four, eight, twelve legs.',
    '“That is a lot of legs,” laughed Tara, “and I only have two!”',
  ], [['How many legs does a spider have?', ['Six', 'Eight', 'Ten'], 1], ['How many legs do two spiders have?', ['Sixteen', 'Eight', 'Twelve'], 0], ['How many legs do the three cats have?', ['Four', 'Eight', 'Twelve'], 2]]),
  S('box-shape', 2, 'maths', 'The Box Shape', '📦', ['□', '⬚', '○', '⌭'], [
    'Dad brought home a box. Kwesi counted its flat sides. There were six, and each one was a square.',
    '“This shape is called a cube,” said Dad. “Dice are cubes too.”',
    'Kwesi found a ball, which is a sphere, and a can of beans, which is a cylinder.',
    'He built a tower with the cube at the bottom, because a sphere would roll away!',
  ], [['How many flat sides does a cube have?', ['Four', 'Six', 'Eight'], 1], ['What shape is a ball?', ['A sphere', 'A cube', 'A cylinder'], 0], ['Why was the cube at the bottom?', ['It was red', 'It was the smallest', 'A sphere would roll away'], 2]]),
  S('pizza-quarters', 2, 'maths', 'Halves and Quarters', '🍕', ['○', '½', '¼', '1'], [
    'Mum made a round pizza and cut it straight down the middle. “Now there are two halves,” she said.',
    'Then she cut across the middle too. Now there were four pieces, all the same size.',
    '“Each piece is a quarter,” said Mum. “Four quarters make one whole pizza.”',
    'Sam ate one quarter, Dad ate two, and Mum ate the last one.',
  ], [['What were there after the first cut?', ['Two halves', 'Three pieces', 'Five pieces'], 0], ['What is each of the four pieces called?', ['A half', 'A quarter', 'A whole'], 1], ['How many quarters did Dad eat?', ['One', 'Four', 'Two'], 2]]),
  // ------------------------------------------------------------------------------------------ level 2: science
  S('raindrop-journey', 2, 'science', 'The Journey of a Raindrop', '💧', ['☁', '↓', '☀', '↑'], [
    'A raindrop fell from a cloud into the sea. The sun warmed the sea, and the raindrop turned into invisible water vapour.',
    'It floated up into the sky, where the air was cold. There it joined other drops to make a new cloud.',
    'When the cloud became heavy, the raindrop fell again, this time on a mountain.',
    'It ran down a stream into a river, and the river carried it back to the sea. Round and round it goes!',
  ], [['What warmed the sea?', ['The moon', 'The sun', 'A fire'], 1], ['What did the drops make in the cold sky?', ['A cloud', 'A rainbow', 'Snow'], 0], ['Where did the river carry the raindrop?', ['Up the mountain', 'Into a cloud', 'Back to the sea'], 2]]),
  S('eight-planets', 2, 'science', 'A Trip Past the Planets', '🪐', ['☉', '○', '○', '○'], [
    'Aiko built a rocket from a cardboard box and imagined a trip through space.',
    'First she passed Mercury, the planet closest to the Sun. Then came Venus, and then our home, the Earth.',
    'Next was red Mars, then huge Jupiter, and Saturn with its beautiful rings.',
    'Far away were Uranus and Neptune, cold and blue. “Eight planets!” said Aiko, and flew home for dinner.',
  ], [['Which planet is closest to the Sun?', ['Mars', 'Mercury', 'Neptune'], 1], ['Which planet has beautiful rings?', ['Saturn', 'Earth', 'Venus'], 0], ['How many planets did Aiko pass?', ['Six', 'Nine', 'Eight'], 2]]),
  S('heart-drum', 2, 'science', 'The Drum Inside You', '❤️', ['♥'], [
    'Put your hand on your chest and keep very still. Can you feel a soft thump, thump?',
    'That is your heart. It is a strong muscle that pumps blood all around your body.',
    'When Ben ran a race, his heart beat faster to give his muscles more energy.',
    'When he rested, it slowed down again. Your heart works all day and all night, even when you sleep.',
  ], [['What is the heart?', ['A bone', 'A muscle', 'The brain'], 1], ['What happened when Ben ran?', ['His heart beat faster', 'His heart stopped', 'His heart beat slower'], 0], ['When does your heart work?', ['Only in the day', 'Only when you run', 'All day and all night'], 2]]),
  S('making-rainbow', 2, 'science', 'Making a Rainbow', '🌈', ['☀', '◢', '7'], [
    'After the rain, the sun came out, and Precious saw a rainbow over the hill.',
    '“Sunlight looks white, but it is made of many colours,” said Grandad. “Raindrops split it up.”',
    'At home they held a glass of water in the sunshine, and a little rainbow appeared on the wall.',
    'Precious counted the colours: red, orange, yellow, green, blue, indigo and violet. Seven!',
  ], [['When did Precious see the rainbow?', ['After the rain, when the sun came out', 'At night', 'In the fog'], 0], ['What splits sunlight into colours?', ['Stones', 'Raindrops', 'The wind'], 1], ['How many colours did she count?', ['Three', 'Five', 'Seven'], 2]]),
  S('push-pull', 2, 'science', 'Pushes and Pulls', '🛒', ['→', '←'], [
    'Felix pushed his toy car, and it rolled across the floor. Then he pulled his wagon with a rope.',
    '“A push or a pull is called a force,” said his teacher. “Forces make things move, stop or change direction.”',
    'When the car reached the carpet, it slowed down. The rough carpet rubbed against the wheels. That is called friction.',
    'On the smooth kitchen floor, the car went much further.',
  ], [['What is a push or a pull called?', ['A force', 'A wheel', 'A sound'], 0], ['Why did the car slow down on the carpet?', ['The battery ran out', 'Friction', 'It was tired'], 1], ['Where did the car go further?', ['On the grass', 'On the carpet', 'On the smooth floor'], 2]]),
  S('our-teeth', 2, 'science', 'Our Teeth', '🦷', ['20', '32'], [
    'Ines lost her first tooth! Underneath, a new grown-up tooth was already waiting.',
    'Children have twenty baby teeth. Grown-ups have up to thirty-two teeth.',
    'Sweet food helps germs make holes in teeth, so Ines brushes twice a day.',
    'Her front teeth are sharp for biting, and her back teeth are flat for chewing.',
  ], [['How many baby teeth do children have?', ['Twenty', 'Ten', 'Thirty-two'], 0], ['How often does Ines brush her teeth?', ['Once a week', 'Twice a day', 'Never'], 1], ['What are the back teeth for?', ['Biting', 'Smiling', 'Chewing'], 2]]),
  S('singing-glass', 2, 'science', 'The Singing Glass', '🔔', ['∿', '♪'], [
    'Malik tapped a glass with a spoon, and it went ting! The glass shook very fast. That shaking is called a vibration.',
    'The vibration made the air shake too, and the sound travelled to Malik’s ears.',
    'He poured water into a second glass and tapped it. It made a lower sound!',
    'Malik lined up five glasses with different amounts of water and played a little tune.',
  ], [['What is the fast shaking called?', ['A vibration', 'A rainbow', 'A shadow'], 0], ['What carried the sound to his ears?', ['Only the water', 'The air', 'The spoon'], 1], ['What did he do with five glasses?', ['He drank them', 'He broke them', 'He played a tune'], 2]]),
  S('plants-eat', 2, 'science', 'How Plants Eat', '🌿', ['☀', '💧', '→', '🍃'], [
    'Plants cannot walk to the shop, but they still make their own food.',
    'Their roots drink water from the soil. Their leaves catch sunlight and take in air.',
    'Using sunlight, the leaves turn water and air into sugar. That sugar is the plant’s food.',
    'That is why Sara puts her plant by the window, where it gets the most light.',
  ], [['What do the roots do?', ['Catch sunlight', 'Drink water', 'Make flowers'], 1], ['What do the leaves make?', ['Sugar', 'Stones', 'Rain'], 0], ['Why does Sara put her plant by the window?', ['To see outside', 'It is cold there', 'It gets the most light'], 2]]),
  S('dinosaur-bones', 2, 'science', 'The Dinosaur Bones', '🦕', [], [
    'At the museum, Daniel stood under a huge skeleton. It was a dinosaur that lived millions of years ago.',
    'Scientists who dig for very old bones are called palaeontologists. They work very slowly with brushes.',
    'Over a long time, the bones had turned to stone. Bones like these are called fossils.',
    'Daniel decided to dig in the garden. He found a snail shell, a button and a lot of mud.',
  ], [['Who digs for very old bones?', ['Astronauts', 'Palaeontologists', 'Bakers'], 1], ['What are bones that turned to stone called?', ['Fossils', 'Crystals', 'Shells'], 0], ['What did Daniel find in the garden?', ['A dinosaur skull', 'Gold coins', 'A snail shell, a button and mud'], 2]]),
  S('light-bulb', 2, 'science', 'The Light Bulb', '💡', ['+', '−', '○'], [
    'Hana had a battery, two wires and a tiny light bulb.',
    'She joined one wire to the top of the battery and one to the bottom. Nothing happened.',
    'Then she touched both wires to the bulb, making a loop. The bulb lit up!',
    '“Electricity needs a full loop to flow,” said her mum. “That loop is called a circuit.”',
  ], [['What did Hana have?', ['A battery, two wires and a bulb', 'A candle', 'A torch with no battery'], 0], ['When did the bulb light up?', ['When she shook it', 'When the wires made a loop', 'When she blew on it'], 1], ['What is the loop called?', ['A wheel', 'A battery', 'A circuit'], 2]]),
  // ------------------------------------------------------------------------------------------ level 2: bedtime
  S('moon-boat', 2, 'bedtime', 'The Moon Boat', '🌙', [], [
    'When Ella closed her eyes, she imagined the moon was a silver boat.',
    'She climbed aboard and sailed slowly across the dark sky, past sleepy clouds.',
    'The stars waved as she went by, and a comet with a long tail raced ahead.',
    'When the boat reached the morning, Ella opened her eyes. The sun was shining in her window.',
  ], [['What did Ella imagine the moon was?', ['A silver boat', 'A big cheese', 'A balloon'], 0], ['What raced ahead?', ['An owl', 'A comet', 'A plane'], 1], ['What did she see when she opened her eyes?', ['The moon', 'The stars', 'The sun'], 2]]),
  S('dream-jar', 2, 'bedtime', 'The Dream Jar', '🫙', [], [
    'Grandma gave Yusuf an empty jar. “Every night, tell it one happy thing from your day,” she said.',
    'On Monday he whispered about the puppy next door. On Tuesday, about a funny joke at school.',
    'Soon he fell asleep thinking about happy things instead of worries.',
    'At the end of the month, Yusuf and Grandma remembered all the happy things together.',
  ], [['What did Grandma give Yusuf?', ['A book', 'An empty jar', 'A puppy'], 1], ['What did he tell the jar?', ['One happy thing', 'A worry', 'A secret'], 0], ['How did the jar help him?', ['He learned to count', 'He made new friends', 'He fell asleep thinking of happy things'], 2]]),
  S('night-garden', 2, 'bedtime', 'The Night Garden', '🦔', [], [
    'When the sun goes down, a different garden wakes up.',
    'Moths flutter around the lamps, and a hedgehog snuffles through the leaves looking for beetles.',
    'Some flowers open only at night, and they smell sweet in the dark.',
    'A fox walks quietly by the fence. By morning, everyone in the night garden is fast asleep.',
  ], [['Who looks for beetles?', ['The fox', 'A hedgehog', 'A moth'], 1], ['When do some flowers open?', ['Only at night', 'At lunchtime', 'Never'], 0], ['When does the night garden go to sleep?', ['At night', 'In the evening', 'By morning'], 2]]),
  S('lighthouse-keeper', 2, 'bedtime', 'The Lighthouse Keeper', '🗼', [], [
    'Every evening, old Mr Kalu climbed the hundred steps of the lighthouse.',
    'At the top, he lit the great lamp, and its beam swept across the dark sea.',
    'Far away, a fishing boat saw the light and steered safely around the rocks.',
    'Then Mr Kalu made a cup of tea and watched the waves until the sun came up.',
  ], [['How many steps did Mr Kalu climb?', ['Ten', 'A hundred', 'A thousand'], 1], ['What did the fishing boat do?', ['It steered safely around the rocks', 'It hit the rocks', 'It stopped'], 0], ['What did Mr Kalu do after lighting the lamp?', ['He went to sleep', 'He went swimming', 'He made a cup of tea'], 2]]),
  S('yawning-zoo', 2, 'bedtime', 'The Yawning Zoo', '🦁', [], [
    'At the end of the day, the lion gave a huge yawn. Then the giraffe yawned too.',
    'The monkeys yawned, the zebras yawned, and even the little penguins yawned.',
    'The zookeeper laughed. “Yawning is catching!” she said, and then she yawned as well.',
    'One by one, the animals closed their eyes, and the zoo was quiet under the stars.',
  ], [['Who yawned first?', ['The lion', 'The giraffe', 'The penguins'], 0], ['What did the zookeeper say?', ['Go home!', 'Yawning is catching!', 'Wake up!'], 1], ['What was the zoo like at the end?', ['Noisy', 'Empty', 'Quiet'], 2]]),
  S('blanket-fort', 2, 'bedtime', 'The Blanket Fort', '🏰', [], [
    'On Friday night, Kai and his sister built a fort with chairs and blankets.',
    'Inside, they had pillows, a torch and their favourite book about pirates.',
    'They read by torchlight and whispered so their parents would not hear.',
    'Dad peeked in and smiled. Both pirates were already asleep, with the book open on the pillow.',
  ], [['What did they build the fort with?', ['Boxes', 'Chairs and blankets', 'Sand'], 1], ['What was their book about?', ['Pirates', 'Dinosaurs', 'Space'], 0], ['What did Dad see?', ['They were reading', 'They were playing', 'They were both asleep'], 2]]),
  S('first-snow', 2, 'bedtime', 'The First Snow', '❄️', [], [
    'Before bed, Anya looked out and saw tiny white flakes falling past the street lamp.',
    '“Is it snow?” she asked. Mum nodded. “If it keeps falling, it will cover everything by morning.”',
    'Anya fell asleep dreaming of snowmen and sledges.',
    'When she woke up, the whole street was white and soft, and very, very quiet.',
  ], [['Where did Anya see the flakes?', ['Falling past the street lamp', 'In the fridge', 'On the television'], 0], ['What did she dream about?', ['The sea', 'Snowmen and sledges', 'Flowers'], 1], ['What was the street like in the morning?', ['Busy', 'Dark', 'White and quiet'], 2]]),
  S('whale-lullaby', 2, 'bedtime', 'The Whale’s Lullaby', '🐋', [], [
    'Deep in the ocean, a mother whale sang to her baby.',
    'Her song was long and low, and it travelled for many miles through the water.',
    'Fish stopped to listen, and an old turtle closed his eyes.',
    'The baby whale snuggled close to his mother and fell asleep, rocked by the gentle waves.',
  ], [['Who sang?', ['A turtle', 'A mother whale', 'A fish'], 1], ['How far did the song travel?', ['Many miles', 'One metre', 'Nowhere'], 0], ['What rocked the baby whale?', ['The turtle', 'A boat', 'The gentle waves'], 2]]),
  S('sleepy-train', 2, 'bedtime', 'The Sleepy Train', '🚂', [], [
    'The last train of the night left the city, full of tired people.',
    'Clickety-clack, clickety-clack, it rolled past dark fields and sleeping villages.',
    'One by one, the passengers closed their eyes, rocked by the gentle rhythm.',
    'At the end of the line, the driver turned off the engine. “Good night, train,” she said softly.',
  ], [['Where did the train leave from?', ['The city', 'A farm', 'The beach'], 0], ['What sound did the train make?', ['Beep, beep', 'Clickety-clack', 'Woof'], 1], ['What did the driver say?', ['Hurry up!', 'All aboard!', 'Good night, train'], 2]]),

  // ------------------------------------------------------------------------------------------ level 3: maths
  S('angle-detectives', 3, 'maths', 'The Angle Detectives', '📐', ['∠', '∟', '90°', '180°'], [
    'Ms Osei gave her class a mission: find the angles hidden around the school. An angle is made where two lines meet.',
    'Priya found a right angle in the corner of a book. It looked like a capital L and measured exactly ninety degrees.',
    'Tom found an acute angle, smaller than a right angle, at the tip of a slice of cake. Leila found an obtuse angle, wider than a right angle, in an open laptop.',
    'At the end, they laid two rulers in a straight line. “A straight line is an angle too,” said Ms Osei. “One hundred and eighty degrees: two right angles side by side.”',
  ], [['How many degrees are in a right angle?', ['Forty-five', 'Ninety', 'One hundred and eighty'], 1], ['What is an acute angle?', ['Smaller than a right angle', 'Wider than a right angle', 'A straight line'], 0], ['How many degrees is a straight line?', ['Ninety', 'Three hundred and sixty', 'One hundred and eighty'], 2]]),
  S('secret-pi', 3, 'maths', 'The Secret Number of Circles', '⭕', ['π', '○', '⌀', '≈3.14'], [
    'Jamal wrapped a piece of string around a round tin and marked where it met. That length is the circumference: the distance all the way round.',
    'Then he measured straight across the middle of the tin. That is the diameter. The string was a little more than three times as long.',
    'He tried a plate, a coin and a bicycle wheel. Every time, the answer was about three point one four.',
    '“That number is called pi,” said his aunt, who was an engineer. “It is the same for every circle in the universe, big or small.”',
  ], [['What is the circumference?', ['The distance across the middle', 'The distance all the way round', 'A kind of tin'], 1], ['How many times longer than the diameter was the string?', ['About three point one four times', 'Exactly two times', 'Ten times'], 0], ['What is true about pi?', ['It is different for every circle', 'It is only for big circles', 'It is the same for every circle'], 2]]),
  S('tiled-floor', 3, 'maths', 'The Tiled Floor', '⬢', ['⬡', '△', '□', '⬠'], [
    'In the old market hall, Bea noticed that the floor was covered in hexagon tiles, fitting together with no gaps.',
    'Shapes that fit together without gaps or overlaps make a tessellation. Squares and triangles tessellate too.',
    'Bea tried to cover a page with circles, but there were always little gaps between them. Pentagons left gaps as well.',
    'Later she saw a honeycomb in a nature programme. The bees build hexagons too, because they hold the most honey for the least wax.',
  ], [['What shape were the floor tiles?', ['Hexagons', 'Circles', 'Pentagons'], 0], ['What happened when Bea used circles?', ['They fitted perfectly', 'There were always gaps', 'They overlapped and melted'], 1], ['Why do bees build hexagons?', ['They look pretty', 'They are easy to draw', 'They hold the most honey for the least wax'], 2]]),
  S('garden-area', 3, 'maths', 'Planning the Garden', '🌼', ['▭', '8 × 5', 'm²'], [
    'The school had a rectangle of empty ground, eight metres long and five metres wide, and Class 5 was asked to plan a garden.',
    'To find how much ground they had, Ade multiplied the length by the width: eight times five is forty square metres. That is the area.',
    'They gave half of the area, twenty square metres, to vegetables, and the rest to flowers and a bench.',
    'To build a fence around the edge, they added all four sides: eight plus five plus eight plus five. That is the perimeter: twenty-six metres.',
  ], [['What was the area of the ground?', ['Thirteen square metres', 'Forty square metres', 'Twenty-six square metres'], 1], ['How much ground was given to vegetables?', ['Twenty square metres', 'Forty square metres', 'Eight square metres'], 0], ['What is the perimeter?', ['The space inside', 'Half of the area', 'The distance around the edge'], 2]]),
  S('sunflower-spiral', 3, 'maths', 'The Sunflower Spiral', '🌻', ['1', '1', '2', '3', '5', '8', '13'], [
    'Mateo’s grandfather showed him a sequence: one, one, two, three, five, eight. Each number is the two before it added together.',
    '“What comes after eight?” he asked. Mateo thought: five plus eight makes thirteen.',
    'Then Grandfather showed him the seeds in the middle of a sunflower. They curled in spirals, and when they counted, there were thirty-four one way and fifty-five the other.',
    'Both numbers were in the sequence. Mateo began looking for it everywhere: in pine cones, in shells and in the petals of flowers.',
  ], [['How is each number in the sequence made?', ['By adding the two before it', 'By doubling', 'By taking away one'], 0], ['What comes after eight?', ['Ten', 'Thirteen', 'Sixteen'], 1], ['Where did they find numbers from the sequence?', ['On a clock', 'In a newspaper', 'In the sunflower seeds'], 2]]),
  S('rice-doubling', 3, 'maths', 'A Reward of Rice', '🍚', ['×2', '1', '2', '4', '8', '…'], [
    'In an old story, a clever girl helped a king and asked for rice as her reward: one grain on the first day, two on the second, four on the third, doubling every day.',
    'The king laughed at such a small prize. On the seventh day she received sixty-four grains, hardly a spoonful.',
    'But doubling grows very fast. On the twentieth day she was owed over five hundred thousand grains, and on the thirtieth day, more than five hundred million.',
    'The king could not pay, so he agreed to share the rice with all the hungry villages instead.',
  ], [['How did the reward grow?', ['It doubled every day', 'One more grain every day', 'It stayed the same'], 0], ['How many grains on the seventh day?', ['Seven', 'Sixty-four', 'Fourteen'], 1], ['What did the king do in the end?', ['He paid at once', 'He laughed and refused', 'He shared the rice with the hungry villages'], 2]]),
  S('treasure-grid', 3, 'maths', 'The Treasure Map', '🗺️', ['x', 'y', '(4, 3)', '✕'], [
    'Zainab drew a grid on her treasure map, with numbers along the bottom and up the side.',
    'To find a place, you go along first and then up. “The treasure is at four, three,” she told her cousin: four squares along, three squares up.',
    'Her cousin went up first by mistake and ended up at the pond instead of the treasure.',
    '“Along the corridor, then up the stairs,” Zainab laughed. In the right order, they found the treasure: a tin of biscuits buried by the shed.',
  ], [['On a grid, which way do you go first?', ['Along', 'Up', 'It does not matter'], 0], ['Where did the cousin end up?', ['At the shed', 'At the pond', 'At school'], 1], ['What was the treasure?', ['Gold', 'Another map', 'A tin of biscuits'], 2]]),
  S('what-chances', 3, 'maths', 'What Are the Chances?', '🎲', ['⚀', '⚅', '½', '⅙'], [
    'On a rainy afternoon, Leo and Ama played with a coin and a dice.',
    '“A coin has two sides, so the chance of heads is one out of two, or one half,” said Ama.',
    '“A dice has six faces, so the chance of rolling a six is one out of six,” said Leo. They rolled sixty times and got a six eleven times, close to ten, which is one sixth of sixty.',
    'They learned that chance does not promise what will happen next, but over many tries, it is a good guide.',
  ], [['What is the chance of a coin landing on heads?', ['One out of six', 'One out of two', 'Ten out of ten'], 1], ['How many sixes did they roll in sixty tries?', ['Eleven', 'Sixty', 'Two'], 0], ['What did they learn?', ['Six always comes last', 'Coins always land on heads', 'Over many tries, chance is a good guide'], 2]]),
  S('below-zero', 3, 'maths', 'Below Zero', '🌡️', ['−5', '0', '+3', '°'], [
    'On a winter morning in the mountains, the thermometer outside Lars’s window showed minus five degrees.',
    '“Minus means below zero,” said his father. “Water freezes at zero, so the lake is ice today.”',
    'By lunchtime, the sun had warmed the air by eight degrees. Lars counted up from minus five: minus four, minus three, all the way to three degrees above zero.',
    'By night, it fell again to minus two. On a number line, the temperatures went up and down like steps on a ladder.',
  ], [['What does minus mean?', ['Above zero', 'Below zero', 'Exactly zero'], 1], ['At what temperature does water freeze?', ['Zero degrees', 'Ten degrees', 'Minus fifty degrees'], 0], ['What was the temperature at lunchtime?', ['Minus three degrees', 'Eight degrees', 'Three degrees above zero'], 2]]),
  S('polygon-party', 3, 'maths', 'The Polygon Party', '⬟', ['△', '□', '⬠', '⬡', '○'], [
    'Every shape at the Polygon Party wore a badge showing how many straight sides it had.',
    'Triangle had three sides, and Square had four. Pentagon, with five sides, had come from a famous building. Hexagon, with six, had come from a beehive.',
    'Then Octagon arrived, with eight sides, just like a stop sign. “Where is Circle?” asked Square.',
    '“Circle cannot come,” said Hexagon. “A polygon must have straight sides, and Circle has only one curved line.”',
  ], [['How many sides does a pentagon have?', ['Six', 'Five', 'Eight'], 1], ['Which shape has eight sides?', ['Octagon', 'Hexagon', 'Triangle'], 0], ['Why could Circle not come?', ['It was too big', 'It was asleep', 'It has no straight sides'], 2]]),
  // ------------------------------------------------------------------------------------------ level 3: science
  S('inside-volcano', 3, 'science', 'Inside a Volcano', '🌋', ['▲', '↑', '🔥'], [
    'Far beneath our feet, the Earth is so hot that some rock melts into a thick, glowing liquid called magma.',
    'Sometimes magma pushes up through cracks in the Earth’s crust. When it bursts out at the surface, it is called lava, and the mountain it builds is a volcano.',
    'Kalani lives in Hawaii, where volcanoes have built whole islands from layers of cooled lava over thousands of years.',
    'Scientists called volcanologists watch the ground for small earthquakes and rising gases, so that people can be warned before an eruption.',
  ], [['What is melted rock under the ground called?', ['Lava', 'Magma', 'Crust'], 1], ['What did volcanoes build in Hawaii?', ['Whole islands', 'Rivers', 'Forests'], 0], ['Why do volcanologists watch for small earthquakes?', ['To make maps', 'To find gold', 'To warn people before an eruption'], 2]]),
  S('why-fall', 3, 'science', 'Why Things Fall', '🍏', ['↓', 'g', '⅙'], [
    'When Kofi dropped his pencil, it fell to the floor. When he threw a ball up, it came back down. Everything is pulled towards the Earth by a force called gravity.',
    'Gravity also keeps the Moon going round the Earth, and the Earth going round the Sun.',
    'On the Moon, gravity is about one sixth as strong, so astronauts can jump much higher, bouncing like kangaroos.',
    'Kofi dropped a feather and a stone together. The feather floated down slowly because the air pushed against it. In a space with no air, they would land at the same time.',
  ], [['What is the force that pulls things towards the Earth?', ['Friction', 'Gravity', 'Magnetism'], 1], ['How strong is gravity on the Moon?', ['About one sixth as strong', 'Twice as strong', 'Just the same'], 0], ['Why did the feather fall slowly?', ['It was heavier', 'It was magic', 'The air pushed against it'], 2]]),
  S('food-chain', 3, 'science', 'Who Eats Whom?', '🦅', ['☀', '→', '🌾', '→', '🦗', '→', '🐸'], [
    'In the grassland, the grass grows using sunlight. A grasshopper eats the grass, a frog eats the grasshopper, a snake eats the frog, and an eagle eats the snake.',
    'This is called a food chain. Energy from the Sun passes from one living thing to the next.',
    'If the grasshoppers disappeared, the frogs would go hungry, and then the snakes, and then the eagles.',
    'That is why scientists say every creature matters. Remove one link, and the whole chain can break.',
  ], [['What does the frog eat?', ['Grass', 'The grasshopper', 'The eagle'], 1], ['Where does the energy in a food chain start?', ['The Sun', 'The eagle', 'The snake'], 0], ['What would happen if the grasshoppers disappeared?', ['The eagles would grow bigger', 'Nothing at all', 'The frogs would go hungry'], 2]]),
  S('busy-brain', 3, 'science', 'The Busy Brain', '🧠', [], [
    'Your brain is made of billions of tiny cells called neurons, which send messages to each other using electricity and chemicals.',
    'When Ruth first learned to ride a bike, she wobbled and fell. Her neurons were building new connections.',
    'Every time she practised, those connections grew stronger, until one day she rode without even thinking about it.',
    'Sleep helps too. While Ruth sleeps, her brain sorts out what she learned during the day, which is why a good night’s rest helps you remember.',
  ], [['What are the tiny cells in the brain called?', ['Neurons', 'Bones', 'Muscles'], 0], ['What happened each time Ruth practised?', ['Her brain got smaller', 'The connections grew stronger', 'She forgot how'], 1], ['How does sleep help?', ['It makes you taller', 'It stops all thinking', 'The brain sorts out what you learned'], 2]]),
  S('three-states', 3, 'science', 'Solid, Liquid, Gas', '♨️', ['❄', '→', '💧', '→', '♨'], [
    'In the kitchen, Nadia’s father put an ice cube in a pan. The ice was a solid: it kept its own shape.',
    'As the pan warmed, the ice melted into water, a liquid that spread out to cover the bottom of the pan.',
    'When the water boiled, it turned into steam, a gas that spread out into the whole room.',
    'On the cold window, the steam turned back into tiny drops of water. “The same stuff in three forms,” said her father. “Only the temperature changed.”',
  ], [['Which one keeps its own shape?', ['A liquid', 'A solid', 'A gas'], 1], ['What is steam?', ['A gas', 'A solid', 'Ice'], 0], ['What happened to the steam on the cold window?', ['It froze into ice cubes', 'It caught fire', 'It turned back into water'], 2]]),
  S('bottle-journey', 3, 'science', 'The Journey of a Bottle', '♻️', ['♻'], [
    'Every year, millions of plastic bottles end up in the ocean, where they can take hundreds of years to break down.',
    'Sea turtles sometimes mistake plastic bags for jellyfish, and seabirds feed tiny pieces of plastic to their chicks.',
    'Dami’s class collected bottles for a month and took them to a recycling centre, where they were melted and turned into new things, even warm jackets.',
    'But their teacher reminded them that the best plan is to use less plastic in the first place, with refillable bottles and cloth bags.',
  ], [['How long can plastic take to break down?', ['One week', 'Hundreds of years', 'One day'], 1], ['What do turtles mistake plastic bags for?', ['Jellyfish', 'Seaweed', 'Fish eggs'], 0], ['What is the best plan?', ['Throw it in the sea', 'Burn it', 'Use less plastic in the first place'], 2]]),
  S('light-long-ago', 3, 'science', 'Light from Long Ago', '🔭', ['☀', '★', '→'], [
    'Light travels incredibly fast: about three hundred thousand kilometres every second.',
    'Even so, the stars are so far away that their light takes years to reach us. Light from the Sun takes about eight minutes.',
    'When Isabel looked at a bright star, her uncle told her that the light she was seeing had left the star before she was born.',
    '“So looking at the stars is like looking back in time,” said Isabel. Her uncle nodded. “That is why telescopes are a kind of time machine.”',
  ], [['How fast does light travel?', ['About three hundred kilometres an hour', 'About three hundred thousand kilometres every second', 'As fast as a train'], 1], ['How long does light from the Sun take to reach us?', ['About eight minutes', 'Ten years', 'One second'], 0], ['Why are telescopes a kind of time machine?', ['They can fly', 'They are very old', 'They show light that left the stars long ago'], 2]]),
  S('invisible-world', 3, 'science', 'The Invisible World', '🔬', [], [
    'Under her mother’s microscope, Chen saw a drop of pond water come to life with tiny wriggling creatures.',
    'These living things are called microbes. Most are too small to see with our eyes alone, and they live everywhere: in the soil, in the air and even inside us.',
    'Some microbes can make us ill, which is why we wash our hands with soap. But many are helpful, like the ones that turn milk into yoghurt and help us digest our food.',
    'Chen labelled her drawing: “The world is full of life we cannot see.”',
  ], [['What did Chen look through?', ['A telescope', 'A microscope', 'Sunglasses'], 1], ['Where do microbes live?', ['Everywhere', 'Only in ponds', 'Only in space'], 0], ['How are some microbes helpful?', ['They paint pictures', 'They make noise', 'They turn milk into yoghurt'], 2]]),
  S('why-seasons', 3, 'science', 'Why We Have Seasons', '🌍', ['☀', '⟲', '23°'], [
    'Many people think summer happens because the Earth is closer to the Sun, but that is not the reason.',
    'The Earth is tilted, like a spinning top that leans to one side. As it travels round the Sun over a year, first one half and then the other leans towards the Sun.',
    'When your half leans towards the Sun, the days are long and the sunlight is strong: summer. When it leans away, the days are short and cold: winter.',
    'That is why, when it is summer in Europe, it is winter in Australia. Near the equator, the seasons hardly change.',
  ], [['What is the real reason for the seasons?', ['The Earth is closer to the Sun', 'The Earth is tilted', 'The Sun gets hotter'], 1], ['When it is summer in Europe, what is it in Australia?', ['Winter', 'Summer too', 'Spring'], 0], ['What are the seasons like near the equator?', ['Very cold all year', 'Four strong seasons', 'They hardly change'], 2]]),
  S('strongest-shape', 3, 'science', 'The Strongest Shape', '🌉', ['△', '□', '◇'], [
    'For the class bridge challenge, Kwame’s team had only straws, tape and paper.',
    'Their first bridge was made of squares, but when they put a book on it, the squares leaned over into diamonds and the bridge collapsed.',
    'Then they added a straw from corner to corner across each square, turning it into two triangles. A triangle cannot change its shape unless one of its sides bends.',
    'Their new bridge held six books. “That is why real bridges and cranes are full of triangles,” said their teacher.',
  ], [['What happened to the squares?', ['They leaned into diamonds and the bridge collapsed', 'They got stronger', 'They turned into circles'], 0], ['Why are triangles strong?', ['They are pointy', 'They cannot change shape unless a side bends', 'They are small'], 1], ['How many books did the new bridge hold?', ['One', 'Three', 'Six'], 2]]),
  // ------------------------------------------------------------------------------------------ level 3: bedtime
  S('star-map', 3, 'bedtime', 'Grandpa’s Star Map', '🌌', ['★', '✦'], [
    'On warm nights, Ayo and his grandfather lay on a mat in the yard and looked up at the sky.',
    'Grandpa pointed out the patterns of stars that people had named long ago: a hunter, a scorpion, and a great river of light across the middle.',
    '“Long before compasses, sailors used these stars to find their way home,” he said. “If you know the sky, you are never truly lost.”',
    'Ayo’s eyes grew heavy as he tried to count the stars. Grandpa carried him inside, and the hunter kept watch over the house all night.',
  ], [['Where did Ayo and Grandpa lie?', ['On a roof', 'On a mat in the yard', 'On the beach'], 1], ['Who used the stars to find their way home?', ['Sailors', 'Bakers', 'Drivers'], 0], ['Who kept watch over the house?', ['The dog', 'Grandpa', 'The hunter in the stars'], 2]]),
  S('lighthouse-cat', 3, 'bedtime', 'The Lighthouse Cat', '🐈', [], [
    'On a rocky island lived a lighthouse keeper and her grey cat, Pebble, who refused to sleep until every boat was safe.',
    'Each night, Pebble sat by the great lamp and watched the lights of the boats on the water, counting them as they passed.',
    'One stormy night, one light was missing. Pebble meowed and meowed until the keeper looked through her telescope and spotted a small boat lost in the fog.',
    'She sounded the foghorn, and the boat followed the sound to safety. Only then did Pebble curl up beside the lamp and fall asleep.',
  ], [['What was the cat’s name?', ['Storm', 'Pebble', 'Shadow'], 1], ['What did Pebble count each night?', ['The lights of the boats', 'The stars', 'The fish'], 0], ['How did the lost boat find its way?', ['By the stars', 'With a rope', 'It followed the sound of the foghorn'], 2]]),
  S('owl-library', 3, 'bedtime', 'The Owl’s Library', '🦉', [], [
    'Deep in the forest, an old owl kept a library in the hollow of an oak tree, with tiny books made from leaves.',
    'Every evening, as the light faded, the animals came to borrow stories: the rabbits liked adventures, and the hedgehog liked mysteries.',
    'One night, a young fox arrived, embarrassed because he could not read. The owl did not laugh. She opened a book and read it aloud to him, slowly, pointing at each word.',
    'Night after night they read together, until one evening the fox read the last page to the owl, while she pretended to fall asleep.',
  ], [['Where was the library?', ['In a cave', 'In an oak tree', 'Under a river'], 1], ['Why was the fox embarrassed?', ['He could not read', 'He was late', 'He had lost a book'], 0], ['What happened at the end?', ['The fox ran away', 'The owl closed the library', 'The fox read the last page to the owl'], 2]]),
  S('night-sounds', 3, 'bedtime', 'Sounds of the Night', '🌃', [], [
    'Lying in bed, Mira listened carefully to the night. At first it seemed silent, but slowly she began to notice the sounds.',
    'A car passed far away, the fridge hummed downstairs, and a cricket sang outside the window.',
    'She breathed in slowly while counting to four, and breathed out while counting to six, the way her mother had taught her.',
    'Each sound seemed softer than the one before, until the cricket’s song was the last thing she heard.',
  ], [['What hummed downstairs?', ['A car', 'The fridge', 'A cricket'], 1], ['How did Mira breathe?', ['In while counting to four, out while counting to six', 'Very fast', 'She held her breath'], 0], ['What was the last thing she heard?', ['The car', 'Her mother', 'The cricket’s song'], 2]]),
  S('wishing-boats', 3, 'bedtime', 'The Wishing Boats', '⛵', [], [
    'On the last night of the holiday, Ines and her cousins folded paper boats by the lake.',
    'Each of them wrote a wish inside. Ines wished that they would all meet again next summer.',
    'They set the boats on the still water and watched them drift slowly towards the reeds in the moonlight.',
    'On the drive home, Ines fell asleep against the car window, still thinking of the little boats carrying their wishes across the dark water.',
  ], [['What did they fold?', ['Paper planes', 'Paper boats', 'Paper hats'], 1], ['What was Ines’s wish?', ['That they would all meet again next summer', 'A new bike', 'To stay up late'], 0], ['Where did Ines fall asleep?', ['By the lake', 'In a boat', 'Against the car window'], 2]]),
  S('clockmaker-dream', 3, 'bedtime', 'The Clockmaker’s Dream', '⏰', [], [
    'In a small shop full of ticking, an old clockmaker worked late into the night, mending the clocks of the whole town.',
    'One night he was so tired that he fell asleep at his bench, and he dreamed that all the clocks began to talk.',
    '“You look after everyone’s time,” said the big church clock, “but you never keep any time for yourself.”',
    'When he woke, he hung a sign on the door: Closed on Sundays. And every Sunday after that, he went fishing by the river.',
  ], [['What did the clockmaker mend?', ['Shoes', 'Clocks', 'Bikes'], 1], ['Who talked to him in his dream?', ['The church clock', 'His cat', 'A customer'], 0], ['What did he do on Sundays after that?', ['He worked even more', 'He cleaned the shop', 'He went fishing'], 2]]),
  S('changing-moon', 3, 'bedtime', 'The Changing Moon', '🌗', ['🌑', '🌒', '🌓', '🌔', '🌕'], [
    'Every night for a month, Selin drew the Moon from her bedroom window before she went to sleep.',
    'At first it was a thin silver curve. Night by night it grew fatter, until it was a full, round circle.',
    'Then it began to shrink again, until it disappeared. “The Moon does not really change shape,” said her father. “We see different amounts of its sunny side as it travels around the Earth.”',
    'Selin put her drawings in a row on the wall. The Moon’s journey took about twenty-nine days, and then it began again.',
  ], [['When did Selin draw the Moon?', ['In the morning', 'Before she went to sleep', 'At lunchtime'], 1], ['Does the Moon really change shape?', ['No, we see different amounts of its sunny side', 'Yes, it shrinks', 'Yes, it melts'], 0], ['How long did the Moon’s journey take?', ['Seven days', 'A whole year', 'About twenty-nine days'], 2]]),
  S('mountain-hut', 3, 'bedtime', 'The Hut on the Mountain', '🏔️', [], [
    'After a long day of walking, Sami and his mother reached a little wooden hut high in the mountains.',
    'They lit the stove, cooked soup and listened to the wind whistling around the roof.',
    'Through the window, the snowy peaks glowed pink in the last light of the sun, and then the first stars appeared above them.',
    'Wrapped in thick blankets, Sami felt very small and very safe. He fell asleep before his mother had finished saying good night.',
  ], [['Who was with Sami?', ['His father', 'His mother', 'His friend'], 1], ['What did they cook?', ['Soup', 'Pancakes', 'Fish'], 0], ['When did Sami fall asleep?', ['When the stove went out', 'At sunrise', 'Before his mother finished saying good night'], 2]]),
  S('dream-painter', 3, 'bedtime', 'The Dream Painter', '🎨', [], [
    'In a town where nobody could remember their dreams, a quiet painter worked through the night.',
    'She painted the dreams she found floating in the dark: a whale flying over the city, a bridge made of music, a garden on the Moon.',
    'In the morning, people found the paintings hanging in the square and gasped. “That was my dream!” said a baker. “And that one was mine!” said a little girl.',
    'From then on, before they went to sleep, the people of the town wondered what she would paint next.',
  ], [['What could nobody in the town remember?', ['Their names', 'Their dreams', 'The way home'], 1], ['Where were the paintings hung?', ['In the square', 'At the school', 'At the station'], 0], ['What did people wonder before they went to sleep?', ['Who the painter was', 'Where she lived', 'What she would paint next'], 2]]),
];
