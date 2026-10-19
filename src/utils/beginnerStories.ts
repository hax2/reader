import type { Track } from "../types";

export interface StoryCharacterChip {
  icon: string;
  es: string;
  en: string;
}

export interface StorySceneMarker {
  blockIndex: number;
  icon: string;
  titleEs: string;
  titleEn: string;
}

export interface StoryQuizQuestion {
  questionEs: string;
  questionEn: string;
  options: {
    es: string;
    en: string;
    correct?: boolean;
  }[];
  explanation: string;
}

export interface BeginnerStoryEnhancement {
  settingBadge: string;
  cast: StoryCharacterChip[];
  scenes: StorySceneMarker[];
  moral?: {
    labelEs: string;
    quoteEs: string;
    quoteEn: string;
  };
  quiz: StoryQuizQuestion[];
}

export function isBeginnerTrack(track: Track | null | undefined): boolean {
  if (!track) return false;
  return track.difficulty === "A2" || track.difficulty === "B1";
}

const STORY_ENHANCEMENTS: Record<string, BeginnerStoryEnhancement> = {
  "modern-cafe-madrid": {
    settingBadge: "📍 Plaza Mayor, Madrid · Sábado por la mañana",
    cast: [
      { icon: "☕", es: "Clara", en: "Waiting at Café del Sol" },
      { icon: "🧣", es: "Mateo", en: "Old friend from Valencia" },
      { icon: "📘", es: "El libro azul", en: "Forgotten secondhand book" },
      { icon: "🕰️", es: "El reloj de la plaza", en: "Meeting point at 9:30" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "☀️",
        titleEs: "Escena 1 · Una mañana en la terraza",
        titleEn: "A sunny morning at the café terrace"
      },
      {
        blockIndex: 2,
        icon: "✉️",
        titleEs: "Escena 2 · La postal misteriosa",
        titleEn: "The mysterious postcard inside the blue book"
      },
      {
        blockIndex: 4,
        icon: "🕰️",
        titleEs: "Escena 3 · Bajo el reloj de la plaza",
        titleEn: "Looking toward the plaza clock at 9:30"
      }
    ],
    moral: {
      labelEs: "Expresión clave del relato",
      quoteEs: "«Como si el tiempo nunca hubiera pasado.»",
      quoteEn: "\"As if no time had passed at all\" — a warm Spanish phrase for true friendship."
    },
    quiz: [
      {
        questionEs: "¿Qué pide Clara para desayunar en el Café del Sol?",
        questionEn: "What does Clara order for breakfast at Café del Sol?",
        options: [
          { es: "Un café con leche y una ración de churros", en: "A café con leche and an order of churros", correct: true },
          { es: "Un té verde y una tostada con tomate", en: "A green tea and toast with tomato" },
          { es: "Un zumo de naranja y un cruasán", en: "An orange juice and a croissant" }
        ],
        explanation: "Clara asks the waiter for «un café con leche bien caliente y una ración de churros»."
      },
      {
        questionEs: "¿Quién dejó realmente el libro azul con la postal en la mesa?",
        questionEn: "Who actually left the blue book with the postcard on the table?",
        options: [
          { es: "El camarero del café", en: "The café waiter" },
          { es: "Su amigo Mateo para darle una sorpresa", en: "Her friend Mateo to surprise her", correct: true },
          { es: "Un turista desconocido", en: "An unknown tourist" }
        ],
        explanation: "Mateo arrived early from Valencia in a gray coat and green scarf and left the clue for Clara!"
      }
    ]
  },

  "modern-mercado-coyoacan": {
    settingBadge: "📍 Coyoacán, Ciudad de México · Día de mercado",
    cast: [
      { icon: "🛍️", es: "Diego", en: "Looking for a birthday gift" },
      { icon: "👵", es: "La abuela Elena", en: "Turning 75 years old" },
      { icon: "🥭", es: "Mangos de Michoacán", en: "Sweet as honey" },
      { icon: "🐦", es: "La taza del colibrí", en: "Hand-painted clay mug" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🥭",
        titleEs: "Escena 1 · Colores y frutas del mercado",
        titleEn: "Colors and fresh fruit in the market aisle"
      },
      {
        blockIndex: 2,
        icon: "🏺",
        titleEs: "Escena 2 · El taller del alfarero",
        titleEn: "Don Mateo's pottery stall"
      },
      {
        blockIndex: 4,
        icon: "🌻",
        titleEs: "Escena 3 · Celebración en el patio",
        titleEn: "Birthday chocolate beneath the lemon tree"
      }
    ],
    moral: {
      labelEs: "Detalle cultural",
      quoteEs: "«En nuestra tradición, el colibrí trae alegría y buenos deseos a la casa.»",
      quoteEn: "\"In our tradition, the hummingbird brings joy and good wishes to the home.\""
    },
    quiz: [
      {
        questionEs: "¿Qué animal está pintado en la taza que compra Diego?",
        questionEn: "What animal is painted on the mug Diego buys?",
        options: [
          { es: "Un águila dorada", en: "A golden eagle" },
          { es: "Un colibrí", en: "A hummingbird", correct: true },
          { es: "Una mariposa monarca", en: "A monarch butterfly" }
        ],
        explanation: "Don Mateo shows Diego a glazed clay mug with a hummingbird («un colibrí») painted in the center."
      },
      {
        questionEs: "¿Qué bebida prepara la familia para estrenar la taza de la abuela?",
        questionEn: "What drink does the family prepare to christen the grandmother's new mug?",
        options: [
          { es: "Chocolate caliente espumoso", en: "Frothy hot chocolate", correct: true },
          { es: "Café frío con vainilla", en: "Iced vanilla coffee" },
          { es: "Té de manzanilla", en: "Chamomile tea" }
        ],
        explanation: "Grandmother Elena loves drinking her afternoon hot chocolate («chocolate caliente con canela»)."
      }
    ]
  },

  "samaniego-la-lechera": {
    settingBadge: "📍 Camino del mercado · Fábula clásica (1781)",
    cast: [
      { icon: "🥛", es: "El cántaro de leche", en: "Fresh milk on her head" },
      { icon: "🐣", es: "Cien huevos y pollitos", en: "First step of her dream" },
      { icon: "🐷", es: "El lechón", en: "Fed with acorns and bran" },
      { icon: "🐄", es: "La vaca y el ternero", en: "Her grand daydream" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🚶‍♀️",
        titleEs: "Escena 1 · El camino al mercado",
        titleEn: "Walking briskly with the pitcher of milk"
      },
      {
        blockIndex: 1,
        icon: "🐣",
        titleEs: "Escena 2 · Una fortuna en la imaginación",
        titleEn: "From eggs to chicks, a piglet, and a calf"
      },
      {
        blockIndex: 3,
        icon: "💔",
        titleEs: "Escena 3 · El salto y el cántaro roto",
        titleEn: "One joyful leap shatters the daydream"
      }
    ],
    moral: {
      labelEs: "La moraleja de Samaniego",
      quoteEs: "«No debemos dejarnos llevar por la fantasía desmedida ni contar con los bienes antes de tenerlos seguros.»",
      quoteEn: "\"Don't count your chickens before they hatch — do not build castles in the air before your gains are secure.\""
    },
    quiz: [
      {
        questionEs: "¿Por qué se cae y se rompe el cántaro de leche?",
        questionEn: "Why does the pitcher of milk fall and shatter?",
        options: [
          { es: "Porque un zorro asusta a la muchacha", en: "Because a fox startles the girl" },
          { es: "Porque la lechera da un salto de alegría imaginando al ternero", en: "Because the milkmaid leaps with joy imagining the calf", correct: true },
          { es: "Porque empieza a llover muy fuerte", en: "Because it starts raining heavily" }
        ],
        explanation: "Imagining the calf leaping in the meadow, she leaps with joy herself («dio también un salto de alegría») and drops the pitcher."
      },
      {
        questionEs: "¿Qué planeaba comprar primero con el dinero de la leche?",
        questionEn: "What did she plan to buy first with the money from the milk?",
        options: [
          { es: "Una cesta de cien huevos frescos", en: "A basket of a hundred fresh eggs", correct: true },
          { es: "Un vestido nuevo para la feria", en: "A new dress for the fair" },
          { es: "Un caballo blanco", en: "A white horse" }
        ],
        explanation: "Her first plan was to buy «una cesta de cien huevos frescos» to raise chicks."
      }
    ]
  },

  "samaniego-leon-raton": {
    settingBadge: "📍 La selva · Fábula en verso (1781)",
    cast: [
      { icon: "🦁", es: "El león", en: "Powerful king of the forest" },
      { icon: "🐭", es: "El ratoncillo", en: "Tiny captive mouse" },
      { icon: "🕸️", es: "La red oculta", en: "Hunter's trap in the brush" },
      { icon: "🦷", es: "Los nudos roídos", en: "Gnawed cords that free the lion" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🦁",
        titleEs: "Escena 1 · El perdón del rey",
        titleEn: "The lion spares the little mouse's life"
      },
      {
        blockIndex: 1,
        icon: "🕸️",
        titleEs: "Escena 2 · La trampa en la maleza",
        titleEn: "The lion falls into a hidden net"
      },
      {
        blockIndex: 2,
        icon: "🐭",
        titleEs: "Escena 3 · El rescate y la moraleja",
        titleEn: "The mouse gnaws the knots and frees the king"
      }
    ],
    moral: {
      labelEs: "La moraleja de la fábula",
      quoteEs: "«Conviene al poderoso para los infelices ser piadoso; tal vez se puede ver necesitado del auxilio de aquel más desdichado.»",
      quoteEn: "\"It behooves the powerful to be merciful to the unfortunate; one day they may need the help of the humblest creature.\""
    },
    quiz: [
      {
        questionEs: "¿Qué hace el león cuando el ratoncillo le pide perdón llorando?",
        questionEn: "What does the lion do when the little mouse begs for forgiveness?",
        options: [
          { es: "Lo perdona y lo deja en libertad", en: "He forgives him and sets him free", correct: true },
          { es: "Lo encierra en una jaula", en: "He locks him in a cage" },
          { es: "Pide queso a cambio", en: "He asks for cheese in return" }
        ],
        explanation: "Hearing the mouse plead for mercy, the lion replies majestically: «¡Te perdono!»"
      },
      {
        questionEs: "¿Cómo salva el ratoncillo al león más tarde?",
        questionEn: "How does the little mouse save the lion later on?",
        options: [
          { es: "Llama a los demás leones de la selva", en: "He calls the other lions of the jungle" },
          { es: "Roe con paciencia los nudos de la red hasta romperlos", en: "He diligently gnaws the knots of the net until they break", correct: true },
          { es: "Esconde al león detrás de un árbol", en: "He hides the lion behind a tree" }
        ],
        explanation: "The mouse runs over and gnaws the knots of the net («roe diligente los nudos de la red»)."
      }
    ]
  },

  "samaniego-cuervo-zorro": {
    settingBadge: "📍 En la rama de un árbol · Fábula en verso (1781)",
    cast: [
      { icon: "🐦‍⬛", es: "El señor cuervo", en: "Perched high in a tree" },
      { icon: "🧀", es: "El queso", en: "Held tightly in his beak" },
      { icon: "🦊", es: "El zorro adulador", en: "Hungry and clever flatterer" },
      { icon: "🎵", es: "El graznido", en: "The song that drops the prize" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🧀",
        titleEs: "Escena 1 · El tesoro en el pico",
        titleEn: "A crow with a piece of cheese attracts a clever fox"
      },
      {
        blockIndex: 1,
        icon: "🦊",
        titleEs: "Escena 2 · El elogio engañoso",
        titleEn: "The fox praises the crow's feathers and voice"
      },
      {
        blockIndex: 2,
        icon: "🍂",
        titleEs: "Escena 3 · El canto y la caída del queso",
        titleEn: "The crow opens his beak to sing and loses his meal"
      }
    ],
    moral: {
      labelEs: "La moraleja de la fábula",
      quoteEs: "«Quien oye aduladores, nunca espere otro premio.»",
      quoteEn: "\"Whoever listens to flatterers should never expect any other reward.\""
    },
    quiz: [
      {
        questionEs: "¿Cómo consigue el zorro que el cuervo suelte el queso?",
        questionEn: "How does the fox get the crow to drop the cheese?",
        options: [
          { es: "Trepando hasta la rama más alta del árbol", en: "By climbing to the highest branch of the tree" },
          { es: "Halagando su belleza y pidiéndole que cante", en: "By flattering his beauty and asking him to sing", correct: true },
          { es: "Lanzando piedras contra el árbol", en: "By throwing stones at the tree" }
        ],
        explanation: "The fox flatters the crow, saying that if his voice matches his feathers, he is the king of birds."
      },
      {
        questionEs: "¿Qué enseñanza deja el zorro al marcharse con el queso?",
        questionEn: "What lesson does the fox leave behind as he walks off with the cheese?",
        options: [
          { es: "Que no debemos confiar en los aduladores", en: "That we should not trust flatterers", correct: true },
          { es: "Que los cuervos cantan mejor por la mañana", en: "That crows sing better in the morning" },
          { es: "Que el queso es malo para las aves", en: "That cheese is bad for birds" }
        ],
        explanation: "«Quien oye aduladores, nunca espere otro premio» — flatterers always seek their own benefit."
      }
    ]
  },

  "samaniego-cigarra-hormiga": {
    settingBadge: "📍 El campo en invierno · Fábula en verso (1781)",
    cast: [
      { icon: "🦗", es: "La cigarra", en: "Sang all summer long" },
      { icon: "🐜", es: "La hormiga", en: "Stored grain with foresight" },
      { icon: "🌾", es: "Los graneros", en: "Filled before the cold arrived" },
      { icon: "❄️", es: "El crudo invierno", en: "No flies or worms left in the field" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "❄️",
        titleEs: "Escena 1 · El silencio del invierno",
        titleEn: "Summer ends and the cicada has nothing to eat"
      },
      {
        blockIndex: 1,
        icon: "🌾",
        titleEs: "Escena 2 · El ruego ante la hormiga",
        titleEn: "The cicada begs the industrious ant for a loan of wheat"
      },
      {
        blockIndex: 2,
        icon: "🐜",
        titleEs: "Escena 3 · La respuesta de la hormiga",
        titleEn: "If you sang in the heat, now dance in the cold"
      }
    ],
    moral: {
      labelEs: "Verso célebre de la fábula",
      quoteEs: "«¿Yo prestar lo que gano con un trabajo inmenso? Dime, pues, holgazana: ¿qué has hecho en el buen tiempo?»",
      quoteEn: "\"Lend what I earn with immense labor? Tell me then, idler: what did you do when the weather was fine?\""
    },
    quiz: [
      {
        questionEs: "¿Qué hizo la cigarra durante todo el verano?",
        questionEn: "What did the cicada do all summer long?",
        options: [
          { es: "Cantar alegremente a los pasajeros sin guardar comida", en: "Sing cheerfully to passersby without storing food", correct: true },
          { es: "Construir un refugio bajo tierra", en: "Build an underground shelter" },
          { es: "Viajar a otro bosque más cálido", en: "Travel to a warmer forest" }
        ],
        explanation: "The cicada spent the whole summer singing («Yo, dijo la cigarra, a todo pasajero cantaba alegremente»)."
      },
      {
        questionEs: "¿Qué le pide la cigarra a la hormiga cuando llega el frío?",
        questionEn: "What does the cicada ask the ant for when the cold arrives?",
        options: [
          { es: "Que le preste grano de trigo hasta el verano", en: "To lend her wheat grain until summer", correct: true },
          { es: "Que canten juntas una canción", en: "To sing a song together" },
          { es: "Que le regale una guitarra", en: "To give her a guitar" }
        ],
        explanation: "Starving in winter, the cicada asks the ant to lend her some grain, promising to pay it back with interest."
      }
    ]
  },

  "quiroga-tortuga-gigante": {
    settingBadge: "📍 Selva de Misiones a Buenos Aires · Cuentos de la selva (1918)",
    cast: [
      { icon: "🧔", es: "El cazador bondadoso", en: "Works hard to help his brothers" },
      { icon: "🐢", es: "La tortuga gigante", en: "As big as an armchair, loyal friend" },
      { icon: "🐅", es: "El tigre de la selva", en: "Driven off by the hunter" },
      { icon: "🐭", es: "El ratón de ciudad", en: "Points out the lights of Buenos Aires" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🌿",
        titleEs: "Escena 1 · Hacia el monte de Misiones",
        titleEn: "A sick man travels to the jungle to recover his health"
      },
      {
        blockIndex: 1,
        icon: "🐅",
        titleEs: "Escena 2 · El rescate en la orilla del río",
        titleEn: "Saving the wounded tortoise from the jaguar"
      },
      {
        blockIndex: 3,
        icon: "🐢",
        titleEs: "Escena 3 · La promesa de la tortuga",
        titleEn: "When fever strikes the hunter, the tortoise carries him south"
      },
      {
        blockIndex: 5,
        icon: "🌆",
        titleEs: "Escena 4 · Las luces de Buenos Aires",
        titleEn: "Reaching the Zoological Garden at dawn"
      }
    ],
    moral: {
      labelEs: "Corazón del cuento",
      quoteEs: "«El hombre me salvó la vida y ahora yo lo llevaré hasta Buenos Aires para que lo curen.»",
      quoteEn: "\"The man saved my life, and now I will carry him all the way to Buenos Aires so they can cure him.\""
    },
    quiz: [
      {
        questionEs: "¿Cómo salva el hombre a la tortuga gigante al principio del cuento?",
        questionEn: "How does the man save the giant tortoise at the beginning of the story?",
        options: [
          { es: "Espanta a un tigre y cura sus heridas en la cabaña", en: "He drives off a jaguar and heals her wounds in his cabin", correct: true },
          { es: "La saca de una red de pescadores", en: "He frees her from a fishing net" },
          { es: "La compra en un mercado del pueblo", en: "He buys her at a village market" }
        ],
        explanation: "He scares away the jaguar attacking her on the riverbank and nurses her back to health for weeks."
      },
      {
        questionEs: "¿Quién le explica a la tortuga agotada que las luces del horizonte son Buenos Aires?",
        questionEn: "Who tells the exhausted tortoise that the lights on the horizon are Buenos Aires?",
        options: [
          { es: "Un ratón de ciudad", en: "A city mouse", correct: true },
          { es: "Un loro verde del bosque", en: "A green forest parrot" },
          { es: "El guardia de un tren", en: "A train guard" }
        ],
        explanation: "A passing city mouse («un ratón de ciudad») tells her that the glowing horizon is Buenos Aires!"
      }
    ]
  },

  "marti-bebe-pomposo": {
    settingBadge: "📍 París · La Edad de Oro de José Martí (1889)",
    cast: [
      { icon: "👦", es: "Bebé", en: "Generous five-year-old boy" },
      { icon: "🧒", es: "Raúl", en: "His poor cousin with no toys" },
      { icon: "🎩", es: "Don Pomposo", en: "Wealthy, flattering uncle" },
      { icon: "🗡️", es: "El sable dorado", en: "The splendid gift Bebé gives away" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🎠",
        titleEs: "Escena 1 · El mundo de Bebé y su primo Raúl",
        titleEn: "A privileged boy who notices his poor cousin has no toys"
      },
      {
        blockIndex: 3,
        icon: "🎩",
        titleEs: "Escena 2 · La visita del señor don Pomposo",
        titleEn: "Uncle Pomposo gifts Bebé a magnificent toy sword and ignores Raúl"
      },
      {
        blockIndex: 6,
        icon: "🗡️",
        titleEs: "Escena 3 · El gesto silencioso en la noche",
        titleEn: "Bebé gets up before dawn to place the golden sword beside sleeping Raúl"
      }
    ],
    moral: {
      labelEs: "El corazón del cuento de Martí",
      quoteEs: "«Los niños saben más de lo que parece, y ven la injusticia con ojos limpios.»",
      quoteEn: "\"Children understand far more than it seems, and see injustice with clear, generous eyes.\""
    },
    quiz: [
      {
        questionEs: "¿Por qué se siente incómodo Bebé durante la visita del tío don Pomposo?",
        questionEn: "Why does Bebé feel uncomfortable during Uncle Don Pomposo's visit?",
        options: [
          { es: "Porque don Pomposo le regala un sable precioso a él y no le da nada al pobre Raúl", en: "Because Don Pomposo gives him a splendid sword and gives nothing to poor Raúl", correct: true },
          { es: "Porque no le gustan los caballos ni los sables", en: "Because he doesn't like horses or swords" },
          { es: "Porque quiere salir a pasear al parque", en: "Because he wants to go for a walk in the park" }
        ],
        explanation: "Bebé sees how sad his cousin Raúl looks while Don Pomposo lavishes attention and a magnificent sword only on Bebé."
      }
    ]
  },

  "marti-nene-traviesa": {
    settingBadge: "📍 Hogar familiar · La Edad de Oro de José Martí (1889)",
    cast: [
      { icon: "👧", es: "Nené", en: "Imaginative, curious little girl" },
      { icon: "👨‍👧", es: "Su papá", en: "Works late copying books for her" },
      { icon: "📚", es: "El libro de cien años", en: "Borrowed treasure with animal pictures" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🌟",
        titleEs: "Escena 1 · El cariño del padre y la curiosidad de Nené",
        titleEn: "A devoted father and his imaginative little daughter"
      },
      {
        blockIndex: 4,
        icon: "📖",
        titleEs: "Escena 2 · El libro prohibido de cien años",
        titleEn: "Her father warns her not to touch a valuable borrowed book"
      },
      {
        blockIndex: 8,
        icon: "😢",
        titleEs: "Escena 3 · Las páginas rotas y el arrepentimiento",
        titleEn: "Temptation leads to torn pages and a heartfelt confession"
      }
    ],
    moral: {
      labelEs: "Enseñanza del relato",
      quoteEs: "«Un instante de capricho puede herir a quien más trabaja por nosotros.»",
      quoteEn: "\"A single moment's whim can deeply hurt the person who works hardest for us.\""
    },
    quiz: [
      {
        questionEs: "¿Por qué era tan importante no tocar el libro grande que trajo el papá de Nené?",
        questionEn: "Why was it so important not to touch the big book Nené's father brought home?",
        options: [
          { es: "Porque tenía cien años, era prestado y valía mucho dinero", en: "Because it was a hundred years old, borrowed, and worth a great deal of money", correct: true },
          { es: "Porque estaba escrito en otro idioma", en: "Because it was written in another language" },
          { es: "Porque tenía las hojas mojadas", en: "Because its pages were wet" }
        ],
        explanation: "Nobody had wanted to lend the century-old book, and her father would have to work a whole year to pay for it if damaged."
      }
    ]
  },

  "bes-jonas": {
    settingBadge: "📍 El mar Mediterráneo y Nínive · Relato bíblico (B1)",
    cast: [
      { icon: "⛵", es: "Jonás", en: "Reluctant prophet fleeing by ship" },
      { icon: "🌊", es: "Los marineros", en: "Caught in a violent storm" },
      { icon: "🐋", es: "El gran pez", en: "Swallows Jonah for three days" },
      { icon: "🌿", es: "La planta de sombra", en: "Object lesson in compassion" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "⛵",
        titleEs: "Escena 1 · La huida hacia Tarsis y la tormenta",
        titleEn: "Jonah boards a ship in the opposite direction and a great storm rises"
      },
      {
        blockIndex: 2,
        icon: "🐋",
        titleEs: "Escena 2 · En el vientre del gran pez",
        titleEn: "Three days in the depths and Jonah's prayer"
      },
      {
        blockIndex: 4,
        icon: "🏛️",
        titleEs: "Escena 3 · El perdón de Nínive y la lección de compasión",
        titleEn: "Nineveh repents and Jonah learns about mercy"
      }
    ],
    moral: {
      labelEs: "Pregunta final del libro",
      quoteEs: "«Tú tuviste compasión de una planta que no plantaste; ¿y no tendré yo compasión de Nínive, aquella gran ciudad?»",
      quoteEn: "\"You had compassion on a plant you did not grow; should I not have compassion on that great city Nineveh?\""
    },
    quiz: [
      {
        questionEs: "¿Adónde intenta huir Jonás en barco cuando recibe el encargo de ir a Nínive?",
        questionEn: "Where does Jonah try to flee by ship when told to go to Nineveh?",
        options: [
          { es: "A Tarsis, en dirección opuesta", en: "To Tarshish, in the opposite direction", correct: true },
          { es: "A Egipto por el desierto", en: "To Egypt through the desert" },
          { es: "A Babilonia", en: "To Babylon" }
        ],
        explanation: "Jonah goes down to Joppa and boards a ship bound for Tarshish to flee in the opposite direction."
      }
    ]
  },

  "bes-rut": {
    settingBadge: "📍 Moab y los campos de Belén · Relato bíblico (B1)",
    cast: [
      { icon: "🌾", es: "Rut", en: "Loyal Moabite woman" },
      { icon: "👵", es: "Noemí", en: "Her mother-in-law returning to Bethlehem" },
      { icon: "🏡", es: "Booz", en: "Generous landowner and kinsman" }
    ],
    scenes: [
      {
        blockIndex: 0,
        icon: "🛤️",
        titleEs: "Escena 1 · La promesa de lealtad en el camino",
        titleEn: "Ruth refuses to leave Naomi and travels with her to Bethlehem"
      },
      {
        blockIndex: 3,
        icon: "🌾",
        titleEs: "Escena 2 · La cosecha de cebada en el campo de Booz",
        titleEn: "Gleaning grain in the fields and meeting Boaz"
      },
      {
        blockIndex: 6,
        icon: "🌅",
        titleEs: "Escena 3 · Redención y una nueva familia",
        titleEn: "Boaz redeems the family land and marries Ruth"
      }
    ],
    moral: {
      labelEs: "Promesa célebre de Rut",
      quoteEs: "«Adondequiera que tú vayas, iré yo; tu pueblo será mi pueblo.»",
      quoteEn: "\"Wherever you go, I will go; your people shall be my people.\""
    },
    quiz: [
      {
        questionEs: "¿Qué hace Rut en los campos de Belén para alimentar a su suegra Noemí?",
        questionEn: "What does Ruth do in the fields of Bethlehem to feed her mother-in-law Naomi?",
        options: [
          { es: "Recoge las espigas de cebada que dejan los segadores", en: "She gleans the barley ears left behind by the harvesters", correct: true },
          { es: "Vende cerámica en la puerta de la ciudad", en: "She sells pottery at the city gate" },
          { es: "Cuida un rebaño de ovejas", en: "She tends a flock of sheep" }
        ],
        explanation: "Ruth goes out to glean ears of barley behind the harvesters in the field belonging to Boaz."
      }
    ]
  }
};

