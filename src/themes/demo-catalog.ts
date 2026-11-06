/**
 * Catálogo de ejemplo de cada tienda demo (una por plantilla). Lo usa
 * scripts/seed-demos.mjs. `query` es la búsqueda de fotos en Pexels (en
 * inglés da mejores resultados). Precios en pesos; el script los pasa a centavos.
 */
export type DemoProduct = [name: string, price: number, category: number, description: string, compareAt?: number];

export type DemoCatalog = {
  brand: string;
  tagline: string;
  /** Fotos de ambiente para portada, historias y galerías. */
  scene: string;
  categories: { name: string; query: string }[];
  products: DemoProduct[];
};

export const DEMO_CATALOG: Record<string, DemoCatalog> = {
  plantas: {
    brand: "Verde Vivo", tagline: "Plantas que se quedan contigo.", scene: "houseplants",
    categories: [{ name: "Interior", query: "monstera plant pot" }, { name: "Suculentas", query: "succulent pot" }, { name: "Macetas", query: "terracotta pot" }],
    products: [
      ["Monstera deliciosa", 549, 0, "Hojas grandes y abiertas. Luz indirecta, riego semanal."], ["Pothos dorado", 289, 0, "La más fácil de cuidar; crece colgante."],
      ["Ficus lyrata", 899, 0, "Hoja de violín para esquinas luminosas.", 1099], ["Sansevieria", 349, 0, "Aguanta poca luz y olvidos de riego."],
      ["Trío de suculentas", 259, 1, "Tres suculentas en macetas de barro."], ["Echeveria rosa", 149, 1, "Roseta compacta, ideal para escritorio."],
      ["Maceta de barro 20 cm", 199, 2, "Hecha a mano con plato incluido."], ["Maceta esmaltada blanca", 329, 2, "Con orificio de drenaje."],
    ],
  },
  imprenta: {
    brand: "Imprenta Norte", tagline: "Impresión rápida, precios claros.", scene: "print shop",
    categories: [{ name: "Tarjetas", query: "business cards" }, { name: "Gran formato", query: "large format printing banner" }, { name: "Papelería", query: "stationery letterhead" }, { name: "Sellos", query: "rubber stamp" }],
    products: [
      ["Tarjetas mate 9×5 cm (100)", 290, 0, "Couché 300 g, impresión a color por ambos lados."], ["Tarjetas con barniz (100)", 450, 0, "Barniz a registro para resaltar tu logo."],
      ["Lona front 13 oz (m²)", 180, 1, "Con ojillos y dobladillo."], ["Vinil adhesivo (m²)", 260, 1, "Para vidrios y vehículos.", 300],
      ["Volante media carta (500)", 690, 2, "Couché 130 g, una cara."], ["Hoja membretada (500)", 980, 2, "Bond 90 g tamaño carta."],
      ["Folder tamaño carta (100)", 1450, 2, "Sulfatada 14 pts con bolsa interior."], ["Sello autoentintable", 320, 3, "Placa de 38 × 14 mm."],
    ],
  },
  panaderia: {
    brand: "La Dona Dorada", tagline: "Recién horneado, cada mañana.", scene: "bakery pastries",
    categories: [{ name: "Donas", query: "glazed donuts" }, { name: "Pan dulce", query: "pastry bakery" }, { name: "Pasteles", query: "cake slice" }, { name: "Café", query: "coffee cup latte" }],
    products: [
      ["Dona glaseada", 22, 0, "Masa suave y glaseado de vainilla."], ["Caja de 12 donas", 240, 0, "Surtido de la casa.", 264], ["Dona de chocolate", 26, 0, "Cubierta de chocolate amargo."],
      ["Concha de vainilla", 18, 1, "La de siempre, recién salida."], ["Rol de canela", 35, 1, "Con glaseado de queso crema."],
      ["Pastel de tres leches", 380, 2, "Para 12 personas."], ["Café americano", 32, 3, "Grano de Veracruz."], ["Latte", 48, 3, "Con leche entera o de avena."],
    ],
  },
  arte: {
    brand: "Óxido", tagline: "Obra original con certificado.", scene: "art studio painting",
    categories: [{ name: "Pintura", query: "abstract oil painting" }, { name: "Gráfica", query: "art print framed" }, { name: "Joyería", query: "handmade silver jewelry" }],
    products: [
      ["Marea baja, VII", 18500, 0, "Óleo sobre lino, 120 × 150 cm. Pieza única."], ["Bruma", 12400, 0, "Óleo sobre lino, 90 × 120 cm."], ["Sal", 9800, 0, "Óleo sobre tela, 80 × 100 cm."],
      ["Litoral (grabado)", 2400, 1, "Edición de 30, firmado y numerado."], ["Mareas (serigrafía)", 1800, 1, "Edición de 50."],
      ["Anillo Costa", 1650, 2, "Plata .925 hecha a mano."], ["Collar Óxido", 2300, 2, "Plata oxidada con baño de oro."],
    ],
  },
  fotolibros: {
    brand: "Momentos", tagline: "Tus fotos merecen salir del celular.", scene: "photo album",
    categories: [{ name: "Fotolibros", query: "photo book" }, { name: "Impresiones", query: "polaroid photos" }, { name: "Calendarios", query: "wall calendar photos" }],
    products: [
      ["Fotolibro 20 × 20 cm", 690, 0, "24 páginas, portada rígida."], ["Fotolibro 30 × 30 cm", 1190, 0, "40 páginas, portada de tela.", 1390], ["Álbum de boda", 2490, 0, "60 páginas, papel fotográfico."],
      ["Impresiones tipo polaroid (24)", 249, 1, "Papel mate con marco blanco."], ["Impresiones 10 × 15 (50)", 290, 1, "Brillante o mate."],
      ["Calendario de pared", 390, 2, "12 meses con tus fotos."], ["Calendario de escritorio", 290, 2, "Base de madera incluida."],
    ],
  },
  streetwear: {
    brand: "KAOS/MX", tagline: "Hecho en la calle. Edición limitada.", scene: "streetwear",
    categories: [{ name: "Sneakers", query: "sneakers" }, { name: "Playeras", query: "oversized t-shirt streetwear" }, { name: "Sudaderas", query: "hoodie streetwear" }],
    products: [
      ["Runner Ácido", 2890, 0, "Drop 07. Suela de espuma y malla transpirable."], ["Low Concreto", 2490, 0, "Piel gris con costuras contrastantes.", 2790], ["High Noche", 3190, 0, "Bota alta en negro total."],
      ["Playera Kaos oversize", 690, 1, "Algodón pesado de 240 g."], ["Playera Drop 07", 750, 1, "Estampado frontal y en espalda."],
      ["Sudadera con capucha", 1290, 2, "Felpa perchada por dentro."], ["Sudadera crewneck", 1150, 2, "Bordado en el pecho."],
    ],
  },
  mascotas: {
    brand: "Huella", tagline: "Todo lo que tu mascota ama.", scene: "happy dog",
    categories: [{ name: "Perro", query: "dog toy" }, { name: "Gato", query: "cat toy" }, { name: "Comida", query: "pet food bowl" }],
    products: [
      ["Pelota que rebota", 149, 0, "Hule natural, flota en el agua."], ["Correa reflejante", 299, 0, "Para paseos de noche."], ["Cama ortopédica", 1290, 0, "Espuma viscoelástica, funda lavable.", 1490],
      ["Rascador torre", 890, 1, "Tres niveles con cuerda de sisal."], ["Varita con plumas", 129, 1, "Para jugar juntos."],
      ["Croqueta adulto 10 kg", 1190, 2, "Pollo y arroz, sin colorantes."], ["Premios de pollo", 189, 2, "Deshidratados, un solo ingrediente."],
    ],
  },
  fitness: {
    brand: "Pulso", tagline: "Entrena más. Recupera mejor.", scene: "gym workout",
    categories: [{ name: "Proteínas", query: "protein powder" }, { name: "Pre-entreno", query: "supplement shaker gym" }, { name: "Accesorios", query: "dumbbells gym equipment" }],
    products: [
      ["Proteína whey chocolate 2 lb", 790, 0, "24 g de proteína por porción."], ["Proteína vegana vainilla", 890, 0, "Chícharo y arroz, sin lácteos."], ["Creatina monohidratada 300 g", 590, 1, "Micronizada, sin sabor.", 690],
      ["Pre-entreno frutos rojos", 690, 1, "Cafeína y beta-alanina."], ["Electrolitos limón (20)", 290, 1, "Sin azúcar."],
      ["Shaker 700 ml", 199, 2, "Con compartimento para polvo."], ["Bandas de resistencia", 349, 2, "Juego de 5 niveles."],
    ],
  },
  flores: {
    brand: "Pétalo", tagline: "Dilo con flores frescas.", scene: "flower bouquet",
    categories: [{ name: "Ramos", query: "flower bouquet" }, { name: "Arreglos", query: "flower arrangement vase" }, { name: "Plantas", query: "orchid pot" }],
    products: [
      ["Ramo de rosas rojas", 890, 0, "12 rosas con follaje de temporada."], ["Ramo pastel", 750, 0, "Rosas, claveles y lisianthus."], ["Ramo de girasoles", 690, 0, "Seis girasoles envueltos en papel kraft.", 790],
      ["Arreglo en florero", 1190, 1, "Florero de vidrio incluido."], ["Caja de rosas", 1490, 1, "24 rosas en caja redonda."],
      ["Orquídea blanca", 690, 2, "Dos varas en maceta de cerámica."],
    ],
  },
  vinos: {
    brand: "Cava Nocturna", tagline: "Vinos de pequeños productores.", scene: "wine cellar",
    categories: [{ name: "Tintos", query: "red wine bottle" }, { name: "Blancos", query: "white wine glass" }, { name: "Mezcal", query: "mezcal bottle" }],
    products: [
      ["Tinto Valle de Guadalupe", 690, 0, "Nebbiolo y tempranillo. Frutos negros y especias."], ["Gran reserva", 1290, 0, "18 meses en barrica de roble.", 1490], ["Malbec joven", 420, 0, "Fresco y frutal."],
      ["Blanco sauvignon", 450, 1, "Cítrico, ideal con mariscos."], ["Rosado de garnacha", 390, 1, "Para la tarde."],
      ["Mezcal espadín joven", 850, 2, "Oaxaca, 45% alc."], ["Mezcal tobalá", 1650, 2, "Agave silvestre, producción limitada."],
    ],
  },
  tecnologia: {
    brand: "Circuito", tagline: "Tecnología original con garantía.", scene: "headphones",
    categories: [{ name: "Audio", query: "wireless headphones" }, { name: "Accesorios", query: "phone charger cable" }, { name: "Smart home", query: "smart speaker" }],
    products: [
      ["Audífonos con cancelación de ruido", 2890, 0, "40 horas de batería y carga rápida.", 3290], ["Audífonos inalámbricos", 1290, 0, "Estuche de carga y resistencia al agua."], ["Bocina portátil", 990, 0, "Sonido 360° y 12 horas de batería."],
      ["Cargador rápido 30 W", 449, 1, "USB-C, compatible con la mayoría de celulares."], ["Power bank 10,000 mAh", 590, 1, "Dos puertos y carga inalámbrica."],
      ["Bocina inteligente", 1190, 2, "Control por voz en español."], ["Foco inteligente", 249, 2, "Millones de colores desde tu celular."],
    ],
  },
  juguetes: {
    brand: "Recreo", tagline: "¡A jugar!", scene: "toys",
    categories: [{ name: "Bebés", query: "baby wooden toy" }, { name: "Construcción", query: "wooden building blocks" }, { name: "Juegos de mesa", query: "board game family" }],
    products: [
      ["Sonaja de madera", 189, 0, "Madera de haya, pintura no tóxica."], ["Gimnasio para bebé", 990, 0, "Con cinco juguetes colgantes.", 1190],
      ["Bloques de madera (50)", 590, 1, "Formas y colores para construir."], ["Torre de equilibrio", 349, 1, "Juego de destreza para toda la familia."],
      ["Memorama de animales", 249, 2, "48 tarjetas de cartón grueso."], ["Lotería ilustrada", 299, 2, "Edición con ilustraciones nuevas."],
    ],
  },
  muebles: {
    brand: "Nido", tagline: "Espacios que se sienten como casa.", scene: "living room interior",
    categories: [{ name: "Sala", query: "armchair interior" }, { name: "Comedor", query: "wooden dining table" }, { name: "Decoración", query: "ceramic vase decor" }],
    products: [
      ["Sillón lounge de nogal", 12900, 0, "Madera maciza y tapiz de lino.", 14500], ["Mesa de centro redonda", 5900, 0, "Encino natural, 80 cm."], ["Lámpara de pie", 3400, 0, "Pantalla de lino y base de latón."],
      ["Mesa de comedor 6 personas", 18900, 1, "Parota maciza con acabado aceitado."], ["Silla de comedor tejida", 2900, 1, "Asiento de palma natural."],
      ["Jarrón de cerámica", 890, 2, "Hecho a mano, cada pieza es distinta."], ["Cojín de lino", 590, 2, "Funda con cierre oculto."],
    ],
  },
  skincare: {
    brand: "Botica", tagline: "Menos pasos, mejor piel.", scene: "skincare",
    categories: [{ name: "Limpiadores", query: "facial cleanser bottle" }, { name: "Sueros", query: "serum dropper bottle" }, { name: "Hidratantes", query: "face cream jar" }],
    products: [
      ["Limpiador en gel", 390, 0, "Para piel mixta a grasa."], ["Bálsamo desmaquillante", 450, 0, "Se convierte en aceite y se enjuaga fácil."],
      ["Suero de niacinamida", 520, 1, "Unifica el tono y controla el brillo."], ["Suero de ácido hialurónico", 560, 1, "Hidratación ligera para todo el día.", 640],
      ["Crema hidratante", 490, 2, "Con centella asiática, sin fragancia."], ["Protector solar FPS 50", 430, 2, "Toque seco, sin residuo blanco."],
    ],
  },
  vinilos: {
    brand: "Surco", tagline: "Ponle play a lo raro.", scene: "vinyl records",
    categories: [{ name: "Vinilos", query: "vinyl record" }, { name: "Libros", query: "music books stack" }, { name: "Tornamesas", query: "turntable record player" }],
    products: [
      ["Cumbia rebajada (LP)", 690, 0, "Edición de 500 copias, vinil de color."], ["Jazz mexicano 1970 (LP)", 890, 0, "Reedición remasterizada."], ["Post-punk local (EP)", 420, 0, "Siete pulgadas."],
      ["Ambient para leer (LP)", 750, 0, "Doble vinil con libreto."], ["Fanzine de la escena", 120, 1, "Número 12, risografía a dos tintas."], ["Libro: historia del son", 480, 1, "320 páginas ilustradas."],
      ["Tornamesa de banda", 5900, 2, "Con preamplificador integrado.", 6500],
    ],
  },
  restaurante: {
    brand: "Antojo", tagline: "Se te antojó, te llega.", scene: "tacos",
    categories: [{ name: "Tacos", query: "tacos" }, { name: "Platos fuertes", query: "mexican dish plate" }, { name: "Bebidas", query: "agua fresca drink" }],
    products: [
      ["Orden de tacos al pastor", 95, 0, "Cinco tacos con piña, cebolla y cilantro."], ["Orden de tacos de birria", 120, 0, "Con consomé para remojar."], ["Gringa", 85, 0, "Tortilla de harina, queso y pastor."],
      ["Enchiladas suizas", 145, 1, "Pollo, salsa verde cremosa y queso gratinado."], ["Chilaquiles con arrachera", 175, 1, "Rojos o verdes, con frijoles."],
      ["Agua de horchata 1 L", 45, 2, "Hecha en casa."], ["Agua de jamaica 1 L", 45, 2, "Poco dulce."],
    ],
  },
  outdoor: {
    brand: "Ruta", tagline: "Más lejos, más ligero.", scene: "mountain hiking",
    categories: [{ name: "Campismo", query: "camping tent" }, { name: "Mochilas", query: "hiking backpack" }, { name: "Ropa", query: "outdoor jacket hiking" }],
    products: [
      ["Tienda de campaña 2 personas", 3490, 0, "1.9 kg, doble pared, columna de agua 3000 mm.", 3990], ["Bolsa de dormir 0 °C", 1890, 0, "Relleno sintético, compresible."], ["Estufa compacta", 790, 0, "Encendido piezoeléctrico."],
      ["Mochila 40 L", 2290, 1, "Espalda ventilada y cubierta para lluvia."], ["Mochila de día 20 L", 1190, 1, "Con hidratación compatible."],
      ["Chamarra impermeable", 2490, 2, "Costuras selladas y capucha ajustable."], ["Playera térmica", 690, 2, "Merino, no guarda olor."],
    ],
  },
};
