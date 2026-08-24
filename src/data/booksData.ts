import { Book } from '../types';

export const AFRICAN_LITERATURE_GENRES = [
  'African Literature & Classics',
  'African Diaspora & Black Studies',
  'Afrofuturism & Speculative Fiction',
  'Pan-African History & Civilizations',
  'African Philosophy & Indigenous Traditions',
  'Contemporary African Voices & Fiction'
];

export const CONSCIOUSNESS_COMMUNITY_GENRES = [
  'Consciousness & Ancient Wisdom',
  'Kemetic Science & Sacred Geometry',
  'Metaphysics & Higher Dimensions',
  'Indigenous Spiritual Technologies',
  'Mind Mastery & Quantum Awakening',
  'Holistic Energy, Chakras & Kundalini'
];

export const GENERAL_GENRES = [
  'Sci-Fi & Fantasy',
  'Fiction & Literature',
  'Mystery & Suspense',
  'Historical Fiction',
  'Romance & Contemporary',
  'Thriller & Crime',
  'Non-Fiction & Essays',
  'Biography & Memoir',
  'Business & Leadership',
  'Self-Improvement & Psychology',
  'Dutch & European Classics',
  'Graphic Novels & Manga',
  'Philosophy & Deep Thought',
  'Poetry & Anthologies',
  'Science & Technology'
];

export const GENRES = [
  'All Genres',
  // African Literature & Diaspora
  ...AFRICAN_LITERATURE_GENRES,
  // Consciousness Community & Sacred Sciences
  ...CONSCIOUSNESS_COMMUNITY_GENRES,
  // General & Regional Classics
  ...GENERAL_GENRES
];

