#!/usr/bin/env python3
"""Create 8 new curated Spanish readings across A2, B1, and B2 with pre-aligned English translations."""

from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

SENTENCE_END = re.compile(r'''[.!?…]["')\]»”]*\s*$''')
TOKEN_PATTERN = re.compile(r"\w+(?:['’]\w+)?|[^\w]+", re.UNICODE)
OPENING_PUNCT_SPLIT = re.compile(r"^([\s\S]*?\s+)([¿¡«“\"'(\[—–-]+)$", re.UNICODE)


def tokenize_text(text: str) -> list[dict[str, str]]:
    words: list[dict[str, str]] = []
    pending_prefix = ""
    for match in TOKEN_PATTERN.finditer(text):
        token = match.group(0)
        if token[0].isalnum() or token[0] == "_":
            words.append({"text": token, "prefix": pending_prefix, "separator": ""})
            pending_prefix = ""
        elif words:
            words[-1]["separator"] += token
        else:
            pending_prefix += token
    for index, word in enumerate(words):
        split_match = OPENING_PUNCT_SPLIT.match(word["separator"])
        if split_match and index + 1 < len(words):
            word["separator"] = split_match.group(1)
            words[index + 1]["prefix"] = (words[index + 1].get("prefix") or "") + split_match.group(2)
    return words


def build_reader_blocks(body: str, sentences_per_block: int = 4) -> list[str]:
    words = tokenize_text(body.strip())
    blocks: list[str] = []
    current = ""
    sentence_count = 0
    for index, word in enumerate(words):
        prefix = word.get("prefix") or ""
        separator = word.get("separator") or " "
        piece = f'{word["text"]}{separator}'
        current += f"{prefix}{piece}"
        if SENTENCE_END.search(piece):
            sentence_count += 1
        if sentence_count >= sentences_per_block and index < len(words) - 1:
            blocks.append(current.strip())
            current = ""
            sentence_count = 0
    if current.strip():
        blocks.append(current.strip())
    return blocks