export function getBeginnerStoryEnhancement(track: Track | null | undefined, totalBlocks: number): BeginnerStoryEnhancement | null {
  if (!isBeginnerTrack(track) || !track) return null;

  const curated = STORY_ENHANCEMENTS[track.id];
  if (curated) return curated;

  // Fallback visual enhancement for any other A2/B1 track (or user-added A2/B1 books)
  const tagIcons: Record<string, string> = {
    animals: "🐾",
    family: "👨‍👩‍👧",
    familia: "👨‍👩‍👧",
    kindness: "💛",
    poetry: "📜",
    Biblia: "📖",
    sabiduría: "🕯️",
    historia: "🏛️",
    intriga: "🗝️",
    oración: "🌿",
    viaje: "🧭"
  };

  const cast: StoryCharacterChip[] = (track.tags || []).slice(0, 4).map((tag) => ({
    icon: tagIcons[tag] || "✨",
    es: tag.charAt(0).toUpperCase() + tag.slice(1),
    en: track.genre || "Theme"
  }));

  const scenes: StorySceneMarker[] = [];
  if (totalBlocks >= 3) {
    scenes.push({
      blockIndex: 0,
      icon: "📖",
      titleEs: "Parte I · Introducción",
      titleEn: "Opening of the reading"
    });
    const mid = Math.floor(totalBlocks / 2);
    if (mid > 0) {
      scenes.push({
        blockIndex: mid,
        icon: "✨",
        titleEs: "Parte II · Desarrollo",
        titleEn: "Heart of the passage"
      });
    }
  }

  return {
    settingBadge: `📖 ${track.genre || "Lectura guiada"} · Nivel ${track.difficulty}`,
    cast,
    scenes,
    quiz: []
  };
}