export const INITIAL_BOOKS: Book[] = [
  // ==========================================
  // AFRICAN LITERATURE & CONSCIOUSNESS MASTERWORKS
  // ==========================================

  // 1. Afrofuturism & Speculative Fiction
  {
    id: 'atlas-afr-001',
    title: 'The Celestial Griot of Sirius B',
    subtitle: 'Quantum Orature, Dogon Star Maps, and the Great Exodus Beyond the Void',
    author: 'Dr. Keshia Mwangi',
    authorBio: 'Dr. Keshia Mwangi is an astrobiologist and Hugo-nominated author born in Nairobi and currently researching cosmic archeology between Oxford and Dakar. Her speculative fiction bridges ancient African astral navigation with quantum gravitational physics.',
    narrator: 'Chiwetel Ejiofor',
    coverImage: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=700&q=80',
    price: 14.99,
    originalPrice: 21.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.97,
    reviewCount: 4890,
    format: 'bundle',
    genres: ['Afrofuturism & Speculative Fiction', 'African Literature & Classics', 'Sci-Fi & Fantasy'],
    primaryGenre: 'Afrofuturism & Speculative Fiction',
    pageCount: 464,
    audioDurationMinutes: 780,
    publishDate: 'February 1, 2026',
    publisher: 'Kushite Stellar Imprint / Atlantean Global Arts',
    isbn: '978-0-998-10294-3',
    language: 'English',
    synopsis: 'Deep in the Bandiagara Escarpment of Mali, the sacred Po Tolo star calendar begins radiating an anomalous tachyonic signal. Nommo, an elder sonic engineer and hereditary griot, uncovers the forgotten solar ark constructed by the ancient Dogon stargazers—a vessel powered by acoustic harmonics calibrated to the resonant frequency of the African continent.',
    editorialReview: '“A monumental achievement in speculative Afrofuturism. Mwangi fuses deep ancestral oral tradition with theoretical astrophysics in prose so radiant it vibrates in your chest.” — The Pan-African Literary Review',
    superPointsEarned: 150,
    tags: ['Afrofuturism', 'Dogon Astronomy', 'Sirius B', 'Sci-Fi', 'Bookatlas Plus', 'Bestseller'],
    awards: ['African Speculative Fiction Award Winner 2026', 'Nebula Award Finalist'],
    readingTimeHours: 8.0,
    aiVibe: 'Transcendent, cosmic, and fiercely ancestral',
    audioSampleUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    sampleChapters: [
      {
        title: 'Chapter 1: The Heavy Star Whispers',
        subtitle: 'The Cliff of Bandiagara, 2142',
        content: [
          'The sandstone of the cliffs still held the dry heat of the Sahel sun, but inside the cave of the sanctuary, the stone altar was humming with the exact pitch of an oscillating crystal.',
          'Nommo placed both palms against the carved basalt relief of Po Tolo—the tiny white dwarf star the ancestors had tracked for three thousand years before optical telescopes had ever detected its invisible companion.',
          'The hieroglyphs were not decorative. They were circuit pathways of pure carbon-copper inlay. When Nommo whispered the seventh name of the Nummo water-spirits, the stone beneath his fingers softened into liquid light, and the star map of the third galaxy blossomed across the vaulted cavern ceiling.',
          '“The Great Return has been initiated,” his daughter Amina whispered from the entrance, her cybernetic cowl catching the emerald bioluminescence of the chamber.',
          '“Not a return, my child,” Nommo said, watching the star trails spiral into alignment. “It is our appointed departure.”'
        ]
      },
      {
        title: 'Chapter 2: The Acoustic Engine',
        subtitle: 'Harmonics of the Great Migration',
        content: [
          'The vessel rested four hundred meters beneath the dunes of Timbuktu, suspended in a magnetic cradle powered by the subterranean aquifers of the Niger river basin.',
          'Its hull was not forged of titanium or polymer, but of bio-grown ironwood tempered in zero-point vacuum fields and inscribed with gold geometric lattices.',
          '“We do not combust fuel,” Nommo explained to the young navigators gathered in the command amphitheater. “We sing the coordinates. The universe does not yield to force; it yields to resonance.”'
        ]
      }
    ],
    reviews: [
      {
        id: 'rev-afr-1',
        authorName: 'Tariq Al-Mansoor',
        rating: 5,
        date: '3 days ago',
        title: 'The definitive Afrofuturist epic of our era',
        comment: 'The synthesis of Dogon astronomical cosmology with quantum physics is staggering. The audio narration by Chiwetel Ejiofor brings tears to your eyes during the departure chant.',
        verifiedPurchase: true,
        upvotes: 84
      }
    ]
  },

  // 2. Kemetic Science & Sacred Geometry
  {
    id: 'atlas-afr-002',
    title: 'The Sacred Science of Kemet',
    subtitle: 'Temple Architecture, Ma\'at, the 42 Divine Principles, and the Pineal Awakening of Ancient Egypt',
    author: 'Master Heru Ankh-Ra',
    authorBio: 'Master Heru Ankh-Ra is a Kemetic historian, initiates of the Mystery Tradition, and researcher in bio-geometry who has studied the Nile Valley temples for over thirty-five years.',
    narrator: 'Dennis Haysbert',
    coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=700&q=80',
    price: 16.49,
    originalPrice: 24.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.99,
    reviewCount: 6120,
    format: 'bundle',
    genres: ['Kemetic Science & Sacred Geometry', 'Consciousness & Ancient Wisdom', 'Metaphysics & Higher Dimensions'],
    primaryGenre: 'Kemetic Science & Sacred Geometry',
    pageCount: 528,
    audioDurationMinutes: 890,
    publishDate: 'January 15, 2026',
    publisher: 'Ankh Mystery School Press / Atlantean Philosophical Library',
    isbn: '978-1-954-82019-8',
    language: 'English',
    synopsis: 'A groundbreaking revelation of the sacred sciences developed along the Nile River. Master Heru decodes the architectural harmonics of the Temple of Luxor (the Temple of Man), the 42 Laws of Ma\'at, the Seven Hermetic Axioms of Tehuti (Thoth), and the biological mechanics of the Eye of Heru (the Pineal Gland) as an interface for higher dimensional awareness.',
    editorialReview: '“An encyclopedic masterpiece of consciousness and ancestral wisdom. It dismantles centuries of Eurocentric distortion and restores Kemetic science to its rightful place as the mother of astronomy, physics, and spiritual alchemy.” — Journal of Consciousness Studies',
    superPointsEarned: 165,
    tags: ['Kemet', 'Ancient Egypt', 'Sacred Geometry', 'Maat', 'Tehuti', 'Pineal Gland', 'Consciousness'],
    awards: ['Consciousness Literature Gold Award', 'African Heritage Scholarly Prize'],
    readingTimeHours: 9.5,
    aiVibe: 'Illuminating, profoundly sacred, and mathematically pristine',
    sampleChapters: [
      {
        title: 'Chapter 1: The Temple as Biological Blueprint',
        subtitle: 'The Hermetic Key of Luxor',
        content: [
          'When the ancient Kemetic priesthood laid the granite foundation stones of Waset (Thebes), they were not building a monument to human vanity. They were constructing a living holographic resonator of the human body.',
          'Every hall, pylon, colonnade, and sanctum of the Temple of Luxor corresponds with millimeter precision to the endocrine glands, bone proportions, and neural chakras of the fully awakened human being.',
          'The innermost sanctuary—the Holy of Holies—sits in direct geometric alignment with the Thalamus and the Epiphysis Cerebri: the Pineal Gland, known in Medu Neter as the Ujat or Eye of Heru.',
          'To enter the temple was not to worship an external deity; it was an exact mathematical initiation into the seven stages of psychological and spiritual transmutation.'
        ]
      },
      {
        title: 'Chapter 2: Ma’at and the Physics of Universal Balance',
        subtitle: 'The 42 Declarations of Innocence as Quantum Coherence',
        content: [
          'In Kemetic cosmology, Ma’at represents Truth, Justice, Reciprocity, and Cosmic Equilibrium.',
          'The weighing of the heart (Ib) against the feather of Ma’at is not a superstitious mythology—it is an energetic law: consciousness cannot traverse the doorway into higher dimensional realms if it carries the vibrational density of discord, deceit, or unhealed trauma.',
          'When thought, word, and deed achieve zero entropy, the bio-toroidal field of the heart expands, harmonizing with the primordial cosmic order known as Nun.'
        ]
      }
    ],
    reviews: [
      {
        id: 'rev-kemet-1',
        authorName: 'Dr. Ashanti Menelik',
        rating: 5,
        date: '1 week ago',
        title: 'Required reading for every seeker of truth',
        comment: 'This book completely transformed my understanding of the pyramids and ancient African metaphysics. The breakdown of the 42 laws and sacred geometry of Luxor is breathtaking.',
        verifiedPurchase: true,
        upvotes: 112
      }
    ]
  },

  // 3. African Literature & Classics
  {
    id: 'atlas-afr-003',
    title: 'Echoes of the River Niger',
    subtitle: 'The Lost Manuscripts of Timbuktu, Ancient Universities, and the Golden Age of African Scholarship',
    author: 'Professor Amadou Diop',
    authorBio: 'Professor Amadou Diop is an archivist, historian, and director of the Sahelian Heritage Research Center in Bamako and Paris. He has led international excavations preserving over 40,000 medieval African manuscripts.',
    narrator: 'Hugh Quarshie',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80',
    price: 13.49,
    originalPrice: 19.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: false,
    isEditorPick: true,
    rating: 4.95,
    reviewCount: 3840,
    format: 'ebook',
    genres: ['African Literature & Classics', 'Pan-African History & Civilizations', 'Non-Fiction & Essays'],
    primaryGenre: 'African Literature & Classics',
    pageCount: 480,
    audioDurationMinutes: 760,
    publishDate: 'October 10, 2025',
    publisher: 'Sankore University Press / Atlantean Imprint',
    isbn: '978-0-435-90512-1',
    language: 'English',
    synopsis: 'Long before Oxford and the Sorbonne flourished, the University of Sankore in Timbuktu housed over 25,000 international scholars and millions of leather-bound manuscripts covering optics, jurisprudence, astronomy, mathematics, and poetry. Professor Diop chronicles the intellectual renaissance of the Songhai and Mali Empires, unveiling the profound legacy of African literary genius.',
    editorialReview: '“A majestic reclamation of African intellectual history. Diop’s prose flows with the grace of the Niger itself, bringing the vibrant libraries of Timbuktu alive for the modern world.” — The European Journal of African Studies',
    superPointsEarned: 135,
    tags: ['Timbuktu', 'African Classics', 'Sankore', 'History', 'Manuscripts', 'Scholarship'],
    awards: ['UNESCO International Heritage Award', 'African Studies Association Best Book Prize'],
    readingTimeHours: 8.2,
    aiVibe: 'Majestic, historically profound, and deeply inspiring',
    sampleChapters: [
      {
        title: 'Chapter 1: The City of Gold and Ink',
        subtitle: 'The University of Sankore in 1492',
        content: [
          'In the year 1492, as caravels sailed west from Andalusia, camel caravans carrying forty tons of bound books and fine rag paper were arriving at the gates of Timbuktu.',
          'Here, in the shadow of the great mud-brick minarets of the Djinguereber and Sankore mosques, books were prized above all commodities. Salt came from the north, gold came from the south, but the word of God and the treasures of wisdom were found only in the scholars’ courtyards.',
          'Ahmed Baba, the grand jurist and bibliophile who possessed a personal library of over two thousand rare volumes, sat upon a carpet of woven silk, dictating annotations on spherical trigonometry to students from across North Africa and the Middle East.'
        ]
      }
    ],
    reviews: []
  },

  // 4. Consciousness & Ancient Wisdom
  {
    id: 'atlas-con-001',
    title: 'The Frequency of Awakening',
    subtitle: 'Dimensional Shifting, Quantum Intuition, Bio-Resonance, and the Universal Lattice',
    author: 'Dr. Zuri Oladipo',
    authorBio: 'Dr. Zuri Oladipo is a biophysicist and pioneer in consciousness research at the Institute of Noetic Sciences and the University of Cape Town. Her work investigates the quantum coherence of microtubules and heart-brain bio-fields.',
    narrator: 'Thandiwe Newton',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    price: 15.99,
    originalPrice: 22.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.96,
    reviewCount: 5210,
    format: 'bundle',
    genres: ['Consciousness & Ancient Wisdom', 'Mind Mastery & Quantum Awakening', 'Self-Improvement & Psychology'],
    primaryGenre: 'Consciousness & Ancient Wisdom',
    pageCount: 416,
    audioDurationMinutes: 690,
    publishDate: 'January 28, 2026',
    publisher: 'Akashic Quantum Editions / Atlantean Consciousness Vault',
    isbn: '978-1-608-68720-4',
    language: 'English',
    synopsis: 'What if intuition is not an accident, but a measurable biological signal connecting you to a non-local quantum intelligence lattice? Dr. Oladipo combines cellular biophysics, ancient indigenous initiation practices, and sound frequency entrainment to deliver a practical guide for shifting consciousness into higher creative and intuitive flow states.',
    editorialReview: '“Brilliant, grounded, and utterly transformative. Dr. Oladipo bridges the gap between quantum mechanics and spiritual illumination with flawless clarity.” — Mind & Energy Quarterly',
    superPointsEarned: 160,
    tags: ['Consciousness', 'Quantum Awakening', 'Bio-Resonance', 'Intuition', 'Ancient Wisdom'],
    readingTimeHours: 7.0,
    aiVibe: 'Visionary, deeply calming, and scientifically revolutionary',
    sampleChapters: [
      {
        title: 'Chapter 1: The Heart-Brain Torus',
        subtitle: 'The electromagnetic field of human intention',
        content: [
          'The human heart produces an electromagnetic field five thousand times stronger magnetically and sixty times stronger electrically than that generated by the brain.',
          'This toroidal field extends up to eight feet outside your physical body in all directions, acting as a continuous transceiver of emotional coherence and vibrational intent.',
          'When your heart rhythm enters a state of 0.1 Hertz coherent oscillation, your nervous system locks into resonance with the Schumann resonance of Planet Earth—opening the perceptual threshold to instant knowing.'
        ]
      }
    ],
    reviews: []
  },

  // 5. Pan-African History & Civilizations
  {
    id: 'atlas-afr-004',
    title: 'Stolen Legacy of the Nile',
    subtitle: 'Great African Foundations of World Civilization, Mathematics, Philosophy, and Architecture',
    author: 'Dr. Kwame Asante-Boateng',
    authorBio: 'Dr. Kwame Asante-Boateng is a distinguished professor of African History and Chair of Nile Valley Civilizations at the University of Ghana, Legon.',
    narrator: 'David Oyelowo',
    coverImage: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&w=700&q=80',
    price: 12.99,
    originalPrice: 18.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: false,
    isEditorPick: true,
    rating: 4.98,
    reviewCount: 7120,
    format: 'bundle',
    genres: ['Pan-African History & Civilizations', 'African Diaspora & Black Studies', 'Philosophy & Deep Thought'],
    primaryGenre: 'Pan-African History & Civilizations',
    pageCount: 544,
    audioDurationMinutes: 940,
    publishDate: 'August 18, 2025',
    publisher: 'Pan-African Heritage Library / Atlantean Historical Editions',
    isbn: '978-0-933-12101-0',
    language: 'English',
    synopsis: 'A tour de force historical synthesis tracing the origins of geometry, astronomy, medicine, and philosophy back to the indigenous African civilizations of Ta-Seti, Nubia, Kemet, Axum, and Great Zimbabwe. Dr. Asante-Boateng reveals how Greek scholars like Pythagoras, Thales, and Plato studied for decades at the African temple universities of Heliopolis and Waset.',
    editorialReview: '“An indispensable pillar of historical scholarship. Every page pulses with rigorous archival documentation and uncompromising truth.” — Black History & World Affairs Journal',
    superPointsEarned: 130,
    tags: ['Pan-African History', 'Nubia', 'Kemet', 'Black Studies', 'Civilization', 'Heritage'],
    awards: ['African Intellectual Excellence Award', 'W.E.B. Du Bois Medal of Honor'],
    readingTimeHours: 9.2,
    aiVibe: 'Monumental, empowering, and rigorously documented',
    sampleChapters: [
      {
        title: 'Chapter 1: The Mother of Sciences',
        subtitle: 'Nubia and the Southern Foundations of the Nile',
        content: [
          'Civilization did not migrate down from the Mediterranean into Africa; it flowed north from the heart of the continent along the spine of the Hapi (Nile) river.',
          'At Nabta Playa in southern Egypt, two millennia before Stonehenge, African pastoralists erected the world’s oldest megalithic astronomical calendar circle, tracking the heliacal rising of Sirius and the solstices.',
          'From this southern cradle arose the dynasties of Kush, Kerma, and Ta-Seti, bringing the royal crown, the hieroglyphic script, and the sacred science of resurrection northward to Memphis and Giza.'
        ]
      }
    ],
    reviews: []
  },

  // 6. Mind Mastery & Quantum Awakening
  {
    id: 'atlas-con-002',
    title: 'The Holographic Mind',
    subtitle: 'Reprogramming the Subconscious Matrix, Timeline Collapsing, and Supreme Inner Sovereignty',
    author: 'Malik Vance & The Consciousness Collective',
    authorBio: 'Malik Vance is a master mindset strategist, author, and meditation teacher who has mentored over 250,000 students globally in quantum manifestation and mental sovereignty.',
    narrator: 'Lance Reddick',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
    price: 11.99,
    originalPrice: 17.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.93,
    reviewCount: 4310,
    format: 'ebook',
    genres: ['Mind Mastery & Quantum Awakening', 'Consciousness & Ancient Wisdom', 'Self-Improvement & Psychology'],
    primaryGenre: 'Mind Mastery & Quantum Awakening',
    pageCount: 368,
    audioDurationMinutes: 590,
    publishDate: 'February 10, 2026',
    publisher: 'Sovereignty Press / Atlantean Mind Editions',
    isbn: '978-1-780-28562-7',
    language: 'English',
    synopsis: 'Your physical reality is a continuous projection of your subconscious assumptions. Malik Vance delivers a razor-sharp, actionable manual for shattering generational programming, mastering emotional state control, and utilizing the Law of Assumption to manifest extraordinary outcomes with effortless precision.',
    editorialReview: '“The modern masterclass in mental transmutation. Practical, fierce, and liberating.” — Quantum Awakening Review',
    superPointsEarned: 120,
    tags: ['Mindset', 'Manifestation', 'Quantum Jumping', 'Subconscious', 'Law of Assumption'],
    readingTimeHours: 6.2,
    aiVibe: 'Direct, electrifying, and deeply practical',
    sampleChapters: [
      {
        title: 'Chapter 1: The Observer Effect',
        subtitle: 'Collapsing the wave function of reality',
        content: [
          'In quantum physics, a particle exists as an infinite cloud of probabilities until a conscious observer measures it.',
          'Your life operates under the exact same law. The subconscious mind does not attract what you want; it reflects who you are being in this present moment.',
          'To shift your external reality, you must first assume the feeling of the wish fulfilled with total emotional conviction before the physical senses register any change.'
        ]
      }
    ],
    reviews: []
  },

  // 7. Indigenous Spiritual Technologies & Energy
  {
    id: 'atlas-con-003',
    title: 'Cosmic Rhythms of the Ancestors',
    subtitle: 'Shamanic Sound, Earth Grids, Plant Intelligence, and Orisha Energy Archetypes',
    author: 'Elder Nanyamka Kachingwe',
    authorBio: 'Elder Nanyamka Kachingwe is an initiate of the sacred Yoruba Ifá orature and traditional herbalist living between Salvador da Bahia and Ibadan.',
    narrator: 'Angelique Kidjo',
    coverImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=700&q=80',
    price: 13.99,
    originalPrice: 19.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.97,
    reviewCount: 3950,
    format: 'bundle',
    genres: ['Indigenous Spiritual Technologies', 'African Philosophy & Indigenous Traditions', 'Holistic Energy, Chakras & Kundalini'],
    primaryGenre: 'Indigenous Spiritual Technologies',
    pageCount: 420,
    audioDurationMinutes: 710,
    publishDate: 'January 5, 2026',
    publisher: 'Orisha Sound & Spirit Editions / Atlantean Cultural Press',
    isbn: '978-0-892-81765-8',
    language: 'English',
    synopsis: 'An illuminating journey into the spiritual technologies of indigenous Africa and the African Diaspora. Discover the mathematics of sacred polyrhythms, the 256 Odù Ifá binary decision trees, botanical plant intelligence, and how aligning with natural elemental forces (Òrìṣà) restores radiant vitality to the human spirit.',
    editorialReview: '“A transcendent exploration of indigenous science that honors the living heartbeat of the earth and the ancestors.” — World Wisdom Review',
    superPointsEarned: 140,
    tags: ['Ifa', 'Orisha', 'Indigenous Wisdom', 'Sound Healing', 'Ancestors', 'Plant Medicine'],
    readingTimeHours: 7.2,
    aiVibe: 'Atmospheric, rhythmic, and profoundly grounding',
    sampleChapters: [
      {
        title: 'Chapter 1: The Drum as Portal',
        subtitle: 'The 432Hz African Batá polyrhythms',
        content: [
          'The sacred Batá drum is not an instrument of entertainment; it is an acoustic transducer calibrated to shift the brain’s electrical activity from beta stress into deep theta trance in less than three minutes.',
          'Each rhythm carries a mathematical signature dedicated to a specific cosmic force: Shango for bio-electric lightning and passion, Yemoja for oceanic emotional healing, and Ogun for the will to forge iron and destiny.'
        ]
      }
    ],
    reviews: []
  },

  // 8. African Diaspora & Black Studies
  {
    id: 'atlas-afr-005',
    title: 'The Maroon Cosmologies',
    subtitle: 'Resistance, Memory, Botanical Wisdom, and the Atlantic Sanctuary',
    author: 'Dr. Sonia Baptiste',
    authorBio: 'Dr. Sonia Baptiste is an anthropologist and cultural historian specializing in Caribbean maroon communities, ethnobotany, and Atlantic resistance epistemologies.',
    narrator: 'Naomie Harris',
    coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=700&q=80',
    price: 12.49,
    originalPrice: 17.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: false,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.91,
    reviewCount: 2240,
    format: 'ebook',
    genres: ['African Diaspora & Black Studies', 'African Philosophy & Indigenous Traditions', 'Biography & Memoir'],
    primaryGenre: 'African Diaspora & Black Studies',
    pageCount: 384,
    audioDurationMinutes: 620,
    publishDate: 'December 4, 2025',
    publisher: 'Maroon Epistemologies Press / Atlantean Imprint',
    isbn: '978-0-807-07730-6',
    language: 'English',
    synopsis: 'From the Cockpit Country of Jamaica to the quilombos of Palmares in Brazil and the Gullah Geechee sea islands, escaped African captives created impenetrable self-governing civilizations. Dr. Baptiste explores the spiritual codes, botanical herbalism, and unbreakable collective solidarity that preserved African freedom in the New World.',
    editorialReview: '“A luminous work of historical recovery and spiritual courage. Essential reading for all students of freedom.” — Caribbean Review of Books',
    superPointsEarned: 125,
    tags: ['Maroon', 'Diaspora', 'Black Studies', 'Resistance', 'Palmares', 'Gullah'],
    readingTimeHours: 6.5,
    aiVibe: 'Defiant, luminous, and deeply moving',
    sampleChapters: [
      {
        title: 'Chapter 1: The Mountain Fortress',
        subtitle: 'The Blue Mountains of Jamaica, 1730',
        content: [
          'Queen Nanny stood at the precipice of Nanny Town, where the mountain mist wrapped around the cedar trees like smoke from a ceremonial fire.',
          'She carried no musket, only her abeng horn carved from the horn of a bull. When blown, its sound echoed through forty miles of limestone sinkholes, communicating tactical messages that British soldiers could never decipher.'
        ]
      }
    ],
    reviews: []
  },

  // 9. Contemporary African Voices & Fiction
  {
    id: 'atlas-afr-006',
    title: 'The Palm Wine Prophet of Lagos',
    subtitle: 'Megacity Magic, Neon Market Spirits, and the Girl with Lightning in Her Hands',
    author: 'Babatunde Adeleke',
    authorBio: 'Babatunde Adeleke is an award-winning Lagosian novelist and screenwriter whose vibrant urban magical realism captures the relentless heartbeat of Nigeria’s commercial capital.',
    narrator: 'John Boyega',
    coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=700&q=80',
    price: 10.99,
    originalPrice: 15.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.94,
    reviewCount: 3620,
    format: 'bundle',
    genres: ['Contemporary African Voices & Fiction', 'African Literature & Classics', 'Fiction & Literature'],
    primaryGenre: 'Contemporary African Voices & Fiction',
    pageCount: 352,
    audioDurationMinutes: 580,
    publishDate: 'January 22, 2026',
    publisher: 'Farafina Books / Atlantean Contemporary Fiction',
    isbn: '978-9-789-54312-8',
    language: 'English & Pidgin',
    synopsis: 'In the bustling alleys of Balogun Market in Lagos, a young solar technician named Ronke discovers that touching fiber-optic internet cables allows her to see the ancient spirit pathways running beneath the asphalt. When a multinational conglomerate attempts to pave over the sacred lagoon shrine, Ronke and an eccentric palm wine brewer launch a thrilling digital-spiritual rebellion.',
    editorialReview: '“Pure electric energy. Adeleke writes with the vibrant swagger of Fela Kuti and the mythological genius of Amos Tutuola.” — The Guardian Africa',
    superPointsEarned: 110,
    tags: ['Lagos', 'Magical Realism', 'Contemporary Fiction', 'Nigeria', 'African Voices'],
    readingTimeHours: 5.8,
    aiVibe: 'High-octane, witty, mystical, and unforgettable',
    sampleChapters: [
      {
        title: 'Chapter 1: The Spark on Marina Bridge',
        subtitle: 'Lagos Island at Rush Hour',
        content: [
          'If you stand on the Marina bridge at six o’clock in the evening, you will see yellow Danfo buses honking like angry metal beetles, street hawkers selling plantain chips between bumpers, and the Atlantic wind blowing salt across twenty million dreams.',
          'Ronke was holding a pair of insulated wire cutters when the lightning hit the billboard above her. It didn’t burn her. It sang in her fingertips in fluent Yoruba.'
        ]
      }
    ],
    reviews: []
  },

  // 10. Metaphysics & Higher Dimensions
  {
    id: 'atlas-con-004',
    title: 'The Kybalion & Kemetic Matrix',
    subtitle: 'The Seven Universal Laws Decoded for Modern Masters: Mentalism, Vibration, Polarity, and Alchemy',
    author: 'Chancellor Imhotep Davis',
    authorBio: 'Chancellor Imhotep Davis is a hermetic scholar, metaphysician, and philosopher who has dedicated forty years to comparative ancient cosmologies.',
    narrator: 'Morgan Freeman',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80',
    price: 14.49,
    originalPrice: 20.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: false,
    isEditorPick: true,
    rating: 4.98,
    reviewCount: 6840,
    format: 'bundle',
    genres: ['Metaphysics & Higher Dimensions', 'Consciousness & Ancient Wisdom', 'Philosophy & Deep Thought'],
    primaryGenre: 'Metaphysics & Higher Dimensions',
    pageCount: 440,
    audioDurationMinutes: 720,
    publishDate: 'November 12, 2025',
    publisher: 'Hermetic Alchemy Editions / Atlantean Philosophical Vault',
    isbn: '978-0-874-77874-8',
    language: 'English',
    synopsis: 'A definitive masterwork demonstrating the direct descent of the Hermetic axioms from the Nile Valley wisdom texts of Tehuti. Davis breaks down Mentalism (The All is Mind), Correspondence (As Above, So Below), Vibration (Nothing Rests), Polarity, Rhythm, Cause & Effect, and Gender, providing practical exercises for mental transmutation in daily life.',
    editorialReview: '“The most lucid, profound treatise on universal law published in this century. A must-have master text.” — Metaphysical Society of Europe',
    superPointsEarned: 145,
    tags: ['Kybalion', 'Hermeticism', 'Universal Laws', 'Metaphysics', 'Alchemy', 'Consciousness'],
    readingTimeHours: 7.5,
    aiVibe: 'Profound, sublime, and intellectually liberating',
    sampleChapters: [
      {
        title: 'Chapter 1: The Principle of Mentalism',
        subtitle: 'The Universe is Mental; The All is Mind',
        content: [
          'Before matter, before light, before atomic structure, there was pure infinite subjective Consciousness—called by the ancients Nu or The ALL.',
          'The material universe you perceive with your physical senses is a thought-form held within the infinite living mind of the Cosmos. When you master your own thoughts, you align directly with the creative power that sustains the stars.'
        ]
      }
    ],
    reviews: []
  },

  // 1. Sci-Fi & Fantasy (Original Bookatlas Classics)
  {
    id: 'atlas-001',
    title: 'The Cartographer of Silent Stars',
    subtitle: 'A Tale of Lost Navigation and Cosmic Secrets',
    author: 'Elena Rostova',
    authorBio: 'Elena Rostova is an award-winning novelist and astrophysicist based in Edinburgh and Amsterdam. Her speculative fiction has been translated into twenty-four languages.',
    narrator: 'Dominic Armato',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80',
    price: 13.99,
    originalPrice: 18.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.92,
    reviewCount: 3420,
    format: 'ebook',
    genres: ['Sci-Fi & Fantasy', 'Fiction & Literature'],
    primaryGenre: 'Sci-Fi & Fantasy',
    pageCount: 432,
    audioDurationMinutes: 740,
    publishDate: 'October 14, 2025',
    publisher: 'Orion Publishing Group / Atlantean Imprint',
    isbn: '978-0-593-44210-9',
    language: 'English',
    synopsis: 'On the salt plains of Oakhaven, the stellar beacons have started dimming one by one. Kaelen, an apprentice astrolabe engineer who lost her sight to an eclipse, discovers that the constellations are not dying—they are being systematically rewritten by a ghost armada from beyond the perimeter.',
    editorialReview: '“A breathless triumph of world-building and celestial wonder. Rostova writes with the poetic precision of Ted Chiang and the vast emotional scale of Ursula K. Le Guin.” — The European Literary Review',
    superPointsEarned: 140,
    tags: ['Space Opera', 'Astrophysics', 'Bookatlas Plus', 'Bestseller'],
    awards: ['Hugo Award Nominee 2025', 'European Speculative Fiction Prize'],
    readingTimeHours: 7.5,
    aiVibe: 'Vast, celestial, and deeply poetic',
    audioSampleUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    sampleChapters: [
      {
        title: 'Chapter 1: The Silver Needle',
        subtitle: 'The salt plains beneath the hollow moons',
        content: [
          'The astrolabe in Kaelen’s palm hummed with a resonance that felt colder than winter sea water. For three centuries, the needle had pointed unerringly toward Polaris Prime, the anchor star by which all seven colony worlds calculated their orbits and maintained atmospheric shielding.',
          'Tonight, the needle was trembling. Then, with a faint crystalline snap, it swung three degrees southward into empty black space.',
          'Kaelen stood on the parapet of the High Observatory, the dry salt wind pulling at her linen shawl. Below her, the valley of Oakhaven lay dormant, bathed in the pale violet glow of twin planetary rings. Not a single light flickered from the residential spires; curfew had been called four hours past when the orbital relay went dark.',
          '“You shouldn’t be up here, apprentice,” a voice rasped from the archway behind her. Master Corvo leaned on his brass cane, the intricate cogs in his mechanical knee ticking softly in the desert chill.',
          '“Look at the third quadrant, Master,” she whispered without turning around. “The Orion filament. The belt stars are no longer forming an equilateral bridge. The middle jewel is gone.”',
          'Corvo did not scoff. He stepped forward to the heavy brass telescope, his weathered eye pressing against the chilled optic. When he pulled away, his breath misted the eyepiece, his knuckles bloodless.',
          '“Get your gear packed,” Corvo said, his voice dropping an octave into absolute stillness. “The Archivists must not find us here at dawn.”'
        ]
      },
      {
        title: 'Chapter 2: The Mapmaker’s Vault',
        subtitle: 'Secrets buried beneath centuries of brine',
        content: [
          'The archives of the Old Cartography Guild were hidden inside the subterranean sea vaults beneath the salt dunes. Water seeped through ancient mortar, forming stalactites of calcified salt that glittered like shattered diamonds in the light of Kaelen’s phosphorus torch.',
          'She pulled a heavy iron ledger from the third shelf. The parchment was brittle as dried wasp wings, bound in cured sharkskin that smelled of cedar oil and centuries of silence.',
          'On page four hundred and twelve, an illuminated chart showed a map of our galaxy drawn five hundred years before humanity achieved light-speed travel. But drawn in the margins in fresh indigo ink were mathematical coordinates that matched the anomaly she had recorded only hours ago.',
          '“Someone knew this would happen,” Kaelen murmured, tracing the faded ink with the tip of her index finger. “And they left the key here.”'
        ]
      }
    ],
    reviews: [
      {
        id: 'r1',
        authorName: 'Marcus Vance',
        rating: 5,
        date: '2 weeks ago',
        title: 'Absolute masterpiece of modern science fiction',
        comment: 'I finished this in two sittings. The depiction of astral navigation and the depth of Kaelen’s character had me weeping by chapter 15. The eReader formatting on Bookatlas with Literata font is perfection.',
        verifiedPurchase: true,
        upvotes: 42
      }
    ]
  },

  // 2. Historical Fiction & Dutch Sagas
  {
    id: 'atlas-002',
    title: 'The Star-Cartographer of Amsterdam',
    subtitle: 'Canals, Optical Lenses, and the Map That Changed the World',
    author: 'Willem van der Meer',
    authorBio: 'Willem van der Meer is a historian and novelist born in Utrecht. He was awarded the Dutch National Book Prize in 2023 for his historical epics of the Golden Age.',
    narrator: 'Lars Mikkelsen',
    coverImage: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&w=700&q=80',
    price: 11.49,
    originalPrice: 16.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: false,
    isEditorPick: true,
    rating: 4.88,
    reviewCount: 2190,
    format: 'bundle',
    genres: ['Historical Fiction', 'Dutch & European Classics'],
    primaryGenre: 'Historical Fiction',
    pageCount: 512,
    audioDurationMinutes: 890,
    publishDate: 'September 2, 2024',
    publisher: 'De Geus / Atlantean Historical Library',
    isbn: '978-9-044-54602-1',
    language: 'English',
    synopsis: 'In 1672 Amsterdam, as the Dutch Republic faces invasion by three European armies, an optics master named Pieter Huygens crafts a miraculous prism for the admiralty. But when he inspects a confidential sea atlas from Batavia, he realizes an uncharted island holds an alchemical secret capable of turning naval warfare into utter annihilation.',
    editorialReview: '“Rich with the scent of linseed oil, canal mist, and tallow candles. Van der Meer resurrects seventeenth-century Amsterdam with unmatched historical brilliance.” — De Volkskrant',
    superPointsEarned: 115,
    tags: ['Amsterdam', 'Historical Fiction', 'Golden Age', 'Optics', 'Dutch Classics'],
    awards: ['Dutch Historical Fiction Medal', 'European Heritage Book Prize'],
    readingTimeHours: 9.0,
    aiVibe: 'Atmospheric, meticulous, and rich with European heritage',
    sampleChapters: [
      {
        title: 'Chapter 1: The Canal of the Emperor',
        subtitle: 'Keizersgracht, Winter 1672',
        content: [
          'The ice on the Keizersgracht had turned the color of pewter under the low December sky. Pieter Huygens stood by his workshop window, breathing warm air onto his frostbitten fingers before resuming his work on the convex brass lens.',
          'Outside, the bells of the Westerkerk tolled four in the afternoon. The city was on edge. Rumors had spread from Utrecht that French cavalry had breached the eastern waterlines, skating over frozen marshes that had served as the Republic’s defense for thirty years.',
          'A hurried knock shook the oak door downstairs. When Pieter opened it, a courier wrapped in a sodden wool cloak thrust a sealed cylinder of wax-treated leather into his chest.',
          '“From the Grand Pensionary Johan de Witt,” the man whispered, his breath steaming in the entryway. “Let no eye but yours touch the parchment inside.”'
        ]
      }
    ],
    reviews: []
  },

  // 3. Mystery & Suspense
  {
    id: 'atlas-003',
    title: 'The Shadow of Herengracht',
    subtitle: 'A Pieter van Dijk Amsterdam Detective Mystery',
    author: 'Saskia Noort-Groot',
    authorBio: 'Saskia Noort-Groot is a former criminologist and bestselling crime novelist based in Haarlem.',
    narrator: 'Famke Janssen',
    coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=700&q=80',
    price: 9.99,
    originalPrice: 14.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    rating: 4.81,
    reviewCount: 1840,
    format: 'ebook',
    genres: ['Mystery & Suspense', 'Thriller & Crime'],
    primaryGenre: 'Mystery & Suspense',
    pageCount: 368,
    audioDurationMinutes: 620,
    publishDate: 'January 18, 2026',
    publisher: 'Ambo Anthos Crime',
    isbn: '978-9-026-35810-4',
    language: 'English',
    synopsis: 'When a prominent art restorer is found drowned inside an antique seventeenth-century baptismal font on the Herengracht, Detective Pieter van Dijk discovers a missing Vermeer study that holds clues to a multi-million-euro antiquities smuggling ring.',
    editorialReview: '“A pulse-pounding Nordic-style noir drenched in Dutch atmosphere and labyrinthine twists.” — Het Parool',
    superPointsEarned: 100,
    tags: ['Crime', 'Mystery', 'Amsterdam', 'Art Heist', 'Thriller'],
    readingTimeHours: 6.2,
    aiVibe: 'Tense, shadowy, and fast-paced investigative noir',
    sampleChapters: [
      {
        title: 'Chapter 1: The Midnight Call',
        subtitle: 'Canal mist over the Jordaan',
        content: [
          'The rain over Amsterdam was that thin, relentless drizzle that seeped straight through the seams of Pieter van Dijk’s trench coat.',
          'He leaned against the wrought-iron railing of the bridge at Herengracht and Leidsegracht, staring down at the blue flashers reflecting off the dark canal water. Two divers from the regional police unit were hauling a sodden canvas tarp up the stone steps of the dock.',
          '“Restorer from the Rijksmuseum,” forensic technician Bram whispered, stepping under Pieter’s umbrella. “Found by the early morning barge operator. But look at his hands, Pieter. His fingernails are stained with lapis lazuli pigment.”'
        ]
      }
    ],
    reviews: []
  },

  // 4. Thriller & Crime
  {
    id: 'atlas-004',
    title: 'Protocol Zero: The Zurich Infiltration',
    subtitle: 'An International Cyber-Espionage Thriller',
    author: 'Julian Vance',
    authorBio: 'Julian Vance spent twelve years in counter-intelligence operations across Frankfurt, Geneva, and London before turning to fiction.',
    narrator: 'Colin Salmon',
    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80',
    price: 4.99,
    originalPrice: 15.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: false,
    rating: 4.79,
    reviewCount: 4210,
    format: 'bundle',
    genres: ['Thriller & Crime', 'Mystery & Suspense'],
    primaryGenre: 'Thriller & Crime',
    pageCount: 410,
    audioDurationMinutes: 710,
    publishDate: 'November 12, 2025',
    publisher: 'Bantam Press',
    isbn: '978-0-553-82019-3',
    language: 'English',
    synopsis: 'A rogue algorithmic hedge fund in Zurich deploys a weaponized neural worm designed to collapse European clearing houses in under seventy seconds. Ex-NATO operative Evelyn Shaw has twenty-four hours to infiltrate the underground server bunker beneath Lake Geneva.',
    editorialReview: '“A relentless, adrenaline-fueled tour-de-force that makes the modern financial espionage world feel terrifyingly real.” — Financial Times',
    superPointsEarned: 50,
    tags: ['Cyber Thriller', 'Espionage', 'Deal', 'Bestseller'],
    readingTimeHours: 6.5,
    aiVibe: 'High-octane, tech-savvy, and relentless',
    sampleChapters: [
      {
        title: 'Chapter 1: The 60-Second Crash',
        subtitle: 'Bahnhofstrasse, Zurich, 08:59 CET',
        content: [
          'The digital clock on Evelyn Shaw’s encrypted wrist terminal ticked down: 00:00:59.',
          'Across the trading floor of Helvetia Private Clearing, four hundred dual-monitor workstations flickered simultaneously from forest green to blinding amber. The high-frequency transaction latency spiked from four microseconds to eight thousand milliseconds.',
          '“We’ve lost the Frankfurt exchange link!” a trader yelled across the pit. “The order book is empty! Everything is being routed through an anonymous IP in Bucharest!”',
          'Evelyn didn’t panic. She pulled the magnetic keycard from her pocket and slipped through the security fire door leading down to Sub-Level 4.'
        ]
      }
    ],
    reviews: []
  },

  // 5. Romance & Contemporary
  {
    id: 'atlas-005',
    title: 'The Tulip Merchant’s Daughter',
    subtitle: 'A Story of Hidden Love, Art, and Secret Canals',
    author: 'Clara Beaumont',
    authorBio: 'Clara Beaumont is a bestselling historical romance author whose novels celebrate the beauty of European cities.',
    narrator: 'Rosamund Pike',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    price: 8.99,
    originalPrice: 14.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    rating: 4.87,
    reviewCount: 3100,
    format: 'ebook',
    genres: ['Romance & Contemporary', 'Historical Fiction'],
    primaryGenre: 'Romance & Contemporary',
    pageCount: 352,
    audioDurationMinutes: 580,
    publishDate: 'February 10, 2026',
    publisher: 'St. Martin’s Griffin',
    isbn: '978-1-250-84310-7',
    language: 'English',
    synopsis: 'In 1636 Haarlem, at the height of Tulipmania, Anneliese van Houten secretly cross-breeds a rare midnight-black bulb to save her family from bankruptcy. When a talented English botanist arrives seeking the same legendary flower, a tender rivalry turns into an unforgettable romance.',
    editorialReview: '“Sensual, lush, and overflowing with heartfelt emotion. Beaumont paints every scene with the vivid color of a Dutch master’s canvas.” — Romantic Times',
    superPointsEarned: 90,
    tags: ['Romance', 'Historical Romance', 'Amsterdam', 'Tulipmania'],
    readingTimeHours: 5.8,
    aiVibe: 'Romantic, poetic, and heartwarming',
    sampleChapters: [
      {
        title: 'Chapter 1: The Glasshouse at Twilight',
        subtitle: 'Haarlem, Spring 1636',
        content: [
          'Inside the heated glasshouse behind her father’s apothecary, the air was warm with damp loam and sweet hyacinth.',
          'Anneliese knelt beside the terra-cotta forcing pot, gently peeling back the dark moss. Beneath it, a single sprout had emerged, its slender tip shaded in deep violet that bordered on obsidian.',
          '“If the guild masters in Amsterdam see this,” a voice spoke softly from the doorway, “they will offer you ten thousand guilders before the sun sets.”',
          'She spun around, her heart jumping. Standing in the shadows of the doorway was Henry Sterling, the English botanist whose sketches had captivated the Royal Society in London.'
        ]
      }
    ],
    reviews: []
  },

  // 6. Non-Fiction & Essays
  {
    id: 'atlas-006',
    title: 'The Architecture of Human Attention',
    subtitle: 'Reclaiming Deep Focus in an Era of Infinite Distraction',
    author: 'Dr. Soren Lindqvist',
    authorBio: 'Dr. Soren Lindqvist is a cognitive neuroscientist at Karolinska Institute and a visiting fellow at Oxford.',
    narrator: 'Stephen Fry',
    coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=700&q=80',
    price: 14.99,
    originalPrice: 22.00,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.94,
    reviewCount: 5200,
    format: 'bundle',
    genres: ['Non-Fiction & Essays', 'Self-Improvement & Psychology'],
    primaryGenre: 'Non-Fiction & Essays',
    pageCount: 384,
    audioDurationMinutes: 660,
    publishDate: 'January 5, 2026',
    publisher: 'Penguin Press / Atlantean Intellectual Library',
    isbn: '978-0-593-31845-4',
    language: 'English',
    synopsis: 'Why has uninterrupted contemplation become the rarest commodity of the 21st century? Dr. Lindqvist synthesizes fifty years of neuro-imaging data and monastic attentional practices to construct an actionable blueprint for modern intellectual sovereign work.',
    editorialReview: '“The definitive guide to reclaiming our cognitive agency. Lindqvist writes with profound clarity and scientific rigor.” — Nature Mind & Brain',
    superPointsEarned: 150,
    tags: ['Attention Economy', 'Neuroscience', 'Focus', 'Non-Fiction', 'Bestseller'],
    readingTimeHours: 6.4,
    aiVibe: 'Rigorous, illuminating, and transformative',
    sampleChapters: [
      {
        title: 'Chapter 1: The Fragmentation of the Prefrontal Cortex',
        subtitle: 'Why 12-second notifications destroy 4-hour states of flow',
        content: [
          'In 1904, the philosopher William James famously declared that the faculty of voluntarily bringing back a wandering attention over and over again is the very root of judgment, character, and will.',
          'A century later, neuro-imaging reveals what happens when that faculty is assaulted by intermittent digital reinforcement: the dopamine receptors in the ventral tegmental area undergo structural downregulation.',
          'We do not simply get distracted; we train our brains to experience boredom as physical distress. To rebuild our attention, we must first redesign our cognitive architecture from the foundation up.'
        ]
      }
    ],
    reviews: []
  },

  // 7. Business & Leadership
  {
    id: 'atlas-007',
    title: 'The Antifragile Enterprise',
    subtitle: 'How Visionary Companies Flourish Under Extreme Volatility',
    author: 'Hendrik de Vries',
    authorBio: 'Hendrik de Vries is an angel investor, former tech executive, and senior advisor to sovereign wealth funds in the Netherlands and Singapore.',
    narrator: 'Simon Vance',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=700&q=80',
    price: 16.99,
    originalPrice: 24.99,
    isBookatlasPlus: false,
    isKoboPlus: false,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    rating: 4.86,
    reviewCount: 1980,
    format: 'ebook',
    genres: ['Business & Leadership', 'Non-Fiction & Essays'],
    primaryGenre: 'Business & Leadership',
    pageCount: 320,
    audioDurationMinutes: 540,
    publishDate: 'December 1, 2025',
    publisher: 'Harvard Business Review Press',
    isbn: '978-1-633-69812-3',
    language: 'English',
    synopsis: 'Traditional resilience is about withstanding shocks; antifragility is about getting exponentially stronger from disorder. De Vries breaks down how modern organizations eliminate brittle hierarchies, decentralize decision rights, and turn market disruptions into compounding advantages.',
    editorialReview: '“Essential reading for every founder and executive building for the next twenty years.” — The Wall Street Journal',
    superPointsEarned: 170,
    tags: ['Business', 'Strategy', 'Leadership', 'Management'],
    readingTimeHours: 5.5,
    aiVibe: 'Sharp, strategic, and forward-thinking',
    sampleChapters: [
      {
        title: 'Chapter 1: The Illusion of Efficiency',
        subtitle: 'Why optimized supply chains break first',
        content: [
          'For thirty years, global management theory preached a single gospel: lean optimization. Remove all redundancy. Minimize inventory. Outsource non-core operations to the lowest bidder.',
          'Yet when the storm arrived, the most "efficient" enterprises were the first to shatter. The companies that survived and dominated were those with strategic slack, distributed redundant nodes, and aggressive trial-and-error speed.'
        ]
      }
    ],
    reviews: []
  },

  // 8. Self-Improvement & Psychology
  {
    id: 'atlas-008',
    title: 'The Mindful Stoic: Calm in Chaos',
    subtitle: 'Timeless Wisdom for Modern High-Pressure Lives',
    author: 'Marcus Aurelius Brooks',
    authorBio: 'Marcus Aurelius Brooks is a clinical psychologist and popular philosophical essayist.',
    narrator: 'Marcus Aurelius Brooks',
    coverImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=700&q=80',
    price: 2.99,
    originalPrice: 13.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: false,
    rating: 4.84,
    reviewCount: 7650,
    format: 'ebook',
    genres: ['Self-Improvement & Psychology', 'Non-Fiction & Essays'],
    primaryGenre: 'Self-Improvement & Psychology',
    pageCount: 240,
    audioDurationMinutes: 310,
    publishDate: 'March 15, 2024',
    publisher: 'Penguin Life',
    isbn: '978-0-143-13456-7',
    language: 'English',
    synopsis: 'How do you preserve interior tranquility when the world around you is noisy, uncertain, and demanding? Brooks translates ancient Epictetus, Seneca, and Aurelius into five-minute daily cognitive practices.',
    editorialReview: '“Clear, antidote-for-anxiety wisdom in an age of constant notification overload.” — Psychology Today',
    superPointsEarned: 30,
    tags: ['Stoicism', 'Mindfulness', 'Mental Health', 'Daily Deal'],
    readingTimeHours: 4.0,
    aiVibe: 'Calm, centering, and deeply grounded',
    sampleChapters: [
      {
        title: 'Chapter 1: The Circle of Control',
        subtitle: 'What belongs to you and what does not',
        content: [
          'Of things that exist, some are within our control and others are not. Within our power are opinion, motivation, desire, aversion, and whatever is of our own doing. Not in our power are body, property, reputation, and public offices.',
          'The moment you stop expecting the external world to behave according to your preferences, peace of mind ceases to be an elusive dream.'
        ]
      }
    ],
    reviews: []
  },

  // 9. Biography & Memoir
  {
    id: 'atlas-009',
    title: 'Leonardo: The Polymath’s Journals',
    subtitle: 'A New Biography from Unseen Manuscripts',
    author: 'Prof. Matteo Rossi',
    authorBio: 'Prof. Matteo Rossi is Chief Curator of Renaissance Manuscripts at the Uffizi Gallery in Florence.',
    narrator: 'Derek Jacobi',
    coverImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=700&q=80',
    price: 18.99,
    originalPrice: 28.00,
    isBookatlasPlus: false,
    isKoboPlus: false,
    isDeal: false,
    isBestseller: false,
    isNewRelease: true,
    rating: 4.89,
    reviewCount: 1250,
    format: 'bundle',
    genres: ['Biography & Memoir', 'Historical Fiction'],
    primaryGenre: 'Biography & Memoir',
    pageCount: 580,
    audioDurationMinutes: 940,
    publishDate: 'December 4, 2025',
    publisher: 'Oxford University Press',
    isbn: '978-0-198-83120-1',
    language: 'English',
    synopsis: 'Drawing from newly decrypted mirror-writing codices discovered in Milanese family vaults, Professor Rossi unveils the intimate doubts, astronomical breakthroughs, and botanical obsessions of history’s greatest genius.',
    editorialReview: '“The definitive Da Vinci biography for our century. Breathtakingly researched.” — The Guardian',
    superPointsEarned: 190,
    tags: ['Biography', 'Renaissance', 'Art History', 'Science'],
    readingTimeHours: 9.8,
    aiVibe: 'Scholarly, evocative, and masterfully detailed',
    sampleChapters: [
      {
        title: 'Chapter 1: The Left Hand of Florence',
        subtitle: 'The workshop of Verrocchio, 1466',
        content: [
          'In the summer of 1466, a fourteen-year-old boy from the Tuscan village of Vinci entered the bustling bottega of Andrea del Verrocchio. He carried a portfolio of sketches drawn not in ink, but in charcoal crushed from olive twigs.',
          'Where other pupils copied plaster casts of Roman saints, the young Leonardo sat on the workshop threshold, sketching the vortex formed by a pail of water spilled across uneven paving stones.'
        ]
      }
    ],
    reviews: []
  },

  // 10. Graphic Novels & Manga
  {
    id: 'atlas-010',
    title: 'Neo-Tokyo 2099: Cyber-Blade Chronicles',
    subtitle: 'Volume 1: The Digital Ronin',
    author: 'Kenji Takahashi & Mia Chen',
    authorBio: 'Kenji Takahashi is an award-winning manga creator and art director from Kyoto.',
    narrator: 'Vic Mignogna',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=80',
    price: 7.99,
    originalPrice: 12.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    rating: 4.91,
    reviewCount: 4890,
    format: 'ebook',
    genres: ['Graphic Novels & Manga', 'Sci-Fi & Fantasy'],
    primaryGenre: 'Graphic Novels & Manga',
    pageCount: 220,
    audioDurationMinutes: 180,
    publishDate: 'January 20, 2026',
    publisher: 'NeoTokyo Press / Atlantean Manga',
    isbn: '978-4-065-21443-8',
    language: 'English (Translated)',
    synopsis: 'In Neo-Shinjuku, year 2099, an augmented ronin cyborg named Akira is hired by an underground AI syndicate to recover a stolen neural consciousness that holds the key to human immortality.',
    editorialReview: '“Stunning visuals, blistering cyber-action, and razor-sharp pacing. A triumph of visual storytelling.” — Manga Weekly',
    superPointsEarned: 80,
    tags: ['Cyberpunk', 'Manga', 'Action', 'Sci-Fi'],
    readingTimeHours: 3.5,
    aiVibe: 'Cinematic, hyper-kinetic, and cyberpunk-cool',
    sampleChapters: [
      {
        title: 'Act 1: Rain in Sector 7',
        subtitle: 'The holographic alleyways of Shinjuku',
        content: [
          '[PANEL 1: Extreme wide shot of towering cybernetic skyscrapers piercing through acid rain clouds, illuminated in neon cyan and magenta.]',
          '[PANEL 2: Akira adjusts his thermal optical visor, the digital heads-up display locking onto three heavily armed synth-mercenaries on the skywalk ahead.]',
          '“Target verified. Engaging plasma blade.”'
        ]
      }
    ],
    reviews: []
  },

  // 11. Philosophy & Deep Thought
  {
    id: 'atlas-011',
    title: 'Spinoza’s Geometry of Joy',
    subtitle: 'Reason, Nature, and the Free Human Being in Amsterdam',
    author: 'Dr. Maarten van Heemskerck',
    authorBio: 'Dr. Maarten van Heemskerck is Professor of Modern Philosophy at the University of Amsterdam.',
    narrator: 'David Attenborough',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
    price: 12.99,
    originalPrice: 19.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: false,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.95,
    reviewCount: 890,
    format: 'ebook',
    genres: ['Philosophy & Deep Thought', 'Dutch & European Classics'],
    primaryGenre: 'Philosophy & Deep Thought',
    pageCount: 336,
    audioDurationMinutes: 610,
    publishDate: 'February 1, 2026',
    publisher: 'Amsterdam University Press',
    isbn: '978-9-089-64211-0',
    language: 'English',
    synopsis: 'Exiled by his community on the Vlooienburg canal, Baruch Spinoza ground optical lenses by day and revolutionized Western philosophy by night. Dr. van Heemskerck presents an accessible, radiant breakdown of the Ethics—demonstrating how understanding nature leads to absolute intellectual freedom.',
    editorialReview: '“A masterpiece of philosophical translation that makes Spinoza’s radical joy leap off the page.” — European Journal of Philosophy',
    superPointsEarned: 130,
    tags: ['Philosophy', 'Spinoza', 'Ethics', 'Amsterdam', 'Classics'],
    readingTimeHours: 5.6,
    aiVibe: 'Profound, sublime, and intellectually liberating',
    sampleChapters: [
      {
        title: 'Chapter 1: The Solitary Grinder of Glass',
        subtitle: 'Vlooienburg, 1656',
        content: [
          'In a modest upstairs chamber overlooking the Amstel river, glass dust hung like fine powdered sugar in the afternoon sunbeams.',
          'Baruch Spinoza rubbed his thumb across the curve of a telescope lens. Outside, the merchants of the Dutch East India Company shouted in half a dozen languages, trading spices and Baltic grain.',
          'Inside, on a rough deal table, lay sheets of manuscript inscribed in dense Latin. Spinoza was proving mathematically that fear and hatred are forms of bondage—and that human beatitude consists solely in the constant and eternal love of nature.'
        ]
      }
    ],
    reviews: []
  },

  // 12. Poetry & Anthologies
  {
    id: 'atlas-012',
    title: 'Constellations Over the IJ',
    subtitle: 'Modern Dutch and European Verse of Harbor, Light, and Stone',
    author: 'Anouk Visser & European Poets Collective',
    authorBio: 'Anouk Visser is a poet and translator living along the Amsterdam IJ waterfront.',
    narrator: 'Gillian Anderson',
    coverImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=700&q=80',
    price: 6.99,
    originalPrice: 12.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: false,
    isNewRelease: true,
    rating: 4.88,
    reviewCount: 620,
    format: 'bundle',
    genres: ['Poetry & Anthologies', 'Dutch & European Classics'],
    primaryGenre: 'Poetry & Anthologies',
    pageCount: 192,
    audioDurationMinutes: 210,
    publishDate: 'January 10, 2026',
    publisher: 'De Bezige Bij Poetry',
    isbn: '978-9-023-48190-2',
    language: 'English & Dutch',
    synopsis: 'A breathtaking bilingual collection of contemporary European poetry capturing the luminous sea skies of the Low Countries, nocturnal ferry crossings, and the quiet dignity of human connection in historic harbor cities.',
    editorialReview: '“Luminous, melancholic, and utterly unforgettable verse.” — TLS',
    superPointsEarned: 70,
    tags: ['Poetry', 'Amsterdam', 'European Verse', 'Bilingual'],
    readingTimeHours: 3.2,
    aiVibe: 'Lyrical, atmospheric, and resonant',
    sampleChapters: [
      {
        title: 'Canto 1: Nocturne on the Buiksloterham Ferry',
        subtitle: 'Crossing the IJ at midnight',
        content: [
          'The diesel hum vibrates through the iron deck,',
          'Where bicycles lean in silent rows like sleeping cranes.',
          'Across the dark mirror of the harbor,',
          'The lights of Central Station dissolve into amber ripples,',
          'And we are carried across the black water,',
          'Neither leaving nor arriving,',
          'Suspended between centuries of brick and the salt wind of the open sea.'
        ]
      }
    ],
    reviews: []
  },

  // 13. Science & Technology
  {
    id: 'atlas-013',
    title: 'Silicon Synapses: The Neural Frontier',
    subtitle: 'Bio-Silicon Computing, Quantum Logic, and the Next Era of Thought',
    author: 'Dr. Aris Thorne',
    authorBio: 'Dr. Aris Thorne is a quantum computing architect and neuro-engineering researcher at TU Delft.',
    narrator: 'Neil deGrasse Tyson',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80',
    price: 15.99,
    originalPrice: 24.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: false,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.93,
    reviewCount: 2430,
    format: 'bundle',
    genres: ['Science & Technology', 'Non-Fiction & Essays'],
    primaryGenre: 'Science & Technology',
    pageCount: 448,
    audioDurationMinutes: 720,
    publishDate: 'February 12, 2026',
    publisher: 'MIT Press / Atlantean Tech',
    isbn: '978-0-262-54910-1',
    language: 'English',
    synopsis: 'When carbon biology merges with synthetic superconducting circuits, what happens to human memory, intuition, and discovery? Dr. Thorne guides readers through the bleeding-edge quantum cleanrooms of Delft and Zurich.',
    editorialReview: '“A thrilling, accessible voyage into the technologies that will define human civilization for the next thousand years.” — Wired Magazine',
    superPointsEarned: 160,
    tags: ['Quantum Computing', 'AI', 'Neuroscience', 'Technology', 'Science'],
    readingTimeHours: 7.2,
    aiVibe: 'Mind-expanding, visionary, and scientifically rigorous',
    sampleChapters: [
      {
        title: 'Chapter 1: The Dilution Refrigerator',
        subtitle: 'Ten millikelvin above absolute zero',
        content: [
          'Inside the gold-plated cylinder suspended in the center of the cleanroom, it is colder than deep interstellar space.',
          'At fifteen millikelvin, thermal noise ceases. Superconducting transmon qubits begin to dance in coherent superposition, calculating probabilistic vectors across millions of alternate states simultaneously.'
        ]
      }
    ],
    reviews: []
  },

  // 14. Fiction & Literature
  {
    id: 'atlas-014',
    title: 'The Midnight Bookshop of Herengracht',
    subtitle: 'Where Every Volume Holds an Alternate Past',
    author: 'Frederik van Veen',
    authorBio: 'Frederik van Veen is an essayist and novelist whose lyrical magical realism has garnered widespread critical acclaim.',
    narrator: 'Emma Thompson',
    coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=700&q=80',
    price: 12.49,
    originalPrice: 17.99,
    isBookatlasPlus: true,
    isKoboPlus: true,
    isDeal: true,
    isBestseller: true,
    isNewRelease: true,
    isEditorPick: true,
    rating: 4.96,
    reviewCount: 6410,
    format: 'ebook',
    genres: ['Fiction & Literature', 'Dutch & European Classics'],
    primaryGenre: 'Fiction & Literature',
    pageCount: 396,
    audioDurationMinutes: 670,
    publishDate: 'November 28, 2025',
    publisher: 'De Harmonie / Atlantean Literary',
    isbn: '978-9-061-69921-7',
    language: 'English',
    synopsis: 'Tucked beneath a leaning gabled house along the Herengracht in Amsterdam is a bookshop that opens only when the clock strikes twelve. The bookseller, an enigmatic woman named Marit, stocks volumes containing the memoirs of lives you chose not to live.',
    editorialReview: '“A modern classic of European magical realism. Heart-wrenching, luminous, and brimming with profound empathy.” — NRC Handelsblad',
    superPointsEarned: 125,
    tags: ['Magical Realism', 'Amsterdam', 'Bookstore', 'Literary Fiction', 'Bestseller'],
    readingTimeHours: 6.6,
    aiVibe: 'Enchanting, bittersweet, and unforgettable',
    sampleChapters: [
      {
        title: 'Chapter 1: The Chime at Midnight',
        subtitle: 'The bell of the brass clock tower',
        content: [
          'The shop had no sign, no brass plaque, and no daytime window display. If you walked down the Herengracht at two in the afternoon, you would see only the shuttered basement of a spice merchant’s 1640 residence.',
          'But if you stood on the moss-covered steps at twelve minutes past midnight, when the canal boats had tied up for the night and the fog rose from the waterline, the frosted glass door would click open of its own accord.',
          'Inside, the smell was unmistakable: dried lavender, beeswax, and paper aged in salt air.'
        ]
      }
    ],
    reviews: []
  }
];