NEW_READINGS = [
    {
        "id": "modern-cafe-madrid",
        "stem": "modern_cafe_madrid",
        "title": "Un café en la Plaza Mayor",
        "author": "Relatos del Día",
        "year": 2025,
        "difficulty": "A2",
        "difficultyNote": "Everyday modern Spanish with clear present and past tenses, café vocabulary, and natural dialogue.",
        "genre": "Everyday story",
        "collection": "stories",
        "tags": ["Madrid", "café", "amistad", "misterio", "vida diaria", "diálogo", "España", "beginner"],
        "description": "Clara arrives early to meet an old friend at a sunlit café in Madrid and discovers a forgotten postcard tucked inside a secondhand book.",
        "source": "Project original graded Spanish story (CC BY 4.0)",
        "rights": "Original project reading; CC BY 4.0",
        "sentences": [
            (
                "Son las nueve de la mañana en Madrid y el sol ilumina los balcones rojos de la Plaza Mayor.",
                "It is nine in the morning in Madrid, and the sun illuminates the red balconies of the Plaza Mayor."
            ),
            (
                "Clara camina despacio por las piedras antiguas mientras busca una mesa libre en la terraza del Café del Sol.",
                "Clara walks slowly across the ancient flagstones while looking for an empty table on the terrace of the Café del Sol."
            ),
            (
                "Hoy es un sábado especial porque va a desayunar con su amigo Mateo después de tres años sin verse.",
                "Today is a special Saturday because she is going to have breakfast with her friend Mateo after three years without seeing each other."
            ),
            (
                "El aire huele a café recién hecho, a pan tostado y a churros calientes con azúcar.",
                "The air smells of freshly brewed coffee, toasted bread, and hot churros with sugar."
            ),
            (
                "Clara se sienta junto a una columna de piedra y deja su bolso sobre la silla de madera.",
                "Clara sits next to a stone column and sets her bag on the wooden chair."
            ),
            (
                "Un camarero amable con delantal blanco se acerca con una sonrisa y una pequeña libreta.",
                "A friendly waiter in a white apron approaches with a smile and a small notepad."
            ),
            (
                "—Buenos días, señorita, ¿qué desea tomar hoy? —pregunta el camarero con voz tranquila.",
                "\"Good morning, miss, what would you like to have today?\" asks the waiter in a calm voice."
            ),
            (
                "—Buenos días, quiero un café con leche bien caliente y una ración de churros, por favor —responde Clara.",
                "\"Good morning, I would like a piping hot café con leche and an order of churros, please,\" Clara replies."
            ),
            (
                "Mientras espera a Mateo, Clara observa un libro viejo con tapas azules olvidado en el borde de su mesa.",
                "While waiting for Mateo, Clara notices an old book with blue covers forgotten on the edge of her table."
            ),
            (
                "Con curiosidad, abre la primera página y descubre una postal antigua escondida entre las hojas amarillas.",
                "Curiously, she opens the first page and discovers an old postcard tucked between the yellow pages."
            ),
            (
                "En la postal hay una fotografía en blanco y negro de la estación de Atocha y un mensaje escrito a mano.",
                "On the postcard there is a black-and-white photograph of Atocha station and a handwritten message."
            ),
            (
                "El mensaje dice: «Si encuentras este libro, mira debajo del reloj de la plaza a las nueve y media».",
                "The message reads: \"If you find this book, look underneath the plaza clock at nine thirty.\""
            ),
            (
                "Clara mira su reloj de pulsera con sorpresa y ve que faltan solo cinco minutos para las nueve y media.",
                "Clara checks her wristwatch in surprise and sees that it is only five minutes until nine thirty."
            ),
            (
                "En ese momento, el camarero regresa con la taza humeante y el plato de churros crujientes.",
                "At that moment, the waiter returns with the steaming cup and the plate of crispy churros."
            ),
            (
                "—Disculpe, ¿sabe quién estuvo sentado en esta mesa antes que yo? —pregunta Clara mostrando el libro azul.",
                "\"Excuse me, do you know who was sitting at this table before me?\" Clara asks, holding up the blue book."
            ),
            (
                "—Sí, fue un joven alto con abrigo gris y una bufanda verde, pero salió hace unos minutos —dice el camarero.",
                "\"Yes, it was a tall young man in a gray coat and a green scarf, but he left a few minutes ago,\" says the waiter."
            ),
            (
                "Clara levanta la vista hacia el gran reloj de la Casa de la Panadería al otro lado de la plaza.",
                "Clara looks up toward the great clock of the Casa de la Panadería on the other side of the square."
            ),
            (
                "Debajo del arco central hay un chico con abrigo gris y bufanda verde mirando hacia las terrazas.",
                "Beneath the central arch stands a young man in a gray coat and a green scarf looking toward the café terraces."
            ),
            (
                "Cuando el chico se quita las gafas de sol y saluda con la mano, Clara empieza a reír.",
                "When the young man takes off his sunglasses and waves his hand, Clara begins to laugh."
            ),
            (
                "¡Es Mateo, que llegó temprano desde Valencia y preparó este pequeño juego para darle una sorpresa!",
                "It is Mateo, who arrived early from Valencia and set up this little game to surprise her!"
            ),
            (
                "Mateo cruza la plaza con una gran sonrisa y se sienta frente a su amiga.",
                "Mateo crosses the square with a big smile and sits down across from his friend."
            ),
            (
                "—Veo que sigues siendo tan curiosa como siempre, Clara —dice Mateo mientras toma un churro caliente.",
                "\"I see you are still just as curious as ever, Clara,\" says Mateo as he takes a warm churro."
            ),
            (
                "—Y tú sigues inventando misterios en todas partes —contesta ella brindando con su taza de café.",
                "\"And you are still inventing mysteries everywhere,\" she replies, clinking her coffee cup."
            ),
            (
                "Bajo el cielo azul de Madrid, los dos amigos hablan durante horas como si el tiempo nunca hubiera pasado.",
                "Beneath the blue sky of Madrid, the two friends talk for hours as if no time had passed at all."
            ),
        ],
    },
    {
        "id": "modern-mercado-coyoacan",
        "stem": "modern_mercado_coyoacan",
        "title": "El mercado de Coyoacán",
        "author": "Relatos del Día",
        "year": 2025,
        "difficulty": "A2",
        "difficultyNote": "Warm, descriptive Mexican Spanish with food, colors, numbers, and polite market conversation.",
        "genre": "Culture & travel",
        "collection": "stories",
        "tags": ["México", "mercado", "cultura", "comida", "familia", "viaje", "beginner"],
        "description": "Diego explores the colorful stalls of Coyoacán Market in Mexico City to find the perfect birthday gift for his grandmother.",
        "source": "Project original graded Spanish story (CC BY 4.0)",
        "rights": "Original project reading; CC BY 4.0",
        "sentences": [
            (
                "Los sábados por la mañana, el mercado de Coyoacán en la Ciudad de México está lleno de música, colores y aromas deliciosos.",
                "On Saturday mornings, the Coyoacán market in Mexico City is full of music, colors, and delicious aromas."
            ),
            (
                "Diego camina por el pasillo principal con una bolsa de tela porque hoy es el cumpleaños de su abuela Elena.",
                "Diego walks down the main aisle with a cloth bag because today is his grandmother Elena's birthday."
            ),
            (
                "Su abuela cumple setenta y cinco años y ama las flores frescas, la fruta dulce y la cerámica pintada a mano.",
                "His grandmother is turning seventy-five and loves fresh flowers, sweet fruit, and hand-painted ceramics."
            ),
            (
                "En el primer puesto, una vendedora ordena montañas de mangos amarillos, papayas naranjas y granadas rojas.",
                "At the first stall, a vendor arranges mountains of yellow mangoes, orange papayas, and red pomegranates."
            ),
            (
                "—¡Pásele, joven! Prueba estos mangos de Michoacán, están dulces como la miel —dice doña Carmen ofreciendo una rebanada.",
                "\"Step right up, young man! Try these mangoes from Michoacán; they are as sweet as honey,\" says Doña Carmen, offering a slice."
            ),
            (
                "Diego prueba el mango jugoso y compra cuatro piezas grandes para el postre de la tarde.",
                "Diego tastes the juicy mango and buys four large ones for the afternoon dessert."
            ),
            (
                "Más adelante, pasa frente a una cocina tradicional donde preparan tortillas de maíz azul sobre el comal caliente.",
                "Further ahead, he passes a traditional kitchen where they are making blue corn tortillas on the hot griddle."
            ),
            (
                "El vapor sube con olor a cilantro, chile suave y chocolate caliente con canela.",
                "Steam rises with the scent of cilantro, mild chili, and hot chocolate with cinnamon."
            ),
            (
                "En el rincón de las artesanías, Diego encuentra el taller de don Mateo, un maestro alfarero de Puebla.",
                "In the crafts corner, Diego finds the workshop of Don Mateo, a master potter from Puebla."
            ),
            (
                "Sobre los estantes de madera brillan platos, jarras y tazas decoradas con flores azules y pequeños pájaros amarillos.",
                "On the wooden shelves shine plates, pitchers, and cups decorated with blue flowers and little yellow birds."
            ),
            (
                "—Busco un regalo especial para mi abuela, que siempre toma su chocolate caliente por la tarde —explica Diego.",
                "\"I am looking for a special gift for my grandmother, who always drinks her hot chocolate in the afternoon,\" Diego explains."
            ),
            (
                "Don Mateo sonríe y saca de una caja una taza de barro vidriado con un colibrí pintado en el centro.",
                "Don Mateo smiles and takes from a box a glazed clay mug with a hummingbird painted in the center."
            ),
            (
                "—En nuestra tradición, el colibrí trae alegría y buenos deseos a la casa —cuenta el artesano con orgullo.",
                "\"In our tradition, the hummingbird brings joy and good wishes to the home,\" the artisan says proudly."
            ),
            (
                "A Diego le encanta la taza porque el colibrí es el ave favorita de su abuela desde que era niña.",
                "Diego loves the mug because the hummingbird has been his grandmother's favorite bird since she was a little girl."
            ),
            (
                "Después de pagar y envolver la taza en papel de colores, Diego compra un ramo de girasoles brillantes en la entrada.",
                "After paying and wrapping the mug in colorful paper, Diego buys a bouquet of bright sunflowers at the entrance."
            ),
            (
                "Cuando llega a la casa familiar y su abuela abre el paquete, sus ojos brillan de emoción.",
                "When he arrives at the family home and his grandmother opens the package, her eyes shine with emotion."
            ),
            (
                "—¡Qué maravilla, hijo! Esta tarde vamos a estrenar mi taza con el mejor chocolate de Coyoacán —dice ella dándole un fuerte abrazo.",
                "\"How wonderful, my boy! This afternoon we are going to christen my mug with the best chocolate in Coyoacán,\" she says, giving him a big hug."
            ),
            (
                "Toda la familia se reúne en el patio bajo la sombra del árbol de limón para celebrar juntos.",
                "The whole family gathers in the courtyard beneath the shade of the lemon tree to celebrate together."
            ),
            (
                "Mientras sirven los mangos frescos y el chocolate espumoso, un colibrí verdadero vuela entre las flores del jardín.",
                "As they serve the fresh mangoes and frothy chocolate, a real hummingbird flies among the garden flowers."
            ),
            (
                "Diego mira a su abuela sonreír y comprende que los mejores regalos nacen del cariño y de los pequeños detalles.",
                "Diego watches his grandmother smile and realizes that the best gifts come from affection and small thoughtful details."
            ),
        ],
    },
    {
        "id": "samaniego-la-lechera",
        "stem": "samaniego_la_lechera",
        "title": "La lechera",
        "author": "Félix María Samaniego",
        "year": 1781,
        "difficulty": "A2",
        "difficultyNote": "A famous Spanish fable adapted with clear, musical prose and a timeless moral about daydreaming.",
        "genre": "Fable",
        "collection": "stories",
        "tags": ["fábula", "sueños", "campo", "ambición", "animales", "Samaniego", "beginner"],
        "description": "Walking to market with a pitcher of fresh milk on her head, a cheerful milkmaid builds a fortune in her imagination—until she takes one joyful leap too many.",
        "source": "https://es.wikisource.org/wiki/La_lechera",
        "rights": "Public-domain work by Félix María Samaniego (1781); Wikisource CC BY-SA 4.0",
        "sentences": [
            (
                "Una mañana de primavera, una joven aldeana caminaba alegre y ligera hacia el mercado del pueblo.",
                "One spring morning, a young village girl walked cheerfully and lightly toward the town market."
            ),
            (
                "Llevaba sobre la cabeza un cántaro lleno de leche fresca recién ordeñada en su granja.",
                "She carried on her head a pitcher full of fresh milk just milked at her farm."
            ),
            (
                "El camino era largo, pero ella avanzaba con paso vivo mientras hacía grandes planes en su imaginación.",
                "The road was long, but she stepped briskly while making grand plans in her imagination."
            ),
            (
                "«Esta leche es tan rica y limpia que la venderé muy pronto en la plaza», pensaba la muchacha con entusiasmo.",
                "\"This milk is so rich and clean that I will sell it very quickly in the square,\" the girl thought enthusiastically."
            ),
            (
                "«Con las monedas de la leche compraré una cesta de cien huevos frescos en el puesto vecino».",
                "\"With the coins from the milk, I will buy a basket of a hundred fresh eggs at the neighboring stall.\""
            ),
            (
                "«De esos huevos nacerán decenas de pollitos que cuidarán mi patio durante todo el verano».",
                "\"From those eggs dozens of little chicks will hatch and fill my yard all summer long.\""
            ),
            (
                "«Ningún zorro astuto podrá acercarse a mi corral porque yo vigilaré mis aves día y noche».",
                "\"No clever fox will be able to get near my coop because I will guard my birds day and night.\""
            ),
            (
                "«Cuando los pollos sean grandes, los venderé en la feria de otoño a muy buen precio».",
                "\"When the chickens are grown, I will sell them at the autumn fair for a very good price.\""
            ),
            (
                "La joven sonreía sola bajo el sol de la mañana mientras su fortuna imaginaria seguía creciendo.",
                "The young woman smiled to herself under the morning sun while her imaginary fortune kept growing."
            ),
            (
                "«Con el dinero de los pollos compraré un lechón pequeño y lo alimentaré con bellotas y salvado».",
                "\"With the money from the chickens I will buy a little piglet and feed it acorns and bran.\""
            ),
            (
                "«Pronto estará tan grande y hermoso que me dará dinero suficiente para comprar una vaca con su ternero».",
                "\"Soon it will be so big and handsome that it will give me enough money to buy a cow and her calf.\""
            ),
            (
                "«¡Qué alegría será ver al pequeño ternero correr y saltar libremente por el prado verde de mi casa!».",
                "\"What a joy it will be to watch the little calf run and leap freely across the green meadow by my house!\""
            ),
            (
                "Llena de felicidad por aquel pensamiento, la lechera dio también un salto de alegría en medio del camino.",
                "Filled with happiness at that thought, the milkmaid also gave a leap of joy right in the middle of the road."
            ),
            (
                "Al saltar, el cántaro perdió el equilibrio, cayó desde su cabeza y se rompió en mil pedazos contra las piedras.",
                "As she leaped, the pitcher lost its balance, fell from her head, and shattered into a thousand pieces against the stones."
            ),
            (
                "La blanca leche corrió por la tierra seca y la pobre muchacha miró con tristeza los restos de su cántaro.",
                "The white milk spilled across the dry earth, and the poor girl looked sadly at the shards of her pitcher."
            ),
            (
                "—¡Adiós leche, adiós dinero, adiós huevos, pollitos, lechón, vaca y ternero! —exclamó suspirando en el sendero.",
                "\"Goodbye milk, goodbye money, goodbye eggs, chicks, piglet, cow, and calf!\" she exclaimed, sighing on the path."
            ),
            (
                "En un solo instante desaparecieron todas las riquezas que había construido en el aire.",
                "In a single instant, all the riches she had built in thin air vanished."
            ),
            (
                "No debemos dejarnos llevar por la fantasía desmedida ni contar con los bienes antes de tenerlos seguros en la mano.",
                "We should not let ourselves be carried away by unchecked fantasy or count on our gains before holding them safely in hand."
            ),
        ],
    },
    {
        "id": "quiroga-tortuga-gigante",
        "stem": "quiroga_tortuga_gigante",
        "title": "La tortuga gigante",
        "author": "Horacio Quiroga",
        "year": 1918,
        "difficulty": "B1",
        "difficultyNote": "Warm, direct narrative prose from Quiroga's Cuentos de la selva, ideal for building confidence with past tenses.",
        "genre": "Jungle fable",
        "collection": "stories",
        "tags": ["animales", "selva", "gratitud", "aventura", "Argentina", "Quiroga", "fábula"],
        "description": "A kind hunter in the South American jungle rescues a giant tortoise from a jaguar—and discovers the depth of her gratitude when he falls gravely ill.",
        "source": "https://es.wikisource.org/wiki/Cuentos_de_la_selva/La_tortuga_gigante",
        "rights": "Public-domain work by Horacio Quiroga (1918); adapted edition CC BY-SA 4.0",
        "sentences": [
            (
                "Había una vez un hombre bueno y trabajador que vivía en Buenos Aires con sus hermanos pequeños.",
                "Once upon a time there was a good, hardworking man who lived in Buenos Aires with his younger brothers."
            ),
            (
                "Un día el hombre cayó enfermo y los médicos le dijeron que solo podría curarse si iba a vivir al aire libre en el monte.",
                "One day the man fell ill, and the doctors told him he could only recover if he went to live in the open air of the wilderness."
            ),
            (
                "El director del Jardín Zoológico, que era su amigo, le pidió que enviara pieles y animales del bosque a cambio de ayuda para sus hermanos.",
                "The director of the Zoological Garden, who was his friend, asked him to send skins and forest animals in exchange for support for his brothers."
            ),
            (
                "El hombre viajó lejos hasta la selva de Misiones, construyó una cabaña sencilla y empezó a recuperar su fuerza bajo el sol.",
                "The man traveled far to the jungle of Misiones, built a simple cabin, and began to recover his strength under the sun."
            ),
            (
                "Una tarde, mientras caminaba cerca de la orilla de un gran río, escuchó un rugido feroz entre los juncos.",
                "One afternoon, while walking near the bank of a great river, he heard a fierce roar among the reeds."
            ),
            (
                "Al acercarse en silencio, vio a un enorme tigre que intentaba romper el caparazón de una tortuga gigante.",
                "Approaching in silence, he saw an enormous jaguar trying to break open the shell of a giant tortoise."
            ),
            (
                "La tortuga era tan grande como un sillón, pero estaba gravemente herida en el cuello y ya no podía defenderse.",
                "The tortoise was as large as an armchair, but she was gravely wounded in the neck and could no longer defend herself."
            ),
            (
                "El hombre apuntó con su escopeta, espantó al tigre y arrastró con gran esfuerzo a la pesada tortuga hasta su cabaña.",
                "The man aimed his shotgun, drove off the jaguar, and with great effort dragged the heavy tortoise back to his cabin."
            ),
            (
                "Aunque tenía hambre, sintió compasión por el pobre animal y decidió curar sus heridas con agua limpia y tiras de tela.",
                "Although he was hungry, he felt compassion for the poor animal and decided to tend her wounds with clean water and strips of cloth."
            ),
            (
                "Durante semanas enteras, el hombre cuidó a la tortuga cada mañana hasta que su cuello sanó por completo.",
                "For whole weeks, the man cared for the tortoise every morning until her neck healed completely."
            ),
            (
                "La tortuga comprendió que aquel hombre le había salvado la vida y se quedó a vivir junto a su puerta como una fiel compañera.",
                "The tortoise understood that the man had saved her life and stayed to live beside his door as a faithful companion."
            ),
            (
                "Pero al llegar las lluvias del otoño, el hombre volvió a enfermar con una fiebre muy alta que no lo dejaba levantarse.",
                "But when the autumn rains arrived, the man fell ill again with a very high fever that kept him from getting up."
            ),
            (
                "Solo en medio del monte, sin medicinas ni vecinos, el cazador hablaba en voz alta entre sueños febriles.",
                "Alone in the middle of the wilderness, without medicine or neighbors, the hunter spoke aloud in feverish dreams."
            ),
            (
                "—Voy a morir aquí solo, lejos de mis hermanos, porque solo en Buenos Aires hay remedios para curarme —murmuraba el enfermo.",
                "\"I am going to die here alone, far from my brothers, because only in Buenos Aires is there medicine to cure me,\" murmured the sick man."
            ),
            (
                "La tortuga gigante escuchó sus palabras desde el rincón y tomó una decisión extraordinaria.",
                "The giant tortoise heard his words from the corner and made an extraordinary decision."
            ),
            (
                "Si el hombre la había llevado y curado cuando ella estaba herida, ahora ella lo llevaría hasta Buenos Aires sobre su lomo.",
                "If the man had carried and healed her when she was wounded, now she would carry him all the way to Buenos Aires on her back."
            ),
            (
                "Buscó raíces tiernas y agua fresca en un caparazón pequeño, alimentó al hombre y luego lo ató suavemente con lianas sobre su espalda.",
                "She gathered tender roots and fresh water in a small shell, fed the man, and then tied him gently onto her back with vines."
            ),
            (
                "Así comenzó un viaje heroico a través de bosques espesos, pantanos profundos y llanuras interminables hacia el sur.",
                "Thus began a heroic journey through thick forests, deep swamps, and endless plains toward the south."
            ),
            (
                "Día tras día y semana tras semana, la tortuga caminó bajo el sol y las estrellas, deteniéndose solo para darle agua a su amigo.",
                "Day after day and week after week, the tortoise walked beneath sun and stars, stopping only to give water to her friend."
            ),
            (
                "Finalmente, una noche en que la tortuga ya casi no tenía fuerzas, vio en el horizonte un resplandor inmenso de luces.",
                "Finally, one night when the tortoise had almost no strength left, she saw on the horizon an immense glow of lights."
            ),
            (
                "Un ratón de ciudad que pasaba por el camino le dijo con asombro que aquellas luces eran la gran ciudad de Buenos Aires.",
                "A city mouse passing along the road told her in amazement that those lights were the great city of Buenos Aires."
            ),
            (
                "Llena de un último impulso de valor, la tortuga entró al amanecer por las calles y llegó hasta el Jardín Zoológico.",
                "Filled with one last surge of courage, the tortoise entered the streets at dawn and reached the Zoological Garden."
            ),
            (
                "El director reconoció de inmediato a su amigo, llamó a los médicos que lo curaron y adoptó con cariño a la noble tortuga.",
                "The director immediately recognized his friend, called the doctors who cured him, and lovingly adopted the noble tortoise."
            ),
            (
                "Desde entonces, el hombre sano visitaba todas las tardes el jardín para llevarle hojas frescas a la amiga que le salvó la vida.",
                "From then on, the healthy man visited the garden every afternoon to bring fresh leaves to the friend who had saved his life."
            ),
        ],
    },
    {
        "id": "quiroga-almohadon-plumas",
        "stem": "quiroga_almohadon_plumas",
        "title": "El almohadón de plumas",
        "author": "Horacio Quiroga",
        "year": 1917,
        "difficulty": "B2",
        "difficultyNote": "Masterpiece of Latin American gothic suspense with vivid psychological atmosphere and a famous twist ending.",
        "genre": "Gothic short story",
        "collection": "stories",
        "tags": ["misterio", "terror", "suspenso", "Quiroga", "matrimonio", "clásico"],
        "description": "A young bride wastes away inside a cold, silent mansion while doctors are baffled by her mysterious illness—until someone lifts her feather pillow.",
        "source": "https://es.wikisource.org/wiki/Cuentos_de_amor_de_locura_y_de_muerte/El_almohad%C3%B3n_de_plumas",
        "rights": "Public-domain work by Horacio Quiroga (1917); Wikisource CC BY-SA 4.0",
        "sentences": [
            (
                "Su luna de miel fue un largo escalofrío.",
                "Her honeymoon was a long shiver."
            ),
            (
                "Rubia, angelical y tímida, el carácter duro de su marido heló sus soñadas niñerías de novia.",
                "Blonde, angelic, and shy, her husband's stern temperament froze her dreamy girlish illusions as a bride."
            ),
            (
                "Ella lo quería mucho, sin embargo, aunque a veces con un ligero estremecimiento cuando, volviendo de noche juntos por la calle, echaba una furtiva mirada a la alta estatura de Jordán, mudo desde hacía una hora.",
                "She loved him deeply, nevertheless, though sometimes with a slight shudder when, walking home together at night, she cast a furtive glance at the tall figure of Jordán, who had been silent for an hour."
            ),
            (
                "Él, por su parte, la amaba profundamente, sin darlo a conocer.",
                "He, for his part, loved her profoundly, without ever showing it."
            ),
            (
                "Durante tres meses —se habían casado en abril— vivieron una dicha especial.",
                "For three months—they had married in April—they lived in a special kind of bliss."
            ),
            (
                "Sin duda hubiera ella deseado menos severidad en ese rígido cielo de amor, más expansiva e incauta ternura; pero el impasible semblante de su marido la contenía siempre.",
                "Doubtless she would have wished for less severity in that rigid heaven of love, a more open and unguarded tenderness; yet her husband's impassive countenance always held her back."
            ),
            (
                "La casa en que vivían influía un poco en sus estremecimientos.",
                "The house in which they lived played no small part in her tremors."
            ),
            (
                "La blancura del patio silencioso —frisos, columnas y estatuas de mármol— producía una otoñal impresión de palacio encantado.",
                "The whiteness of the silent courtyard—friezes, columns, and marble statues—produced an autumnal impression of an enchanted palace."
            ),
            (
                "Dentro, el brillo glacial del estuco, sin el más leve rasguño en las altas paredes, afirmaba aquella sensación de desapacible frío.",
                "Inside, the glacial gleam of the stucco, without the faintest scratch on the high walls, reinforced that sensation of bleak cold."
            ),
            (
                "Al cruzar de una pieza a otra, los pasos hallaban eco en toda la casa, como si un largo abandono hubiera sensibilizado su resonancia.",
                "When crossing from one room to another, footsteps echoed throughout the house, as though a long abandonment had heightened its resonance."
            ),
            (
                "En ese extraño nido de amor, Alicia pasó todo el otoño.",
                "In that strange nest of love, Alicia spent the entire autumn."
            ),
            (
                "No obstante, había concluido por echar un velo sobre sus antiguos sueños, y aún vivía dormida en la casa hostil, sin querer pensar en nada hasta que llegaba su marido.",
                "Even so, she had ended by drawing a veil over her former dreams, and lived on as if asleep in the hostile house, trying not to think of anything until her husband came home."
            ),
            (
                "No es raro que adelgazara.",
                "It was no wonder that she grew thin."
            ),
            (
                "Tuvo un ligero ataque de influenza que se arrastró insidiosamente días y días; Alicia no se reponía nunca.",
                "She suffered a mild attack of influenza that dragged on insidiously for days and days; Alicia never recovered."
            ),
            (
                "Al fin una tarde pudo salir al jardín apoyada en el brazo de él.",
                "At last one afternoon she was able to go out into the garden leaning on his arm."
            ),
            (
                "Miraba indiferente a uno y otro lado; de pronto Jordán, con honda ternura, le pasó la mano por la cabeza, y Alicia rompió en seguida en sollozos, echándole los brazos al cuello.",
                "She looked indifferently from side to side; suddenly Jordán, with deep tenderness, stroked her head, and Alicia immediately burst into sobs, throwing her arms around his neck."
            ),
            (
                "Fue ese el último día que Alicia estuvo levantada.",
                "That was the last day Alicia was out of bed."
            ),
            (
                "Al día siguiente amaneció desvanecida.",
                "The next morning she awoke faint and exhausted."
            ),
            (
                "El médico de Jordán la examinó con suma atención, ordenándole calma y descanso absolutos.",
                "Jordán's doctor examined her with the utmost care, ordering complete calm and rest."
            ),
            (
                "—No sé —le dijo a Jordán en la puerta de calle, con la voz todavía baja—. Tiene una gran debilidad que no me explico, y sin vómitos, nada… Si mañana se despierta como hoy, llámeme enseguida.",
                "\"I don't know,\" he told Jordán at the street door in a low voice. \"She has a profound weakness that I cannot explain, and with no vomiting, nothing at all... If she wakes up tomorrow as she did today, call me at once.\""
            ),
            (
                "Al otro día Alicia seguía peor.",
                "The following day Alicia was worse."
            ),
            (
                "Hubo consulta: se constató una anemia de marcha agudísima, completamente inexplicable.",
                "There was a consultation: they diagnosed an anemia of rapid, acute progression, completely inexplicable."
            ),
            (
                "Alicia no tuvo más desmayos, pero se iba visiblemente a la muerte.",
                "Alicia had no further fainting spells, yet she was visibly slipping toward death."
            ),
            (
                "Todo el día el dormitorio estaba con las luces prendidas y en pleno silencio.",
                "All day long the bedroom was kept with the lights on and in complete silence."
            ),
            (
                "Pasábanse horas sin oír el menor ruido.",
                "Hours passed without the slightest sound being heard."
            ),
            (
                "Alicia dormitaba; Jordán vivía casi en la sala, también con toda la luz encendida, paseándose sin cesar de un extremo a otro con incansable obstinación.",
                "Alicia dozed; Jordán practically lived in the drawing room, also with all the lights burning, pacing ceaselessly from one end to the other with tireless obstinacy."
            ),
            (
                "La alfombra ahogaba sus pasos.",
                "The carpet muffled his footsteps."
            ),
            (
                "A ratos entraba en el dormitorio y proseguía su mudo vaivén a lo largo de la cama, mirando a su mujer cada vez que caminaba en su dirección.",
                "At times he entered the bedroom and continued his silent pacing alongside the bed, looking at his wife each time he walked toward her."
            ),
            (
                "Pronto Alicia comenzó a tener alucinaciones, confusas y flotantes al principio, y que descendieron luego a ras del suelo.",
                "Soon Alicia began to have hallucinations, confused and floating at first, which then descended to floor level."
            ),
            (
                "La joven, con los ojos desmesuradamente abiertos, no hacía sino mirar la alfombra a uno y otro lado del respaldo de la cama.",
                "The young woman, her eyes wide open, did nothing but stare at the carpet on either side of the head of the bed."
            ),
            (
                "Una noche se quedó de repente mirando fijamente; al rato abrió la boca para gritar, y sus narices y labios se perlaron de sudor.",
                "One night she suddenly stared fixedly; a moment later she opened her mouth to scream, and her nose and lips beaded with sweat."
            ),
            (
                "—¡Jordán! ¡Jordán! —clamó, rígida de espanto, sin dejar de mirar la alfombra.",
                "\"Jordán! Jordán!\" she cried out, rigid with terror, without taking her eyes off the carpet."
            ),
            (
                "Jordán corrió al dormitorio, y al verlo aparecer Alicia dio un alarido de horror.",
                "Jordán ran to the bedroom, and upon seeing him appear, Alicia gave a shriek of horror."
            ),
            (
                "—¡Soy yo, Alicia, soy yo! —le dijo él con desesperación.",
                "\"It's me, Alicia, it's me!\" he told her in despair."
            ),
            (
                "Alicia lo miró con extravío, miró la alfombra, volvió a mirarlo, y después de largo rato de estupefacta confrontación, se serenó.",
                "Alicia looked at him wildly, looked at the carpet, looked at him again, and after a long moment of stunned confrontation, grew calm."
            ),
            (
                "Los médicos volvieron inútilmente; habían visto desfilar ante ellos una vida que se extinguía sin que pudieran saber por qué.",
                "The doctors returned in vain; they had watched a life ebbing away before their eyes without being able to tell why."
            ),
            (
                "Durante el día su enfermedad no avanzaba, pero cada mañana amanecía lívida, en síncope casi.",
                "During the day her illness did not advance, yet every morning she awoke livid, almost in a swoon."
            ),
            (
                "Parecía que únicamente de noche se le fuera la vida en nuevas oleadas de sangre.",
                "It seemed that only at night did her life drain away in fresh waves of blood."
            ),
            (
                "Tenía siempre al despertar la sensación de estar desplomada en la cama con un millón de kilos encima.",
                "Whenever she woke she had the sensation of lying crushed in bed with a million kilos weighing upon her."
            ),
            (
                "Desde el tercer día este hundimiento no la abandonó más; apenas podía mover la cabeza y no quiso que le tocaran la cama ni que le arreglaran el almohadón.",
                "From the third day on, this sinking heaviness never left her; she could barely move her head and refused to let anyone touch her bed or fluff her pillow."
            ),
            (
                "Sus terrores crepusculares avanzaron en forma de monstruos que se arrastraban hasta la cama y trepaban dificultosamente por la colcha.",
                "Her twilight terrors advanced in the form of monsters that dragged themselves to the bed and climbed laboriously up the bedspread."
            ),
            (
                "Perdió luego el conocimiento y los dos días finales deliró sin cesar a media voz.",
                "She then lost consciousness, and during the final two days she raved ceaselessly in a low voice."
            ),
            (
                "Alicia murió, por fin.",
                "Alicia died, at last."
            ),
            (
                "La sirvienta, que entró después a deshacer la cama, ya sola, miró un rato extrañada el almohadón.",
                "The maid, who came in afterward to strip the now-empty bed, stared in puzzlement at the pillow for a moment."
            ),
            (
                "—¡Señor! —llamó a Jordán en voz baja—. En el almohadón hay manchas que parecen de sangre.",
                "\"Sir!\" she called to Jordán in a low voice. \"On the pillowcase there are stains that look like blood.\""
            ),
            (
                "Jordán se acercó rápidamente y se dobló sobre aquél: efectivamente, sobre la funda, a ambos lados del hueco que había dejado la cabeza de Alicia, se veían manchitas oscuras.",
                "Jordán approached quickly and bent over it: indeed, on the cover, on both sides of the hollow left by Alicia's head, tiny dark spots could be seen."
            ),
            (
                "—Parecen picaduras —murmuró la sirvienta después de un rato de inmóvil observación.",
                "\"They look like bites,\" murmured the maid after a moment of motionless observation."
            ),
            (
                "—Levántelo a la luz —le dijo Jordán.",
                "\"Hold it up to the light,\" Jordán told her."
            ),
            (
                "La sirvienta lo levantó, pero enseguida lo dejó caer y se quedó mirando a aquél, lívida y temblando.",
                "The maid lifted it, but immediately dropped it back down and stood staring at it, pale and trembling."
            ),
            (
                "Sin saber por qué, Jordán sintió que los cabellos se le erizaban.",
                "Without knowing why, Jordán felt his hair stand on end."
            ),
            (
                "—¿Qué hay? —murmuró con la voz ronca—. Pesa mucho.",
                "\"What is it?\" he murmured in a hoarse voice. \"It is very heavy.\""
            ),
            (
                "Articuló la sirvienta sin dejar de temblar, mientras Jordán lo levantaba; pesaba extraordinariamente.",
                "The maid articulated without ceasing to tremble, while Jordán lifted it; it weighed an extraordinary amount."
            ),
            (
                "Salieron con él, y sobre la mesa del comedor Jordán cortó funda y envoltura de un tajo.",
                "They carried it out, and on the dining-room table Jordán slit the pillowcase and ticking open with a single slash."
            ),
            (
                "Las plumas superiores volaron, y la sirvienta dio un grito de horror con toda la boca abierta, llevándose las manos crispadas a los bandós.",
                "The top feathers flew into the air, and the maid gave a wide-mouthed scream of horror, clutching her hands to her hair."
            ),
            (
                "Sobre el fondo, entre las plumas, moviendo lentamente las patas velludas, había un animal monstruoso, una bola viviente y viscosa.",
                "At the bottom, among the feathers, slowly moving its hairy legs, lay a monstrous creature, a living, viscous ball."
            ),
            (
                "Estaba tan hinchado que apenas se le pronunciaba la boca.",
                "It was so swollen that its mouth was barely visible."
            ),
            (
                "Noche a noche, desde que Alicia había caído en cama, había aplicado sigilosamente su boca —su trompa, mejor dicho— a las sienes de aquélla, chupándole la sangre.",
                "Night after night, ever since Alicia had taken to her bed, it had stealthily applied its mouth—its proboscis, rather—to her temples, sucking her blood."
            ),
            (
                "La picadura era casi imperceptible, y el remocionar diario del almohadón había impedido sin duda su desarrollo, pero desde que la joven no pudo moverse, la succión fue vertiginosa.",
                "The bite was almost imperceptible, and the daily fluffing of the pillow had doubtless hindered its growth at first, but once the young woman could no longer move, the draining of her blood became dizzyingly swift."
            ),
            (
                "En cinco días, en cinco noches, había vaciado a Alicia.",
                "In five days, in five nights, it had drained Alicia dry."
            ),
            (
                "Estos parásitos de las aves, diminutos en el medio habitual, llegan a adquirir en ciertas condiciones proporciones enormes.",
                "These bird parasites, tiny in their usual environment, can under certain conditions reach enormous proportions."
            ),
            (
                "La sangre humana parece serles particularmente favorable, y no es raro hallarlos en los almohadones de pluma.",
                "Human blood seems particularly favorable to them, and it is not unheard of to find them inside feather pillows."
            ),
        ],
    },
    {
        "id": "doyle-sherlock-bohemia",
        "stem": "doyle_sherlock_bohemia",
        "title": "Sherlock Holmes: Un escándalo en Bohemia",
        "author": "Arthur Conan Doyle",
        "year": 1891,
        "difficulty": "B2",
        "difficultyNote": "Classic detective mystery with sharp deduction, dialogue, and nineteenth-century European intrigue.",
        "genre": "Mystery / Detective",
        "collection": "stories",
        "tags": ["misterio", "detective", "Sherlock Holmes", "espionaje", "intriga", "Londres", "Irene Adler", "espionage"],
        "description": "On a foggy evening at 221B Baker Street, Sherlock Holmes receives a masked royal visitor desperate to recover a secret photograph from the brilliant Irene Adler.",
        "source": "https://es.wikisource.org/wiki/Un_esc%C3%A1ndalo_en_Bohemia",
        "rights": "Public-domain work by Arthur Conan Doyle (1891); adapted Spanish edition CC BY-SA 4.0",
        "sentences": [
            (
                "Para Sherlock Holmes ella es siempre «la mujer».",
                "To Sherlock Holmes she is always \"the woman.\""
            ),
            (
                "Rara vez le he oído mencionarla por otro nombre.",
                "I have seldom heard him mention her under any other name."
            ),
            (
                "En sus ojos, Irene Adler eclipsa y predomina sobre todo su sexo.",
                "In his eyes, Irene Adler eclipses and predominates the whole of her sex."
            ),
            (
                "No es que sintiera por ella ninguna emoción cercana al amor, pues para aquella mente fría y precisa toda pasión era como un grano de arena en un instrumento delicado.",
                "It was not that he felt any emotion akin to love for her, for to that cold, precise mind any passion was like grit in a sensitive instrument."
            ),
            (
                "Y sin embargo, hubo una mujer para él, y esa mujer fue la difunta Irene Adler, de dudosa y cuestionable memoria.",
                "And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory."
            ),
            (
                "Una noche de marzo de 1888, yo regresaba de visitar a un paciente cuando mi camino me llevó de nuevo por Baker Street.",
                "One night in March 1888, I was returning from a visit to a patient when my way led me once more through Baker Street."
            ),
            (
                "Al pasar frente a aquella puerta tan familiar, vi que las ventanas de nuestro antiguo salón estaban brillantemente iluminadas.",
                "As I passed that well-remembered door, I saw that the windows of our old sitting room were brightly lit."
            ),
            (
                "Detrás de las cortinas se movía la silueta alta y delgada de Holmes, caminando de un lado a otro con la cabeza inclinada sobre el pecho.",
                "Behind the blinds moved the tall, spare figure of Holmes, pacing swiftly back and forth with his head sunk upon his chest."
            ),
            (
                "Subí las escaleras y entré en el cuarto, donde mi amigo me recibió con entusiasmo junto a la chimenea.",
                "I climbed the stairs and entered the room, where my friend welcomed me warmly beside the fireplace."
            ),
            (
                "—Querido Watson, llegas en el momento exacto —me dijo señalando un pliego de papel grueso sobre la mesa.",
                "\"My dear Watson, you arrive at the exact right moment,\" he told me, pointing to a sheet of heavy paper on the table."
            ),
            (
                "—Esta carta llegó en el último correo y anuncia la visita de un cliente que prefiere ocultar su rostro tras una máscara.",
                "\"This note arrived by the last post and announces the visit of a client who prefers to conceal his face behind a mask.\""
            ),
            (
                "—Examina el papel y dime qué deduces de él —añadió Holmes pasándome la hoja.",
                "\"Examine the paper and tell me what you deduce from it,\" Holmes added, handing me the sheet."
            ),
            (
                "Observé que el papel era caro, con una marca de agua extranjera y un sello grabado en forma de corona real.",
                "I observed that the paper was expensive, bearing a foreign watermark and an embossed crest shaped like a royal crown."
            ),
            (
                "—Fue escrito en papel fabricado en Bohemia por un noble alemán que intenta escribir en inglés —declaró Holmes cuando se oyeron pasos firmes en la escalera.",
                "\"It was written on paper made in Bohemia by a German nobleman attempting to write in English,\" Holmes declared just as heavy footsteps sounded on the stairs."
            ),
            (
                "La puerta se abrió y entró un hombre de estatura gigantesca, vestido con una rica capa oscura y un antifaz negro que cubría la mitad superior de su rostro.",
                "The door opened and in stepped a man of gigantic stature, dressed in a rich dark cloak and a black mask that covered the upper half of his face."
            ),
            (
                "—Pueden llamarme el conde Von Kramm, un noble de Bohemia —dijo el visitante con acento profundo.",
                "\"You may address me as Count Von Kramm, a Bohemian nobleman,\" said the visitor in a deep accent."
            ),
            (
                "—Preferiría llamar a Su Majestad por su verdadero título: Wilhelm Gottsreich Sigismond von Ormstein, rey hereditario de Bohemia —respondió Holmes con serenidad.",
                "\"I would prefer to address Your Majesty by your true title: Wilhelm Gottsreich Sigismond von Ormstein, hereditary King of Bohemia,\" Holmes replied calmly."
            ),
            (
                "El visitante dio un salto de asombro, se arrancó el antifaz negro y confesó la grave situación que amenazaba su corona.",
                "The visitor started in astonishment, tore off the black mask, and confessed the grave situation threatening his crown."
            ),
            (
                "Cinco años antes, en Varsovia, había conocido a la célebre cantante de ópera estadounidense Irene Adler y había cometido la imprudencia de fotografiarse junto a ella.",
                "Five years earlier, in Warsaw, he had met the celebrated American opera singer Irene Adler and had committed the indiscretion of being photographed beside her."
            ),
            (
                "Ahora que el rey estaba a punto de casarse con la princesa de Escandinavia, Irene Adler guardaba aquella fotografía en Londres y se negaba a entregarla.",
                "Now that the King was about to marry the Princess of Scandinavia, Irene Adler kept that photograph in London and refused to surrender it."
            ),
            (
                "—Mis agentes han registrado su equipaje y su casa dos veces sin encontrar nada —explicó el rey con desesperación.",
                "\"My agents have searched her luggage and her house twice without finding a thing,\" the King explained in despair."
            ),
            (
                "—Mañana mismo me ocuparé del asunto, Majestad, y usted, Watson, me acompañará a Briony Lodge a las tres de la tarde —dijo Holmes.",
                "\"Tomorrow I shall attend to the matter, Your Majesty, and you, Watson, will join me at Briony Lodge at three in the afternoon,\" said Holmes."
            ),
            (
                "Al día siguiente, disfrazado de un anciano clérigo amable, Holmes provocó un pequeño tumulto frente a la casa de Irene Adler y fingió resultar herido.",
                "The next day, disguised as an amiable elderly clergyman, Holmes staged a small commotion in front of Irene Adler's house and pretended to be injured."
            ),
            (
                "Compadecida, la dama ordenó que llevaran al herido a su salón principal mientras yo aguardaba junto a la ventana abierta con un cohete de humo.",
                "Moved by sympathy, the lady ordered that the injured man be carried into her drawing room while I waited by the open window with a smoke rocket."
            ),
            (
                "Cuando Holmes levantó la mano, lancé el cohete y grité: «¡Fuego!», sabiendo que ante un incendio una persona corre por instinto hacia su objeto más valioso.",
                "When Holmes raised his hand, I threw the rocket and shouted, \"Fire!\" knowing that in a fire a person instinctively rushes toward their most prized possession."
            ),
            (
                "Tal como Holmes había previsto, Irene Adler corrió hacia un panel secreto junto a la campana de la chimenea, antes de que Holmes asegurara que había sido una falsa alarma.",
                "Just as Holmes had foreseen, Irene Adler darted toward a secret panel beside the fireplace bell-pull, before Holmes assured everyone it had been a false alarm."
            ),
            (
                "Sin embargo, cuando salimos de la casa y regresamos a Baker Street al anochecer, un joven delgado con abrigo largo pasó junto a nosotros y dijo con voz clara: «Buenas noches, señor Sherlock Holmes».",
                "Yet as we left the house and returned to Baker Street at dusk, a slender youth in a long ulster brushed past us and said in a clear voice: \"Good night, Mister Sherlock Holmes.\""
            ),
            (
                "Aquella voz nos pareció extrañamente familiar, pero no comprendimos su significado hasta la mañana siguiente.",
                "That voice struck us as strangely familiar, though we did not grasp its meaning until the following morning."
            ),
            (
                "Cuando llegamos con el rey de Bohemia a Briony Lodge, la criada nos informó que la señora Irene Adler se había casado el día anterior con el abogado Godfrey Norton y había partido hacia el continente en el primer tren.",
                "When we arrived at Briony Lodge with the King of Bohemia, the housekeeper informed us that Irene Adler had married the lawyer Godfrey Norton the day before and departed for the Continent on the first train."
            ),
            (
                "Holmes abrió rápidamente el panel secreto del salón y encontró en su interior una fotografía de Irene Adler sola, acompañada de una carta dirigida a él mismo.",
                "Holmes quickly opened the secret panel in the drawing room and found inside a photograph of Irene Adler alone, accompanied by a letter addressed to himself."
            ),
            (
                "En la carta, Irene explicaba que había sospechado del falso incendio, lo había seguido vestida de joven hasta su puerta para confirmar su identidad, y prometía al rey que jamás usaría la antigua fotografía en su contra.",
                "In the letter, Irene explained that she had suspected the false fire, followed him in a young man's coat right to his door to confirm his identity, and promised the King she would never use the old photograph against him."
            ),
            (
                "—¡Qué mujer tan extraordinaria! —exclamó el rey admirado, pero Holmes solo pidió como recompensa conservar aquella fotografía de la única persona que había logrado vencer su ingenio.",
                "\"What an extraordinary woman!\" exclaimed the King in admiration, but as his sole reward Holmes asked only to keep that photograph of the one person who had ever outwitted him."
            ),
        ],
    },
    {
        "id": "epicteto-enquiridion",
        "stem": "epicteto_enquiridion",
        "title": "Manual de vida (Enquiridión)",
        "author": "Epicteto",
        "year": 125,
        "difficulty": "B2",
        "difficultyNote": "Clear, direct Stoic maxims in Spanish on inner freedom, self-mastery, and peace of mind.",
        "genre": "Stoic philosophy",
        "collection": "greek-classics",
        "originalLanguage": "Ancient Greek",
        "tags": ["filosofía", "estoicismo", "Epicteto", "Grecia", "serenidad", "sabiduría", "philosophy", "stoicism"],
        "description": "The essential handbook of Stoic wisdom: how to distinguish what is in our power from what is not, and remain unshaken by external events.",
        "source": "https://es.wikisource.org/wiki/Manual_de_Epicteto",
        "rights": "Public-domain classical work by Epictetus / Arrian; historical Spanish edition CC BY-SA 4.0",
        "sentences": [
            (
                "De todas las cosas del mundo, unas dependen de nosotros y otras no dependen de nosotros.",
                "Of all things in the world, some are within our power and others are not within our power."
            ),
            (
                "Dependen de nosotros nuestros juicios, nuestros impulsos, nuestros deseos y nuestras aversiones; en una palabra, todas nuestras propias acciones.",
                "Within our power are our judgments, our impulses, our desires, and our aversions; in a word, whatever is our own doing."
            ),
            (
                "No dependen de nosotros el cuerpo, la riqueza, la fama, los cargos públicos ni nada que no sea nuestra propia obra.",
                "Beyond our power are the body, wealth, reputation, public office, and whatever is not our own doing."
            ),
            (
                "Las cosas que dependen de nosotros son por naturaleza libres, nadie puede impedirlas ni encadenarlas; mientras que las que no dependen de nosotros son frágiles, serviles y ajenas.",
                "The things within our power are by nature free, unhindered, and unfettered; while those beyond our power are weak, slavish, and subject to others."
            ),
            (
                "Recuerda, por tanto, que si confundes lo que es esclavo por naturaleza con lo que es libre, y crees tuyo lo que es ajeno, hallarás obstáculos a cada paso, vivirás afligido y culparás a los dioses y a los hombres.",
                "Remember, therefore, that if you mistake what is naturally slavish for what is free, and count what belongs to others as your own, you will meet with obstacles at every step, live in sorrow, and blame both gods and men."
            ),
            (
                "Pero si consideras tuyo solamente lo que es tuyo, y ajeno lo que en verdad es ajeno, nadie podrá obligarte jamás a nada ni te impedirá hacer lo que debes.",
                "But if you regard only what is yours as your own, and what belongs to others as truly theirs, no one will ever compel you or hinder you from doing what you ought."
            ),
            (
                "No culparás a nadie, no acusarás a nadie, no harás nada contra tu voluntad y no tendrás enemigo alguno que pueda dañarte.",
                "You will blame no one, accuse no one, do nothing against your will, and have no enemy who can harm you."
            ),
            (
                "Ante cualquier impresión áspera o difícil, acostúmbrate a decir al instante: «Eres solo una apariencia y no de todas maneras lo que pareces ser».",
                "Faced with any harsh or troubling impression, accustom yourself to say at once: \"You are only an appearance, and by no means altogether what you claim to be.\""
            ),
            (
                "Luego examínala con esta primera regla: mira si pertenece a las cosas que dependen de nosotros o a las que no dependen de nosotros.",
                "Then test it by this first rule: ask whether it belongs to the things that are within our power or to those that are not."
            ),
            (
                "Y si pertenece a las que no dependen de nosotros, ten a mano este pensamiento: «Nada me importa».",
                "And if it belongs to the things beyond our power, have this thought ready at hand: \"It is nothing to me.\""
            ),
            (
                "No son las cosas mismas las que perturban a los seres humanos, sino las opiniones que ellos se forman acerca de las cosas.",
                "It is not things themselves that disturb human beings, but the judgments they form about things."
            ),
            (
                "Por ejemplo, la muerte no es nada terrible, pues si lo fuera también se lo habría parecido a Sócrates; sino que el terror consiste en nuestra opinión de que la muerte es terrible.",
                "For instance, death is nothing dreadful, for if it were it would have seemed so to Socrates as well; rather, the terror lies in our judgment that death is dreadful."
            ),
            (
                "Por eso, cuando nos vemos contrariados, inquietos o tristes, nunca echemos la culpa a otro, sino a nosotros mismos, es decir, a nuestros propios juicios.",
                "Therefore, whenever we are thwarted, troubled, or grieved, let us never blame another, but only ourselves—that is, our own judgments."
            ),
            (
                "Propio de quien no ha sido educado en la sabiduría es culpar a los demás de sus propios males; empezar a educarse es culparse a uno mismo; y haber completado la educación es no culpar ni a otro ni a uno mismo.",
                "It is the mark of an uninstructed person to blame others for their own misfortunes; to begin learning wisdom is to blame oneself; and to have completed it is to blame neither another nor oneself."
            ),
            (
                "No pretendas que las cosas sucedan como tú deseas; desea más bien que sucedan tal como suceden, y tu vida transcurrirá con serenidad.",
                "Do not demand that events happen as you wish; rather, wish them to happen just as they do happen, and your life will flow on in serenity."
            ),
            (
                "La enfermedad es un obstáculo para el cuerpo, pero no para la voluntad, a menos que la voluntad misma lo permita.",
                "Sickness is an impediment to the body, but not to the will, unless the will itself chooses to make it so."
            ),
            (
                "La cojera es un impedimento para la pierna, mas no para el propósito interior; di esto mismo ante cada accidente de la vida y descubrirás que es un impedimento para otra cosa, pero no para ti.",
                "Lameness is an impediment to the leg, but not to inner purpose; say this at every accident that befalls you, and you will find it an impediment to something else, but not to yourself."
            ),
            (
                "Recuerda que debes comportarte en la vida como en un banquete.",
                "Remember that you ought to conduct yourself in life as at a banquet."
            ),
            (
                "¿Llega hasta ti el plato que se sirve? Extiende la mano y toma tu parte con moderación y cortesía.",
                "Has a dish been passed to you? Reach out your hand and take your share with moderation and courtesy."
            ),
            (
                "¿Pasa de largo? No lo retengas. ¿Aún no llega? No lances desde lejos tu deseo, sino aguarda en calma hasta que llegue a tu lado.",
                "Does it pass you by? Do not detain it. Has it not yet come? Do not project your desire from afar, but wait quietly until it reaches your side."
            ),
            (
                "Recuerda también que eres actor de un drama tal como el director lo ha dispuesto: breve si es breve, largo si es largo.",
                "Remember too that you are an actor in a play of such a kind as the author chooses: short if it be short, long if it be long."
            ),
            (
                "A ti te corresponde representar noblemente el papel que te ha sido confiado; elegir ese papel corresponde a otro.",
                "Your business is to act nobly the role that has been assigned to you; to choose that role belongs to another."
            ),
            (
                "¿Hasta cuándo aplazarás el considerarte digno de lo mejor y el seguir la voz de la razón?",
                "How long will you put off counting yourself worthy of the highest things and following the voice of reason?"
            ),
            (
                "Ya no eres un adolescente, sino una persona madura: si ahora te descuidas y pospones tu mejora día tras día, pasarás por la vida y morirás sin darte cuenta de que nunca empezaste a vivir con sabiduría.",
                "You are no longer a youth, but a grown person: if you are careless now and postpone your progress day after day, you will pass through life and die without noticing that you never began to live wisely."
            ),
        ],
    },
    {
        "id": "marco-aurelio-meditaciones",
        "stem": "marco_aurelio_meditaciones",
        "title": "Meditaciones: Consejos para el alma",
        "author": "Marco Aurelio",
        "year": 175,
        "difficulty": "B2",
        "difficultyNote": "Reflective Stoic notebook entries written in clear, resonant Spanish prose on patience, duty, and the inner citadel.",
        "genre": "Stoic philosophy",
        "collection": "greek-classics",
        "originalLanguage": "Ancient Greek",
        "tags": ["filosofía", "estoicismo", "Marco Aurelio", "Roma", "serenidad", "tiempo", "philosophy", "stoicism", "history"],
        "description": "Private reflections written by Emperor Marcus Aurelius in his campaign tent: how to begin each morning, meet difficult people with patience, and guard the peace of the mind.",
        "source": "https://es.wikisource.org/wiki/Los_doce_libros_del_emperador_Marco_Aurelio",
        "rights": "Public-domain classical work by Marcus Aurelius; historical Spanish edition CC BY-SA 4.0",
        "sentences": [
            (
                "Al amanecer, dite a ti mismo: hoy me encontraré con personas indiscretas, ingratas, soberbias, desleales y envidiosas.",
                "At dawn, say to yourself: today I shall meet with people who are meddling, ungrateful, arrogant, dishonest, and envious."
            ),
            (
                "Todo eso les sucede porque ignoran la diferencia entre los verdaderos bienes y los verdaderos males.",
                "All these things happen to them because they do not know the difference between true good and true evil."
            ),
            (
                "Pero yo, que he comprendido que la naturaleza del bien es lo bello y que la naturaleza de quien yerra es pariente de la mía, no puedo recibir daño de ninguno de ellos.",
                "But I, who have understood that the nature of the good is what is noble and that the nature of the wrongdoer is akin to my own, cannot be harmed by any of them."
            ),
            (
                "Pues ninguno podrá arrastrarme a lo que es vergonzoso, ni puedo enojarme con mi hermano ni aborrecerlo.",
                "For none of them can drag me into what is shameful, nor can I be angry with my kinsman or hate him."
            ),
            (
                "Hemos nacido para cooperar unos con otros, como los pies, las manos, los párpados y las hileras de los dientes superiores e inferiores.",
                "We were born to work together with one another, like feet, hands, eyelids, and the rows of the upper and lower teeth."
            ),
            (
                "Obrar unos contra otros es, por tanto, contrario a la naturaleza; y enojarse o dar la espalda a otro es ya obrar contra él.",
                "To act against one another is therefore contrary to nature; and to be vexed with another or turn away from him is already to act against him."
            ),
            (
                "Cuando al despertar te cueste levantarte de la cama, ten presente este pensamiento: «Me levanto para cumplir la obra propia de un ser humano».",
                "When upon waking you find it hard to rise from bed, hold fast to this thought: \"I am rising to do the proper work of a human being.\""
            ),
            (
                "¿Voy a quejarme acaso de ir a hacer aquello para lo cual he nacido y he sido traído al mundo?",
                "Shall I complain, then, of going out to do that for which I was born and brought into the world?"
            ),
            (
                "¿O he sido formado para quedarme envuelto entre las mantas dándome calor?",
                "Or was I fashioned merely to lie huddled beneath the blankets keeping myself warm?"
            ),
            (
                "¿No ves cómo las plantas, los gorriones, las hormigas, las arañas y las abejas cumplen cada mañana su tarea y contribuyen a ordenar el mundo?",
                "Do you not see how the plants, the sparrows, the ants, the spiders, and the bees perform their task each morning and help put the world in order?"
            ),
            (
                "Los hombres buscan retiros en el campo, en las costas del mar o en las montañas, y tú mismo sueles anhelar ese descanso.",
                "People seek retreats for themselves in the country, by the seashore, or in the mountains, and you yourself often long for such repose."
            ),
            (
                "Sin embargo, está en tu mano retirarte en cualquier momento dentro de ti mismo.",
                "Yet it is in your power to retire into yourself whenever you choose."
            ),
            (
                "En ningún lugar puede el ser humano hallar un refugio más tranquilo y libre de turbación que en su propia alma.",
                "Nowhere can a person find a quieter or more untroubled retreat than within their own soul."
            ),
            (
                "Concédete sin cesar este retiro y renuévate en él con principios breves y fundamentales que basten para devolverte al instante la serenidad.",
                "Grant yourself this retreat continually and renew yourself therein with brief, fundamental principles that suffice at once to restore your serenity."
            ),
            (
                "Piensa que todo lo que te ocurre desde fuera es como la espuma del mar contra una roca firme.",
                "Reflect that everything that comes upon you from outside is like sea foam breaking against a steadfast headland."
            ),
            (
                "El promontorio permanece inmóvil y alrededor de él se adormecen las olas enfurecidas.",
                "The headland stands unmoved, and around it the raging waves sink to rest."
            ),
            (
                "No digas nunca: «¡Qué desgracia que me haya sucedido esto!», sino más bien: «¡Qué fortuna soportar esto con nobleza, sin que me doblegue el presente ni me asuste el porvenir!».",
                "Never say, \"What a misfortune that this has happened to me!\" but rather, \"What good fortune to bear this nobly, uncrushed by the present and unafraid of the future!\""
            ),
            (
                "Realiza cada acción de tu vida como si fuera la última, lejos de toda ligereza, de toda hipocresía y de toda queja contra tu destino.",
                "Perform every act of your life as though it were your last, free from all carelessness, hypocrisy, and complaint against your lot."
            ),
            (
                "Aunque hubieras de vivir tres mil años, recuerda que nadie pierde otra vida que la que vive ahora, ni vive otra que la que pierde.",
                "Even if you were to live three thousand years, remember that no one loses any other life than the one they are living now, nor lives any other than the one they lose."
            ),
            (
                "El presente es igual para todos, y es el único instante que está en nuestras manos embellecer con justicia y bondad.",
                "The present moment is the same for all, and it is the only instant in our hands to adorn with justice and kindness."
            ),
            (
                "La mejor manera de defenderte de quien obra mal es no asemejarte a él.",
                "The best way to avenge yourself on one who does wrong is not to become like him."
            ),
            (
                "Sé como la fuente de agua clara: aunque un caminante arroje barro en ella, la fuente no deja de manar hasta volver a quedar limpia y transparente.",
                "Be like a clear spring of water: even if a passerby casts mud into it, the spring never ceases flowing until it runs pure and transparent once more."
            ),
            (
                "No pierdas más tiempo discutiendo cómo debe ser un hombre bueno; sé uno desde hoy mismo.",
                "Waste no more time arguing about what a good person should be; be one starting today."
            ),
            (
                "Todo lo que está en armonía contigo, oh universo, está en armonía conmigo; nada es para mí temprano ni tardío si llega a su tiempo para ti.",
                "Whatever is in harmony with you, O Universe, is in harmony with me; nothing is too early or too late for me that comes in due season for you."
            ),
        ],
    },
]


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    texts_dir = root / "texts"
    translations_dir = root / "translations"
    texts_dir.mkdir(exist_ok=True)
    translations_dir.mkdir(exist_ok=True)

    library_path = root / "library.json"
    library = json.loads(library_path.read_text(encoding="utf-8"))
    existing_ids = {item["id"] for item in READINGS_LIST(NEW_READINGS)}
    library = [item for item in library if item.get("id") not in existing_ids]

    new_entries = []
    for reading in NEW_READINGS:
        es_sentences = [s[0] for s in reading["sentences"]]
        en_sentences = [s[1] for s in reading["sentences"]]

        # Group into 4-sentence paragraphs for clean visual reading
        paragraphs = []
        for i in range(0, len(es_sentences), 4):
            paragraphs.append(" ".join(es_sentences[i : i + 4]))
        body = "\n\n".join(paragraphs)
        full_text = f"{reading['title']}\n{reading['author']}\n\n{body}\n"

        text_path = texts_dir / f"{reading['stem']}.txt"
        text_path.write_text(full_text, encoding="utf-8")

        # Build exact 4-sentence reader blocks as ReaderText.tsx and translate_catalog_google.py do
        blocks_4 = build_reader_blocks(body, 4)
        source_hash = hashlib.sha256("\n\0\n".join(blocks_4).encode("utf-8")).hexdigest()

        translation_blocks = []
        for idx, block_src in enumerate(blocks_4):
            en_group = " ".join(en_sentences[idx * 4 : (idx + 1) * 4])
            translation_blocks.append({
                "source": block_src,
                "translation": en_group,
            })

        # Also include 1-sentence blocks so english-below layout has 100% exact sentence matches
        blocks_1 = build_reader_blocks(body, 1)
        for idx, sent_src in enumerate(blocks_1):
            if idx < len(en_sentences):
                translation_blocks.append({
                    "source": sent_src,
                    "translation": en_sentences[idx],
                })

        trans_payload = {
            "version": 1,
            "trackId": reading["id"],
            "sourceHash": source_hash,
            "provider": "curated-bilingual-edition",
            "sourceLanguage": "es",
            "targetLanguage": "en",
            "translatedAt": datetime.now(timezone.utc).isoformat(),
            "characters": sum(map(len, blocks_4)),
            "blocks": translation_blocks,
        }
        trans_path = translations_dir / f"{reading['id']}.en.json"
        trans_path.write_text(json.dumps(trans_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        word_count = len(tokenize_text(body))
        minutes = max(1, round(word_count / 170))

        entry = {
            "id": reading["id"],
            "title": reading["title"],
            "author": reading["author"],
            "year": reading["year"],
            "difficulty": reading["difficulty"],
            "difficultyNote": reading["difficultyNote"],
            "genre": reading["genre"],
            "tags": reading["tags"],
            "description": reading["description"],
            "collection": reading["collection"],
            "source": reading["source"],
            "rights": reading["rights"],
            "cover": f"covers/{reading['stem']}.webp",
            "text": f"texts/{reading['stem']}.txt",
            "wordCount": word_count,
            "minutes": minutes,
            "englishTranslation": f"translations/{reading['id']}.en.json",
        }
        if "originalLanguage" in reading:
            entry["originalLanguage"] = reading["originalLanguage"]
        new_entries.append(entry)
        print(f"Created {reading['id']} ({reading['difficulty']}): {word_count} words, {len(blocks_4)} blocks")

    library.extend(new_entries)
    library_path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated library.json with {len(new_entries)} readings (total: {len(library)}).")


def READINGS_LIST(items):
    return items


if __name__ == "__main__":
    main()
