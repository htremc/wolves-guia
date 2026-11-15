/* ════════════════════════════════════════════════════════════════════════════
   GUÍA DE VENTAS · Wolves of WEBstreet × COMPOUND
   Script clásico (sin import/export). Contrato con la app:
     window.WolvesGuia = { montar(el, opts), actualizar(opts) }
     opts = { capitulos:[8 ids], leidos:[ids], onLeido(id), condiciones:{titular, puntos[]}|null, logo, lobo }
   - CSS propio en <style id="wg-css">, todo bajo .wg.
   - three.js r128 (cdnjs) se inyecta al montar; sin él o sin WebGL, la moneda se pinta en canvas 2D.
   - Navegación interna por capítulos SIN tocar location.hash.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.WolvesGuia && window.WolvesGuia.__wg) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const FUENTES = [
    'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&display=swap',
    'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap',
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&display=swap',
  ];
  const F_CANVAS = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif';
  const CAPS_DEF = ['c-vendemos', 'c-llamada', 'c-ganchos', 'c-objeciones', 'c-mejores', 'c-rojas', 'c-cobras', 'c-pruebas'];
  const CAP = {
    'c-vendemos': { corto: 'Qué vendemos', titulo: 'Qué vendemos y a quién', min: 3 },
    'c-llamada': { corto: 'La llamada', titulo: 'La llamada perfecta, paso a paso', min: 6 },
    'c-ganchos': { corto: 'Ganchos', titulo: 'Ganchos que funcionan', min: 4 },
    'c-objeciones': { corto: 'Objeciones', titulo: 'Las 17 objeciones', min: 8 },
    'c-mejores': { corto: 'Los mejores', titulo: 'Lo que hacen los mejores', min: 5 },
    'c-rojas': { corto: 'Líneas rojas', titulo: 'Líneas rojas', min: 3 },
    'c-cobras': { corto: 'Cómo cobras', titulo: 'Cómo cobras', min: 3 },
    'c-pruebas': { corto: 'Las pruebas', titulo: 'Las pruebas: cómo se entra', min: 4 },
  };

  // ── utilidades ────────────────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const rm = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = (n, d) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');
  const fmtPct = p => (Math.abs(p - Math.round(p)) < 1e-9 ? String(Math.round(p)) : dec(p, 1));
  const eur = n => miles(n) + ' €';
  const barajar = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t; } return x; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutCubic = k => 1 - Math.pow(1 - k, 3);
  const easeOutBack = k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  function pctDe(c) {
    const m = String((c && c.titular) || '').match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
    const v = m ? parseFloat(m[1].replace(',', '.')) : NaN;
    return v > 0 && v <= 100 ? v : 50;
  }

  // ════════════════════════════════════════════════════════════════════════
  // CONTENIDO
  // ════════════════════════════════════════════════════════════════════════

  // Salida correcta de cada objeción: copia literal de SALIDAS de la app (lo que corrige el examen).
  const SALIDAS = [
    'Respetar que está con un cliente y dejar una hora concreta para volver a llamar (o, si da pie, ir al grano en 20 segundos).',
    'Sin cifra y sin esquivarlo: explicar en una frase que depende de lo que necesite y que se lo enseñamos con la web delante, y proponer dos días.',
    'Darle la razón en lo que tiene de cierto (muchas no sirven), diferenciarnos (equipo profesional, proveedor tecnológico de Meta), preguntarle si no le gustaría tener más clientes y llevar a la reunión.',
    'Reconocer lo que ya hace bien, explicar que quien le busca en Google no ve su Instagram, preguntarle si no le gustaría tener más clientes y llevar a la reunión.',
    'Celebrarlo, hacerle ver el tiempo que pierde gestionando a mano (citas, mensajes, recordatorios) y ofrecer, además de la web, un sistema con IA que lo gestione solo; 5 minutos con dos días.',
    'Aceptar el WhatsApp pero sin quedarse en «te mando info»: mejor que un folleto es enseñarle en 5 minutos la web que le estamos haciendo, con día y hora.',
    'Dar la razón a su desconfianza sin criticar a nadie, transparencia (no se paga nada por adelantado, primero la ve), decir quién llama y que somos proveedor tecnológico de Meta, y proponer dos días.',
    'Responder claro y sin rodeos (de su ficha pública de Google Maps), ofrecer no volver a llamar si lo prefiere y volver al motivo concreto.',
    'Incluir al socio en la reunión y pedir una hora que les venga bien a los dos.',
    'Respeto, pero comparación con seguridad: posicionamiento, calidad y resultados de un equipo profesional, proveedor tecnológico de Meta (lo barato sale caro); ofrecer compararla en 5 minutos. Si de verdad le funciona, despedirse con simpatía.',
    'Reconocer que puede; hacerle ver el tiempo que le quita y la diferencia en posicionamiento, calidad y resultados de un equipo profesional, proveedor tecnológico de Meta (lo barato sale caro); 5 minutos para compararla.',
    'Darle la razón; el amigo al que le recomiendan su negocio le busca en Google antes de ir; preguntarle si no le gustaría tener más clientes y llevar a la reunión.',
    'No es una objeción real: dar la razón y UNA sola pregunta sobre lo que gana (¿no le gustaría tener más clientes, ganar más y que le conozca más gente?); si repite el no, despedirse con simpatía. Aquí NO hace falta pedir hora.',
    'Respetarlo al momento, disculparse y no vender nada: un 10 si lo hace. Si insiste, línea roja grave.',
    'No venderle a quien no decide: pedir con educación el nombre del dueño, a qué hora está y su número, o dejarle el tuyo para que te llame.',
    'Dar la razón, bajar el compromiso (5 minutos, a la hora que menos le estorbe) y proponer una hora concreta.',
    'Respetar al colega, pero comparar con seguridad: posicionamiento, calidad y resultados de un equipo profesional, proveedor tecnológico de Meta (lo barato sale caro); ofrecer compararla en 5 minutos.',
  ];

  // Las 17 objeciones (mismo orden que OBJECIONES de la app).
  const OBJ = [
    { o: 'Ahora no puedo, estoy con un cliente.', tag: 'Reflejo',
      verdad: 'Puede ser verdad (está trabajando) o un reflejo para quitarte de encima. En los dos casos, no luches contra su tiempo: llévate una hora para volver.',
      di: '«Claro, te dejo trabajar. Es sobre la web que os estamos preparando con vuestras reseñas: ¿te llamo mañana a las 10 o a las 5?»',
      extra: 'Si te da pie: «Te robo 20 segundos y te dejo trabajar», y vas al grano.',
      bien: 'Respetas su tiempo y te llevas una hora concreta para volver a llamar.',
      mal: [['«Es solo un minuto, de verdad. Mira, hacemos webs para negocios como el tuyo y…»', 'No respetas su tiempo y le sueltas el rollo: se cierra en banda.'],
        ['«Vale, perdona. Ya te llamo otro día.»', 'Respetas, pero sin hora: «otro día» es nunca.']] },
    { o: '¿Y esto cuánto cuesta?', tag: 'Situación',
      verdad: '¡Es una señal de interés! Nadie pregunta el precio de lo que no le importa. Ni le das una cifra a ciegas ni lo esquivas.',
      di: '«Buena pregunta. Depende de lo que necesitéis, y por eso no te doy un número a ciegas: te lo explicamos en 5 minutos con la web delante, y si no te encaja, lo dejamos ahí. ¿Te viene mejor el lunes o el martes?»',
      bien: 'Explicas en una frase por qué no hay cifra, sin esquivarlo, y lo llevas a la reunión con dos días.',
      mal: [['«Son unos 500 € y luego una cuota al mes.»', 'Das una cifra por teléfono: error serio (la nota no pasa de 6). Sin ver la web, cualquier número le suena caro.'],
        ['«Eso ya lo verás, tranquilo. ¿Mañana a las 11?»', 'Lo esquivas sin explicar por qué: suena a que escondes algo y se enfría.']] },
    { o: 'Las webs son carísimas y luego no sirven para nada.', tag: 'Situación',
      verdad: 'Un prejuicio o una mala experiencia. Y tiene parte de razón: muchas webs están hechas deprisa y nadie las encuentra.',
      di: '«Tienes razón, muchas no sirven: las hacen deprisa y nadie las encuentra. La vuestra la hace un equipo profesional, proveedor tecnológico de Meta. Y dime una cosa: ¿a ti no te gustaría tener más clientes y que os conozca más gente? Te la enseñamos en 5 minutos y la juzgas tú.»',
      bien: 'Le das la razón en lo que tiene de cierto, te diferencias con seguridad y le preguntas por lo que gana él.',
      mal: [['«Qué va, eso no es así. Las nuestras funcionan, te lo garantizo.»', 'Le llevas la contraria y garantizas resultados: eso es línea roja.'],
        ['«Por eso la nuestra te va a salir gratis.»', 'Decir que la web es gratis es línea roja grave (la nota no pasa de 3). «Verla no te cuesta nada» o «sin compromiso» sí valen.']] },
    { o: 'Yo ya tengo Instagram y me va bien.', tag: 'Ya tengo',
      verdad: 'Orgullo de algo que hace bien. No le lleves la contraria: la web suma, no sustituye.',
      di: '«Y se nota, lo tenéis muy bien. Pero quien busca «barbería en Carabanchel» en Google no ve Instagram: ve fichas y webs. ¿A ti no te gustaría que también te encontrara esa gente, y tener más clientes? Te la enseñamos en 5 minutos.»',
      bien: 'Reconoces lo que hace bien, explicas la diferencia en una frase y le preguntas por lo que gana.',
      mal: [['«Ya, pero Instagram no es serio. Hoy un negocio sin web no es nada.»', 'Desprecias lo que hace bien: se pone a la defensiva.'],
        ['«Vale, pues si te va bien con Instagram, no te molesto más.»', 'Te rindes al primer reflejo. Antes de despedirte, cabe una pregunta.']] },
    { o: 'No me hace falta: tenemos clientes de sobra, no damos abasto.', tag: 'Ya tengo',
      verdad: 'Una buena noticia que usa de escudo. Si no da abasto, lo que le hace falta no son más clientes: es quitarse trabajo de encima. Ahí entra la IA.',
      di: '«¡Qué bien que tengáis tantos clientes! Pero entonces, ahora mismo todo eso lo gestionáis vosotros a mano, ¿no? Citas, mensajes, recordatorios… Son un montón de horas. Además de la web, montamos sistemas con IA que lo gestionan solos, y vosotros a lo vuestro. Te lo enseñamos en 5 minutos: ¿lunes o martes?»',
      bien: 'Lo celebras, le haces ver las horas que pierde gestionando a mano y le ofreces quitárselas con IA, además de la web.',
      mal: [['«Con la web vas a facturar el doble, te lo aseguro.»', 'Prometes un resultado concreto: error serio (la nota no pasa de 5).'],
        ['«Pues entonces no te molesto más.»', 'Te rindes: justo quien no da abasto es quien más horas puede ahorrarse.']] },
    { o: 'Mándame información por WhatsApp y ya lo miro.', tag: 'Reflejo',
      verdad: 'Casi siempre es una forma educada de colgar. Un folleto no se lee; una web hecha con sus fotos, sí se mira.',
      di: '«Claro, te escribo por WhatsApp. Pero mejor que un folleto: te enseñamos en 5 minutos la web que os estamos haciendo. ¿Te viene mejor el lunes o el martes? Y te mando el enlace.»',
      bien: 'Aceptas el WhatsApp sin quedarte en «te mando info»: lo conviertes en reunión con día y hora.',
      mal: [['«¡Perfecto! Te mando un PDF con todo y ya me dices.»', 'Sin hora, el PDF se pierde en su móvil y el «ya me dices» no llega.'],
        ['«No, por WhatsApp no se puede, tiene que ser por videollamada.»', 'Le niegas lo que pide: suena a imposición.']] },
    { o: '¿Esto no será un timo? Ya me llamaron otros y me engañaron.', tag: 'Desconfianza',
      verdad: 'Desconfianza ganada a pulso: ya le quemaron. No va contra ti. Dale la razón y transparencia.',
      di: '«Te entiendo, y haces bien en preguntarlo. Soy Lucía, de COMPOUND: somos un equipo profesional y proveedor tecnológico de Meta. No pedimos nada por adelantado: primero la ves y, solo si te encaja, se habla de presupuesto. ¿Te la enseñamos el lunes o el martes?»',
      bien: 'Validas su desconfianza sin criticar a nadie, das transparencia, dices quién eres y propones dos días.',
      mal: [['«¿Un timo? Para nada, hombre, ¿cómo va a ser un timo?»', 'Te defiendes sin darle ni un motivo para confiar.'],
        ['«Esos serían unos piratas. Nosotros tenemos más de 200 clientes en Madrid.»', 'Criticas a otros y te inventas una cifra: inventar clientes o cifras es línea roja.']] },
    { o: '¿Y tú de dónde has sacado mi número?', tag: 'Reflejo',
      verdad: 'Una pregunta legítima. Se contesta claro y a la primera: mentir aquí es línea roja.',
      di: '«De vuestra ficha pública de Google Maps. Si prefieres que no te llamemos más, lo apunto ahora mismo. Te llamaba por algo concreto de vuestras reseñas.»',
      bien: 'Respondes claro, ofreces no volver a llamar y vuelves al motivo concreto.',
      mal: [['«Nos lo ha pasado un cliente tuyo que está muy contento contigo.»', 'Es mentira: mentir sobre de dónde tienes su número es línea roja grave.'],
        ['«Eso da igual, lo importante es lo que te quiero contar.»', 'Esquivas una pregunta legítima: la confianza se rompe ahí.']] },
    { o: 'Eso lo tengo que hablar con mi socio.', tag: 'Situación',
      verdad: 'Puede ser verdad o una excusa. En los dos casos la solución es la misma: que el socio esté en la reunión.',
      di: '«Claro, mejor que lo vea también. ¿Qué hora os viene bien a los dos esta semana? Son 5 minutos por videollamada.»',
      bien: 'Incluyes al socio y pides una hora que les venga bien a los dos.',
      mal: [['«Vale, pues háblalo y ya me dices algo.»', 'Sin hora: lo más probable es que no vuelvas a saber de él.'],
        ['«Seguro que a tu socio le parece bien. Decide tú y luego se lo cuentas.»', 'Presionas para que se salte a su socio: se nota y queda fatal.']] },
    { o: 'Ya tengo una web, me la hizo mi cuñado.', tag: 'Ya tengo',
      verdad: 'Lealtad familiar. No hace falta criticar al cuñado: basta con comparar. Una web hecha en casa no tiene el posicionamiento, la calidad ni los resultados de una profesional.',
      di: '«Seguro que la hizo con todo el cariño. Pero dime una cosa: ¿crees que tiene el mismo posicionamiento, la misma calidad y, sobre todo, los mismos resultados que una web hecha por un equipo profesional, proveedor tecnológico de Meta? Lo barato a veces sale caro. Te enseñamos la vuestra en 5 minutos y comparas tú.»',
      extra: 'Si de verdad le funciona, despídete con simpatía y anótalo.',
      bien: 'Respetas al cuñado, pero comparas con aplomo: posicionamiento, calidad y resultados. Y lo llevas a la reunión.',
      mal: [['«Ya me imagino… las webs hechas por un familiar suelen dar bastante pena.»', 'Insultas a su familia: llamada perdida.'],
        ['«Con la nuestra vas a salir el primero en Google; con la de tu cuñado, no.»', 'Prometer salir el primero en Google es línea roja grave.']] },
    { o: '¿Y por qué no me la hago yo con Wix?', tag: 'Ya tengo',
      verdad: 'Claro que puede. Pero no tiene tiempo: lleva un negocio. Y una plantilla hecha a ratos no compite con un equipo profesional.',
      di: '«Claro que puedes. Pero entre tu negocio y el día a día, ¿vas a sacar tiempo? Y una plantilla hecha a ratos no tiene el posicionamiento, la calidad ni los resultados de una web hecha por un equipo profesional, proveedor tecnológico de Meta. Lo barato sale caro. Te la enseñamos en 5 minutos y comparas: ¿lunes o martes?»',
      bien: 'Reconoces que puede, y le haces ver tiempo, posicionamiento y resultados de un equipo profesional.',
      mal: [['«Porque con Wix te va a quedar fatal, eso es de aficionados.»', 'Le dices que no sabe: se cierra.'],
        ['«Porque la nuestra te va a traer 30 clientes nuevos al mes.»', 'Prometes un resultado concreto (y te lo inventas): error serio.']] },
    { o: 'Mis clientes vienen por el boca a boca, no necesito más.', tag: 'Ya tengo',
      verdad: 'Está orgulloso, y con razón. Pero el boca a boca de hoy también pasa por Google.',
      di: '«Es lo mejor que se puede tener. Pero el amigo al que le recomiendan tu negocio te busca en Google antes de venir. ¿A ti no te gustaría que te encontrara, y tener más clientes? Te lo enseñamos en 5 minutos: ¿lunes o martes?»',
      bien: 'Le das la razón y le enseñas que el boca a boca también busca en Google.',
      mal: [['«El boca a boca está muerto, hoy todo es internet.»', 'Le contradices en lo que más orgullo le da.'],
        ['«Vale, no te molesto. ¡Que vaya bien!»', 'Te despides al primer reflejo: aquí cabía una pregunta.']] },
    { o: 'No me interesa, gracias.', tag: 'Reflejo',
      verdad: 'Un reflejo: todavía no sabe ni qué le ofreces. No es una objeción real.',
      di: '«Te entiendo. Solo una pregunta: ¿a ti no te gustaría tener más clientes, ganar más y que os conozca más gente?»',
      extra: 'Si repite el no: «¡Perfecto, gracias por tu tiempo y que vaya muy bien!». Aquí no hace falta pedir hora.',
      bien: 'Una sola pregunta que le hace pensar en lo que gana. Si repite el no, te despides con simpatía.',
      mal: [['«Espera, espera, que no te he contado lo mejor: te hacemos una web y…»', 'Ignoras su no y sueltas el rollo. Si sigues tras el segundo no, es presionar.'],
        ['«¿Por qué no te interesa? ¿Qué tienes en contra de las webs?»', 'Suena a interrogatorio y a reproche.']] },
    { o: 'No me llaméis más, por favor.', tag: 'No es no',
      verdad: 'Es un no definitivo. Se respeta al momento, sin excepciones.',
      di: '«Entendido, no volvemos a llamar. Perdona la molestia.»',
      extra: 'Y lo marcas en tu mesa para que nadie vuelva a llamar. Siempre.',
      bien: 'Lo respetas al momento y no vendes nada: esto es un 10.',
      mal: [['«Vale, pero antes déjame que te cuente una cosa rápida…»', 'Insistir después de «no me llaméis más» es línea roja (la nota no pasa de 2).'],
        ['«Entendido. ¿Y si te llamo dentro de un par de meses?»', 'Sigues insistiendo: «no me llaméis más» también vale para dentro de dos meses.']] },
    { o: 'El dueño no está, yo solo trabajo aquí.', tag: 'No decide',
      verdad: 'Hablas con quien no decide. No le vendas a él: consigue a quién llamar, cuándo y, si puedes, cómo.',
      di: '«Gracias. ¿Cómo se llama y a qué hora suele estar? Si te parece, pásame su número, o apúntale el mío y que me llame cuando pueda: es por la web de la barbería.»',
      extra: 'Apunta en tu mesa el nombre, la hora y el número, o que le dejaste el tuyo.',
      bien: 'No le vendes a quien no decide: te llevas su nombre, a qué hora está y su número, o le dejas el tuyo.',
      mal: [['«No pasa nada, te lo cuento a ti y se lo dices: os estamos haciendo una web que…»', 'Le vendes a quien no decide: el mensaje se pierde por el camino.'],
        ['«Vale, ya llamaré otro día.»', 'Te vas sin nombre, sin hora y sin teléfono: no sabrás ni a quién llamar.']] },
    { o: 'No tengo tiempo para reuniones.', tag: 'Situación',
      verdad: 'Miedo a perder una hora. Baja el compromiso: son 5 minutos, cuando menos le estorbe.',
      di: '«Lo entiendo, por eso son 5 minutos, a la hora que menos te estorbe, incluso antes de abrir. ¿Te encaja mañana a las 9:45, o el jueves a la misma hora?»',
      bien: 'Bajas el compromiso (5 minutos, a su hora) y propones una hora concreta.',
      mal: [['«Es una reunión de una hora, pero merece la pena, de verdad.»', 'Subes el compromiso en vez de bajarlo. Y son 5 minutos.'],
        ['«Pues buscamos un hueco cuando puedas, tú me dices.»', 'Sin hora concreta, el «tú me dices» no llega nunca.']] },
    { o: 'Me la va a hacer un colega, que sabe de esto.', tag: 'Ya tengo',
      verdad: 'Como lo del cuñado: confianza en alguien cercano. Compara sin criticar: un colega que «sabe de esto» no es un equipo profesional.',
      di: '«¡Qué bien tener a alguien así! Pero dime una cosa: ¿crees que va a tener el mismo posicionamiento, la misma calidad y los mismos resultados que una web hecha por un equipo profesional, proveedor tecnológico de Meta? Lo barato a veces sale caro. Te enseñamos la vuestra en 5 minutos y comparas tú: ¿lunes o martes?»',
      bien: 'Respetas al colega y comparas con seguridad: posicionamiento, calidad y resultados. Y lo llevas a la reunión.',
      mal: [['«Los colegas siempre lo hacen mal, no te fíes.»', 'Criticas a su amigo: se pone de su lado, no del tuyo.'],
        ['«Vale, pues que te la haga él.»', 'Te rindes al primer reflejo: cabía la comparación.']] },
  ];

  // Negocios de muestra para la fábrica de ganchos (los mismos de las llamadas de práctica).
  const NEGS = [
    { id: 'barberia', neg: 'Barbería Nájera', de: 'de la Barbería Nájera', oficio: 'barbería', pl: 'barberías', barrio: 'Carabanchel', r: 212, s: '4,8', duenyo: 'Rubén', g: 'o', tu: 'barbería', cita: 'Kamal corta el pelo y la barba genial' },
    { id: 'estetica', neg: 'Centro de Estética Lirio', de: 'del Centro de Estética Lirio', oficio: 'centro de estética', pl: 'centros de estética', barrio: 'Hortaleza', r: 167, s: '4,9', duenyo: 'Marisa', g: 'a', tu: 'centro', cita: 'Marisa tiene unas manos de oro, salgo nueva' },
    { id: 'taller', neg: 'Taller Hermanos Ortega', de: 'del Taller Hermanos Ortega', oficio: 'taller', pl: 'talleres', barrio: 'Leganés', r: 304, s: '4,6', duenyo: 'Javi', g: 'o', tu: 'taller', cita: 'Honrados: me dijeron que no hacía falta cambiar la pieza' },
    { id: 'fisio', neg: 'Fisioterapia Alameda', de: 'de Fisioterapia Alameda', oficio: 'fisio', pl: 'fisios', barrio: 'Chamberí', r: 143, s: '4,9', duenyo: 'Laura', g: 'a', tu: 'clínica', cita: 'Laura te lo explica todo y se nota que sabe' },
    { id: 'cerrajero', neg: 'Cerrajería Rápida Moratalaz', de: 'de Cerrajería Rápida Moratalaz', oficio: 'cerrajero', pl: 'cerrajeros', barrio: 'Moratalaz', r: 98, s: '4,7', duenyo: 'Paco', g: 'o', tu: 'cerrajería', cita: 'Vino en veinte minutos un domingo por la noche' },
    { id: 'unas', neg: 'Mila Nails', de: 'de Mila Nails', oficio: 'uñas', pl: 'salones de uñas', barrio: 'Tetuán', r: 89, s: '4,7', duenyo: 'Mila', g: 'a', tu: 'salón', cita: 'Las uñas me duran perfectas tres semanas' },
    { id: 'canina', neg: 'Peluquería Canina Bigotes', de: 'de la Peluquería Canina Bigotes', oficio: 'peluquería canina', pl: 'peluquerías caninas', barrio: 'Getafe', r: 131, s: '4,8', duenyo: 'Nuria', g: 'a', tu: 'peluquería', cita: 'Mi perro sale feliz y oliendo de maravilla' },
  ];
  const TIPOS = [
    { id: 'web', n: '¿No tenéis web?', cuando: 'El de Héctor y el que más recomendamos: no suena a venta y le hace hablar.' },
    { id: 'motivo', n: 'Motivo + permiso', cuando: 'El más seguro: sirve siempre.' },
    { id: 'pregunta', n: 'Pregunta', cuando: 'Para que piense en su problema desde el primer segundo.' },
    { id: 'humor', n: 'Humor', cuando: 'Rompe el «otro vendedor más». Con gracia, sin pasarte.' },
    { id: 'curiosidad', n: 'Curiosidad', cuando: 'Para dueños con prisa: una pregunta corta y rara.' },
    { id: 'resena', n: 'Su propia reseña', cuando: 'La más personal: demuestra que te has mirado su negocio.' },
  ];
  // m = marcar como dato de su ficha
  function gancho(tipo, n, m) {
    const El = n.g === 'a' ? 'La' : 'El';
    switch (tipo) {
      case 'web': return `Oye, estaba buscando ${m(n.pl + ' por ' + n.barrio)} y quería ver más ${m(n.de)}… pero no he encontrado ningún sitio donde ver vuestros servicios. ¿No tenéis página web?`;
      case 'motivo': return `¿${m(n.duenyo)}? Te llamo por una cosa concreta de tu ${n.tu}: tus ${m(n.r + ' reseñas')}… y que quien busca “${m(n.oficio + ' en ' + n.barrio)}” ${m('no os encuentra')}. ¿Me das 20 segundos y, si no te sirve, te dejo trabajar?`;
      case 'pregunta': return `¿${m(n.duenyo)}? ¿${El} ${m(n.de)}, con ${m(n.r + ' reseñas')} y un ${m(n.s)} en ${m(n.barrio)}? Con esas reseñas deberíais tener la agenda llena de gente nueva… y quien no os conoce ${m('no os encuentra')}. ¿Me das 30 segundos y te cuento por qué?`;
      case 'humor': return `Te prometo que no te llamo para cambiarte la luz ni para venderte una alarma. Te llamo por algo que he visto ${m(n.de)} en Google, y es bueno.`;
      case 'curiosidad': return `Una pregunta rápida: ¿sabes qué le sale a alguien que busca “${m(n.oficio + ' en ' + n.barrio)}” en Google? ${m('Vosotros no')}. Y tenéis ${m(n.r + ' reseñas')} con un ${m(n.s)}.`;
      default: return `Acabo de leer en vuestras reseñas que “${m(n.cita)}”… y he pensado: qué pena que quien no os conoce no pueda encontraros.`;
    }
  }

  const PASOS = [
    { t: 'Interésate por su negocio', corto: 'Gancho', ini: 0, fin: 15, reloj: '0:00 – 0:15',
      que: 'Sin presentarte ni decir la empresa, y sin sonar a venta. Le cuentas algo verdadero: has estado mirando negocios como el suyo por la zona y no encuentras su web. Y se lo preguntas.',
      ej: '«Hola, ¿qué tal? Oye, estaba buscando barberías por Carabanchel y quería ver más de la vuestra, que tenéis unas reseñas buenísimas… pero no he encontrado ningún sitio donde ver vuestros servicios. ¿No tenéis página web?»',
      no: '«Hola, soy X, de la empresa Y, ¿hablo con el dueño?» o «¿te pillo en mal momento?».' },
    { t: 'El porqué', corto: 'Porqué', ini: 15, fin: 40, reloj: '0:15 – 0:40',
      que: 'Le preguntas por qué no tiene web y escuchas de verdad: su respuesta te dice qué contarle. Casi siempre es una de las cinco de abajo.',
      ej: '«¿Y hay alguna razón por la que no tenéis? Por curiosidad.»',
      no: 'Saltarte la pregunta y soltar lo que vendes, o hacer tres preguntas seguidas.' },
    { t: 'Quién eres y lo que ya le estamos haciendo', corto: 'Quién eres', ini: 40, fin: 70, reloj: '0:40 – 1:10',
      que: 'Ahora sí: tu nombre, COMPOUND y lo que le estamos preparando (una web con sus fotos y sus reseñas), unido a la razón que te ha dado. Verla no le cuesta nada.',
      ej: '«Te cuento por qué te pregunto: soy Lucía, trabajo con COMPOUND. Ayudamos a negocios de barrio como el tuyo y os estamos haciendo una web con vuestras fotos y vuestras 212 reseñas, para que os encuentre quien os busca. Verla no os cuesta nada.»',
      no: 'Prometer resultados, decir que la web es gratis o dar un precio.' },
    { t: 'Cierre: 5 minutos y dos días… y callar', corto: 'Cierre', ini: 70, fin: 95, reloj: '1:10 – 1:35',
      que: 'Como estará liado, le pides solo 5 minutos para enseñársela y le das dos días a elegir. Después de preguntar, te callas y esperas. Luego, la hora.',
      ej: '«Como imagino que estás liado, ¿qué te parece si te la enseñamos en una videollamada de 5 minutos y, si os gusta, decidís? ¿Te viene mejor el lunes o el martes?»',
      no: '«¿Te interesaría?» (se contesta con un no) o «ya me dices».' },
    { t: 'Datos', corto: 'Datos', ini: 95, fin: 120, reloj: '1:35 – 2:00',
      que: 'La hora exacta, a nombre de quién y su WhatsApp para mandarle el enlace. Antes de colgar, repites día y hora.',
      ej: '«¿Te va bien a las 10? ¿Lo apunto a tu nombre? ¿A qué número te mando el enlace por WhatsApp? Pues el martes a las 10, hecho.»',
      no: 'Colgar sin hora, sin nombre o sin WhatsApp.' },
  ];
  // Lo que suele contestar a «¿hay alguna razón por la que no tenéis web?», y cómo seguir
  const PORQUES = [
    { d: 'No nos hemos puesto, no hay tiempo.', r: '«Normal, con el día a día no da tiempo. Por eso os la estamos haciendo nosotros, sin que tengáis que hacer nada.»' },
    { d: 'Es muy caro.', r: '«Ya, hay webs carísimas. Por eso te la enseñamos antes de hablar de nada: la ves y decides.»', n: 'Sin dar precio: eso se explica en la reunión, con la web delante.' },
    { d: 'Teníamos una, pero se quedó vieja.', r: '«Pasa mucho. Esta la estamos haciendo con vuestras reseñas de ahora, y te la enseñamos funcionando.»' },
    { d: 'No la necesito: ya tengo clientes (o Instagram).', r: '«Se nota, con esas reseñas. La web es para el que todavía no os conoce: os busca en Google, compara y se queda con quien le da confianza.»' },
    { d: 'Sí que tenemos web.', r: '«¡Anda! Pues no me salía buscando barberías por la zona. ¿Os entran clientes por ella?»', n: 'Si le funciona, despídete con simpatía. Si no, sigue con quién eres.' },
  ];

  const CHAT_BUENA = [
    ['el', '¿Sí? Barbería Nájera, dígame.'],
    ['ti', 'Hola, ¿qué tal? Oye, estaba buscando barberías por Carabanchel y quería ver más de la vuestra, que tenéis unas reseñas buenísimas… pero no he encontrado ningún sitio donde ver vuestros servicios. ¿No tenéis página web?', 'Se interesa por su negocio, sin vender'],
    ['el', 'Pues no, la verdad.'],
    ['ti', '¿Y hay alguna razón? Por curiosidad.', 'El porqué'],
    ['el', 'Nunca nos hemos puesto. Y me han dicho que es carísimo.'],
    ['ti', 'Normal, con el día a día no da tiempo, y hay webs carísimas. Te cuento por qué te pregunto: soy Lucía, trabajo con COMPOUND. Ayudamos a negocios de barrio como el tuyo y os estamos haciendo una web con vuestras fotos y vuestras 212 reseñas. Verla no os cuesta nada.', 'Se adapta a su porqué + quién es + lo que ya le estamos haciendo'],
    ['el', '¿Ah, sí? ¿Y esto cuánto cuesta?'],
    ['ti', 'Depende de lo que necesitéis, por eso no te doy un número a ciegas. Como imagino que estás liado: te la enseñamos en una videollamada de 5 minutos y, si os gusta, decidís. ¿Te viene mejor el lunes o el martes?', 'Precio sin cifra + 5 minutos + dos días'],
    ['pausa', 'Y te callas. Esperas.'],
    ['el', 'El martes, a primera hora.'],
    ['ti', '¿Te va bien a las 10? ¿Lo apunto a tu nombre? ¿Y a qué número te mando el enlace por WhatsApp?', 'Hora y datos'],
    ['el', 'Rubén. A este mismo, que es mi móvil.'],
    ['ti', 'Hecho, Rubén: el martes a las 10. ¡Que vaya bien el día!', 'Repite la hora'],
  ];
  const CHAT_MALA = [
    ['el', '¿Sí? Barbería Nájera, dígame.'],
    ['ti', 'Hola, buenos días, soy Pepe, de la empresa COMPOUND. ¿Hablo con el dueño?', 'Apertura de teleoperador'],
    ['el', 'Sí… ¿qué vendes?'],
    ['ti', '¿Te pillo en mal momento?', 'Le invita a decir que sí'],
    ['el', 'Pues sí, la verdad. Tengo a un cliente.'],
    ['ti', 'Es un momento. Hacemos páginas web profesionales para todo tipo de negocios: diseño moderno, adaptadas al móvil, posicionamiento…', 'Monólogo de catálogo: nada de SU negocio'],
    ['el', 'Ya tengo Instagram.'],
    ['ti', 'Ya, pero Instagram no es serio. Hoy, sin web no eres nadie.', 'Desprecia lo que hace bien'],
    ['el', 'Mira, no me interesa.'],
    ['ti', '¿Te interesaría que te mandara información?', '«¿Te interesaría?» se contesta con un no'],
    ['el', 'No. Adiós.'],
    ['fin', 'Cuelga.'],
  ];
  const CONTRASTE = [
    ['Abre interesándose por SU negocio: «no encuentro vuestra web».', 'Abre con «Hola, soy Pepe, de la empresa…».'],
    ['Pregunta por qué no tiene web y escucha.', '«¿Te pillo en mal momento?»: le invita a colgar.'],
    ['Se adapta a lo que le dice.', 'Un monólogo de catálogo.'],
    ['Dice quién es cuando ya hay interés, junto con lo que le estamos haciendo.', 'COMPOUND sale en la primera frase, cuando resta.'],
    ['Precio sin cifra, explicado en una frase.', 'No llega ni a eso.'],
    ['5 minutos y dos días a elegir, y se calla.', '«¿Te interesaría…?»'],
  ];

  const PRINCIPIOS = [
    { f: 'Abrir', t: 'Di pronto por qué llamas.', x: 'En los datos de Gong, decir el motivo de la llamada multiplica por 2,1 las probabilidades de éxito.', ej: '«Te llamo por una cosa concreta de tus reseñas…»', a: 'Gong Labs · 90.380 llamadas' },
    { f: 'Abrir', t: 'Nada de «¿te pillo en mal momento?».', x: 'Es de las peores aperturas medidas: le estás invitando a decirte que sí.', ej: '', a: 'Gong Labs · 2018 y 2024' },
    { f: 'Abrir', t: 'Apertura con permiso.', x: 'Reconoce que es una llamada que no esperaba y pide 20 segundos con una salida fácil. Es de las aperturas que mejor salen en los datos de 2024.', ej: '«¿Me das 20 segundos y, si no te sirve, te dejo trabajar?»', a: 'Armand Farrokh y Nick Cegelski' },
    { f: 'Abrir', t: 'Habla de SU negocio, y que sea verdad.', x: 'Sus reseñas, su barrio, lo que le sale en Google. Lo concreto engancha; lo genérico suena a teleoperador.', ej: '', a: 'Becc Holland' },
    { f: 'Conversar', t: 'Vende la reunión, no la web.', x: 'Lo único que pides son 5 minutos para que vea lo que ya le estamos preparando.', ej: '«No te vendo nada por teléfono: lo ves y decides.»', a: 'Gong: vende la prueba, no el producto' },
    { f: 'Conversar', t: 'Llega con algo ya hecho.', x: 'Cuando alguien te da algo primero, apetece corresponder: es la reciprocidad. Por eso decimos que ya le estamos preparando la web y que verla no le cuesta nada. Pero nunca digas que la web es gratis.', ej: '', a: 'Robert Cialdini' },
    { f: 'Conversar', t: 'Una o dos preguntas, no un interrogatorio.', x: 'Preguntas que le hagan ver el problema. En una llamada de dos minutos caben una o dos.', ej: '«Cuando alguien busca lo tuyo en tu barrio, ¿qué crees que le sale?»', a: 'Neil Rackham (SPIN) y Josh Braun' },
    { f: 'Conversar', t: 'Turnos cortos.', x: 'En las llamadas que salen bien, los dos hablan a ratos cortos y se pasan la palabra muchas veces. Un monólogo largo mata la llamada.', ej: '', a: 'Gong Labs · más de 100.000 llamadas' },
    { f: 'Conversar', t: 'El primer «no» casi nunca es de verdad.', x: 'Casi la mitad de las objeciones en frío son un acto reflejo («no me interesa», «mándame info»). Dale la razón y reabre con una pregunta.', ej: '«Normal, te llama alguien que no conoces. Solo una cosa…»', a: 'Gong Labs y Jeb Blount' },
    { f: 'Conversar', t: 'Pon nombre a lo que siente.', x: 'Desactiva la defensa mejor que discutir.', ej: '«Suena a que ya te han llamado veinte veces con lo mismo…»', a: 'Chris Voss, exnegociador del FBI' },
    { f: 'Conversar', t: 'Tono: destaca y no pases desapercibido.', x: 'La seguridad, la energía y la expresión pesan más que las palabras: es lo primero que nota el dueño. Habla con aplomo, como alguien que sabe algo bueno de su negocio. Ni euforia de teleoperador ni pidiendo perdón.', ej: '', a: 'Jeremy Miner' },
    { f: 'Cerrar', t: 'Dos opciones… y calla.', x: 'Pide la hora con dos opciones concretas. Después de preguntar, espera: quien habla primero, pierde.', ej: '«¿Mañana a las 11 o el jueves a las 4?»', a: 'Jeb Blount' },
    { f: 'Cerrar', t: 'Un reencuadre y, si repite el no, despedida con simpatía.', x: 'Una vuelta por objeción, no más. Mejor volver a llamar a la hora que te diga que insistir en el momento: la mayoría de reuniones no salen a la primera llamada.', ej: '«Perfecto, gracias por tu tiempo y que te vaya genial.»', a: 'Método COMPOUND, adaptado a negocio local' },
    { f: 'Cerrar', t: 'Volumen y constancia.', x: 'Las reuniones salen de hacer muchas llamadas, todos los días. Cuantas más haces, antes aprendes y más cobras.', ej: '', a: 'Alex Hormozi · la Regla de los 100' },
  ];

  const ROJAS = [
    { t: 'Prometer que la web es «gratis», «sin coste» o «de regalo».', sub: '«Verla no te cuesta nada» y «sin compromiso» sí valen.', tope: 3 },
    { t: 'Prometer salir el primero en Google o resultados garantizados.', sub: '', tope: 3 },
    { t: 'Inventarte clientes, cifras, reseñas o datos de su negocio.', sub: '', tope: 3 },
    { t: 'Mentir sobre quién eres o sobre de dónde sacamos su número, cuando te lo preguntan.', sub: '', tope: 3 },
    { t: 'Faltar al respeto.', sub: '', tope: 3 },
    { t: 'Insistir después de un «no me llaméis más».', sub: 'Esta todavía baja más.', tope: 2 },
  ];
  const SERIOS = [
    { t: 'Dar un precio cerrado.', sub: 'Además, «Objeciones y precio» no pasa de 3.', tope: 6, de: 'La nota' },
    { t: 'Prometer un resultado concreto, como «vas a ganar 3.000 € más».', sub: '', tope: 5, de: 'La nota' },
    { t: 'Presionar después de dos noes seguidos.', sub: 'Además, «Cierre con hora» no pasa de 3.', tope: 5, de: 'La nota' },
    { t: 'Abrir como un teleoperador: «Hola, soy X, de la empresa Y, ¿hablo con el dueño?».', sub: '', tope: 4, de: 'El gancho' },
  ];
  const ROJA_QUIZ = [
    { f: '«Es sin compromiso: lo ves y decides.»', r: 'vale', fb: 'Vale. «Sin compromiso» se puede decir.' },
    { f: '«Verla no os cuesta nada: te la enseñamos y decidís.»', r: 'vale', fb: 'Vale: es verdad, verla no cuesta nada. Lo que nunca se dice es que la web sea gratis.' },
    { f: '«Te la dejamos hecha gratis, de regalo.»', r: 'roja', fb: 'Línea roja: decir que la web es gratis o de regalo suspende (no pasa de 3).' },
    { f: '«Con nosotros sales el primero en Google, seguro.»', r: 'roja', fb: 'Línea roja: nadie puede prometer el primer puesto en Google.' },
    { f: '«De vuestra ficha pública de Google Maps.»', ctx: 'Te ha preguntado de dónde tienes su número.', r: 'vale', fb: 'Vale: es la verdad, dicha claro y a la primera.' },
    { f: '«Trabajamos con 300 negocios de tu barrio.»', ctx: 'Te lo acabas de inventar.', r: 'roja', fb: 'Línea roja: inventarte clientes o cifras.' },
    { f: '«Son 400 € y ya está.»', r: 'serio', fb: 'Error serio: precio cerrado por teléfono. La nota no pasa de 6.' },
    { f: '«Con la web vas a ganar 3.000 € más al mes.»', r: 'serio', fb: 'Error serio: prometer un resultado concreto. No pasa de 5.' },
    { f: '«Depende de lo que necesitéis: te lo explicamos con la web delante.»', ctx: 'Te ha preguntado el precio.', r: 'vale', fb: 'Vale: sin cifra y sin esquivarlo.' },
    { f: '«Vale, pero antes déjame contarte una cosa…»', ctx: 'Te acaba de decir «no me llaméis más».', r: 'roja', fb: 'Línea roja: insistir tras «no me llaméis más». No pasa de 2.' },
  ];
  const ICP = [
    { n: 'Peluquería de barrio', m: '★ 4,9 · 231 reseñas · sin web', ok: true, fb: 'De los nuestros: muchas y buenas reseñas, y sin web.' },
    { n: 'Clínica de fisioterapia', m: '★ 4,8 · 156 reseñas · web antigua que no se lee en el móvil', ok: true, fb: 'De los nuestros: tiene web, pero da pena. Le pasa lo mismo que si no la tuviera.' },
    { n: 'Taller mecánico', m: '★ 3,1 · 14 reseñas · sin web', ok: false, fb: 'No: buscamos negocios que ya tienen muchas y buenas reseñas.' },
    { n: 'Tienda online de zapatillas', m: 'Vende solo por internet', ok: false, fb: 'No: eso es otro servicio de COMPOUND. Tú llamas a negocios de barrio.' },
  ];
  // Rúbrica de las llamadas de práctica: copia de CRITERIOS de la app.
  const CRITERIOS = [
    { id: 'personaje', txt: 'Gancho y personaje', peso: 20, d: 'En los primeros 30 segundos se interesa por SU negocio con algo concreto y verdadero (que ha buscado su oficio por la zona y no encuentra su web, sus reseñas, su barrio) o hace una pregunta que le hace pensar, y suena a persona, no a vendedor ni a guion. No abre con la fórmula de teleoperador. Decir su nombre al principio ni suma ni resta.', a: '3 = fórmula de teleoperador o genérico sin motivo; 5 = sin teleoperador pero seco o genérico («¿tenéis web?» sin más); 7 = se interesa por su negocio con algo verdadero de su ficha y le hace hablar, aunque algo largo; 9 = en dos o tres frases cortas y sin sonar a venta: algo real de su negocio y una pregunta que le hace hablar («estaba buscando barberías por la zona y no encuentro vuestra web, ¿no tenéis?»).' },
    { id: 'valor', txt: 'Valor ya preparado', peso: 10, d: 'Cuenta de forma concreta lo que COMPOUND ya le está preparando (una web con sus fotos y sus reseñas), lo une a lo que el dueño le ha dicho (por qué no tiene web) y lo usa para pedir la reunión («verla no te cuesta nada: la ves y decides»), sin prometer resultados ni decir que la web es gratis.', a: '3 = «hacemos webs, ¿te interesa?»; 5 = menciona la web preparada sin concretar; 7 = concreta (sus fotos, sus reseñas) y la une a su razón para no tener web; 9 = además la usa para pedir solo 5 minutos y no suena a promesa.' },
    { id: 'preguntas', txt: 'Preguntas y escucha', peso: 10, d: 'Una o dos preguntas cortas que le hacen ver el problema; usa lo que el dueño contesta; turnos cortos, una pregunta por turno, sin monólogos ni interrogatorios.', a: '3 = monólogo o preguntas de formulario; 5 = una pregunta cerrada o retórica y no usa la respuesta; 7 = una pregunta que le hace pensar (p. ej. «¿hay alguna razón por la que no tenéis web?») y usa lo que contesta; 9 = dos preguntas breves, la segunda con sus propias palabras, y adapta lo que cuenta a su respuesta, sin apilarlas.' },
    { id: 'objeciones', txt: 'Objeciones y precio', peso: 15, d: 'Da la razón en una frase sin discutir y reabre con una pregunta o un dato; no repite la misma frase; precio sin cifra y explicando por qué, sin sonar a evasiva ni prometer rentabilidad; respeta el no firme.', a: '3 = discute, se defiende, da un precio cerrado o se rinde al primer no; 5 = da la razón con frase de manual y vuelve a pedir igual; 7 = da la razón, devuelve una pregunta concreta y lleva a la hora; precio sin cifra explicando por qué; 9 = nombra lo que siente («suena a que ya te han llamado…»), cambia de ángulo y respeta con elegancia el no firme.' },
    { id: 'cierre', txt: 'Cierre con hora', peso: 20, d: 'Propone la videollamada de 5 minutos («te la enseñamos») con dos opciones concretas de día y hora y se queda con el nombre de quien decide y un WhatsApp (o, si no se puede, una hora concreta para volver a llamar, o el nombre del dueño y a qué hora está).', a: '3 = «si te interesa, ya me dices», sin día ni hora; 5 = una sola opción vaga («un día de estos»); 7 = dos opciones concretas y pide nombre y WhatsApp, con algún fallo; 9 = dos opciones, confirma quién estará, el WhatsApp para el enlace, repite la hora y se despide.' },
    { id: 'tono', txt: 'Tono, seguridad y expresión', peso: 25, d: 'Destaca y no pasa desapercibido: habla con seguridad, energía y expresión, como alguien que sabe algo bueno del negocio del dueño, y levanta el interés. Ni teleoperador ni pidiendo perdón. Como no se oye la voz, se juzga por lo escrito: frases con fuerza y cortas, tuteo, sin titubeos ni fórmulas de comunicado («le informo», «queríamos ofrecerle»).', a: '3 = pide perdón, titubea o suena a comunicado o a teleoperador; 5 = correcto pero plano: no destaca; 7 = seguro y natural, se nota interés; 9 = destaca: seguridad, energía y chispa que levantan el interés sin pasarse.' },
  ];
  const ESCENAS = [
    { neg: 'Barbería Nájera', quien: 'Rubén, dueño y barbero', nivel: 'Fácil', ojo: 'Contesta mientras corta el pelo: ve al grano.', obj: 'Videollamada con día y hora.' },
    { neg: 'Peluquería Canina Bigotes', quien: 'Andrea, empleada', nivel: 'Fácil', ojo: 'La dueña no está: no le vendas a la empleada.', obj: 'El nombre de quien decide, a qué hora llamarle y su número (o dejarle el tuyo).' },
    { neg: 'Cerrajería Rápida Moratalaz', quien: 'Paco, autónomo', nivel: 'Medio', ojo: 'Está en plena apertura de una puerta: tienes 30 segundos.', obj: 'Videollamada con día y hora (vale confirmarla luego por WhatsApp).' },
    { neg: 'Fisioterapia Alameda', quien: 'Laura, fisio y dueña', nivel: 'Medio', ojo: 'Tiene Instagram y Doctoralia: no desprecies lo que ya tiene.', obj: 'Videollamada con día y hora.' },
    { neg: 'Centro de Estética Lirio', quien: 'Marisa, dueña', nivel: 'Difícil', ojo: 'Ya la engañaron con una web: desconfía de todo.', obj: 'Videollamada con día y hora.' },
    { neg: 'Taller Hermanos Ortega', quien: 'Javi, socio con su hermano', nivel: 'Difícil', ojo: 'Lo primero que pregunta es el precio.', obj: 'Videollamada con día y hora.' },
    { neg: 'Mila Nails', quien: 'Mila, dueña', nivel: 'Difícil', ojo: 'Le llaman comerciales todos los días: sorpréndela.', obj: 'Reunión si se puede; si no, un rechazo bien llevado también cuenta.' },
  ];
  const LIBROS = [
    { t: 'Cold Calling Sucks (And That’s Why It Works)', a: 'Armand Farrokh y Nick Cegelski', x: 'Lo más práctico de llamada en frío hoy. En inglés.' },
    { t: 'Fanatical Prospecting', a: 'Jeb Blount', x: 'Volumen, disciplina y la llamada en 4-5 pasos. En inglés.' },
    { t: 'Rompe la barrera del no', a: 'Chris Voss', x: 'Etiquetas, espejos y preguntas que desactivan la defensa.' },
    { t: 'Influencia', a: 'Robert Cialdini', x: 'Por qué funciona llegar con algo ya hecho.' },
  ];

  // ════════════════════════════════════════════════════════════════════════
  // CSS (un solo look oscuro, todo bajo .wg)
  // ════════════════════════════════════════════════════════════════════════
  const CSS = `
/* Parqué de bolsa nocturno: héroe con la moneda del 50 %, cuadro de cotizaciones con tu progreso y un capítulo cada vez, como un terminal. */
.wg{--wg-bg:#06100c;--wg-bg-rgb:6,16,12;--wg-bg-2:#0a1813;--wg-panel:#0f2119;--wg-panel-2:#152c21;--wg-line:#21402f;--wg-line-2:#2f5841;--wg-ink:#eef5ef;--wg-muted:#a5bbae;--wg-dim:#7b9486;--wg-gold:#f1c45a;--wg-gold-2:#ffe39a;--wg-gold-deep:#a8771f;--wg-gold-ink:#1d1405;--wg-gold-rgb:241,196,90;--wg-money:#3fdc8f;--wg-money-2:#1f9b5f;--wg-money-deep:#0e4d30;--wg-money-rgb:63,220,143;--wg-red:#ff7366;--wg-red-rgb:255,115,102;--wg-amber:#ffb84d;--wg-amber-rgb:255,184,77;--wg-white-rgb:255,255,255;--wg-black-rgb:0,0,0;
--wg-display:"Big Shoulders Display","Anton",Impact,"Arial Narrow Bold","Arial Narrow",sans-serif;--wg-body:"Schibsted Grotesk","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;--wg-mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;
color-scheme:dark;position:relative;isolation:isolate;overflow:hidden;border-radius:22px;background:var(--wg-bg);color:var(--wg-ink);font:400 16px/1.6 var(--wg-body);text-align:left;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-text-size-adjust:100%}
.wg *,.wg *::before,.wg *::after{box-sizing:border-box}
.wg :where(h2,h3,h4,h5,p,ul,ol,figure,blockquote,dl,dd,table){margin:0}
.wg :where(ul,ol){padding:0;list-style:none}
.wg :where(button){font:inherit;color:inherit;cursor:pointer;background:none;border:0;padding:0;margin:0;text-align:inherit}
.wg :where(img){max-width:100%;display:block}
.wg :where(a){color:var(--wg-gold)}
.wg :where(b,strong){font-weight:700;color:var(--wg-ink)}
.wg :focus-visible{outline:2px solid var(--wg-gold);outline-offset:3px;border-radius:8px}
.wg [hidden]{display:none!important}
.wg-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.wg-pad{padding-left:clamp(16px,4vw,44px);padding-right:clamp(16px,4vw,44px)}
.wg-eyebrow{font:600 12px/1.35 var(--wg-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--wg-gold)}
.wg-num{font-variant-numeric:tabular-nums}
.wg-p{max-width:66ch}
.wg-small{font-size:14px;line-height:1.55;color:var(--wg-muted)}
.wg-lead{font-size:clamp(17px,1.7vw,19px);line-height:1.55;color:var(--wg-muted);max-width:62ch}
.wg-h1{font:900 clamp(54px,7.8vw,96px)/.84 var(--wg-display);text-transform:uppercase;letter-spacing:.004em;text-wrap:balance;color:var(--wg-ink)}
.wg-h1 span{display:block;color:var(--wg-gold)}
@supports ((-webkit-background-clip:text) or (background-clip:text)){.wg-h1 span{background:linear-gradient(180deg,var(--wg-gold-2) 8%,var(--wg-gold) 52%,var(--wg-gold-deep) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}}
.wg-h3{font:900 clamp(40px,5.8vw,66px)/.9 var(--wg-display);text-transform:uppercase;letter-spacing:.005em;text-wrap:balance;color:var(--wg-ink)}
.wg-h3:focus{outline:none}
.wg-h4{font:800 clamp(25px,3vw,31px)/1 var(--wg-display);text-transform:uppercase;letter-spacing:.01em;text-wrap:balance;color:var(--wg-ink)}
.wg-h5{font:800 21px/1.05 var(--wg-display);text-transform:uppercase;letter-spacing:.01em;color:var(--wg-ink)}

/* botones */
.wg-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;border:1px solid var(--wg-line-2);background:var(--wg-panel);color:var(--wg-ink);font:700 15px/1.15 var(--wg-body);text-decoration:none;text-align:center;transition:transform .15s,background-color .15s,border-color .15s,color .15s}
.wg-btn:hover{border-color:var(--wg-gold);color:var(--wg-ink)}
.wg-btn:active{transform:translateY(1px)}
.wg-btn-oro{background:linear-gradient(180deg,var(--wg-gold-2),var(--wg-gold) 55%,var(--wg-gold-deep));color:var(--wg-gold-ink);border-color:transparent;box-shadow:0 10px 24px -12px rgba(var(--wg-gold-rgb),.85),inset 0 1px 0 rgba(var(--wg-white-rgb),.55)}
.wg-btn-oro:hover{color:var(--wg-gold-ink);filter:brightness(1.06)}
.wg-btn-ghost{background:transparent}
.wg-btn-sm{min-height:36px;padding:7px 14px;font-size:14px}
.wg-btn[aria-disabled="true"]{cursor:default}
.wg-btn.is-hecho{background:rgba(var(--wg-money-rgb),.12);color:var(--wg-money);border-color:rgba(var(--wg-money-rgb),.45);box-shadow:none}
.wg-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid var(--wg-line-2);font:600 11.5px/1.2 var(--wg-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--wg-muted);white-space:nowrap}
.wg-chip.is-oro{color:var(--wg-gold);border-color:rgba(var(--wg-gold-rgb),.45)}
.wg-chip.is-verde{color:var(--wg-money);border-color:rgba(var(--wg-money-rgb),.45)}
.wg-chip.is-rojo{color:var(--wg-red);border-color:rgba(var(--wg-red-rgb),.5)}
.wg-chip.is-ambar{color:var(--wg-amber);border-color:rgba(var(--wg-amber-rgb),.5)}

/* héroe */
.wg-hero{position:relative;overflow:hidden;background:radial-gradient(55% 75% at 80% 38%,rgba(var(--wg-gold-rgb),.16),transparent 62%),radial-gradient(55% 65% at 4% 110%,rgba(var(--wg-money-rgb),.12),transparent 70%),var(--wg-bg)}
.wg-hero-fx{position:absolute;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(var(--wg-money-rgb),.07) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--wg-money-rgb),.07) 1px,transparent 1px);background-size:46px 46px;-webkit-mask-image:radial-gradient(80% 90% at 70% 40%,#000 30%,transparent 80%);mask-image:radial-gradient(80% 90% at 70% 40%,#000 30%,transparent 80%)}
.wg-cv{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;pointer-events:none}
.wg-cv.is-3d{opacity:0;transition:opacity .6s ease}
.wg-cv.is-3d.is-on{opacity:1}
.wg-hero::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(var(--wg-bg-rgb),.94) 0%,rgba(var(--wg-bg-rgb),.72) 36%,rgba(var(--wg-bg-rgb),0) 60%)}
.wg-hero-in{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:24px;align-items:center;min-height:clamp(400px,40vw,480px);padding-top:clamp(22px,3.2vw,38px);padding-bottom:72px}
.wg-hero-txt{display:grid;gap:15px;align-content:center;max-width:640px;min-width:0}
.wg-stage{align-self:stretch;min-height:280px;position:relative;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wg-crest{display:flex;align-items:center;gap:12px}
.wg-crest img{width:46px;height:auto;filter:drop-shadow(0 8px 14px rgba(var(--wg-black-rgb),.55))}
.wg-crest .wg-eyebrow span{color:var(--wg-muted)}
.wg-hero-lead{font-size:clamp(16.5px,1.6vw,18.5px);line-height:1.5;color:var(--wg-muted);max-width:52ch}
.wg-hero-obj{padding:10px 15px;border-radius:14px;border:1px solid rgba(var(--wg-gold-rgb),.35);background:rgba(var(--wg-bg-rgb),.55);max-width:50ch;font-weight:600;line-height:1.4}
.wg-hero-obj .wg-eyebrow{margin-right:8px}
.wg-hero-cta{display:flex;flex-wrap:wrap;gap:10px}
.wg-ticker{position:absolute;left:0;right:0;bottom:0;z-index:3;overflow:hidden;border-top:1px solid var(--wg-line);background:rgba(var(--wg-bg-rgb),.9)}
.wg-ticker-track{display:flex;width:max-content;animation:wg-cinta 80s linear infinite}
.wg-hero.is-pausa .wg-ticker-track{animation-play-state:paused}
.wg-ticker-track>span{display:inline-flex;gap:9px;align-items:baseline;padding:13px 22px;border-right:1px solid var(--wg-line);font:500 12.5px/1 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-muted);white-space:nowrap}
.wg-ticker-track b{font-weight:600;color:var(--wg-ink)}
.wg-up{color:var(--wg-money)!important}
.wg-down{color:var(--wg-red)!important}
@keyframes wg-cinta{to{transform:translateX(-50%)}}

/* cuadro de progreso */
.wg-board{position:relative;z-index:2;background:var(--wg-bg-2);border-bottom:1px solid var(--wg-line);padding-top:20px;padding-bottom:20px}
.wg-board.is-completa{background:linear-gradient(180deg,rgba(var(--wg-gold-rgb),.10),var(--wg-bg-2) 70%)}
.wg-board-top{display:flex;flex-wrap:wrap;align-items:center;gap:12px 26px;margin-bottom:16px}
.wg-count{display:flex;align-items:baseline;gap:10px;color:var(--wg-muted);font-weight:600}
.wg-count b{font:900 52px/.8 var(--wg-display);color:var(--wg-gold);font-variant-numeric:tabular-nums}
.wg-segs{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;flex:1 1 200px;max-width:340px}
.wg-segs i{height:9px;border-radius:2px;background:var(--wg-line)}
.wg-segs i.on{background:linear-gradient(90deg,var(--wg-gold-deep),var(--wg-gold))}
.wg-board-msg{flex:1 1 260px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;color:var(--wg-muted);line-height:1.4}
.wg-nav{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px}
.wg-tk{display:grid;gap:7px;align-content:start;padding:12px 12px 11px;border-radius:12px;border:1px solid var(--wg-line);background:var(--wg-panel);min-height:96px;transition:border-color .15s,background-color .15s}
.wg-tk:hover{border-color:var(--wg-line-2);background:var(--wg-panel-2)}
.wg-tk[aria-current="step"]{border-color:var(--wg-gold);background:linear-gradient(180deg,rgba(var(--wg-gold-rgb),.14),var(--wg-panel))}
.wg-tk-n{font:600 11.5px/1 var(--wg-mono);letter-spacing:.1em;color:var(--wg-dim)}
.wg-tk[aria-current="step"] .wg-tk-n{color:var(--wg-gold)}
.wg-tk-t{font:800 18px/1 var(--wg-display);text-transform:uppercase;letter-spacing:.01em;text-wrap:balance}
.wg-tk-s{font:600 10.5px/1.2 var(--wg-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--wg-dim)}
.wg-tk.is-leido .wg-tk-s{color:var(--wg-money)}

/* capítulo */
.wg-caps{padding-top:8px;padding-bottom:52px}
.wg-cap{display:grid;gap:44px;padding-top:34px;scroll-margin-top:90px}
.wg-cap-head{display:grid;gap:14px;padding-bottom:26px;border-bottom:1px solid var(--wg-line)}
.wg-sec{display:grid;gap:16px;min-width:0}
.wg-sec>p{max-width:66ch}
.wg-dice{position:relative;display:grid;gap:6px;padding:14px 16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line);max-width:72ch}
.wg-dice>small{font:600 11px/1.2 var(--wg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--wg-money)}
.wg-dice>p{font-size:16.5px;line-height:1.5}
.wg-dice.is-mal{border-color:rgba(var(--wg-red-rgb),.4);background:rgba(var(--wg-red-rgb),.06)}
.wg-dice.is-mal>small{color:var(--wg-red)}
.wg-foot{display:grid;gap:14px;padding-top:26px;border-top:1px solid var(--wg-line)}
.wg-foot-btns{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
.wg-foot-btns>:first-child{justify-self:start}
.wg-foot-btns>:last-child{justify-self:end}
.wg-tengo{min-width:180px;min-height:52px;font-size:17px}

/* c-vendemos */
.wg-split{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:28px;align-items:start}
.wg-prose{display:grid;gap:14px;min-width:0}
.wg-ojo{padding:10px 14px;border-radius:12px;background:rgba(var(--wg-amber-rgb),.08);border:1px solid rgba(var(--wg-amber-rgb),.35)}
.wg-checks{display:grid;gap:10px}
.wg-checks li{position:relative;padding-left:30px}
.wg-checks li::before{content:"✓";position:absolute;left:0;top:1px;width:21px;height:21px;border-radius:50%;display:grid;place-items:center;font:800 12px/1 var(--wg-body);color:var(--wg-gold-ink);background:var(--wg-gold)}
.wg-ficha{display:grid;gap:12px;min-width:0}
.wg-ficha-card{position:relative;display:grid;gap:6px;padding:18px;border-radius:16px;background:var(--wg-ink);color:#1b1f1d;box-shadow:0 22px 50px -24px rgba(var(--wg-black-rgb),.9)}
.wg-ficha-card b{color:#1b1f1d}
.wg-ficha-tit{font:700 20px/1.2 var(--wg-body)}
.wg-ficha-est{display:flex;gap:6px;align-items:center;font-size:14.5px;color:#46504a}
.wg-ficha-est .wg-estr{color:#d99a00;letter-spacing:1px}
.wg-ficha-cat{font-size:14px;color:#46504a}
.wg-ficha-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.wg-ficha-acc span{padding:6px 12px;border-radius:999px;border:1px solid #c9d2cc;font-size:13px;font-weight:600;color:#1f5f42}
.wg-ficha-acc .wg-tachado{color:#a33b30;border-color:#e8b9b3;text-decoration:line-through}
.wg-sello{position:absolute;top:14px;right:12px;transform:rotate(9deg);padding:5px 10px;border:2px solid var(--wg-gold-deep);border-radius:8px;font:900 15px/1 var(--wg-display);letter-spacing:.12em;text-transform:uppercase;color:var(--wg-gold-deep)}
.wg-ficha-notas{display:grid;gap:6px}
.wg-ficha-notas li{font-size:14px;color:var(--wg-muted);padding-left:22px;position:relative}
.wg-ficha-notas li::before{content:"▲";position:absolute;left:0;color:var(--wg-money);font-size:11px;top:3px}
.wg-ficha figcaption{font:500 11.5px/1.3 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-dim)}
.wg-escalera{display:grid;gap:10px;max-width:760px}
.wg-escalera li{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;padding:16px 18px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-escalera li:nth-child(2){margin-left:clamp(0px,4vw,48px)}
.wg-esc-n{font:900 44px/.8 var(--wg-display);color:var(--wg-gold)}
.wg-meta{display:grid;gap:10px;padding:clamp(20px,3vw,30px);border-radius:20px;background:radial-gradient(120% 140% at 0% 0%,rgba(var(--wg-gold-rgb),.2),transparent 55%),var(--wg-panel);border:1px solid rgba(var(--wg-gold-rgb),.4)}
.wg-meta-big{font:900 clamp(34px,4.8vw,56px)/.95 var(--wg-display);text-transform:uppercase;text-wrap:balance}
.wg-meta-big span{color:var(--wg-gold)}
.wg-relevo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;counter-reset:rel}
.wg-relevo li{position:relative;display:grid;gap:4px;align-content:start;padding:16px;border-radius:14px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-relevo li:first-child{border-color:rgba(var(--wg-money-rgb),.55);background:rgba(var(--wg-money-rgb),.07)}
.wg-relevo li:not(:last-child)::after{content:"→";position:absolute;right:-12px;top:50%;transform:translateY(-50%);width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:var(--wg-bg);border:1px solid var(--wg-line-2);color:var(--wg-gold);font-size:13px;z-index:1}
.wg-relevo-q{font:800 24px/1 var(--wg-display);text-transform:uppercase}
.wg-relevo-c{font:600 11px/1.3 var(--wg-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--wg-gold)}
.wg-relevo p{font-size:14.5px;color:var(--wg-muted);line-height:1.45}
.wg-icp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.wg-icp-it{display:grid;gap:10px;align-content:start;padding:16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-icp-it.is-ok{border-color:rgba(var(--wg-money-rgb),.55)}
.wg-icp-it.is-ko{border-color:rgba(var(--wg-red-rgb),.55)}
.wg-icp-txt{display:grid;gap:2px}
.wg-icp-txt b{font-size:16.5px}
.wg-icp-txt span{font:500 12.5px/1.4 var(--wg-mono);color:var(--wg-muted)}
.wg-icp-btns{display:flex;flex-wrap:wrap;gap:8px}
.wg-icp-fb{font-size:14.5px;line-height:1.45}
.wg-icp-fb:empty{display:none}
.wg-icp-fb.is-ok{color:var(--wg-money)}
.wg-icp-fb.is-ko{color:var(--wg-red)}

/* c-llamada */
.wg-orden{display:grid;gap:14px;padding:clamp(18px,3vw,28px);border-radius:20px;background:linear-gradient(135deg,rgba(var(--wg-red-rgb),.10),transparent 60%),var(--wg-panel);border:1px solid rgba(var(--wg-red-rgb),.35)}
.wg-orden ul{display:grid;gap:10px}
.wg-orden li{position:relative;padding-left:34px;line-height:1.45}
.wg-orden li::before{position:absolute;left:0;top:0;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font:800 13px/1 var(--wg-body)}
.wg-orden li.no::before{content:"✗";background:rgba(var(--wg-red-rgb),.18);color:var(--wg-red)}
.wg-orden li.si::before{content:"✓";background:rgba(var(--wg-money-rgb),.18);color:var(--wg-money)}
.wg-tl{display:grid;gap:10px;padding:clamp(16px,2.6vw,24px);border-radius:20px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-tl-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
.wg-tl-play{display:flex;align-items:center;gap:12px}
.wg-tl-reloj{font:900 30px/1 var(--wg-display);color:var(--wg-gold);min-width:3.2ch;text-align:right}
.wg-tl-chart{position:relative;height:96px}
.wg-tl-chart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.wg-tl-area{fill:rgba(var(--wg-money-rgb),.12)}
.wg-tl-line{fill:none;stroke:var(--wg-money);stroke-width:2.5}
.wg-tl-head{position:absolute;top:-4px;bottom:-34px;width:2px;margin-left:-1px;background:var(--wg-gold);box-shadow:0 0 12px rgba(var(--wg-gold-rgb),.8);opacity:0;transition:opacity .2s}
.wg-tl.is-play .wg-tl-head{opacity:1}
.wg-tl-segs{display:flex;gap:3px}
.wg-tl-segs button{min-width:0;display:flex;align-items:center;gap:6px;padding:9px 8px;border-radius:8px;background:var(--wg-panel-2);border:1px solid var(--wg-line);overflow:hidden;transition:background-color .2s,border-color .2s}
.wg-tl-segs button b{font:900 17px/1 var(--wg-display);color:var(--wg-gold)}
.wg-tl-segs button span{font:600 11px/1 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wg-tl-segs button.is-act{background:rgba(var(--wg-gold-rgb),.18);border-color:var(--wg-gold)}
.wg-tl-ticks{position:relative;height:16px;font:500 11px/1 var(--wg-mono);color:var(--wg-dim);white-space:nowrap}
.wg-tl-ticks span{position:absolute;top:0;transform:translateX(-50%)}
.wg-tl-ticks span:first-child{transform:none}
.wg-tl-ticks span:last-child{transform:translateX(-100%)}
.wg-tl-cred{margin-left:8.333%;padding:7px 10px;border-radius:8px;border:1px dashed rgba(var(--wg-gold-rgb),.5);font:500 12px/1.35 var(--wg-mono);color:var(--wg-gold)}
.wg-pasos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wg-paso{display:grid;gap:10px;align-content:start;padding:18px;border-radius:16px;background:var(--wg-panel);border:1px solid var(--wg-line);transition:border-color .25s,background-color .25s,transform .25s}
.wg-paso.is-act{border-color:var(--wg-gold);background:linear-gradient(180deg,rgba(var(--wg-gold-rgb),.12),var(--wg-panel))}
.wg-paso-top{display:flex;align-items:baseline;gap:12px}
.wg-paso-n{font:900 40px/.8 var(--wg-display);color:var(--wg-gold)}
.wg-paso-t{font:800 22px/1.02 var(--wg-display);text-transform:uppercase;flex:1;min-width:0}
.wg-paso p{font-size:15px;line-height:1.5}
.wg-paso .wg-q{padding:10px 12px;border-radius:10px;background:rgba(var(--wg-money-rgb),.08);font-size:15px;line-height:1.45}
.wg-paso .wg-no{font-size:14px;color:var(--wg-muted)}
.wg-paso .wg-no b{color:var(--wg-red)}
.wg-chats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
.wg-chat-col{display:grid;gap:10px;min-width:0}
.wg-chat-h{display:flex;justify-content:space-between;align-items:center;gap:10px}
.wg-chat{display:grid;gap:9px;padding:14px;border-radius:18px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-msg{display:grid;gap:4px;max-width:90%}
.wg-msg.is-entra{animation:wg-entra .35s ease both}
.wg-msg-el{justify-self:start}
.wg-msg-ti{justify-self:end;justify-items:end}
.wg-msg small{font:600 10.5px/1 var(--wg-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--wg-dim)}
.wg-msg p{padding:9px 13px;border-radius:15px;font-size:15px;line-height:1.42}
.wg-msg-el p{background:var(--wg-panel-2);border-bottom-left-radius:4px}
.wg-msg-ti p{background:linear-gradient(180deg,#1d6243,#164d34);border-bottom-right-radius:4px}
.wg-chat.is-mala .wg-msg-ti p{background:linear-gradient(180deg,#5a2a25,#47211d)}
.wg-tag{font:600 10.5px/1.3 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-money);text-align:right}
.wg-chat.is-mala .wg-tag{color:var(--wg-red)}
.wg-msg-pausa,.wg-msg-fin{justify-self:center;max-width:100%}
.wg-msg-pausa span{display:inline-block;padding:6px 14px;border-radius:999px;border:1px dashed rgba(var(--wg-gold-rgb),.6);font:600 12px/1.2 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-gold)}
.wg-msg-fin span{display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(var(--wg-red-rgb),.14);font:600 12px/1.2 var(--wg-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--wg-red)}
.wg-msg.is-oculto{display:none}
.wg-escribe{justify-self:start;display:inline-flex;gap:4px;padding:10px 13px;border-radius:15px;background:var(--wg-panel-2)}
.wg-escribe.de-ti{justify-self:end;background:#1a5539}
.wg-escribe i{width:6px;height:6px;border-radius:50%;background:var(--wg-muted);animation:wg-punto 1s infinite}
.wg-escribe i:nth-child(2){animation-delay:.15s}
.wg-escribe i:nth-child(3){animation-delay:.3s}
@keyframes wg-punto{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
@keyframes wg-entra{from{opacity:.001;transform:translateY(6px)}to{opacity:1;transform:none}}
.wg-veredicto{display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:12px;font-weight:700;line-height:1.35}
.wg-veredicto.is-bien{background:rgba(var(--wg-money-rgb),.1);color:var(--wg-money);border:1px solid rgba(var(--wg-money-rgb),.4)}
.wg-veredicto.is-mal{background:rgba(var(--wg-red-rgb),.08);color:var(--wg-red);border:1px solid rgba(var(--wg-red-rgb),.4)}
.wg-contraste{display:grid;border-radius:16px;overflow:hidden;border:1px solid var(--wg-line)}
.wg-contraste>div{display:grid;grid-template-columns:1fr 1fr}
.wg-contraste>div>*{padding:11px 14px;font-size:15px;line-height:1.45;border-top:1px solid var(--wg-line)}
.wg-contraste>div:first-child>*{border-top:0;font:600 11.5px/1.3 var(--wg-mono);letter-spacing:.1em;text-transform:uppercase;background:var(--wg-panel-2)}
.wg-contraste>div>:first-child{border-right:1px solid var(--wg-line)}
.wg-contraste .si{color:var(--wg-ink)}
.wg-contraste .si::before{content:"✓ ";color:var(--wg-money);font-weight:800}
.wg-contraste .no{color:var(--wg-muted)}
.wg-contraste .no::before{content:"✗ ";color:var(--wg-red);font-weight:800}

/* c-ganchos */
.wg-regla{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:16px;background:rgba(var(--wg-gold-rgb),.08);border:1px solid rgba(var(--wg-gold-rgb),.4);max-width:72ch}
.wg-regla>span{font:900 34px/.8 var(--wg-display);color:var(--wg-gold)}
.wg-ganchos{display:grid;gap:10px}
.wg-gancho{display:grid;grid-template-columns:minmax(150px,.32fr) minmax(0,1fr);gap:8px 22px;align-items:start;padding:16px 18px;border-radius:16px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-gancho-tipo{display:grid;gap:4px}
.wg-gancho-tipo b{font:800 21px/1 var(--wg-display);text-transform:uppercase;color:var(--wg-gold)}
.wg-gancho-tipo span{font-size:13.5px;color:var(--wg-muted);line-height:1.4}
.wg-gancho p{font-size:16.5px;line-height:1.5}
.wg-asino{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.wg-gen{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:18px;padding:clamp(16px,2.6vw,26px);border-radius:22px;background:radial-gradient(100% 120% at 100% 0%,rgba(var(--wg-gold-rgb),.12),transparent 55%),var(--wg-bg-2);border:1px solid var(--wg-line-2)}
.wg-gen-ctrl{display:grid;gap:16px;align-content:start}
.wg-field{display:grid;gap:6px}
.wg-field>span,.wg-field>label{font:600 11.5px/1.3 var(--wg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--wg-muted)}
.wg-select{appearance:none;-webkit-appearance:none;width:100%;min-height:46px;padding:10px 40px 10px 14px;border-radius:12px;border:1px solid var(--wg-line-2);background:var(--wg-panel) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23f1c45a' stroke-width='2'/%3E%3C/svg%3E") no-repeat right 14px center;color:var(--wg-ink);font:600 15.5px/1.2 var(--wg-body)}
.wg-tipos{display:flex;flex-wrap:wrap;gap:8px}
.wg-tipos button{padding:8px 13px;border-radius:999px;border:1px solid var(--wg-line-2);background:var(--wg-panel);font-weight:600;font-size:14px;transition:background-color .15s,border-color .15s,color .15s}
.wg-tipos button[aria-pressed="true"]{background:var(--wg-gold);color:var(--wg-gold-ink);border-color:var(--wg-gold)}
.wg-gen-out{display:grid;gap:14px;align-content:start;padding:18px;border-radius:16px;background:var(--wg-panel);border:1px solid var(--wg-line);min-width:0}
.wg-gen-out figcaption{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.wg-gen-txt{font:500 clamp(18px,2vw,21px)/1.45 var(--wg-body);color:var(--wg-ink)}
.wg-gen-txt mark{background:none;color:var(--wg-gold-2);border-bottom:2px dotted var(--wg-gold);padding:0 1px}
.wg-gen-acc{display:flex;flex-wrap:wrap;gap:8px}
.wg-gen-check{display:grid;gap:6px;font-size:13.5px;color:var(--wg-muted)}
.wg-gen-check li{padding-left:22px;position:relative;line-height:1.4}
.wg-gen-check li::before{content:"☐";position:absolute;left:0;top:0;color:var(--wg-gold)}

/* c-objeciones */
.wg-mezcla{display:grid;gap:10px;padding:18px;border-radius:18px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-barra{display:flex;height:34px;border-radius:8px;overflow:hidden;gap:2px}
.wg-barra span{display:flex;align-items:center;padding:0 10px;font:600 12px/1 var(--wg-mono);color:var(--wg-gold-ink);white-space:nowrap;overflow:hidden;min-width:0}
.wg-barra span:nth-child(1){background:var(--wg-gold)}
.wg-barra span:nth-child(2){background:var(--wg-money);color:#062114}
.wg-barra span:nth-child(3){background:var(--wg-muted);color:#0c1712}
.wg-ley{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;color:var(--wg-muted)}
.wg-ley i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:0}
.wg-metodo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wg-metodo li{display:grid;gap:6px;align-content:start;padding:16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-metodo b{font:900 30px/.8 var(--wg-display);color:var(--wg-gold)}
.wg-metodo strong{font:800 20px/1.05 var(--wg-display);text-transform:uppercase}
.wg-metodo span{font-size:14.5px;color:var(--wg-muted);line-height:1.45}
.wg-modos{display:inline-flex;flex-wrap:wrap;gap:4px;padding:4px;border-radius:999px;background:var(--wg-bg-2);border:1px solid var(--wg-line);justify-self:start}
.wg-modos button{padding:9px 16px;border-radius:999px;font-weight:700;font-size:14.5px;color:var(--wg-muted)}
.wg-modos button[aria-pressed="true"]{background:var(--wg-gold);color:var(--wg-gold-ink)}
.wg-deck{display:grid;gap:14px;max-width:820px}
.wg-deck-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;font:600 13px/1 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-muted)}
.wg-flip{perspective:1600px;cursor:pointer}
.wg-flip-in{display:grid;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.75,.25,1)}
.wg-flip.is-girada .wg-flip-in{transform:rotateY(180deg)}
.wg-face{grid-area:1/1;-webkit-backface-visibility:hidden;backface-visibility:hidden;display:grid;gap:16px;align-content:space-between;min-height:320px;padding:clamp(20px,3.4vw,34px);border-radius:22px}
.wg-face-a{background:radial-gradient(120% 110% at 0% 0%,rgba(var(--wg-gold-rgb),.18),transparent 55%),linear-gradient(160deg,var(--wg-panel-2),var(--wg-panel));border:1px solid var(--wg-line-2);box-shadow:0 26px 60px -34px rgba(var(--wg-black-rgb),.95)}
.wg-face-b{transform:rotateY(180deg);background:radial-gradient(120% 110% at 100% 0%,rgba(var(--wg-money-rgb),.16),transparent 55%),linear-gradient(160deg,#11301f,var(--wg-panel));border:1px solid rgba(var(--wg-money-rgb),.4)}
.wg-face-q{font:800 clamp(32px,4.6vw,50px)/1 var(--wg-display);text-wrap:balance}
.wg-face-hint{display:flex;align-items:center;gap:10px;color:var(--wg-muted);font-size:15px}
.wg-face-b dl{display:grid;gap:18px}
.wg-face-b dl>div{display:grid;gap:5px}
.wg-face-b dt{font:600 11px/1.2 var(--wg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--wg-money)}
.wg-face-b dd{font-size:15.5px;line-height:1.5}
.wg-face-b dd.wg-di{font-size:17px;font-weight:500;color:var(--wg-ink)}
.wg-deck-ctrl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.wg-deck-dots{display:flex;flex-wrap:wrap;gap:5px}
.wg-deck-dots button{width:32px;height:32px;border-radius:8px;border:1px solid var(--wg-line);background:var(--wg-panel);font:600 12px/1 var(--wg-mono);color:var(--wg-muted)}
.wg-deck-dots button[aria-current="true"]{border-color:var(--wg-gold);color:var(--wg-gold-ink);background:var(--wg-gold)}
.wg-quiz{display:grid;gap:14px;max-width:820px}
.wg-quiz-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;font:600 13px/1 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-muted)}
.wg-quiz-top b{color:var(--wg-gold)}
.wg-quiz-q{padding:18px 20px;border-radius:18px;background:var(--wg-panel-2);border:1px solid var(--wg-line-2);font:800 clamp(26px,3.4vw,36px)/1.05 var(--wg-display)}
.wg-quiz-q small{display:block;margin-bottom:8px;font:600 11.5px/1.2 var(--wg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--wg-gold)}
.wg-opts{display:grid;gap:10px}
.wg-opt{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px;padding:14px 16px;border-radius:14px;border:1px solid var(--wg-line);background:var(--wg-panel);transition:border-color .15s,background-color .15s}
.wg-opt:hover:not([disabled]){border-color:var(--wg-gold)}
.wg-opt[disabled]{cursor:default}
.wg-opt>b{grid-row:span 2;font:900 24px/1 var(--wg-display);color:var(--wg-gold);padding-top:2px}
.wg-opt>span{font-size:15.5px;line-height:1.45}
.wg-opt>em{font-style:normal;font-size:14px;line-height:1.45;color:var(--wg-muted)}
.wg-opt.is-ok{border-color:var(--wg-money);background:rgba(var(--wg-money-rgb),.08)}
.wg-opt.is-ok>b{color:var(--wg-money)}
.wg-opt.is-ko{border-color:rgba(var(--wg-red-rgb),.7);background:rgba(var(--wg-red-rgb),.07)}
.wg-opt.is-ko>b{color:var(--wg-red)}
.wg-quiz-fb{font-weight:700}
.wg-quiz-fb.is-ok{color:var(--wg-money)}
.wg-quiz-fb.is-ko{color:var(--wg-red)}
.wg-quiz-fin{display:grid;gap:12px;justify-items:start;padding:22px;border-radius:18px;background:var(--wg-panel);border:1px solid var(--wg-line-2)}
.wg-quiz-fin b.big{font:900 64px/.85 var(--wg-display);color:var(--wg-gold)}
.wg-chuleta{display:grid;gap:8px}
.wg-chu{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:6px 20px;padding:14px 16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-chu-o{font:800 19px/1.08 var(--wg-display)}
.wg-chu-o span{display:block;margin-top:6px}
.wg-chu-r{display:grid;gap:6px;font-size:15px;line-height:1.48}
.wg-chu-r small{font-size:13.5px;color:var(--wg-muted)}

/* c-mejores */
.wg-honesto{padding:14px 16px;border-radius:14px;border:1px dashed var(--wg-line-2);color:var(--wg-muted);font-size:15px;line-height:1.5;max-width:76ch}
.wg-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wg-tile{display:grid;gap:8px;align-content:start;padding:18px;border-radius:16px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-tile b{font:900 clamp(46px,5.4vw,64px)/.85 var(--wg-display);color:var(--wg-gold);font-variant-numeric:tabular-nums}
.wg-tile p{font-size:15px;line-height:1.45}
.wg-tile small{font:500 11.5px/1.35 var(--wg-mono);color:var(--wg-dim)}
.wg-graf{display:grid;gap:12px;padding:18px;border-radius:18px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-graf-fila{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(0,2fr);gap:12px;align-items:center}
.wg-graf-fila>span{font-size:14.5px;line-height:1.3}
.wg-graf-bar{position:relative;height:30px;border-radius:6px;background:repeating-linear-gradient(90deg,rgba(var(--wg-white-rgb),.05) 0 1px,transparent 1px 8.333%)}
.wg-graf-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px}
.wg-graf-bar em{position:absolute;top:50%;transform:translateY(-50%);font:600 13px/1 var(--wg-mono);font-style:normal;color:var(--wg-ink);padding-left:8px;white-space:nowrap}
.wg-graf-bar em.is-dentro{padding:0 9px 0 0;color:#062114}
.wg-graf-eje{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(0,2fr);gap:12px}
.wg-graf-eje div{position:relative;height:14px;font:500 11px/1 var(--wg-mono);color:var(--wg-dim);white-space:nowrap}
.wg-graf-eje div span{position:absolute;top:0;transform:translateX(-50%)}
.wg-graf-eje div span:first-child{transform:none}
.wg-graf-eje div span:last-child{transform:translateX(-100%)}
.wg-fase{display:grid;gap:10px}
.wg-fase-h{display:flex;align-items:center;gap:12px}
.wg-fase-h::after{content:"";flex:1;height:1px;background:var(--wg-line)}
.wg-princ{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,.42fr);gap:6px 18px;align-items:start;padding:14px 16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-princ-n{font:900 28px/.9 var(--wg-display);color:var(--wg-gold);min-width:1.4em}
.wg-princ-c{display:grid;gap:5px;min-width:0}
.wg-princ-c strong{font:800 20px/1.05 var(--wg-display);text-transform:uppercase}
.wg-princ-c p{font-size:15px;line-height:1.5;color:var(--wg-muted)}
.wg-princ-c q{quotes:none;font-size:15px;color:var(--wg-ink)}
.wg-princ-a{justify-self:end;text-align:right;font:500 12px/1.35 var(--wg-mono);color:var(--wg-gold);padding-top:4px}
.wg-libros{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.wg-libro{display:grid;gap:8px;align-content:start;padding:18px 16px;border-radius:6px 16px 16px 6px;background:linear-gradient(90deg,rgba(var(--wg-black-rgb),.35) 0 8px,transparent 8px),var(--wg-panel-2);border:1px solid var(--wg-line-2)}
.wg-libro b{font:800 19px/1.05 var(--wg-display);text-transform:uppercase;padding-left:6px}
.wg-libro span{font:500 12px/1.3 var(--wg-mono);color:var(--wg-gold);padding-left:6px}
.wg-libro p{font-size:14px;color:var(--wg-muted);line-height:1.45;padding-left:6px}

/* c-rojas */
.wg-rojas{display:grid;gap:8px}
.wg-roja{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 20px;align-items:center;padding:14px 16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-roja.is-grave{border-color:rgba(var(--wg-red-rgb),.4);background:linear-gradient(90deg,rgba(var(--wg-red-rgb),.07),var(--wg-panel) 60%)}
.wg-roja.is-serio{border-color:rgba(var(--wg-amber-rgb),.35)}
.wg-roja p{font-size:16px;line-height:1.45}
.wg-roja small{display:block;font-size:13.5px;color:var(--wg-muted)}
.wg-tope{display:grid;justify-items:end;gap:5px}
.wg-tope-b{display:grid;grid-template-columns:repeat(10,10px);gap:3px}
.wg-tope-b i{height:14px;border-radius:2px;background:var(--wg-money-2)}
.wg-tope-b i.off{background:repeating-linear-gradient(45deg,rgba(var(--wg-red-rgb),.45) 0 2px,transparent 2px 5px);box-shadow:inset 0 0 0 1px rgba(var(--wg-red-rgb),.45)}
.wg-tope span{font:600 11.5px/1 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-red);white-space:nowrap}
.wg-roja.is-serio .wg-tope span{color:var(--wg-amber)}
.wg-baja{display:grid;gap:6px;padding:14px 16px;border-radius:14px;border:1px dashed var(--wg-line-2);color:var(--wg-muted);font-size:15px}
.wg-baja li{padding-left:18px;position:relative;line-height:1.45}
.wg-baja li::before{content:"▼";position:absolute;left:0;top:3px;font-size:10px;color:var(--wg-amber)}
.wg-rq{display:grid;gap:8px}
.wg-rq-it{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 16px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-rq-it.is-ok{border-color:rgba(var(--wg-money-rgb),.55)}
.wg-rq-it.is-ko{border-color:rgba(var(--wg-red-rgb),.55)}
.wg-rq-f{display:grid;gap:3px}
.wg-rq-f p{font-size:16px;line-height:1.4}
.wg-rq-f small{font-size:13px;color:var(--wg-muted)}
.wg-rq-b{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
.wg-rq-b button{padding:7px 12px;border-radius:999px;border:1px solid var(--wg-line-2);font-size:13.5px;font-weight:700;background:var(--wg-bg-2)}
.wg-rq-b button[data-r="vale"]:hover{border-color:var(--wg-money)}
.wg-rq-b button[data-r="serio"]:hover{border-color:var(--wg-amber)}
.wg-rq-b button[data-r="roja"]:hover{border-color:var(--wg-red)}
.wg-rq-b button.is-sel{background:var(--wg-ink);color:var(--wg-bg)}
.wg-rq-fb{grid-column:1/-1;font-size:14.5px;line-height:1.4}
.wg-rq-fb:empty{display:none}
.wg-rq-it.is-ok .wg-rq-fb{color:var(--wg-money)}
.wg-rq-it.is-ko .wg-rq-fb{color:var(--wg-red)}
.wg-mercado{display:grid;gap:14px;padding:clamp(16px,2.6vw,24px);border-radius:20px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-mercado-top{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 18px}
.wg-mercado-h{font:900 clamp(34px,4.4vw,48px)/.9 var(--wg-display);text-transform:uppercase}
.wg-mercado-now{font:600 13px/1.4 var(--wg-mono);letter-spacing:.04em}
.wg-mercado-now.is-abierto{color:var(--wg-money)}
.wg-mercado-now.is-cerrado{color:var(--wg-amber)}
.wg-dias{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;max-width:360px}
.wg-dias span{text-align:center;padding:7px 0;border-radius:6px;font:700 13px/1 var(--wg-mono);background:var(--wg-panel);color:var(--wg-dim);border:1px solid var(--wg-line)}
.wg-dias span.on{background:rgba(var(--wg-money-rgb),.14);color:var(--wg-money);border-color:rgba(var(--wg-money-rgb),.45)}
.wg-horas{display:grid;gap:6px}
.wg-horas-bar{position:relative;height:20px;border-radius:6px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-horas-bar i{position:absolute;top:0;bottom:0;border-radius:5px;background:linear-gradient(90deg,var(--wg-money-2),var(--wg-money))}
.wg-horas-bar b{position:absolute;top:-5px;bottom:-5px;width:2px;margin-left:-1px;background:var(--wg-gold);box-shadow:0 0 10px rgba(var(--wg-gold-rgb),.9)}
.wg-horas-t{position:relative;height:14px;font:500 11px/1 var(--wg-mono);color:var(--wg-dim);white-space:nowrap}
.wg-horas-t span{position:absolute;top:0;transform:translateX(-50%)}
.wg-horas-t span:first-child{transform:none}
.wg-horas-t span:last-child{transform:translateX(-100%)}

/* c-cobras */
.wg-cond{display:grid;gap:14px;padding:clamp(20px,3vw,30px);border-radius:22px;background:radial-gradient(110% 130% at 0% 0%,rgba(var(--wg-gold-rgb),.22),transparent 55%),var(--wg-panel);border:1px solid rgba(var(--wg-gold-rgb),.45)}
.wg-cond-tit{font:900 clamp(38px,5.4vw,62px)/.92 var(--wg-display);text-transform:uppercase;color:var(--wg-gold);text-wrap:balance}
.wg-cond-lista{display:grid;gap:10px;counter-reset:cond}
.wg-cond-lista li{position:relative;padding-left:40px;line-height:1.5;max-width:70ch;counter-increment:cond}
.wg-cond-lista li::before{content:counter(cond);position:absolute;left:0;top:0;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:800 13px/1 var(--wg-mono);color:var(--wg-gold-ink);background:var(--wg-gold)}
.wg-aviso{padding:10px 14px;border-radius:12px;background:rgba(var(--wg-amber-rgb),.1);border:1px solid rgba(var(--wg-amber-rgb),.45);color:var(--wg-amber);font-weight:600}
.wg-calc{display:grid;gap:18px;padding:clamp(16px,2.6vw,26px);border-radius:22px;background:var(--wg-bg-2);border:1px solid var(--wg-line-2)}
.wg-calc-ctrl{display:grid;gap:10px}
.wg-calc-l{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-weight:700}
.wg-calc-l output{font:900 40px/.85 var(--wg-display);color:var(--wg-gold);font-variant-numeric:tabular-nums}
.wg-range{width:100%;accent-color:var(--wg-gold);height:28px;cursor:pointer}
.wg-calc-pre{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:14px;color:var(--wg-muted)}
.wg-calc-pre button{padding:6px 12px;border-radius:999px;border:1px solid var(--wg-line-2);font:600 13px/1 var(--wg-mono)}
.wg-calc-pre button[aria-pressed="true"]{background:var(--wg-gold);color:var(--wg-gold-ink);border-color:var(--wg-gold)}
.wg-embudo{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.wg-embudo li{position:relative;display:grid;gap:6px;align-content:start;padding:16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-embudo li:not(:last-child)::after{content:"→";position:absolute;right:-12px;top:50%;transform:translateY(-50%);width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:var(--wg-bg-2);border:1px solid var(--wg-line-2);color:var(--wg-gold);font-size:13px;z-index:1}
.wg-embudo span{font:600 11px/1.3 var(--wg-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--wg-muted)}
.wg-embudo b{font:900 clamp(36px,4.2vw,50px)/.85 var(--wg-display);font-variant-numeric:tabular-nums}
.wg-embudo small{font-size:13px;color:var(--wg-dim);line-height:1.35}
.wg-embudo li.is-total{border-color:rgba(var(--wg-gold-rgb),.6);background:radial-gradient(120% 120% at 100% 0%,rgba(var(--wg-gold-rgb),.2),transparent 60%),var(--wg-panel)}
.wg-embudo li.is-total b{color:var(--wg-gold)}
.wg-manada{display:grid;gap:12px;padding:clamp(16px,2.6vw,26px);border-radius:22px;background:var(--wg-bg-2);border:1px solid var(--wg-line-2)}
.wg-lobos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wg-lobo{display:grid;gap:8px;justify-items:center;text-align:center;padding:16px 10px;border-radius:16px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-lobo.is-jefe{border-color:rgba(var(--wg-gold-rgb),.6);background:radial-gradient(110% 110% at 50% 0%,rgba(var(--wg-gold-rgb),.18),transparent 60%),var(--wg-panel)}
.wg-lobo-ava{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:900 24px/1 var(--wg-display);background:var(--wg-panel-2);border:1px solid var(--wg-line-2);color:var(--wg-ink)}
.wg-lobo.is-jefe .wg-lobo-ava{background:var(--wg-gold);color:var(--wg-gold-ink);border-color:var(--wg-gold)}
.wg-lobo b{font:800 22px/1 var(--wg-display);text-transform:uppercase}
.wg-monedas{display:flex;gap:3px}
.wg-monedas i{width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--wg-gold-2),var(--wg-gold) 50%,var(--wg-gold-deep));box-shadow:0 1px 0 rgba(var(--wg-black-rgb),.4)}
.wg-lobo small{font-size:13px;color:var(--wg-muted)}
.wg-flecha{text-align:center;font:600 12.5px/1.4 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-gold);padding:10px 12px;border-radius:12px;border:1px dashed rgba(var(--wg-gold-rgb),.5)}
.wg-reparto{display:grid;gap:8px}
.wg-reparto-bar{display:flex;height:40px;border-radius:10px;overflow:hidden;gap:2px}
.wg-reparto-bar span{display:flex;align-items:center;justify-content:center;font:700 13px/1 var(--wg-mono);white-space:nowrap;overflow:hidden;min-width:0}
.wg-reparto-bar .r-l{background:var(--wg-money-2);color:var(--wg-ink)}
.wg-reparto-bar .r-b{background:var(--wg-gold);color:var(--wg-gold-ink)}
.wg-reparto-bar .r-m{background:var(--wg-money);color:#062114}
.wg-reparto-txt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wg-reparto-txt div{display:grid;gap:2px;text-align:center}
.wg-reparto-txt b{font:900 32px/.9 var(--wg-display);font-variant-numeric:tabular-nums}
.wg-reparto-txt span{font-size:13px;color:var(--wg-muted);line-height:1.35}
.wg-disclaimer{padding:12px 16px;border-radius:12px;border:1px dashed var(--wg-line-2);color:var(--wg-muted);font-size:14.5px;line-height:1.5;max-width:76ch}

/* aviso para quien entra traído por un compañero */
.wg-colega{display:grid;gap:8px;padding:clamp(16px,2.6vw,22px);border-radius:18px;border:2px solid rgba(var(--wg-amber-rgb),.7);background:rgba(var(--wg-amber-rgb),.1)}
.wg-colega .wg-eyebrow{color:var(--wg-amber)}
.wg-colega-tit{font:900 clamp(26px,3.4vw,36px)/1 var(--wg-display);text-transform:uppercase;color:var(--wg-amber);text-wrap:balance}
.wg-colega p{max-width:70ch}

/* c-pruebas */
.wg-camino{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wg-pant{position:relative;display:grid;gap:8px;align-content:start;padding:18px;border-radius:18px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-pant:not(:last-child)::after{content:"→";position:absolute;right:-12px;top:34px;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:var(--wg-bg);border:1px solid var(--wg-line-2);color:var(--wg-gold);font-size:13px;z-index:1}
.wg-pant-n{font:600 11px/1.2 var(--wg-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--wg-gold)}
.wg-pant b{font:900 30px/.9 var(--wg-display);text-transform:uppercase}
.wg-pant p{font-size:14.5px;color:var(--wg-muted);line-height:1.45}
.wg-pant.is-mesa{border-color:rgba(var(--wg-gold-rgb),.55);background:radial-gradient(120% 120% at 100% 0%,rgba(var(--wg-gold-rgb),.18),transparent 60%),var(--wg-panel)}
.wg-partes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wg-parte{display:grid;gap:10px;align-content:start;padding:18px;border-radius:16px;background:var(--wg-bg-2);border:1px solid var(--wg-line)}
.wg-parte>p:not([class]){font-size:15px;line-height:1.5}
.wg-aprueba{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(var(--wg-money-rgb),.08);border:1px solid rgba(var(--wg-money-rgb),.4);font-weight:700;line-height:1.35}
.wg-aprueba b{font:900 30px/.85 var(--wg-display);color:var(--wg-money);white-space:nowrap}
.wg-escenas{display:grid;border-radius:16px;overflow:hidden;border:1px solid var(--wg-line)}
.wg-esc{display:grid;grid-template-columns:minmax(0,1.1fr) auto minmax(0,1.2fr) minmax(0,1.1fr);gap:6px 16px;align-items:center;padding:12px 16px;border-top:1px solid var(--wg-line);background:var(--wg-panel)}
.wg-esc:first-child{border-top:0}
.wg-esc-n b{display:block;font-size:15.5px}
.wg-esc-n span{font-size:13px;color:var(--wg-muted)}
.wg-esc p{font-size:14px;line-height:1.4;color:var(--wg-muted)}
.wg-esc p strong{color:var(--wg-ink)}
.wg-rub{display:grid;gap:12px}
.wg-rub-bar{display:flex;height:46px;border-radius:12px;overflow:hidden;gap:2px}
.wg-rub-bar span{display:grid;place-items:center;min-width:0;overflow:hidden;font:800 15px/1 var(--wg-display);color:var(--wg-gold-ink);white-space:nowrap}
.wg-rub-l{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.wg-rub-it{display:grid;gap:6px;align-content:start;padding:14px 16px;border-radius:14px;background:var(--wg-panel);border:1px solid var(--wg-line)}
.wg-rub-h{display:flex;align-items:baseline;gap:10px}
.wg-rub-h i{width:12px;height:12px;border-radius:3px;flex:none;transform:translateY(1px)}
.wg-rub-h strong{font:800 19px/1.05 var(--wg-display);text-transform:uppercase;flex:1}
.wg-rub-h b{font:900 24px/1 var(--wg-display);color:var(--wg-gold)}
.wg-rub-it p{font-size:14px;line-height:1.45;color:var(--wg-muted)}
.wg-rub-it details summary{cursor:pointer;font:600 12px/1.3 var(--wg-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--wg-gold)}
.wg-anclas{display:grid;gap:5px;margin-top:8px}
.wg-anclas div{display:grid;grid-template-columns:24px 1fr;gap:8px;font-size:13.5px;line-height:1.4;color:var(--wg-muted)}
.wg-anclas b{font:900 18px/1 var(--wg-display);color:var(--wg-gold)}
.wg-plus{display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:14px;border:1px dashed rgba(var(--wg-gold-rgb),.55);font-size:15px;line-height:1.45}
.wg-plus b.big{font:900 30px/.85 var(--wg-display);color:var(--wg-gold);white-space:nowrap}
.wg-sim{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:start;padding:clamp(16px,2.6vw,26px);border-radius:22px;background:var(--wg-bg-2);border:1px solid var(--wg-line-2)}
.wg-sim-crit{display:grid;gap:12px}
.wg-sim-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center}
.wg-sim-row label{font-weight:600;font-size:15px}
.wg-sim-row label span{font:500 12px/1 var(--wg-mono);color:var(--wg-dim);margin-left:4px}
.wg-sim-row output{font:900 24px/1 var(--wg-display);color:var(--wg-gold);min-width:2ch;text-align:right;font-variant-numeric:tabular-nums}
.wg-sim-row input{grid-column:1/-1}
.wg-sim-row.is-tope output{color:var(--wg-red)}
.wg-sim-checks{display:grid;gap:6px;padding-top:6px;border-top:1px solid var(--wg-line)}
.wg-check{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.4;cursor:pointer}
.wg-check input{width:18px;height:18px;margin:1px 0 0;accent-color:var(--wg-gold);flex:none;cursor:pointer}
.wg-check small{color:var(--wg-muted)}
.wg-sim-res{display:grid;gap:10px;justify-items:center;text-align:center;padding:22px 18px;border-radius:18px;background:var(--wg-panel);border:1px solid var(--wg-line-2)}
.wg-sim-res.is-ok{border-color:var(--wg-money);background:radial-gradient(100% 100% at 50% 0%,rgba(var(--wg-money-rgb),.16),transparent 60%),var(--wg-panel)}
.wg-sim-res.is-ko{border-color:rgba(var(--wg-red-rgb),.6)}
.wg-sim-res .wg-sim-nota{font:900 clamp(76px,9vw,110px)/.8 var(--wg-display);font-variant-numeric:tabular-nums}
.wg-sim-res.is-ok .wg-sim-nota{color:var(--wg-money)}
.wg-sim-res.is-ko .wg-sim-nota{color:var(--wg-red)}
.wg-sim-res .wg-sim-veredicto{font:800 20px/1.1 var(--wg-display);text-transform:uppercase;letter-spacing:.02em;align-self:end}
.wg-sim-res>p:not([class]){font-size:14px;line-height:1.45;color:var(--wg-muted);max-width:34ch}

/* efectos */
.wg-moneda-fx{position:absolute;width:16px;height:16px;border-radius:50%;pointer-events:none;z-index:30;background:radial-gradient(circle at 35% 30%,var(--wg-gold-2),var(--wg-gold) 50%,var(--wg-gold-deep));box-shadow:0 2px 6px rgba(var(--wg-black-rgb),.4);animation:wg-pop .95s cubic-bezier(.15,.7,.3,1) forwards}
@keyframes wg-pop{0%{transform:translate(-50%,-50%) scale(.5);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(260deg);opacity:0}}

/* responsive */
@media (max-width:979px){.wg-nav{grid-template-columns:repeat(4,minmax(0,1fr))}.wg-libros{grid-template-columns:repeat(2,minmax(0,1fr))}.wg-princ{grid-template-columns:auto minmax(0,1fr)}.wg-princ-a{grid-column:2;justify-self:start;text-align:left;padding-top:0}.wg-esc{grid-template-columns:minmax(0,1fr) auto}.wg-esc p{grid-column:1/-1}}
@media (max-width:820px){.wg-chats,.wg-sim,.wg-gen,.wg-split{grid-template-columns:1fr}.wg-tl-segs button span{display:none}.wg-tl-segs button{justify-content:center}}
@media (max-width:759px){
.wg-hero-in{grid-template-columns:1fr;min-height:0;gap:2px;padding-top:0;padding-bottom:62px}
.wg-hero-txt{gap:13px}
.wg-stage{order:-1;min-height:0;height:190px}
.wg-hero::after{background:linear-gradient(180deg,rgba(var(--wg-bg-rgb),0) 0,rgba(var(--wg-bg-rgb),0) 150px,rgba(var(--wg-bg-rgb),.86) 230px,rgba(var(--wg-bg-rgb),.94) 100%)}
.wg-hero-fx{-webkit-mask-image:radial-gradient(90% 40% at 50% 18%,#000 30%,transparent 85%);mask-image:radial-gradient(90% 40% at 50% 18%,#000 30%,transparent 85%)}
.wg-crest img{width:40px}
.wg-pasos,.wg-metodo,.wg-tiles,.wg-asino,.wg-icp,.wg-partes,.wg-rub-l,.wg-camino{grid-template-columns:1fr}
.wg-relevo,.wg-embudo{grid-template-columns:repeat(2,minmax(0,1fr))}
.wg-relevo li:not(:last-child)::after,.wg-embudo li:not(:last-child)::after,.wg-pant:not(:last-child)::after{content:none}
.wg-relevo li:last-child{grid-column:1/-1}
.wg-gancho{grid-template-columns:1fr}
.wg-chu{grid-template-columns:1fr}
.wg-escalera li:nth-child(2){margin-left:0}
.wg-foot-btns{grid-template-columns:1fr 1fr}
.wg-foot-btns .wg-tengo{grid-column:1/-1;grid-row:1;width:100%}
.wg-foot-btns>:first-child{justify-self:start}
.wg-roja{grid-template-columns:1fr}
.wg-tope{justify-items:start}
.wg-rq-it{grid-template-columns:1fr}
.wg-rq-b{justify-content:flex-start}
.wg-graf-fila,.wg-graf-eje{grid-template-columns:1fr}
.wg-graf-eje>span{display:none}
.wg-contraste>div{grid-template-columns:1fr}
.wg-contraste>div>:first-child{border-right:0}
.wg-contraste>div:first-child{display:none}
.wg-contraste>div:nth-child(2)>:first-child{border-top:0}
.wg-contraste>div>:last-child{border-top:1px dashed var(--wg-line);padding-top:8px}
.wg-contraste>div>:first-child{border-top-width:2px}
.wg-reparto-txt b{font-size:26px}
.wg-sim-res{order:-1;grid-template-columns:auto 1fr;justify-items:start;text-align:left;column-gap:16px;row-gap:4px;padding:16px}
.wg-sim-res .wg-eyebrow{grid-column:1/-1}
.wg-sim-res .wg-sim-nota{font-size:64px}
.wg-sim-res .wg-sim-veredicto{align-self:center}
.wg-sim-res>p:not([class]),.wg-sim-res .wg-btn{grid-column:1/-1}
}
@media (max-width:519px){
.wg-nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.wg-tk{min-height:0;grid-template-columns:auto minmax(0,1fr);align-items:baseline;column-gap:9px;row-gap:3px;padding:9px 10px}
.wg-tk-t{font-size:16px}
.wg-tk-s{grid-column:2}
.wg-board{padding-top:16px;padding-bottom:16px}
.wg-board-top{gap:10px 16px;margin-bottom:12px}
.wg-count b{font-size:44px}
.wg-stage{height:170px}
.wg-hero-lead{display:none}
.wg-hero-cta .wg-btn{min-height:42px;padding:9px 15px;font-size:14.5px}
.wg-libros{grid-template-columns:1fr}.wg-lobos{gap:6px}.wg-lobo{padding:12px 6px}.wg-lobo b{font-size:18px}.wg-face{min-height:280px}}
@media (prefers-reduced-motion:reduce){.wg *,.wg *::before,.wg *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.wg-ticker-track{animation:none!important}}
`;

  // ════════════════════════════════════════════════════════════════════════
  // HTML
  // ════════════════════════════════════════════════════════════════════════
  function hTicker(pct) {
    const it = [
      ['Motivo pronto', '▲ ×2,1', 'wg-up'],
      ['Apertura con permiso', '▲ 11,18 %', 'wg-up'],
      ['«¿Te pillo mal?»', '▼ 2,15 %', 'wg-down'],
      ['Objeciones reflejo', '49,5 %', ''],
      ['Reunión con Héctor', '5 min', ''],
      ['Cierre', '2 horas + silencio', 'wg-up'],
      ['Precio por teléfono', 'no se da', 'wg-down'],
      ['«La web es gratis»', '▼ línea roja', 'wg-down'],
      ['Comisión', '▲ ' + fmtPct(pct) + ' % del beneficio', 'wg-up'],
      ['Llamadas', 'cuando quieras', ''],
    ];
    const una = it.map(([l, v, c]) => `<span>${esc(l)} <b class="${c}">${esc(v)}</b></span>`).join('');
    return una + una;
  }

  function hHero(o, pct) {
    return `<header class="wg-hero">
      <div class="wg-hero-fx" aria-hidden="true"></div>
      <canvas class="wg-cv wg-cv2" aria-hidden="true"></canvas>
      <div class="wg-hero-in wg-pad">
        <div class="wg-hero-txt">
          <div class="wg-crest"><img src="${esc(o.logo)}" alt="Escudo de Wolves of WEBstreet, el equipo de ventas de COMPOUND" width="66" height="80" decoding="async"><p class="wg-eyebrow">Wolves of WEBstreet × COMPOUND<br><span>Guía de ventas oficial</span></p></div>
          <h2 class="wg-h1">La guía <span>del lobo</span></h2>
          <p class="wg-hero-lead">${o.modo === 'suelta' ? 'Ocho capítulos para pasar de cero a sacar reuniones. Al acabar cada uno, pulsa «Lo tengo» y sigue con el siguiente.' : 'Ocho capítulos para pasar de cero a sacar reuniones. Al acabar cada uno, pulsa «Lo tengo»: con los ocho se abre la Prueba 1.'}</p>
          <p class="wg-hero-obj"><span class="wg-eyebrow">Tu único objetivo</span>Una videollamada de 5 minutos con Héctor, con día y hora.</p>
          <div class="wg-hero-cta"><button type="button" class="wg-btn wg-btn-oro" data-wg="continuar" data-k="cta">Empezar por el capítulo 1</button><button type="button" class="wg-btn wg-btn-ghost" data-wg="moneda">Lanzar la moneda</button></div>
        </div>
        <div class="wg-stage" data-wg="moneda" aria-hidden="true"></div>
      </div>
      <div class="wg-ticker" aria-hidden="true"><div class="wg-ticker-track" data-k="ticker">${hTicker(pct)}</div></div>
    </header>`;
  }

  function hBoard(orden) {
    return `<section class="wg-board wg-pad" aria-label="Capítulos de la guía y tu progreso">
      <div class="wg-board-top">
        <p class="wg-count"><b data-k="n">0</b><span>de ${orden.length} leídos</span></p>
        <div class="wg-segs" aria-hidden="true">${orden.map(() => '<i></i>').join('')}</div>
        <div class="wg-board-msg" data-k="msg"></div>
      </div>
      <nav class="wg-nav" aria-label="Capítulos">${orden.map((id, i) => `<button type="button" class="wg-tk" data-wg="ir" data-cap="${id}"><span class="wg-tk-n">${String(i + 1).padStart(2, '0')}</span><span class="wg-tk-t">${esc(CAP[id].corto)}</span><span class="wg-tk-s">Pendiente</span></button>`).join('')}</nav>
      <p class="wg-sr" aria-live="polite" data-k="live"></p>
    </section>`;
  }

  function hCapHead(id, i, n, lead) {
    return `<header class="wg-cap-head"><p class="wg-eyebrow">Capítulo ${i + 1} de ${n} · ${CAP[id].min} min de lectura</p><h3 class="wg-h3" tabindex="-1">${esc(CAP[id].titulo)}</h3>${lead ? `<p class="wg-lead">${lead}</p>` : ''}</header>`;
  }
  function hCapFoot(id, i, orden) {
    const prev = orden[i - 1], next = orden[i + 1];
    return `<footer class="wg-foot">
      <p class="wg-small">${(S && S.opts && S.opts.modo === 'suelta') ? '¿Lo tienes? Pulsa «Lo tengo» y pasa al siguiente.' : '¿Lo tienes? Pulsa «Lo tengo»: cada capítulo leído cuenta para abrir la Prueba 1.'}</p>
      <div class="wg-foot-btns">
        ${prev ? `<button type="button" class="wg-btn wg-btn-ghost" data-wg="ir" data-cap="${prev}">← ${esc(CAP[prev].corto)}</button>` : '<span></span>'}
        <button type="button" class="wg-btn wg-btn-oro wg-tengo" data-wg="tengo" data-cap="${id}">Lo tengo</button>
        ${next ? `<button type="button" class="wg-btn wg-btn-ghost" data-wg="ir" data-cap="${next}">${esc(CAP[next].corto)} →</button>` : '<span></span>'}
      </div>
    </footer>`;
  }
  const dice = (txt, etiqueta, mal) => `<div class="wg-dice${mal ? ' is-mal' : ''}"><small>${esc(etiqueta)}</small><p>${esc(txt)}</p></div>`;

  // ── 1 · Qué vendemos ──
  function cVendemos() {
    return `
    <section class="wg-sec">
      <h4 class="wg-h4">A quién llamas</h4>
      <div class="wg-split">
        <div class="wg-prose">
          <p>A <b>negocios de barrio de toda España</b>: peluquerías, barberías, centros de estética, uñas, talleres, cerrajeros, fisios, clínicas…</p>
          <p class="wg-ojo"><b>Ojo:</b> aquí no se vende el servicio de COMPOUND para tiendas online. Eso es otra cosa.</p>
          <p>El negocio que buscamos tiene dos cosas a la vez:</p>
          <ul class="wg-checks">
            <li><b>Muchas y buenas reseñas en Google.</b> Sus clientes ya están contentos, y se nota.</li>
            <li><b>Sin web, o con una web que da pena.</b> Quien todavía no le conoce no le encuentra, o no se fía.</li>
          </ul>
        </div>
        <figure class="wg-ficha">
          <div class="wg-ficha-card">
            <p class="wg-ficha-tit">Barbería Nájera</p>
            <p class="wg-ficha-est"><b>4,8</b><span class="wg-estr" aria-hidden="true">★★★★★</span><span>(212 reseñas)</span></p>
            <p class="wg-ficha-cat">Barbería · Carabanchel, Madrid</p>
            <div class="wg-ficha-acc"><span>Llamar</span><span>Cómo llegar</span><span class="wg-tachado">Sitio web</span></div>
            <span class="wg-sello">Objetivo</span>
          </div>
          <ul class="wg-ficha-notas"><li>212 reseñas con un 4,8: clientes contentos.</li><li>Sin web: quien no le conoce no le encuentra.</li></ul>
          <figcaption>Ficha de ejemplo, como la verás en Google Maps</figcaption>
        </figure>
      </div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Qué les ofrecemos</h4>
      <ol class="wg-escalera">
        <li><span class="wg-esc-n">1</span><div><b>Primero, una web que les trae clientes.</b> Ya se la estamos preparando, con sus fotos y sus reseñas.</div></li>
        <li><span class="wg-esc-n">2</span><div><b>Y si necesitan más, sistemas con IA</b> que contestan solos a sus clientes, gestionan las citas y los recordatorios y les ahorran horas.</div></li>
      </ol>
      <p>Lo que el negocio necesite, <b>COMPOUND lo construye</b>.</p>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Por qué les interesa</h4>
      <p>Ya tienen clientes contentos: se ve en sus reseñas. Pero quien busca «barbería en Usera» compara en Google y elige a quien le da más confianza. Sin web, ese negocio pierde a los clientes nuevos que comparan.</p>
    </section>
    <section class="wg-sec">
      <div class="wg-meta"><p class="wg-eyebrow">Tu único objetivo en cada llamada</p><p class="wg-meta-big">Una videollamada de 5 minutos con Héctor, <span>con día y hora.</span></p></div>
      <ol class="wg-relevo">
        <li><span class="wg-relevo-c">La llamada · unos 2 min</span><span class="wg-relevo-q">Tú</span><p>Abres la puerta: consigues el día y la hora.</p></li>
        <li><span class="wg-relevo-c">La videollamada · 5 min</span><span class="wg-relevo-q">Héctor</span><p>Enseña lo que les hemos preparado y cierra la venta.</p></li>
        <li><span class="wg-relevo-c">Después</span><span class="wg-relevo-q">COMPOUND</span><p>Construye la web y lo que haga falta.</p></li>
      </ol>
      <p>Tú no vendes la web por teléfono ni das precios. Abres la puerta; Héctor la enseña y cierra. Cuanto mejor la abras, más fácil es el cierre… y más cobras.</p>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">¿Es de los nuestros?</h4>
      <p class="wg-small">Tus 60 negocios ya vendrán elegidos así; esto es para que entiendas por qué. Decide en cada ficha.</p>
      <div class="wg-icp">${ICP.map((x, i) => `<div class="wg-icp-it" data-i="${i}"><p class="wg-icp-txt"><b>${esc(x.n)}</b><span>${esc(x.m)}</span></p><div class="wg-icp-btns"><button type="button" class="wg-btn wg-btn-sm" data-wg="icp" data-i="${i}" data-r="si">Sí, llamo</button><button type="button" class="wg-btn wg-btn-sm wg-btn-ghost" data-wg="icp" data-i="${i}" data-r="no">No es para nosotros</button></div><p class="wg-icp-fb" aria-live="polite"></p></div>`).join('')}</div>
    </section>`;
  }

  // ── 2 · La llamada ──
  function hChat(arr, tipo) {
    return arr.map(([q, t, tag], k) => {
      if (q === 'pausa') return `<li class="wg-msg wg-msg-pausa" data-k="${k}"><span>··· ${esc(t)} ···</span></li>`;
      if (q === 'fin') return `<li class="wg-msg wg-msg-fin" data-k="${k}"><span>${esc(t)}</span></li>`;
      return `<li class="wg-msg wg-msg-${q}" data-k="${k}"><small>${q === 'el' ? 'Rubén' : (tipo === 'mala' ? 'Pepe' : 'Lucía')}</small><p>${esc(t)}</p>${tag ? `<span class="wg-tag">${tipo === 'mala' ? '✗' : '✓'} ${esc(tag)}</span>` : ''}</li>`;
    }).join('');
  }
  function cLlamada() {
    const pts = '0,46 10,40 30,32 60,22 80,12 120,5';
    return `
    <aside class="wg-orden" aria-label="Orden de Héctor">
      <p class="wg-eyebrow">Orden de Héctor</p>
      <ul>
        <li class="no"><b>«Hola, soy X, de la empresa Y, ¿hablo con el dueño?» es terrible.</b> Suena a teleoperador en un segundo y el dueño se pone a la defensiva.</li>
        <li class="si"><b>Empieza interesándote por SU negocio</b>, sin parecer que vendes: «estaba buscando barberías por la zona y no encuentro vuestra web… ¿no tenéis?».</li>
        <li class="si">Pregunta <b>por qué no tiene web</b> y adáptate a lo que te diga.</li>
        <li class="si">Quién eres y COMPOUND, <b>después</b>: cuando ya te escucha, junto con lo que le estamos haciendo. Da credibilidad.</li>
        <li class="si">Habla en plural: <b>«te la enseñamos en 5 minutos»</b>. No hace falta nombrar a nadie: 5 minutos suena fácil de aceptar, aunque luego la reunión se alargue.</li>
        <li class="si">El <b>tono</b> es de lo que más pesa: seguridad, energía y expresión. Que no pases desapercibido.</li>
        <li class="no">Ni <b>«¿te pillo en mal momento?»</b> ni <b>«¿te interesaría?»</b>: las dos se contestan solas, y mal.</li>
      </ul>
    </aside>
    <section class="wg-sec">
      <h4 class="wg-h4">La estructura, con su reloj</h4>
      <div class="wg-tl" data-k="tl">
        <div class="wg-tl-top"><p class="wg-eyebrow">Reloj orientativo · una llamada de unos 2 minutos</p><div class="wg-tl-play"><span class="wg-tl-reloj wg-num" aria-hidden="true" data-k="reloj">0:00</span><button type="button" class="wg-btn wg-btn-sm" data-wg="tl-play" data-k="tl-btn">▶ Reproducir</button></div></div>
        <div class="wg-tl-chart" aria-hidden="true"><svg viewBox="0 0 120 50" preserveAspectRatio="none"><polygon class="wg-tl-area" points="0,50 ${pts} 120,50"></polygon><polyline class="wg-tl-line" points="${pts}" vector-effect="non-scaling-stroke"></polyline></svg><span class="wg-tl-head" data-k="head" style="left:0%"></span></div>
        <div class="wg-tl-segs">${PASOS.slice(0, 5).map((p, i) => `<button type="button" data-wg="tl-paso" data-i="${i}" style="flex:${p.fin - p.ini} 1 0" aria-label="Paso ${i + 1}: ${esc(p.t)}, ${esc(p.reloj)}"><b>${i + 1}</b><span>${esc(p.corto)}</span></button>`).join('')}</div>
        <div class="wg-tl-ticks" aria-hidden="true"><span style="left:0%">0:00</span><span style="left:25%">0:30</span><span style="left:50%">1:00</span><span style="left:75%">1:30</span><span style="left:100%">2:00</span></div>
        <p class="wg-tl-cred">Si te pregunta quién eres antes de tiempo, se lo dices claro y a la primera: tu nombre y COMPOUND. Nunca lo escondas.</p>
      </div>
      <p class="wg-small">En los primeros 15 segundos no vendes nada: preguntas. A los 40 ya sabes por qué no tiene web, y entonces le cuentas quién eres y lo que le estamos haciendo. Toca un paso o pulsa «Reproducir».</p>
      <div class="wg-pasos">${PASOS.map((p, i) => `<article class="wg-paso" data-paso="${i}"><div class="wg-paso-top"><span class="wg-paso-n">${i + 1}</span><span class="wg-paso-t">${esc(p.t)}</span><span class="wg-chip is-oro">${esc(p.reloj)}</span></div><p>${esc(p.que)}</p><p class="wg-q">${esc(p.ej)}</p><p class="wg-no"><b>✗ Así no:</b> ${esc(p.no)}</p></article>`).join('')}</div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Lo que te dirá cuando le preguntes por qué</h4>
      <p class="wg-small">Escucha la respuesta: te dice qué contarle. Una frase y sigues con quién eres.</p>
      <div class="wg-chuleta">${PORQUES.map(x => `<div class="wg-chu"><p class="wg-chu-o">«${esc(x.d)}»</p><div class="wg-chu-r"><p>${esc(x.r)}</p>${x.n ? `<small>${esc(x.n)}</small>` : ''}</div></div>`).join('')}</div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">La misma llamada, bien y mal</h4>
      <p>Barbería Nájera, en Carabanchel: 212 reseñas, un 4,8 y sin web. Contesta Rubén, el dueño, con un cliente en el sillón.</p>
      <div><button type="button" class="wg-btn wg-btn-sm" data-wg="chat-play" data-k="chat-btn">▶ Reproducir las dos llamadas</button></div>
      <div class="wg-chats">
        <div class="wg-chat-col"><div class="wg-chat-h"><p class="wg-h5">La buena</p><span class="wg-chip is-verde">Lucía · método</span></div><ol class="wg-chat" data-k="chat-a">${hChat(CHAT_BUENA, 'buena')}</ol><p class="wg-veredicto is-bien">✓ Reunión el martes a las 10, con nombre y WhatsApp. En menos de dos minutos.</p></div>
        <div class="wg-chat-col"><div class="wg-chat-h"><p class="wg-h5">La mala</p><span class="wg-chip is-rojo">Pepe · teleoperador</span></div><ol class="wg-chat is-mala" data-k="chat-b">${hChat(CHAT_MALA, 'mala')}</ol><p class="wg-veredicto is-mal">✗ Colgó en menos de un minuto. Sin hora, sin nombre y con mal sabor de boca.</p></div>
      </div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Por qué una funciona y la otra no</h4>
      <div class="wg-contraste" role="table" aria-label="Diferencias entre la llamada buena y la mala">
        <div role="row"><span role="columnheader">La buena</span><span role="columnheader">La mala</span></div>
        ${CONTRASTE.map(([a, b]) => `<div role="row"><span role="cell" class="si">${esc(a)}</span><span role="cell" class="no">${esc(b)}</span></div>`).join('')}
      </div>
    </section>`;
  }

  // ── 3 · Ganchos ──
  function cGanchos() {
    const ej = NEGS[0], m = s => esc(s);
    return `
    <div class="wg-regla"><span>!</span><p><b>Regla de oro:</b> todo lo que digas tiene que ser verdad y salir de su ficha. Antes de marcar, mírala: nombre, reseñas, nota, barrio y qué le sale a quien busca su oficio en Google.</p></div>
    <section class="wg-sec">
      <h4 class="wg-h4">Seis ganchos que funcionan</h4>
      <p class="wg-small">El primero es el de Héctor: empieza por ese. Los otros cinco, para cuando quieras cambiar.</p>
      <div class="wg-ganchos">${TIPOS.map(t => `<div class="wg-gancho"><div class="wg-gancho-tipo"><b>${esc(t.n)}</b><span>${esc(t.cuando)}</span></div><p>«${gancho(t.id, ej, m)}»</p></div>`).join('')}</div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Y así no</h4>
      <div class="wg-asino">
        ${dice('«Hola, soy Pepe, de la empresa COMPOUND. ¿Hablo con el dueño?»', 'Así no · suena a teleoperador en un segundo', true)}
        ${dice('«¿Te pillo en mal momento?»', 'Tampoco · es de las peores aperturas medidas', true)}
      </div>
      <p class="wg-small">Ninguno de los seis empieza por tu nombre ni por COMPOUND. Eso llega después, cuando suma.</p>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">La fábrica de ganchos</h4>
      <p>Elige un negocio y un tipo de gancho. Te sale una frase de ejemplo con los datos de muestra de ese negocio. Cuando llames de verdad, los datos los sacas de SU ficha.</p>
      <div class="wg-gen">
        <div class="wg-gen-ctrl">
          <div class="wg-field"><label for="wg-gen-neg">Negocio</label><select id="wg-gen-neg" class="wg-select" data-k="gen-neg">${NEGS.map((n, i) => `<option value="${i}">${esc(n.neg)} · ${esc(n.barrio)}</option>`).join('')}</select></div>
          <div class="wg-field"><span id="wg-gen-tl">Tipo de gancho</span><div class="wg-tipos" role="group" aria-labelledby="wg-gen-tl">${TIPOS.map((t, i) => `<button type="button" data-wg="gen-tipo" data-t="${i}" aria-pressed="${i === 0}">${esc(t.n)}</button>`).join('')}</div></div>
        </div>
        <figure class="wg-gen-out">
          <figcaption><span class="wg-chip is-ambar">Ejemplo · datos de muestra</span><span class="wg-small">Lo subrayado sale de SU ficha</span></figcaption>
          <blockquote class="wg-gen-txt" data-k="gen-txt" aria-live="polite"></blockquote>
          <div class="wg-gen-acc"><button type="button" class="wg-btn wg-btn-sm" data-wg="gen-otro">Otro tipo de gancho</button><button type="button" class="wg-btn wg-btn-sm wg-btn-ghost" data-wg="gen-copiar">Copiar la frase</button></div>
          <ul class="wg-gen-check" aria-label="Antes de usarlo, comprueba"><li>El nombre del dueño, de la ficha o de las reseñas. Si no lo sabes, empieza sin nombre.</li><li>Reseñas y nota: los números exactos de su ficha.</li><li>«No os encuentra»: búscalo tú en Google antes de llamar.</li><li>La cita: copiada tal cual de una reseña real.</li></ul>
        </figure>
      </div>
    </section>`;
  }

  // ── 4 · Objeciones ──
  function cObjeciones() {
    return `
    <section class="wg-sec">
      <div class="wg-mezcla">
        <p class="wg-eyebrow">Qué hay detrás de un «no» en frío · Gong Labs, 2024</p>
        <div class="wg-barra" role="img" aria-label="49,5 % son un reflejo, 42,6 % son de situación (precio, tiempo) y 7,9 % ya tienen algo"><span style="flex:49.5 1 0">49,5 %</span><span style="flex:42.6 1 0">42,6 %</span><span style="flex:7.9 1 0"></span></div>
        <p class="wg-ley"><span><i style="background:var(--wg-gold)"></i>Reflejo: «no me interesa», «mándame info», «estoy liado»</span><span><i style="background:var(--wg-money)"></i>Situación: precio, tiempo, quién decide</span><span><i style="background:var(--wg-muted)"></i>Ya tengo algo: 7,9 %</span></p>
        <p class="wg-small">Datos de llamadas a empresas, en inglés. La lección vale igual: casi la mitad de los «no» del principio son un reflejo, no una decisión.</p>
      </div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">El método, en tres tiempos</h4>
      <ol class="wg-metodo">
        <li><b>1</b><strong>Dale la razón</strong><span>En una frase, sin discutir. Lo que dice tiene su parte de verdad.</span></li>
        <li><b>2</b><strong>Reabre</strong><span>Con una pregunta o un dato de su negocio. Una sola vuelta, no un discurso.</span></li>
        <li><b>3</b><strong>Sal bien</strong><span>Cada objeción tiene su salida correcta, y no siempre es pedir hora. Si repite el no, despedida con simpatía.</span></li>
      </ol>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Las ${OBJ.length}, una a una</h4>
      <div class="wg-modos" role="group" aria-label="Cómo quieres estudiarlas"><button type="button" data-wg="obj-modo" data-m="tarjetas" aria-pressed="true">Tarjetas</button><button type="button" data-wg="obj-modo" data-m="practica" aria-pressed="false">Práctica</button><button type="button" data-wg="obj-modo" data-m="chuleta" aria-pressed="false">Chuleta</button></div>
      <div data-k="m-tarjetas">
        <div class="wg-deck" data-k="deck">
          <div class="wg-deck-top"><span>Tarjeta <b data-k="deck-i">1</b> de ${OBJ.length}</span><span class="wg-chip is-oro" data-k="deck-tag"></span></div>
          <div class="wg-flip" data-wg="girar" data-k="flip">
            <div class="wg-flip-in">
              <div class="wg-face wg-face-a" data-k="cara-a"></div>
              <div class="wg-face wg-face-b" data-k="cara-b" aria-hidden="true"></div>
            </div>
          </div>
          <div class="wg-deck-ctrl"><button type="button" class="wg-btn wg-btn-sm wg-btn-ghost" data-wg="obj-prev" aria-label="Objeción anterior">←</button><button type="button" class="wg-btn wg-btn-sm wg-btn-oro" data-wg="girar" data-k="girar-btn" aria-pressed="false">Girar la tarjeta</button><button type="button" class="wg-btn wg-btn-sm wg-btn-ghost" data-wg="obj-next" aria-label="Objeción siguiente">→</button></div>
          <div class="wg-deck-dots" role="group" aria-label="Ir a una objeción">${OBJ.map((o, i) => `<button type="button" data-wg="obj-ir" data-i="${i}" aria-label="${i + 1}: ${esc(o.o)}">${i + 1}</button>`).join('')}</div>
        </div>
      </div>
      <div data-k="m-practica" hidden><div class="wg-quiz" data-k="quiz"></div></div>
      <div data-k="m-chuleta" hidden><div class="wg-chuleta">${OBJ.map((o, i) => `<div class="wg-chu"><p class="wg-chu-o">${i + 1}. «${esc(o.o)}»<span class="wg-chip">${esc(o.tag)}</span></p><div class="wg-chu-r"><p>${esc(o.di)}</p>${o.extra ? `<small>${esc(o.extra)}</small>` : ''}<small><b>Salida correcta:</b> ${esc(SALIDAS[i])}</small></div></div>`).join('')}</div></div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Y el precio</h4>
      <p>Sin cifra, pero sin esquivarlo: «depende de lo que necesitéis; te lo explicamos con la web delante, y si no te encaja, lo dejamos ahí». Nunca «se paga sola» ni «se recupera»: son promesas, y el dueño las huele.</p>
    </section>`;
  }

  // ── 5 · Los mejores ──
  function cMejores() {
    const fases = ['Abrir', 'Conversar', 'Cerrar'];
    let n = 0;
    const barras = [
      ['Apertura con permiso', 11.18, 'var(--wg-money)'],
      ['«¿Cómo va tu día?»', 7.6, 'var(--wg-muted)'],
      ['«¿Te pillo en mal momento?»', 2.15, 'var(--wg-red)'],
    ];
    return `
    <p class="wg-honesto">Con sinceridad: casi todos estos datos son de llamadas a empresas, en inglés, y los publica Gong, que vende software de ventas. Para un dueño de barbería en España no hay estudios medidos, así que lo hemos adaptado. Úsalo como brújula, no como ley.</p>
    <section class="wg-sec">
      <div class="wg-tiles">
        <div class="wg-tile"><b>×2,1</b><p>más éxito si dices pronto por qué llamas.</p><small>Gong Labs · 2018 · 90.380 llamadas</small></div>
        <div class="wg-tile"><b>49,5 %</b><p>de las objeciones en frío son un reflejo, no un no de verdad.</p><small>Gong Labs · 2024 · más de 300 millones de llamadas</small></div>
        <div class="wg-tile"><b>3,5 s</b><p>habla el cliente por turno en las llamadas que salen bien; 8 s en las que no.</p><small>Gong Labs · 2018 · más de 100.000 llamadas</small></div>
      </div>
    </section>
    <section class="wg-sec">
      <div class="wg-graf">
        <p class="wg-eyebrow">Aperturas medidas · % de éxito · Gong Labs, 2024</p>
        ${barras.map(([l, v, c]) => { const w = v / 12 * 100, txt = dec(v, v % 1 ? String(v).split('.')[1].length : 0) + ' %', dentro = w > 70; return `<div class="wg-graf-fila"><span>${esc(l)}</span><div class="wg-graf-bar" role="img" aria-label="${esc(l)}: ${esc(txt)}"><i style="width:${w.toFixed(2)}%;background:${c}"></i><em class="${dentro ? 'is-dentro' : ''}" style="${dentro ? `right:${(100 - w).toFixed(2)}%` : `left:${w.toFixed(2)}%`}">${esc(txt)}</em></div></div>`; }).join('')}
        <div class="wg-graf-eje" aria-hidden="true"><span></span><div><span style="left:0%">0 %</span><span style="left:25%">3 %</span><span style="left:50%">6 %</span><span style="left:75%">9 %</span><span style="left:100%">12 %</span></div></div>
        <p class="wg-small">La que más sale ese año (11,24 %) es «¿has oído mi nombre por ahí?», que solo vale si ya te conocen. Gong no explica qué cuenta como «éxito» en este estudio.</p>
      </div>
    </section>
    ${fases.map(f => `<section class="wg-sec wg-fase"><div class="wg-fase-h"><p class="wg-h5">${f}</p></div>${PRINCIPIOS.filter(p => p.f === f).map(p => { n++; return `<div class="wg-princ"><span class="wg-princ-n">${n}</span><div class="wg-princ-c"><strong>${esc(p.t)}</strong><p>${esc(p.x)}</p>${p.ej ? `<q>${esc(p.ej)}</q>` : ''}</div><span class="wg-princ-a">${esc(p.a)}</span></div>`; }).join('')}</section>`).join('')}
    <section class="wg-sec">
      <h4 class="wg-h4">Si te pica la curiosidad</h4>
      <div class="wg-libros">${LIBROS.map(l => `<div class="wg-libro"><b>${esc(l.t)}</b><span>${esc(l.a)}</span><p>${esc(l.x)}</p></div>`).join('')}</div>
    </section>`;
  }

  // ── 6 · Líneas rojas ──
  function hTope(t, quien) {
    let s = '';
    for (let i = 1; i <= 10; i++) s += `<i class="${i <= t ? '' : 'off'}"></i>`;
    return `<div class="wg-tope" role="img" aria-label="${esc(quien)} no pasa de ${t} sobre 10"><div class="wg-tope-b">${s}</div><span>${esc(quien)} ≤ ${t}</span></div>`;
  }
  function cRojas() {
    return `
    <section class="wg-sec">
      <h4 class="wg-h4">Líneas rojas · suspenden</h4>
      <div class="wg-rojas">${ROJAS.map(r => `<div class="wg-roja is-grave"><p>${esc(r.t)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</p>${hTope(r.tope, 'La nota')}</div>`).join('')}</div>
      <p class="wg-small">En las llamadas de verdad, cruzar una línea roja te puede costar el puesto. En el sprint de objeciones, una sola línea roja suspende el sprint entero, aunque la media llegue a 6.</p>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Errores serios · hunden la nota</h4>
      <div class="wg-rojas">${SERIOS.map(r => `<div class="wg-roja is-serio"><p>${esc(r.t)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</p>${hTope(r.tope, r.de)}</div>`).join('')}</div>
      <ul class="wg-baja">
        <li>Colgar sin cumplir el objetivo de la llamada (casi siempre, reunión con día y hora): la nota no pasa de 6,9, así que no aprueba.</li>
        <li>Soltar un monólogo sin preguntar nada, o preguntar «¿te interesaría?»: no tienen tope, pero bajan mucho la nota.</li>
      </ul>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">¿Vale, error serio o línea roja?</h4>
      <p class="wg-small">Decide en cada frase. Te decimos al momento si aciertas.</p>
      <div class="wg-rq">${ROJA_QUIZ.map((q, i) => `<div class="wg-rq-it" data-i="${i}"><div class="wg-rq-f"><p>${esc(q.f)}</p>${q.ctx ? `<small>${esc(q.ctx)}</small>` : ''}</div><div class="wg-rq-b"><button type="button" data-wg="roja" data-i="${i}" data-r="vale">Vale</button><button type="button" data-wg="roja" data-i="${i}" data-r="serio">Error serio</button><button type="button" data-wg="roja" data-i="${i}" data-r="roja">Línea roja</button></div><p class="wg-rq-fb" aria-live="polite"></p></div>`).join('')}</div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Cuando llames de verdad</h4>
      <div class="wg-dice"><small>Cuándo llamar</small><p>Cuando quieras: no hay horario. Un truco: en la ficha de cada negocio ves a qué hora abre hoy; si le pillas abierto y sin clientes, te escucha mejor.</p></div>
      <div class="wg-dice is-mal"><small>Los datos de tus negocios</small><p>Se quedan en tu mesa: ni capturas, ni Excel, ni pasárselos a nadie.</p></div>
    </section>`;
  }

  // ── 7 · Cómo cobras ──
  function hCond(c) {
    if (!c) return '<div class="wg-cond"><p class="wg-small">Cargando las condiciones…</p></div>';
    const puntos = Array.isArray(c.puntos) ? c.puntos : [];
    const pend = c.estado != null && c.estado !== 'decidido' ? '<p class="wg-aviso">Pendiente de confirmar por Héctor.</p>' : '';
    return `<div class="wg-cond">${pend}<p class="wg-eyebrow">Las condiciones, tal y como las ha escrito Héctor</p><p class="wg-cond-tit">${esc(c.titular || '')}</p>${puntos.length ? `<ol class="wg-cond-lista">${puntos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}</div>`;
  }
  function cCobras(cond, pct) {
    return `
    <section class="wg-sec" data-k="cond">${hCond(cond)}</section>
    <section class="wg-sec">
      <div class="wg-colega" role="note">
        <p class="wg-eyebrow">¿Has entrado porque te ha traído un compañero del equipo?</p>
        <p class="wg-colega-tit">Entonces el 50 % no es para ti</p>
        <p>Haces la misma guía y las mismas pruebas, pero COMPOUND le paga a quien te trajo: el 50 % del beneficio de vuestras ventas va a él, y <b>tú cobras lo que hayáis acordado entre vosotros</b>. Si no lo tenéis hablado, acláralo con él antes de empezar a llamar.</p>
      </div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Las cuentas, con un ejemplo</h4>
      <p>Imagina una venta que deja <b>400 €</b> de beneficio. Si eres de los lobos principales, tu parte es el <b data-k="pct">${fmtPct(pct)} %</b>: <b data-k="porventa">${eur(400 * pct / 100)}</b> para ti.</p>
      <div class="wg-calc">
        <div class="wg-calc-ctrl">
          <div class="wg-calc-l"><label for="wg-calc-l">Llamadas al día</label><output for="wg-calc-l" data-k="calc-o">20</output></div>
          <input id="wg-calc-l" class="wg-range" type="range" min="10" max="60" step="10" value="20" data-k="calc-l">
          <div class="wg-calc-pre">Ejemplos: ${[20, 40, 60].map(v => `<button type="button" data-wg="calc-pre" data-v="${v}" aria-pressed="${v === 20}">${v} al día</button>`).join('')}</div>
        </div>
        <ol class="wg-embudo">
          <li><span>Llamadas al mes</span><b data-k="e-ll">400</b><small>De lunes a viernes, unos 20 días</small></li>
          <li><span>Reuniones</span><b data-k="e-re">16</b><small>1 de cada 25 llamadas</small></li>
          <li><span>Ventas</span><b data-k="e-ve">4</b><small>Héctor cierra 1 de cada 4</small></li>
          <li class="is-total"><span>Para ti, al mes</span><b data-k="e-tu">800 €</b><small data-k="e-tu-s">4 ventas × 200 €</small></li>
        </ol>
      </div>
      <p class="wg-small" data-k="calc-res"></p>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Monta tu manada, con un ejemplo</h4>
      <p data-k="manada-txt"></p>
      <div class="wg-manada">
        <div class="wg-lobos">${[['Lucas', false], ['Bruno', true], ['Marta', false]].map(([n, jefe]) => `<div class="wg-lobo${jefe ? ' is-jefe' : ''}"><span class="wg-lobo-ava" aria-hidden="true">${n[0]}</span><b>${n}</b><span class="wg-monedas" aria-hidden="true"><i></i><i></i><i></i><i></i></span><small>4 ventas${jefe ? ' · trae a Lucas y a Marta' : ''}</small></div>`).join('')}</div>
        <p class="wg-flecha" data-k="manada-flecha"></p>
        <div class="wg-reparto">
          <div class="wg-reparto-bar" data-k="manada-bar" role="img"></div>
          <div class="wg-reparto-txt" data-k="manada-rep"></div>
        </div>
      </div>
    </section>
    <p class="wg-disclaimer"><b>Son ejemplos, no promesas.</b> Están para que entiendas cómo funciona. Lo que ganes depende de cuántas llamadas hagas, de cómo las hagas y de que cada venta se cierre y se cobre de verdad.</p>`;
  }

  // ── 8 · Las pruebas ──
  const COLORES_RUB = ['var(--wg-gold)', '#d9a93f', '#b98b2c', 'var(--wg-money)', '#ffe39a', 'var(--wg-muted)'];
  function cPruebas() {
    return `
    <section class="wg-sec">
      <h4 class="wg-h4">Tres pantallas, como un videojuego</h4>
      <ol class="wg-camino">
        <li class="wg-pant"><span class="wg-pant-n">Pantalla 1</span><b>Prueba 1</b><p>${(S && S.opts && S.opts.modo === 'suelta') ? 'En la app, con la IA.' : 'Aquí al lado, con la IA.'} Un sprint de objeciones y llamadas de práctica.</p></li>
        <li class="wg-pant"><span class="wg-pant-n">Pantalla 2</span><b>Prueba 2</b><p>Una llamada de verdad, por teléfono, a Héctor.</p></li>
        <li class="wg-pant is-mesa"><span class="wg-pant-n">Premio</span><b>Tu mesa</b><p>60 negocios para llamar, solo tuyos.</p></li>
      </ol>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">${(S && S.opts && S.opts.modo === 'suelta') ? 'Prueba 1 · en la app' : 'Prueba 1 · en la pestaña de al lado'}</h4>
      <p>Dos partes, en el orden que quieras. Las repites todas las veces que quieras: cuenta tu mejor nota.</p>
      <div class="wg-partes">
        <div class="wg-parte"><p class="wg-h5">Sprint de objeciones</p><p>Te salen 8 frases de un dueño, como «no me interesa» o «¿cuánto cuesta?». Escribes qué le contestarías. Sin reloj. La IA pone nota a cada respuesta y te enseña cómo lo diría un buen vendedor.</p><p class="wg-aprueba"><b>6</b>Media de 6, y sin ninguna línea roja: una sola suspende el sprint.</p></div>
        <div class="wg-parte"><p class="wg-h5">Llamadas de práctica</p><p>Son como un chat: la IA hace de dueño de un negocio y tú le escribes lo que le dirías por teléfono, frase a frase. Tu misión: que acepte una reunión con Héctor, con día y hora. Al acabar te pone nota del 0 al 10 y te dice qué mejorar. No se buscan frases exactas: cuenta que sigas la estructura de la guía con tus palabras, te adaptes a lo que te dice y lleves tú la llamada. Y el dueño reacciona como uno de verdad: si no le interesas, se enfría.</p><p class="wg-aprueba"><b>2 × 7</b>Dos llamadas de 7 o más, de dos negocios distintos.</p></div>
      </div>
      <p class="wg-small">La primera vez que corrijas, claude.ai te pedirá permiso para que la página use Claude («Este artefacto usa conectores»): pulsa «Continuar». Cada corrección gasta un poco de tu cuenta de Claude: si te sale un aviso de límite, espera un rato y sigue.</p>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Contra quién practicas</h4>
      <div class="wg-escenas">${ESCENAS.map(e => `<div class="wg-esc"><p class="wg-esc-n"><b>${esc(e.neg)}</b><span>${esc(e.quien)}</span></p><span class="wg-chip ${e.nivel === 'Fácil' ? 'is-verde' : e.nivel === 'Medio' ? 'is-ambar' : 'is-rojo'}">${esc(e.nivel)}</span><p><strong>Ojo:</strong> ${esc(e.ojo)}</p><p><strong>Objetivo:</strong> ${esc(e.obj)}</p></div>`).join('')}</div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Prueba 2 · llamas a Héctor</h4>
      <div class="wg-partes">
        <div class="wg-parte"><p>Con la Prueba 1 aprobada, llamas a Héctor <b>por teléfono, sin avisar</b>, dentro del horario que pone la página de la Prueba 2. Es una llamada en frío de verdad: si no lo coge, prueba más tarde, como harías con un negocio.</p><p>Él hace de <b>dueño de una clínica dental</b>. Tú consigues la videollamada de 5 minutos con día y hora. Llama desde el móvil que pusiste al darte de alta, para que sepa que eres tú.</p></div>
        <div class="wg-parte"><p>Al colgar, Héctor te deja en la app si has aprobado y su feedback. Puntúa seis cosas: gancho, valor preparado, preguntas, objeciones y precio, cierre con hora, y tono, seguridad y expresión, que es de lo que más pesa.</p><p class="wg-aprueba"><b>60</b>Con las dos pruebas aprobadas, tu mesa: 60 negocios para llamar.</p></div>
      </div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Cómo se corrige cada llamada de práctica</h4>
      <div class="wg-rub">
        <div class="wg-rub-bar" role="img" aria-label="Pesos: ${CRITERIOS.map(c => c.txt + ' ' + c.peso + ' %').join(', ')}">${CRITERIOS.map((c, i) => `<span style="flex:${c.peso} 1 0;background:${COLORES_RUB[i]}">${c.peso}</span>`).join('')}</div>
        <div class="wg-rub-l">${CRITERIOS.map((c, i) => `<div class="wg-rub-it"><div class="wg-rub-h"><i style="background:${COLORES_RUB[i]}"></i><strong>${esc(c.txt)}</strong><b>${c.peso} %</b></div><p>${esc(c.d)}</p><details><summary>Qué es un 3, un 5, un 7 y un 9</summary><div class="wg-anclas">${c.a.split(/;\s*(?=\d = )/).map(x => { const mm = x.match(/^(\d) = ([\s\S]*)$/); return mm ? `<div><b>${mm[1]}</b><span>${esc(mm[2].replace(/\.$/, ''))}</span></div>` : ''; }).join('')}</div></details></div>`).join('')}</div>
        <p class="wg-plus"><b class="big">+0,5</b><span><b>Plus de credibilidad.</b> Nombrar a COMPOUND (y que somos proveedor tecnológico de Meta) a mitad de llamada, cuando da confianza. No es obligatorio. Abrir con ello, en cambio, resta.</span></p>
      </div>
    </section>
    <section class="wg-sec">
      <h4 class="wg-h4">Juega con la nota</h4>
      <p>Mueve las barras y marca lo que pasó en la llamada. La nota sale con la misma cuenta que usa hoy la Prueba 1.</p>
      <div class="wg-sim" data-k="sim">
        <div class="wg-sim-crit">
          ${CRITERIOS.map(c => `<div class="wg-sim-row" data-c="${c.id}"><label for="wg-sim-${c.id}">${esc(c.txt)}<span>${c.peso} %</span></label><output for="wg-sim-${c.id}" data-k="o-${c.id}">7</output><input id="wg-sim-${c.id}" class="wg-range" type="range" min="0" max="10" step="1" value="7" data-sim="${c.id}"></div>`).join('')}
          <div class="wg-sim-checks">
            ${[['objetivo', true, 'Conseguí el objetivo', 'reunión con día y hora, o lo que pida ese negocio'], ['cred', false, 'Nombré a COMPOUND cuando sumaba', '+0,5'], ['tele', false, 'Abrí como un teleoperador', 'el gancho no pasa de 4'], ['precio', false, 'Di un precio cerrado', 'objeciones ≤ 3 y nota ≤ 6'], ['promete', false, 'Prometí un resultado concreto', 'nota ≤ 5'], ['presiona', false, 'Presioné tras dos noes', 'cierre ≤ 3 y nota ≤ 5'], ['roja', false, 'Crucé una línea roja grave', 'nota ≤ 3'], ['nollames', false, 'Insistí tras «no me llaméis más»', 'nota ≤ 2']].map(([k, on, t, s]) => `<label class="wg-check" for="wg-sim-k-${k}"><input id="wg-sim-k-${k}" type="checkbox" data-simk="${k}"${on ? ' checked' : ''}><span>${esc(t)} <small>· ${esc(s)}</small></span></label>`).join('')}
          </div>
        </div>
        <div class="wg-sim-res" data-k="sim-res" aria-live="polite"><p class="wg-eyebrow">Tu nota</p><p class="wg-sim-nota" data-k="sim-nota">7,0</p><p class="wg-sim-veredicto" data-k="sim-ver">Aprobada</p><p data-k="sim-mot"></p><button type="button" class="wg-btn wg-btn-sm wg-btn-ghost" data-wg="sim-reset">Volver a 7 en todo</button></div>
      </div>
    </section>`;
  }

  const LEADS = {
    'c-vendemos': 'Antes de marcar tienes que tener clarísimas tres cosas: a quién llamas, qué les ofrecemos y para qué llamas. Caben en esta página.',
    'c-llamada': 'Una buena llamada dura unos dos minutos y siempre tiene la misma forma. Apréndetela y deja que suene a ti, no a un guion.',
    'c-ganchos': 'El gancho son tus primeros 5-10 segundos y decide si te escucha o te cuelga. En 30 segundos tiene que pensar: «¿quién es este?… no sé, pero me ha interesado».',
    'c-objeciones': 'Casi todos dicen que no al principio. Un «no» de primeras no es un no: es un reflejo. Aquí tienes las 17 que te vas a encontrar, qué contestar y cómo salir de cada una.',
    'c-mejores': 'Esto no nos lo inventamos: es lo que se repite entre los mejores vendedores del mundo y en estudios de cientos de miles de llamadas grabadas.',
    'c-rojas': 'Hay cosas que no se dicen nunca. Si cruzas una línea roja, la llamada suspende. Estos son los topes de nota, tal y como los aplica el examen.',
    'c-cobras': 'Cobras por cada venta que sale de una reunión tuya. Primero, las condiciones tal y como las ha escrito Héctor. Después, las cuentas con ejemplos. Si te ha traído un compañero, lee el aviso amarillo: tus condiciones son otras.',
    'c-pruebas': 'Para tener tu mesa de llamadas con 60 negocios hay que pasar dos pruebas. Así funcionan y así se aprueban.',
  };
  function hCap(id, i, orden, cond, pct) {
    const cuerpo = {
      'c-vendemos': cVendemos, 'c-llamada': cLlamada, 'c-ganchos': cGanchos, 'c-objeciones': cObjeciones,
      'c-mejores': cMejores, 'c-rojas': cRojas, 'c-cobras': () => cCobras(cond, pct), 'c-pruebas': cPruebas,
    }[id];
    return `<article class="wg-cap" data-cap="${id}" aria-labelledby="wg-t-${id}" hidden>${hCapHead(id, i, orden.length, LEADS[id]).replace('<h3 class="wg-h3"', `<h3 class="wg-h3" id="wg-t-${id}"`)}${cuerpo()}${hCapFoot(id, i, orden)}</article>`;
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEXTURAS COMPARTIDAS (canvas)
  // ════════════════════════════════════════════════════════════════════════
  let billeteCache = null;
  function billeteCanvas() {
    if (billeteCache) return billeteCache;
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 512, 256);
    lg.addColorStop(0, '#0d5534'); lg.addColorStop(0.5, '#1c8a55'); lg.addColorStop(1, '#0b4a2d');
    g.fillStyle = lg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = 'rgba(220,255,232,.55)'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 228);
    g.lineWidth = 2; g.strokeRect(26, 26, 460, 204);
    g.strokeStyle = 'rgba(200,255,220,.16)'; g.lineWidth = 1.5;
    for (let k = 0; k < 16; k++) { g.beginPath(); for (let x = 30; x <= 482; x += 4) { const y = 128 + Math.sin(x * 0.045 + k * 0.42) * (34 + k * 3); if (x === 30) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(241,196,90,.95)'; g.beginPath(); g.arc(122, 128, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(11,63,39,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(122, 128, 50, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#0b3f27'; g.font = `900 84px ${F_CANVAS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('€', 122, 132);
    g.strokeStyle = 'rgba(241,196,90,.85)'; g.lineWidth = 5; g.beginPath(); g.arc(392, 128, 50, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(241,196,90,.92)'; g.font = `900 62px ${F_CANVAS}`; g.fillText('W', 392, 132);
    g.fillStyle = 'rgba(230,255,238,.78)'; g.font = '600 17px "IBM Plex Mono", monospace'; g.fillText('WOLVES OF WEBSTREET', 256, 47); g.fillText('COMPOUND', 256, 213);
    billeteCache = c;
    return c;
  }
  function imagenLimpia(img) {
    // ¿se puede subir a WebGL? (una imagen de otro origen ensucia el canvas y WebGL la rechaza)
    try { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 2, 2); g.getImageData(0, 0, 1, 1); return true; } catch (e) { return false; }
  }
  function textoCirculo(g, txt, cx, cy, r, px, peso) {
    let fs = px;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const medir = s => { g.font = `${peso} ${fs}px ${F_CANVAS}`; const ws = Array.from(s).map(ch => g.measureText(ch).width); return { ws, tot: ws.reduce((a, b) => a + b, 0) }; };
    const circ = 2 * Math.PI * r;
    let s = txt, m = medir(s);
    if (m.tot > circ) { fs = fs * circ / m.tot * 0.98; m = medir(s); }
    let reps = 1;
    while (m.tot * (reps + 1) / reps <= circ * 0.9 && reps < 4 && m.tot / reps * (reps + 1) <= circ * 0.9) { reps++; }
    if (reps > 1) { s = txt.repeat(reps); m = medir(s); }
    const k = circ / m.tot;
    let a = -Math.PI / 2;
    Array.from(s).forEach((ch, i) => {
      const w = m.ws[i] * k, mid = a + w / 2 / r;
      g.save(); g.translate(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r); g.rotate(mid + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
      a += w / r;
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // HÉROE · moneda 2D (respaldo)
  // ════════════════════════════════════════════════════════════════════════
  function crear2D(cv, hero, stage, d) {
    const g = cv.getContext('2d');
    if (!g) return null;
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, r = 60;
    let spin = d.rm ? 0.38 : -Math.PI * 4, intro = d.rm ? -1 : 0, flip = null, pct = d.pct, lobo = d.lobo, burst = false;
    const nota = billeteCanvas();
    const B = [];
    const nace = (b, arriba) => { b.x = Math.random() * W; b.y = arriba ? -40 - Math.random() * 160 : Math.random() * H; b.vy = 24 + Math.random() * 26; b.vx = 0; b.rot = Math.random() * 6.28; b.vr = (Math.random() - 0.5) * 1.4; b.ph = Math.random() * 6.28; b.s = 0.45 + Math.random() * 0.6; };
    function medir() {
      const R = hero.getBoundingClientRect(), S = stage.getBoundingClientRect();
      if (R.width < 2 || R.height < 2) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = R.width; H = R.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cx = S.left - R.left + S.width / 2; cy = S.top - R.top + S.height / 2; r = Math.max(30, Math.min(S.width, S.height) * 0.38);
      const nb = W < 640 ? 10 : 16;
      while (B.length < nb) { const b = {}; nace(b, false); B.push(b); }
      B.length = nb;
      return true;
    }
    function rafaga() { B.forEach(b => { if (Math.random() > 0.65) return; const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 200; b.x = cx; b.y = cy; b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v - 120; }); }
    function moneda(dy) {
      const c = Math.cos(spin), s = Math.sin(spin), sx = Math.max(Math.abs(c), 0.03), frente = c >= 0;
      const th = r * 0.15, off = s * th * 0.5;
      g.save(); g.translate(cx, cy - dy);
      const halo = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.9);
      halo.addColorStop(0, 'rgba(241,196,90,.20)'); halo.addColorStop(1, 'rgba(241,196,90,0)');
      g.fillStyle = halo; g.fillRect(-r * 2, -r * 2, r * 4, r * 4);
      // canto: pila de elipses entre las dos caras
      for (let k = 0; k <= 10; k++) { const x = -off + (2 * off) * (k / 10); g.beginPath(); g.ellipse(x, 0, r * sx, r, 0, 0, Math.PI * 2); g.fillStyle = k % 2 ? '#9a6c1a' : '#b8862a'; g.fill(); }
      const fx = frente ? off : -off;
      g.translate(fx, 0); g.scale(sx, 1);
      const rg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      rg.addColorStop(0, '#ffeaa8'); rg.addColorStop(0.5, '#f1c45a'); rg.addColorStop(1, '#a8771f');
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
      g.lineWidth = r * 0.05; g.strokeStyle = '#ffe39a'; g.beginPath(); g.arc(0, 0, r * 0.93, 0, Math.PI * 2); g.stroke();
      g.lineWidth = r * 0.02; g.strokeStyle = 'rgba(120,80,10,.7)'; g.beginPath(); g.arc(0, 0, r * 0.85, 0, Math.PI * 2); g.stroke();
      if (frente && lobo) {
        g.save(); g.beginPath(); g.arc(0, 0, r * 0.6, 0, Math.PI * 2); g.clip();
        try { g.drawImage(lobo, -r * 0.6, -r * 0.6, r * 1.2, r * 1.2); } catch (e) { /* imagen no disponible */ }
        g.restore();
        g.lineWidth = r * 0.04; g.strokeStyle = '#ffe39a'; g.beginPath(); g.arc(0, 0, r * 0.61, 0, Math.PI * 2); g.stroke();
      } else {
        const t = frente ? 'W' : fmtPct(pct) + ' %';
        let fs = r * (frente ? 0.9 : 0.62);
        g.font = `900 ${fs}px ${F_CANVAS}`; const w = g.measureText(t).width;
        if (w > r * 1.3) { fs *= r * 1.3 / w; g.font = `900 ${fs}px ${F_CANVAS}`; }
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(255,240,190,.9)'; g.fillText(t, -1.5, -1.5 + fs * 0.04);
        g.fillStyle = '#8a5d12'; g.fillText(t, 0, fs * 0.04);
      }
      g.restore();
    }
    function dibujar(t, dy) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      B.forEach(b => {
        g.save(); g.translate(b.x, b.y); g.rotate(b.rot);
        const fy = Math.cos(t * 1.6 + b.ph);
        g.scale(b.s, b.s * (0.3 + 0.7 * Math.abs(fy))); g.globalAlpha = 0.3 + b.s * 0.55;
        g.drawImage(nota, -56, -28, 112, 56); g.restore();
      });
      moneda(dy);
    }
    return {
      modo: '2d',
      medir,
      frame(dt, t, inp, boost) {
        let dy = 0;
        if (intro >= 0) {
          intro += dt; const k = Math.min(1, intro / 1.2);
          dy = (1 - easeOutBack(k)) * r * 2.2; spin = -Math.PI * 4 * (1 - easeOutCubic(k)) + 0.38;
          if (!burst && k > 0.75) { burst = true; rafaga(); }
          if (k >= 1) intro = -1;
        } else if (flip) {
          flip.t += dt; const k = Math.min(1, flip.t / 1.3);
          spin = flip.de + (flip.a - flip.de) * easeOutCubic(k); dy = Math.sin(Math.PI * k) * r * 0.7;
          if (k >= 1) { spin = flip.a; flip = null; }
        } else spin += (0.55 + boost) * dt;
        B.forEach(b => {
          b.vy += ((24 + b.s * 20) - b.vy) * Math.min(1, dt * 1.5); b.vx += -b.vx * Math.min(1, dt * 1.3);
          b.x += (b.vx + Math.sin(t * 0.9 + b.ph) * 18) * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
          if (b.y > H + 50) nace(b, true);
        });
        dibujar(t, dy + Math.sin(t * 1.3) * 3);
      },
      estatico() { if (!W) return; dibujar(0, 0); },
      lanzar(estatico) {
        if (estatico) { spin = Math.cos(spin) >= 0 ? Math.PI + 0.38 : 0.38; this.estatico(); return; }
        flip = { t: 0, de: spin, a: spin + Math.PI * 5 }; rafaga();
      },
      rafaga,
      setPct(p) { pct = p; },
      setLobo(img) { lobo = img; },
      destroy() { B.length = 0; try { g.clearRect(0, 0, cv.width, cv.height); } catch (e) { /* nada */ } },
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // HÉROE · moneda 3D (three.js r128)
  // ════════════════════════════════════════════════════════════════════════
  let threeProm = null;
  function cargarThree() {
    if (window.THREE && window.THREE.WebGLRenderer) return Promise.resolve(window.THREE);
    if (threeProm) return threeProm;
    threeProm = new Promise((res, rej) => {
      let s = document.getElementById('wg-three');
      const ok = () => (window.THREE && window.THREE.WebGLRenderer ? res(window.THREE) : rej(new Error('three sin THREE')));
      if (!s) { s = document.createElement('script'); s.id = 'wg-three'; s.src = THREE_URL; s.async = true; document.head.appendChild(s); }
      s.addEventListener('load', ok, { once: true });
      s.addEventListener('error', () => rej(new Error('three no carga')), { once: true });
      setTimeout(() => rej(new Error('three tarda demasiado')), 15000);
    });
    threeProm.catch(() => { threeProm = null; });
    return threeProm;
  }
  function fuentesListas(ms) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
      Promise.all([document.fonts.load(`900 64px "Big Shoulders Display"`), document.fonts.load(`800 64px "Big Shoulders Display"`)]).catch(() => {}),
      new Promise(r => setTimeout(r, ms)),
    ]);
  }

  function crear3D(T, cv, hero, stage, d) {
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    if (!renderer || !renderer.getContext()) return null;
    const tirar = [];
    const guarda = o => { tirar.push(o); return o; };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;

    const scene = new T.Scene();
    scene.fog = new T.Fog(0x06100c, 11.5, 21);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 80);
    cam.position.set(0, 0, 11);
    const halfH = z => (cam.position.z - z) * Math.tan(T.MathUtils.degToRad(cam.fov / 2));

    // Entorno HDR para que el oro refleje algo: degradado + cuatro «softboxes».
    const pm = new T.PMREMGenerator(renderer);
    const env = new T.Scene();
    const gcv = document.createElement('canvas'); gcv.width = 8; gcv.height = 256;
    const gg = gcv.getContext('2d'); const lg = gg.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, '#fff0cc'); lg.addColorStop(0.3, '#a8792c'); lg.addColorStop(0.5, '#4a300c'); lg.addColorStop(0.7, '#120d05'); lg.addColorStop(1, '#0f4a2c');
    gg.fillStyle = lg; gg.fillRect(0, 0, 8, 256);
    const gtex = new T.CanvasTexture(gcv); gtex.encoding = T.sRGBEncoding;
    env.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.MeshBasicMaterial({ map: gtex, side: T.BackSide })));
    const caja = (col, k, x, y, z, w, h) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    caja(0xfff3dc, 6, 0, 8, 5, 12, 3);
    caja(0xffd58a, 3.2, -9, 1, 3, 3, 9);
    caja(0x3cff9e, 2.0, 9, -1, 2, 3, 9);
    caja(0xffcf7a, 1.1, 7, 4, 8, 3, 3);
    const envRT = guarda(pm.fromScene(env, 0.03));
    scene.environment = envRT.texture;
    env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    gtex.dispose(); pm.dispose();
    const luz = new T.DirectionalLight(0xffe2b0, 0.7); luz.position.set(5, 6, 4); scene.add(luz);

    // Moneda
    const R = 1.5, TH = 0.2, RF = R * 0.93;
    const pivot = new T.Group(), coin = new T.Group();
    pivot.add(coin); scene.add(pivot);
    const oroColor = new T.Color(1.0, 0.77, 0.36);
    const oro = extra => guarda(new T.MeshStandardMaterial(Object.assign({ color: oroColor, metalness: 1, roughness: 0.3, fog: false }, extra || {})));

    const est = document.createElement('canvas'); est.width = 1024; est.height = 4;
    const eg = est.getContext('2d'); eg.fillStyle = '#000'; eg.fillRect(0, 0, 1024, 4); eg.fillStyle = '#fff';
    for (let i = 0; i < 150; i++) eg.fillRect(i * 1024 / 150, 0, 1024 / 300, 4);
    const estTex = guarda(new T.CanvasTexture(est)); estTex.wrapS = T.RepeatWrapping;
    const prof = [[RF, -TH / 2], [R * 0.968, -TH / 2], [R * 0.992, -TH * 0.36], [R, -TH * 0.2], [R, TH * 0.2], [R * 0.992, TH * 0.36], [R * 0.968, TH / 2], [RF, TH / 2]].map(p => new T.Vector2(p[0], p[1]));
    const cantoGeo = guarda(new T.LatheGeometry(prof, 160)); cantoGeo.rotateX(Math.PI / 2);
    coin.add(new T.Mesh(cantoGeo, oro({ bumpMap: estTex, bumpScale: 0.012, roughness: 0.34 })));

    function texCara(lado, pctv) {
      const S = 1024, c = S / 2;
      const hacer = (alto, campo, blur) => {
        const a = document.createElement('canvas'); a.width = a.height = S;
        const g = a.getContext('2d');
        g.fillStyle = campo; g.fillRect(0, 0, S, S);
        g.fillStyle = alto;
        g.beginPath(); g.arc(c, c, c * 0.995, 0, Math.PI * 2); g.arc(c, c, c * 0.905, 0, Math.PI * 2, true); g.fill();
        for (let i = 0; i < 96; i++) { const an = i / 96 * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(an) * c * 0.865, c + Math.sin(an) * c * 0.865, c * 0.011, 0, Math.PI * 2); g.fill(); }
        const txt = lado === 'a' ? 'WOLVES OF WEBSTREET • COMPOUND SALES TEAM • ' : 'TU PARTE • WOLVES OF WEBSTREET • COMPOUND • ';
        textoCirculo(g, txt, c, c, c * 0.755, Math.round(S * 0.06), 800);
        if (lado === 'b') {
          const t = fmtPct(pctv) + ' %';
          let fs = S * 0.34; g.font = `900 ${fs}px ${F_CANVAS}`;
          const w = g.measureText(t).width, maxW = S * 0.54;
          if (w > maxW) { fs *= maxW / w; g.font = `900 ${fs}px ${F_CANVAS}`; }
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(t, c, c + fs * 0.03);
          g.fillRect(c - S * 0.15, c - fs * 0.6, S * 0.3, S * 0.008);
          g.fillRect(c - S * 0.15, c + fs * 0.58, S * 0.3, S * 0.008);
        } else {
          g.lineWidth = S * 0.012; g.strokeStyle = alto; g.beginPath(); g.arc(c, c, c * 0.63, 0, Math.PI * 2); g.stroke();
        }
        if (!blur) return a;
        const b = document.createElement('canvas'); b.width = b.height = S;
        const bg = b.getContext('2d');
        try { bg.filter = 'blur(2px)'; } catch (e) { /* sin filtro */ }
        bg.drawImage(a, 0, 0);
        return b;
      };
      const bump = guarda(new T.CanvasTexture(hacer('#ffffff', '#000000', true)));
      const rough = guarda(new T.CanvasTexture(hacer('#3c3c3c', '#787878', false)));
      bump.anisotropy = rough.anisotropy = maxAniso;
      return { bump, rough };
    }
    const caraGeo = guarda(new T.CircleGeometry(RF, 128));
    let tA = texCara('a', d.pct), tB = texCara('b', d.pct);
    const matA = oro({ bumpMap: tA.bump, bumpScale: 0.028, roughnessMap: tA.rough, roughness: 1 });
    const matB = oro({ bumpMap: tB.bump, bumpScale: 0.028, roughnessMap: tB.rough, roughness: 1 });
    const caraA = new T.Mesh(caraGeo, matA); caraA.position.z = TH / 2;
    const caraB = new T.Mesh(caraGeo, matB); caraB.rotation.y = Math.PI; caraB.position.z = -TH / 2;
    coin.add(caraA, caraB);

    // Incrustación central: el lobo (o una «W» si la imagen no se puede usar)
    function texInc(img) {
      const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S / 2);
      rg.addColorStop(0, '#1d6b45'); rg.addColorStop(1, '#0a2e1d');
      g.fillStyle = rg; g.fillRect(0, 0, S, S);
      if (img) { g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip(); g.drawImage(img, 0, 0, S, S); g.restore(); }
      else { g.fillStyle = '#f1c45a'; g.font = `900 ${S * 0.6}px ${F_CANVAS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('W', S / 2, S / 2 + S * 0.03); }
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso;
      return t;
    }
    let incTex = texInc(d.lobo && imagenLimpia(d.lobo) ? d.lobo : null);
    const incMat = guarda(new T.MeshPhysicalMaterial({ map: incTex, metalness: 0.05, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.08, fog: false }));
    const incGeo = guarda(new T.CircleGeometry(R * 0.555, 96));
    const inc = new T.Mesh(incGeo, incMat); inc.position.z = TH / 2 + 0.004; coin.add(inc);
    const biselGeo = guarda(new T.TorusGeometry(R * 0.56, 0.032, 12, 128));
    const bisel = new T.Mesh(biselGeo, oro({ roughness: 0.2 })); bisel.position.z = TH / 2 + 0.006; coin.add(bisel);

    // Billetes cayendo
    const ancho = hero.clientWidth || 800;
    const N = ancho < 640 ? 16 : 32;
    const notaTex = guarda(new T.CanvasTexture(billeteCanvas())); notaTex.encoding = T.sRGBEncoding; notaTex.anisotropy = maxAniso;
    const notaGeo = guarda(new T.PlaneGeometry(1.0, 0.5, 8, 1));
    const np = notaGeo.attributes.position;
    for (let i = 0; i < np.count; i++) np.setZ(i, Math.cos(np.getX(i) * 2.6) * 0.07);
    notaGeo.computeVertexNormals();
    const notaMat = guarda(new T.MeshStandardMaterial({ map: notaTex, roughness: 0.72, metalness: 0, side: T.DoubleSide }));
    const notas = new T.InstancedMesh(notaGeo, notaMat, N);
    notas.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(notas);
    const B = [], dummy = new T.Object3D();
    const nace = (b, arriba) => {
      b.z = -5 + Math.random() * 7;
      const hh = halfH(b.z), hw = hh * cam.aspect;
      b.x = (Math.random() * 2 - 1) * hw;
      b.y = arriba ? hh + 0.6 + Math.random() * 2.5 : (Math.random() * 2 - 1) * hh;
      b.vx = 0; b.vy = -(0.4 + Math.random() * 0.3);
      b.rx = Math.random() * 6.28; b.ry = Math.random() * 6.28; b.rz = Math.random() * 6.28;
      b.wx = (Math.random() - 0.5) * 2.2; b.wy = (Math.random() - 0.5) * 1.6; b.wz = (Math.random() - 0.5) * 1.2;
      b.ph = Math.random() * 6.28; b.amp = 0.2 + Math.random() * 0.35; b.s = 0.75 + Math.random() * 0.45;
    };
    for (let i = 0; i < N; i++) { const b = {}; nace(b, false); B.push(b); }
    function pasoNotas(dt, t) {
      for (let i = 0; i < N; i++) {
        const b = B[i];
        const term = -(0.42 + b.s * 0.22);
        b.vy += (term - b.vy) * Math.min(1, dt * 1.5);
        b.vx += -b.vx * Math.min(1, dt * 1.2);
        b.x += (b.vx + Math.sin(t * 0.9 + b.ph) * b.amp) * dt;
        b.y += b.vy * dt;
        b.rx += b.wx * dt; b.ry += b.wy * dt; b.rz += b.wz * dt;
        if (b.y < -halfH(b.z) - 1) nace(b, true);
        dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(b.rx, b.ry, b.rz); dummy.scale.setScalar(b.s); dummy.updateMatrix();
        notas.setMatrixAt(i, dummy.matrix);
      }
      notas.instanceMatrix.needsUpdate = true;
    }
    function rafaga() {
      const c = pivot.position;
      for (let i = 0; i < N; i++) {
        if (Math.random() > 0.7) continue;
        const b = B[i], a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 2.8;
        b.x = c.x + Math.cos(a) * 0.5; b.y = c.y + Math.sin(a) * 0.5; b.z = (Math.random() - 0.35) * 2.4;
        b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v + 1.8;
      }
    }

    // Polvo de oro
    const NP = 110, pp = new Float32Array(NP * 3), pv = new Float32Array(NP);
    for (let i = 0; i < NP; i++) { pp[i * 3] = (Math.random() * 2 - 1) * 8; pp[i * 3 + 1] = (Math.random() * 2 - 1) * 4.5; pp[i * 3 + 2] = -4 + Math.random() * 6; pv[i] = 0.08 + Math.random() * 0.22; }
    const pgeo = guarda(new T.BufferGeometry()); pgeo.setAttribute('position', new T.BufferAttribute(pp, 3));
    const pcv = document.createElement('canvas'); pcv.width = pcv.height = 64;
    const pgc = pcv.getContext('2d'); const prg = pgc.createRadialGradient(32, 32, 0, 32, 32, 32);
    prg.addColorStop(0, 'rgba(255,244,210,1)'); prg.addColorStop(0.35, 'rgba(255,214,120,.55)'); prg.addColorStop(1, 'rgba(255,200,100,0)');
    pgc.fillStyle = prg; pgc.fillRect(0, 0, 64, 64);
    const ptex = guarda(new T.CanvasTexture(pcv));
    const pmat = guarda(new T.PointsMaterial({ size: 0.08, map: ptex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: 0xffd27a, opacity: 0.85 }));
    scene.add(new T.Points(pgeo, pmat));

    // Colocación según el hueco del héroe
    let escala = 1;
    const base = new T.Vector3();
    function medir() {
      const H = hero.getBoundingClientRect(), S = stage.getBoundingClientRect();
      const w = Math.round(H.width), h = Math.round(H.height);
      if (w < 2 || h < 2) return false;
      renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      const hh = halfH(0), hw = hh * cam.aspect;
      const nx = ((S.left + S.width / 2) - H.left) / w * 2 - 1;
      const ny = -(((S.top + S.height / 2) - H.top) / h * 2 - 1);
      base.set(nx * hw, ny * hh, 0);
      const pxU = h / (2 * hh);
      escala = Math.max(0.25, (Math.min(S.width, S.height) * 0.4) / pxU / R);
      pivot.scale.setScalar(escala);
      pivot.position.copy(base);
      return true;
    }

    let spin = d.rm ? 0.42 : -Math.PI * 5, intro = d.rm ? -1 : 0, flip = null, burst = false;
    const tilt = { x: 0, y: 0 };
    function pintar(dt, t, inp, boost, quieto) {
      let dy = 0;
      if (!quieto) {
        if (intro >= 0) {
          intro += dt; const k = Math.min(1, intro / 1.25);
          dy = (1 - easeOutBack(k)) * 3.4; spin = -Math.PI * 5 * (1 - easeOutCubic(k)) + 0.42;
          if (!burst && k > 0.72) { burst = true; rafaga(); }
          if (k >= 1) intro = -1;
        } else if (flip) {
          flip.t += dt; const k = Math.min(1, flip.t / 1.3);
          spin = flip.de + (flip.a - flip.de) * easeOutCubic(k); dy = Math.sin(Math.PI * k) * 1.1;
          if (k >= 1) { spin = flip.a; flip = null; }
        } else spin += (0.5 + boost) * dt;
        tilt.x += (inp.y * 0.35 - tilt.x) * Math.min(1, dt * 4);
        tilt.y += (inp.x * 0.3 - tilt.y) * Math.min(1, dt * 4);
        pasoNotas(dt, t);
        for (let i = 0; i < NP; i++) { pp[i * 3 + 1] += pv[i] * dt; if (pp[i * 3 + 1] > 4.6) pp[i * 3 + 1] = -4.6; }
        pgeo.attributes.position.needsUpdate = true;
      }
      coin.rotation.y = spin + tilt.y;
      pivot.rotation.x = -tilt.x;
      pivot.position.set(base.x, base.y + (dy + (quieto ? 0 : Math.sin(t * 1.3) * 0.05)) * escala, 0);
      renderer.render(scene, cam);
    }
    if (d.rm) { pasoNotas(0, 0); }

    return {
      modo: '3d',
      medir,
      frame(dt, t, inp, boost) { pintar(dt, t, inp, boost, false); },
      estatico() { pasoNotas(0, 0); pintar(0, 0, { x: 0, y: 0 }, 0, true); },
      lanzar(estatico) {
        if (estatico) { spin = Math.cos(spin) >= 0 ? Math.PI + 0.42 : 0.42; this.estatico(); return; }
        flip = { t: 0, de: spin, a: spin + Math.PI * 5 }; rafaga();
      },
      rafaga,
      setPct(p) {
        const nuevo = texCara('b', p);
        matB.bumpMap = nuevo.bump; matB.roughnessMap = nuevo.rough; matB.needsUpdate = true;
        tB = nuevo;
      },
      setLobo(img) {
        if (!img || !imagenLimpia(img)) return;
        const t = texInc(img); const viejo = incMat.map; incMat.map = t; incMat.needsUpdate = true; incTex = t;
        if (viejo) viejo.dispose();
      },
      destroy() {
        try { tirar.forEach(o => { if (o && o.dispose) o.dispose(); }); if (incTex) incTex.dispose(); notas.dispose && notas.dispose(); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) { /* nada */ }
      },
    };
  }

  // Controlador del héroe: 2D al instante; 3D cuando three.js y WebGL responden.
  function crearHero(hero, getDatos) {
    const stage = hero.querySelector('.wg-stage');
    const cv2 = hero.querySelector('.wg-cv2');
    const st = { esc: null, raf: 0, vis: true, docVis: !document.hidden, t: 0, last: 0, top: null, boost: 0, inp: { x: 0, y: 0 }, muerto: false, cv3: null };
    const d0 = getDatos();
    st.esc = crear2D(cv2, hero, stage, d0);

    const quieto = () => rm();
    // siempre queda un fotograma pintado, aunque el bucle no arranque (pestaña oculta, miniatura)
    function medirYPintar() { if (st.esc && st.esc.medir() && (quieto() || !corriendo() || !st.raf)) st.esc.estatico(); }
    const corriendo = () => st.vis && st.docVis && !quieto() && !st.muerto;
    function tick(now) {
      st.raf = 0;
      if (!corriendo() || !st.esc) return;
      const dt = Math.min(0.05, st.last ? (now - st.last) / 1000 : 0.016);
      st.last = now; st.t += dt;
      const top = hero.getBoundingClientRect().top;
      if (st.top != null) st.boost = Math.min(5, st.boost + Math.abs(top - st.top) * 0.012);
      st.top = top;
      st.boost *= Math.exp(-dt * 2.4);
      st.esc.frame(dt, st.t, st.inp, st.boost);
      st.raf = requestAnimationFrame(tick);
    }
    function arrancar() { if (!st.raf && corriendo()) { st.last = 0; st.raf = requestAnimationFrame(tick); } }
    function parar() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; }
    function revisar() { hero.classList.toggle('is-pausa', !(st.vis && st.docVis)); if (corriendo()) arrancar(); else { parar(); if (st.esc) st.esc.estatico(); } }

    let io = null, ro = null;
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => { es.forEach(e => { st.vis = e.isIntersecting; }); revisar(); }, { threshold: 0.01 }); io.observe(hero); }
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => medirYPintar()); ro.observe(hero); } else window.addEventListener('resize', medirYPintar);
    const onVis = () => { st.docVis = !document.hidden; revisar(); };
    document.addEventListener('visibilitychange', onVis);
    const onMove = e => {
      const S = stage.getBoundingClientRect();
      st.inp.x = clamp((e.clientX - (S.left + S.width / 2)) / (S.width || 1), -1, 1);
      st.inp.y = clamp((e.clientY - (S.top + S.height / 2)) / (S.height || 1), -1, 1);
    };
    const onLeave = () => { st.inp.x = 0; st.inp.y = 0; };
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave, { passive: true });

    medirYPintar(); revisar();

    // 3D: se intenta en segundo plano; si algo falla, se queda el 2D sin avisar a nadie.
    cargarThree().then(T => fuentesListas(2500).then(() => T)).then(T => {
      if (st.muerto) return;
      const cv3 = document.createElement('canvas');
      cv3.className = 'wg-cv is-3d'; cv3.setAttribute('aria-hidden', 'true');
      cv2.insertAdjacentElement('afterend', cv3);
      let e3 = null;
      try { e3 = crear3D(T, cv3, hero, stage, getDatos()); } catch (err) { e3 = null; DIAG.error3d = String((err && err.message) || err); }
      if (!e3) { if (!DIAG.error3d) DIAG.error3d = 'sin WebGL'; cv3.remove(); return; }
      if (!e3.medir()) { DIAG.error3d = 'héroe sin tamaño'; e3.destroy(); cv3.remove(); return; }
      DIAG.modo = '3d'; DIAG.error3d = '';
      cv3.addEventListener('webglcontextlost', ev => {
        ev.preventDefault();
        if (st.muerto || st.esc !== e3) return;
        parar(); try { e3.destroy(); } catch (e) { /* nada */ }
        cv3.remove(); cv2.hidden = false; DIAG.modo = '2d'; DIAG.error3d = 'contexto WebGL perdido';
        st.esc = crear2D(cv2, hero, stage, getDatos()); medirYPintar(); revisar();
      }, { once: true });
      const viejo = st.esc;
      st.esc = e3; st.cv3 = cv3;
      if (quieto()) e3.estatico(); else e3.frame(0.016, st.t, st.inp, 0);
      void cv3.offsetWidth; cv3.classList.add('is-on');
      setTimeout(() => { if (viejo) viejo.destroy(); if (st.esc === e3) cv2.hidden = true; }, 650);
      revisar();
    }).catch(err => { DIAG.error3d = String((err && err.message) || err); /* sin 3D: el 2D ya está pintado */ });

    return {
      lanzar() { if (!st.esc) return; if (quieto()) st.esc.lanzar(true); else { st.esc.lanzar(false); arrancar(); } },
      rafaga() { if (st.esc && !quieto() && corriendo()) st.esc.rafaga(); },
      setPct(p) { if (st.esc) { st.esc.setPct(p); if (!corriendo()) st.esc.estatico(); } },
      setLobo(img) { if (st.esc) { st.esc.setLobo(img); if (!corriendo()) st.esc.estatico(); } },
      destroy() {
        st.muerto = true; parar();
        if (io) io.disconnect(); if (ro) ro.disconnect(); else window.removeEventListener('resize', medirYPintar);
        document.removeEventListener('visibilitychange', onVis);
        hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave);
        if (st.esc) st.esc.destroy(); st.esc = null;
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // MONTAJE Y ESTADO
  // ════════════════════════════════════════════════════════════════════════
  let S = null;        // estado montado
  let abiertoPrevio = null;
  let pendienteOpts = null;
  const DIAG = { modo: '2d', error3d: '' };   // WolvesGuia.estado() → qué está pintando el héroe

  function inyectarRecursos() {
    if (!document.getElementById('wg-css')) {
      const st = document.createElement('style'); st.id = 'wg-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    FUENTES.forEach((href, i) => {
      if (document.getElementById('wg-font-' + i)) return;
      const l = document.createElement('link'); l.id = 'wg-font-' + i; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
    });
  }
  function normaliza(opts) {
    const o = Object.assign({ capitulos: CAPS_DEF, leidos: [], onLeido: null, condiciones: null, logo: 'logo/escudo.png', lobo: 'logo/lobo-cabeza.png' }, opts || {});
    let orden = (Array.isArray(o.capitulos) && o.capitulos.length ? o.capitulos : CAPS_DEF).filter(id => CAP[id]);
    if (!orden.length) orden = CAPS_DEF.slice();
    o.orden = Array.from(new Set(orden));
    o.logo = o.logo || 'logo/escudo.png'; o.lobo = o.lobo || 'logo/lobo-cabeza.png';
    return o;
  }
  const q = (sel, el) => (el || S.root).querySelector(sel);
  const qa = (sel, el) => Array.from((el || S.root).querySelectorAll(sel));
  const leidosEnOrden = () => S.orden.filter(id => S.leidos.has(id));
  const primerPendiente = () => S.orden.find(id => !S.leidos.has(id)) || S.orden[0];

  function montar(el, opts) {
    if (!el || !el.appendChild) throw new Error('WolvesGuia.montar: falta el elemento');
    if (S && S.el === el && S.root.isConnected) { actualizar(opts); return; }
    if (S) desmontar();
    DIAG.modo = '2d'; DIAG.error3d = '';
    inyectarRecursos();
    const o = normaliza(Object.assign({}, pendienteOpts || {}, opts || {}));
    pendienteOpts = null;
    const pct = pctDe(o.condiciones);
    S = {
      el, opts: o, orden: o.orden, leidos: new Set((o.leidos || []).filter(id => CAP[id])), locales: new Map(),
      pct, abierto: null, hero: null, timers: [], ui: {},
    };
    const root = document.createElement('div');
    root.className = 'wg'; root.setAttribute('lang', 'es'); root.setAttribute('data-wg-version', '1');
    root.innerHTML = hHero(o, pct) + hBoard(S.orden) + `<div class="wg-caps wg-pad">${S.orden.map((id, i) => hCap(id, i, S.orden, o.condiciones, pct)).join('')}</div>`;
    S.root = root;
    el.innerHTML = '';
    el.appendChild(root);

    // estado de cada interacción
    S.ui = {
      gen: { neg: 0, tipo: 0 },
      obj: { modo: 'tarjetas', i: 0, girada: false },
      quiz: nuevoQuiz(),
      calc: 20,
      sim: simInicial(),
    };
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('keydown', onKey);

    pintarGen(); pintarDeck(); pintarQuiz(); pintarCalc(); pintarSim(); pintarMercado();
    pintarProgreso();
    // cifra y unidad juntas en todo lo que se pinte, ahora y en cada repintado (ver sinCortes)
    sinCortes(root);
    S.cortes = new MutationObserver(lista => { lista.forEach(m => sinCortes(m.type === 'characterData' ? m.target.parentNode : m.target)); });
    S.cortes.observe(root, { childList: true, subtree: true, characterData: true });
    irA(abiertoPrevio && S.orden.includes(abiertoPrevio) ? abiertoPrevio : primerPendiente(), { scroll: false, foco: false });

    // héroe
    const loboImg = new Image();
    loboImg.decoding = 'async';
    const datos = () => ({ pct: S ? S.pct : 50, lobo: loboImg.complete && loboImg.naturalWidth ? loboImg : null, rm: rm() });
    S.hero = crearHero(q('.wg-hero'), datos);
    loboImg.onload = () => { if (S && S.hero) S.hero.setLobo(loboImg); };
    loboImg.src = o.lobo;
  }

  function actualizar(opts) {
    if (!S) { pendienteOpts = Object.assign({}, pendienteOpts || {}, opts || {}); return; }
    const o = S.opts = normaliza(Object.assign({}, S.opts, opts || {}));
    if (opts && 'leidos' in opts) {
      const ahora = Date.now();
      const nuevos = new Set((o.leidos || []).filter(id => CAP[id]));
      // lo marcado aquí hace menos de 10 s se mantiene mientras la app lo guarda
      S.locales.forEach((t, id) => { if (ahora - t < 10000) nuevos.add(id); else S.locales.delete(id); });
      const antes = leidosEnOrden().length;
      S.leidos = nuevos;
      if (antes < S.orden.length && leidosEnOrden().length === S.orden.length) celebrar();
    }
    if (opts && 'condiciones' in opts) {
      const box = q('[data-k="cond"]');
      if (box) box.innerHTML = hCond(o.condiciones);
      const p = pctDe(o.condiciones);
      if (p !== S.pct) {
        S.pct = p;
        const tk = q('[data-k="ticker"]'); if (tk) tk.innerHTML = hTicker(p);
        if (S.hero) S.hero.setPct(p);
      }
      pintarCalc();
    }
    pintarProgreso();
  }

  function desmontar() {
    if (!S) return;
    abiertoPrevio = S.abierto;
    S.timers.forEach(t => clearTimeout(t)); S.timers = [];
    if (S.cortes) S.cortes.disconnect();
    if (S.ui.tl && S.ui.tl.raf) cancelAnimationFrame(S.ui.tl.raf);
    if (S.hero) S.hero.destroy();
    S.root.removeEventListener('click', onClick);
    S.root.removeEventListener('input', onInput);
    S.root.removeEventListener('change', onInput);
    S.root.removeEventListener('keydown', onKey);
    if (S.root.parentNode) S.root.parentNode.removeChild(S.root);
    S = null;
  }

  // ── progreso ──
  function pintarProgreso() {
    const n = leidosEnOrden().length, tot = S.orden.length, falta = tot - n;
    q('[data-k="n"]').textContent = n;
    qa('.wg-segs i').forEach((s, i) => s.classList.toggle('on', S.leidos.has(S.orden[i])));
    const board = q('.wg-board');
    board.classList.toggle('is-completa', n >= tot);
    q('[data-k="msg"]').innerHTML = n >= tot
      ? (S.opts.modo === 'suelta'
        ? `<span><b>¡Guía completa!</b> El siguiente paso es la Prueba 1, en la app: entra con el enlace personal que te manda Héctor.</span>${S.opts.enlaceApp ? `<a class="wg-btn wg-btn-oro wg-btn-sm" href="${esc(S.opts.enlaceApp)}" target="_blank" rel="noopener">Abrir la app</a>` : ''}`
        : '<span><b>¡Guía completa!</b> La Prueba 1 ya está abierta.</span><a class="wg-btn wg-btn-oro wg-btn-sm" href="#prueba1">Ir a la Prueba 1</a>')
      : `<span>Te ${falta === 1 ? 'falta <b>1 capítulo</b>' : `faltan <b>${falta} capítulos</b>`} ${S.opts.modo === 'suelta' ? ' para terminar la guía.' : ` para abrir la <b>Prueba 1</b>: se abre cuando tengas los ${tot}.`}</span>`;
    qa('.wg-tk').forEach(b => {
      const id = b.dataset.cap, ok = S.leidos.has(id);
      b.classList.toggle('is-leido', ok);
      b.querySelector('.wg-tk-s').textContent = ok ? 'Leído ▲' : 'Pendiente';
      b.setAttribute('aria-label', `Capítulo ${S.orden.indexOf(id) + 1}: ${CAP[id].titulo}. ${ok ? 'Leído' : 'Pendiente'}`);
    });
    qa('.wg-tengo').forEach(b => {
      const ok = S.leidos.has(b.dataset.cap);
      b.textContent = ok ? 'Leído ✓' : 'Lo tengo';
      b.classList.toggle('is-hecho', ok);
      b.setAttribute('aria-disabled', ok ? 'true' : 'false');
    });
    const cta = q('[data-k="cta"]');
    if (cta) {
      const p = S.orden.find(id => !S.leidos.has(id));
      cta.textContent = !p ? 'Repasar la guía' : n === 0 ? 'Empezar por el capítulo 1' : `Seguir: capítulo ${S.orden.indexOf(p) + 1}`;
    }
  }
  function celebrar() {
    const board = q('.wg-board');
    if (board) rafagaDom(board.querySelector('.wg-count') || board, 18);
    if (S.hero) S.hero.rafaga();
  }
  function rafagaDom(el, n) {
    if (rm() || !el) return;
    const r = el.getBoundingClientRect(), box = S.root.getBoundingClientRect();
    for (let i = 0; i < (n || 10); i++) {
      const s = document.createElement('i');
      s.className = 'wg-moneda-fx';
      s.style.left = (r.left - box.left + r.width / 2) + 'px';
      s.style.top = (r.top - box.top + r.height / 2) + 'px';
      const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 90;
      s.style.setProperty('--dx', Math.round(Math.cos(a) * v) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(a) * v - 40) + 'px');
      S.root.appendChild(s);
      S.timers.push(setTimeout(() => s.remove(), 1000));
    }
  }

  // ── navegación ──
  function irA(id, o) {
    if (!S || !CAP[id] || !S.orden.includes(id)) return;
    o = o || {};
    if (S.abierto !== id) pararReproducciones();
    S.abierto = id;
    qa('.wg-cap').forEach(c => { c.hidden = c.dataset.cap !== id; });
    qa('.wg-tk').forEach(b => { if (b.dataset.cap === id) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    if (id === 'c-rojas') pintarMercado();
    const cap = q(`.wg-cap[data-cap="${id}"]`);
    if (o.foco) { const h = cap.querySelector('.wg-h3'); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } } }
    if (o.scroll) {
      const top = cap.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.55) cap.scrollIntoView({ behavior: rm() ? 'auto' : 'smooth', block: 'start' });
    }
  }
  function marcar(id, btn) {
    if (!S || S.leidos.has(id)) return;
    S.leidos.add(id);
    S.locales.set(id, Date.now());
    const n = leidosEnOrden().length, tot = S.orden.length;
    pintarProgreso();
    rafagaDom(btn, 10);
    const live = q('[data-k="live"]');
    if (live) live.textContent = n >= tot ? `Guía completa: ${n} de ${tot}.${S.opts.modo === 'suelta' ? '' : ' La Prueba 1 ya está abierta.'}` : `Capítulo marcado como leído. Llevas ${n} de ${tot}.`;
    if (n >= tot) celebrar();
    try { if (typeof S.opts.onLeido === 'function') S.opts.onLeido(id); } catch (e) { if (window.console) console.warn('WolvesGuia onLeido:', e); }
  }

  // ── eventos ──
  function onClick(e) {
    const b = e.target.closest('[data-wg]');
    if (!b || !S || !S.root.contains(b)) return;
    const a = b.dataset.wg;
    switch (a) {
      case 'ir': irA(b.dataset.cap, { scroll: true, foco: true }); break;
      case 'continuar': irA(primerPendiente(), { scroll: true, foco: true }); break;
      case 'moneda': if (S.hero) S.hero.lanzar(); break;
      case 'tengo': marcar(b.dataset.cap, b); break;
      case 'icp': respIcp(+b.dataset.i, b.dataset.r); break;
      case 'tl-paso': marcarPaso(+b.dataset.i); break;
      case 'tl-play': reproducirTl(); break;
      case 'chat-play': reproducirChats(); break;
      case 'gen-tipo': S.ui.gen.tipo = +b.dataset.t; pintarGen(); break;
      case 'gen-otro': S.ui.gen.tipo = (S.ui.gen.tipo + 1) % TIPOS.length; pintarGen(); break;
      case 'gen-copiar': copiarGen(b); break;
      case 'obj-modo': modoObj(b.dataset.m); break;
      case 'obj-prev': S.ui.obj.i = (S.ui.obj.i + OBJ.length - 1) % OBJ.length; S.ui.obj.girada = false; pintarDeck(); break;
      case 'obj-next': S.ui.obj.i = (S.ui.obj.i + 1) % OBJ.length; S.ui.obj.girada = false; pintarDeck(); break;
      case 'obj-ir': S.ui.obj.i = +b.dataset.i; S.ui.obj.girada = false; pintarDeck(); break;
      case 'girar': S.ui.obj.girada = !S.ui.obj.girada; pintarGiro(); break;
      case 'quiz-opt': respQuiz(+b.dataset.k); break;
      case 'quiz-sig': S.ui.quiz.i++; S.ui.quiz.ops = null; S.ui.quiz.elegida = null; pintarQuiz(true); break;
      case 'quiz-reset': S.ui.quiz = nuevoQuiz(); pintarQuiz(true); break;
      case 'roja': respRoja(+b.dataset.i, b.dataset.r); break;
      case 'calc-pre': S.ui.calc = +b.dataset.v; pintarCalc(); break;
      case 'sim-reset': S.ui.sim = simInicial(); syncSim(); pintarSim(); break;
      default: break;
    }
  }
  function onInput(e) {
    const t = e.target;
    if (!S || !t || !S.root.contains(t)) return;
    if (t.dataset.k === 'gen-neg') { S.ui.gen.neg = +t.value; pintarGen(); }
    else if (t.dataset.k === 'calc-l') { S.ui.calc = +t.value; pintarCalc(); }
    else if (t.dataset.sim) { S.ui.sim.crit[t.dataset.sim] = +t.value; pintarSim(); }
    else if (t.dataset.simk) { S.ui.sim[t.dataset.simk] = !!t.checked; pintarSim(); }
  }
  function onKey(e) {
    if (!S) return;
    const deck = e.target.closest && e.target.closest('[data-k="deck"]');
    if (deck && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
      e.preventDefault();
      S.ui.obj.i = (S.ui.obj.i + (e.key === 'ArrowRight' ? 1 : OBJ.length - 1)) % OBJ.length; S.ui.obj.girada = false; pintarDeck();
    }
  }

  // ── c-vendemos ──
  function respIcp(i, r) {
    const it = q(`.wg-icp-it[data-i="${i}"]`), x = ICP[i];
    const acierto = (r === 'si') === x.ok;
    it.classList.toggle('is-ok', acierto); it.classList.toggle('is-ko', !acierto);
    const fb = it.querySelector('.wg-icp-fb');
    fb.className = 'wg-icp-fb ' + (acierto ? 'is-ok' : 'is-ko');
    fb.textContent = (acierto ? '✓ Bien. ' : '✗ Casi. ') + x.fb;
  }

  // ── c-llamada ──
  function marcarPaso(i) {
    qa('.wg-paso').forEach(p => p.classList.toggle('is-act', +p.dataset.paso === i));
    qa('.wg-tl-segs button').forEach(b => b.classList.toggle('is-act', +b.dataset.i === i));
  }
  function pararReproducciones() {
    if (!S) return;
    const tl = S.ui.tl;
    if (tl) { if (tl.raf) cancelAnimationFrame(tl.raf); tl.timers.forEach(clearTimeout); S.ui.tl = null; const w = q('[data-k="tl"]'); if (w) w.classList.remove('is-play'); const bt = q('[data-k="tl-btn"]'); if (bt) bt.textContent = '▶ Reproducir'; const rl = q('[data-k="reloj"]'); if (rl) rl.textContent = '0:00'; marcarPaso(-1); }
    const ch = S.ui.chat;
    if (ch) { ch.timers.forEach(clearTimeout); S.ui.chat = null; qa('.wg-msg.is-oculto, .wg-msg.is-entra').forEach(m => m.classList.remove('is-oculto', 'is-entra')); qa('.wg-escribe').forEach(x => x.remove()); const cb = q('[data-k="chat-btn"]'); if (cb) cb.textContent = '▶ Reproducir las dos llamadas'; }
  }
  function reproducirTl() {
    if (S.ui.tl) { pararReproducciones(); return; }
    const wrap = q('[data-k="tl"]'), head = q('[data-k="head"]'), reloj = q('[data-k="reloj"]'), bt = q('[data-k="tl-btn"]');
    const dur = 12;               // 120 s de llamada en 12 s
    const tl = S.ui.tl = { raf: 0, timers: [], t0: 0 };
    wrap.classList.add('is-play'); bt.textContent = '■ Parar';
    const pasoDe = s => { for (let i = 0; i < 5; i++) if (s < PASOS[i].fin) return i; return 4; };
    const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    if (rm()) {
      // sin animación continua: salta de paso en paso
      let i = 0;
      const sig = () => {
        if (!S || S.ui.tl !== tl) return;
        if (i > 4) { pararReproducciones(); return; }
        marcarPaso(i); head.style.left = (PASOS[i].ini / 120 * 100) + '%'; reloj.textContent = fmt(PASOS[i].ini);
        i++; tl.timers.push(setTimeout(sig, 1800));
      };
      sig(); return;
    }
    const paso = now => {
      if (!S || S.ui.tl !== tl) return;
      if (!tl.t0) tl.t0 = now;
      const k = Math.min(1, (now - tl.t0) / 1000 / dur), s = k * 120;
      head.style.left = (k * 100) + '%'; reloj.textContent = fmt(s); marcarPaso(pasoDe(s));
      if (k >= 1) { tl.timers.push(setTimeout(() => { if (S && S.ui.tl === tl) pararReproducciones(); }, 900)); return; }
      tl.raf = requestAnimationFrame(paso);
    };
    tl.raf = requestAnimationFrame(paso);
  }
  function reproducirChats() {
    if (S.ui.chat) { pararReproducciones(); return; }
    const ch = S.ui.chat = { timers: [] };
    const cb = q('[data-k="chat-btn"]'); cb.textContent = '■ Ver las dos enteras';
    const listas = [q('[data-k="chat-a"]'), q('[data-k="chat-b"]')];
    const msgs = listas.map(l => Array.from(l.querySelectorAll('.wg-msg')));
    msgs.forEach(ms => ms.forEach(m => m.classList.add('is-oculto')));
    const paso = rm() ? 900 : 1500;
    const total = Math.max(msgs[0].length, msgs[1].length);
    for (let k = 0; k < total; k++) {
      ch.timers.push(setTimeout(() => {
        if (!S || S.ui.chat !== ch) return;
        msgs.forEach((ms, j) => {
          const m = ms[k]; if (!m) return;
          listas[j].querySelectorAll('.wg-escribe').forEach(x => x.remove());
          m.classList.remove('is-oculto'); m.classList.add('is-entra');
          const sig = ms[k + 1];
          if (sig && !rm() && (sig.classList.contains('wg-msg-el') || sig.classList.contains('wg-msg-ti'))) {
            const e = document.createElement('li'); e.className = 'wg-escribe' + (sig.classList.contains('wg-msg-ti') ? ' de-ti' : ''); e.setAttribute('aria-hidden', 'true'); e.innerHTML = '<i></i><i></i><i></i>';
            listas[j].appendChild(e);
          }
        });
        if (k === total - 1) ch.timers.push(setTimeout(() => { if (S && S.ui.chat === ch) pararReproducciones(); }, 600));
      }, k * paso));
    }
  }

  // ── c-ganchos ──
  function pintarGen() {
    const n = NEGS[S.ui.gen.neg] || NEGS[0], t = TIPOS[S.ui.gen.tipo] || TIPOS[0];
    const out = q('[data-k="gen-txt"]');
    if (out) out.innerHTML = '«' + gancho(t.id, n, s => `<mark>${esc(s)}</mark>`) + '»';
    qa('.wg-tipos button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.t === S.ui.gen.tipo)));
    const sel = q('[data-k="gen-neg"]'); if (sel && +sel.value !== S.ui.gen.neg) sel.value = String(S.ui.gen.neg);
  }
  function copiarGen(btn) {
    const out = q('[data-k="gen-txt"]'); if (!out) return;
    const txt = out.textContent;
    const orig = btn.dataset.txt || (btn.dataset.txt = btn.textContent);
    let hecho = false;
    const fin = t => { if (hecho) return; hecho = true; btn.textContent = t; S.timers.push(setTimeout(() => { btn.textContent = orig; }, 2200)); };
    const ok = () => fin('Copiada ✓');
    // Si el portapapeles no deja, o no contesta en 1,5 s, se selecciona la frase para copiarla a mano (móvil u ordenador).
    const seleccionar = () => { if (hecho) return; try { const r = document.createRange(); r.selectNodeContents(out); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* nada */ } fin('Seleccionada: cópiala'); };
    try { navigator.clipboard.writeText(txt).then(ok, seleccionar); S.timers.push(setTimeout(seleccionar, 1500)); } catch (e) { seleccionar(); }
  }

  // «50 %», «3.000 €»: la cifra y su unidad siempre en la misma línea. Al pintar, el espacio entre las dos se vuelve
  // de no separación; en el fuente se queda el espacio normal, para que «50 %» se siga encontrando al buscarlo.
  const NBSP = String.fromCharCode(160);
  const RE_CORTE = /(\d) ([%€])/g;
  function sinCortes(raiz) {
    if (!raiz || !raiz.ownerDocument) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const v = n.nodeValue;
      if (v.indexOf(' %') < 0 && v.indexOf(' €') < 0) continue;
      const nv = v.replace(RE_CORTE, '$1' + NBSP + '$2');
      if (nv !== v) n.nodeValue = nv;
    }
  }

  // ── c-objeciones ──
  function modoObj(m) {
    S.ui.obj.modo = m;
    qa('.wg-modos button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
    ['tarjetas', 'practica', 'chuleta'].forEach(k => { q(`[data-k="m-${k}"]`).hidden = k !== m; });
  }
  function pintarDeck() {
    const i = S.ui.obj.i, o = OBJ[i];
    q('[data-k="deck-i"]').textContent = i + 1;
    q('[data-k="deck-tag"]').textContent = o.tag;
    q('[data-k="cara-a"]').innerHTML = `<p class="wg-eyebrow">El dueño te dice</p><p class="wg-face-q">«${esc(o.o)}»</p><p class="wg-face-hint">¿Qué le contestarías tú? Piénsalo y gira la tarjeta. ↻</p>`;
    q('[data-k="cara-b"]').innerHTML = `<dl><div><dt>Qué es de verdad</dt><dd>${esc(o.verdad)}</dd></div><div><dt>Le dices</dt><dd class="wg-di">${esc(o.di)}</dd>${o.extra ? `<dd class="wg-small">${esc(o.extra)}</dd>` : ''}</div><div><dt>Salida correcta</dt><dd>${esc(SALIDAS[i])}</dd></div></dl>`;
    qa('.wg-deck-dots button').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === i)));
    pintarGiro(true);
  }
  function pintarGiro(sinAnim) {
    const f = q('[data-k="flip"]'), g = S.ui.obj.girada;
    const inn = f.querySelector('.wg-flip-in');
    if (sinAnim) { inn.style.transition = 'none'; f.classList.toggle('is-girada', g); void inn.offsetWidth; inn.style.transition = ''; }
    else f.classList.toggle('is-girada', g);
    q('[data-k="cara-a"]').setAttribute('aria-hidden', String(g));
    q('[data-k="cara-b"]').setAttribute('aria-hidden', String(!g));
    const bt = q('[data-k="girar-btn"]'); bt.setAttribute('aria-pressed', String(g)); bt.textContent = g ? 'Ver la objeción' : 'Girar la tarjeta';
  }
  function nuevoQuiz() { return { orden: barajar(OBJ.map((_, i) => i)), i: 0, aciertos: 0, hechas: 0, ops: null, elegida: null }; }
  function pintarQuiz(foco) {
    const qz = S.ui.quiz, box = q('[data-k="quiz"]');
    if (qz.i >= qz.orden.length) {
      const msg = qz.aciertos >= 14 ? 'De lobo. Estás listo para el sprint.' : qz.aciertos >= 10 ? 'Muy bien. Repasa las que fallaste en la chuleta.' : 'Repasa las tarjetas y vuelve a intentarlo.';
      box.innerHTML = `<div class="wg-quiz-fin"><p class="wg-eyebrow">Resultado</p><b class="big">${qz.aciertos}/${qz.orden.length}</b><p>${esc(msg)}</p><p class="wg-small">Ojo: en la Prueba 1 no eliges entre tres, escribes tú la respuesta con tus palabras.</p><button type="button" class="wg-btn wg-btn-oro" data-wg="quiz-reset">Otra vez, en otro orden</button></div>`;
      return;
    }
    const k = qz.orden[qz.i], o = OBJ[k];
    if (!qz.ops) qz.ops = barajar([{ t: o.di, ok: true, por: o.bien }, { t: o.mal[0][0], ok: false, por: o.mal[0][1] }, { t: o.mal[1][0], ok: false, por: o.mal[1][1] }]);
    const resp = qz.elegida != null;
    box.innerHTML = `<div class="wg-quiz-top"><span>Objeción <b>${qz.i + 1}</b> de ${qz.orden.length}</span><span>Aciertos <b>${qz.aciertos}</b> de ${qz.hechas}</span></div>
      <p class="wg-quiz-q" tabindex="-1"><small>El dueño te dice</small>«${esc(o.o)}»</p>
      <div class="wg-opts" role="group" aria-label="Elige la mejor respuesta">${qz.ops.map((op, j) => `<button type="button" class="wg-opt${resp ? (op.ok ? ' is-ok' : (j === qz.elegida ? ' is-ko' : '')) : ''}" data-wg="quiz-opt" data-k="${j}"${resp ? ' disabled' : ''}><b>${'ABC'[j]}</b><span>${esc(op.t)}</span>${resp ? `<em>${op.ok ? '✓ ' : '✗ '}${esc(op.por)}</em>` : ''}</button>`).join('')}</div>
      <p class="wg-quiz-fb ${resp ? (qz.ops[qz.elegida].ok ? 'is-ok' : 'is-ko') : ''}" aria-live="polite">${resp ? (qz.ops[qz.elegida].ok ? '✓ ¡Esa es! Esta es la salida correcta.' : '✗ Esa no. Mira por qué la buena funciona.') : ''}</p>
      ${resp ? `<p class="wg-small"><b>Salida correcta:</b> ${esc(SALIDAS[k])}</p><div><button type="button" class="wg-btn wg-btn-oro" data-wg="quiz-sig">${qz.i + 1 < qz.orden.length ? 'Siguiente objeción →' : 'Ver mi resultado'}</button></div>` : ''}`;
    if (foco) { const qq = box.querySelector('.wg-quiz-q'); if (qq) { try { qq.focus({ preventScroll: true }); } catch (e) { /* nada */ } } }
  }
  function respQuiz(j) {
    const qz = S.ui.quiz;
    if (qz.elegida != null || !qz.ops) return;
    qz.elegida = j; qz.hechas++;
    if (qz.ops[j].ok) qz.aciertos++;
    pintarQuiz(false);
    const b = q('[data-k="quiz"] [data-wg="quiz-sig"]'); if (b) b.focus({ preventScroll: true });
  }

  // ── c-rojas ──
  function respRoja(i, r) {
    const it = q(`.wg-rq-it[data-i="${i}"]`), x = ROJA_QUIZ[i];
    const ok = r === x.r;
    it.classList.toggle('is-ok', ok); it.classList.toggle('is-ko', !ok);
    it.querySelectorAll('.wg-rq-b button').forEach(b => b.classList.toggle('is-sel', b.dataset.r === r));
    it.querySelector('.wg-rq-fb').textContent = (ok ? '✓ ' : '✗ No. ') + x.fb;
  }
  function pintarMercado() {
    const el = q('[data-k="ahora"]'), pos = q('[data-k="ahora-pos"]');
    if (!el) return;
    const d = new Date(), dia = d.getDay(), h = d.getHours() + d.getMinutes() / 60;
    const laborable = dia >= 1 && dia <= 5, abierto = laborable && h >= 9.5 && h < 20.5;
    el.className = 'wg-mercado-now ' + (abierto ? 'is-abierto' : 'is-cerrado');
    el.textContent = abierto ? 'Ahora mismo: abierto ▲ (hora de tu dispositivo)' : 'Ahora mismo: cerrado. Se practica; no se llama.';
    if (pos) { pos.hidden = false; pos.style.left = (h / 24 * 100).toFixed(2) + '%'; }
  }

  // ── c-cobras ──
  function pintarCalc() {
    if (!S) return;
    const p = S.pct, porVenta = 400 * p / 100, L = S.ui.calc;
    const ll = L * 20, re = ll / 25, ve = re / 4, tu = ve * porVenta;
    const set = (k, v) => { const el = q(`[data-k="${k}"]`); if (el) el.textContent = v; };
    set('pct', fmtPct(p) + ' %'); set('porventa', eur(porVenta));
    set('calc-o', L); set('e-ll', miles(ll)); set('e-re', miles(re)); set('e-ve', miles(ve)); set('e-tu', eur(tu));
    set('e-tu-s', `${miles(ve)} ventas × ${eur(porVenta)}`);
    const inp = q('[data-k="calc-l"]'); if (inp && +inp.value !== L) inp.value = String(L);
    qa('[data-wg="calc-pre"]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === L)));
    const g = v => eur(v * 20 / 25 / 4 * porVenta);
    set('calc-res', `20 llamadas al día ≈ ${g(20)} al mes · 40 ≈ ${g(40)} · 60 ≈ ${g(60)}. Son supuestos de ejemplo (1 reunión de cada 25 llamadas, 1 venta de cada 4 reuniones), no datos medidos ni una promesa.`);
    // manada
    const propia = 4 * porVenta, mitad = propia / 2, total = 12 * porVenta, bruno = propia + mitad * 2;
    const mt = q('[data-k="manada-txt"]');
    if (mt) mt.innerHTML = `Bruno hace 4 ventas y trae a Lucas y a Marta, que hacen 4 cada uno. Las 12 ventas van a nombre de Bruno: COMPOUND le paga a Bruno el ${esc(fmtPct(p))} % del beneficio de las 12, y él reparte. Si lo reparten a medias, así queda (con ventas de 400 € de beneficio):`;
    set('manada-flecha', `12 ventas a nombre de Bruno → COMPOUND le paga ${eur(total)} → Bruno reparte`);
    const bar = q('[data-k="manada-bar"]');
    if (bar) {
      bar.setAttribute('aria-label', `Reparto de ${eur(total)}: Lucas ${eur(mitad)}, Bruno ${eur(bruno)}, Marta ${eur(mitad)}`);
      bar.innerHTML = `<span class="r-l" style="flex:${mitad} 1 0">${eur(mitad)}</span><span class="r-b" style="flex:${bruno} 1 0">${eur(bruno)}</span><span class="r-m" style="flex:${mitad} 1 0">${eur(mitad)}</span>`;
    }
    const rep = q('[data-k="manada-rep"]');
    if (rep) rep.innerHTML = `<div><b>${eur(mitad)}</b><span>Lucas: la mitad de lo de sus 4 ventas</span></div><div><b style="color:var(--wg-gold)">${eur(bruno)}</b><span>Bruno: ${eur(propia)} de las suyas + ${eur(mitad)} + ${eur(mitad)}</span></div><div><b>${eur(mitad)}</b><span>Marta: la mitad de lo de sus 4 ventas</span></div>`;
  }

  // ── c-pruebas · simulador de nota (la misma cuenta que la app) ──
  function simInicial() { const crit = {}; CRITERIOS.forEach(c => { crit[c.id] = 7; }); return { crit, objetivo: true, cred: false, tele: false, precio: false, promete: false, presiona: false, roja: false, nollames: false }; }
  function calcNota(v) {
    const c = Object.assign({}, v.crit), cap = {};
    if (v.tele && c.personaje > 4) { c.personaje = 4; cap.personaje = 1; }
    if (v.precio && c.objeciones > 3) { c.objeciones = 3; cap.objeciones = 1; }
    if (v.presiona && c.cierre > 3) { c.cierre = 3; cap.cierre = 1; }
    let nota = CRITERIOS.reduce((a, k) => a + c[k.id] * k.peso, 0) / 100;
    nota = Math.min(10, nota + (v.cred ? 0.5 : 0));
    let tope = 10, motivo = '';
    const T = (x, m) => { if (x < tope) { tope = x; motivo = m; } };
    if (v.nollames) T(2, 'Insistir tras «no me llaméis más»: no pasa de 2.');
    if (v.roja) T(3, 'Una línea roja grave: no pasa de 3.');
    if (v.promete) T(5, 'Prometer un resultado concreto: no pasa de 5.');
    if (v.presiona) T(5, 'Presionar tras dos noes: no pasa de 5.');
    if (v.precio) T(6, 'Precio cerrado: no pasa de 6.');
    if (!v.objetivo) T(6.9, 'Sin el objetivo cumplido, no pasa de 6,9.');
    const fin = Math.round(Math.min(nota, tope) * 10) / 10;
    return { fin, bruta: nota, tope, motivo: nota > tope ? motivo : '', cap, aprobada: fin >= 7 && !v.roja && !v.nollames };
  }
  function syncSim() {
    const v = S.ui.sim;
    CRITERIOS.forEach(c => { const i = q(`[data-sim="${c.id}"]`); if (i) i.value = String(v.crit[c.id]); });
    qa('[data-simk]').forEach(i => { i.checked = !!v[i.dataset.simk]; });
  }
  function pintarSim() {
    const v = S.ui.sim, r = calcNota(v);
    CRITERIOS.forEach(c => {
      const o = q(`[data-k="o-${c.id}"]`); const capado = r.cap[c.id];
      if (o) o.textContent = capado ? `${c.id === 'personaje' ? 4 : 3}` : String(v.crit[c.id]);
      const row = q(`.wg-sim-row[data-c="${c.id}"]`); if (row) row.classList.toggle('is-tope', !!capado);
    });
    const res = q('[data-k="sim-res"]');
    res.classList.toggle('is-ok', r.aprobada); res.classList.toggle('is-ko', !r.aprobada);
    q('[data-k="sim-nota"]').textContent = dec(r.fin, 1);
    q('[data-k="sim-ver"]').textContent = r.aprobada ? (r.fin < 7.5 ? 'Aprobada, por los pelos' : 'Aprobada') : 'Todavía no';
    const partes = [];
    if (r.motivo) partes.push(r.motivo);
    if (r.cap.personaje) partes.push('El gancho se queda en 4 por la apertura de teleoperador.');
    if (r.cap.objeciones) partes.push('«Objeciones y precio» se queda en 3 por el precio cerrado.');
    if (r.cap.cierre) partes.push('«Cierre con hora» se queda en 3 por presionar.');
    if (!partes.length) partes.push(r.aprobada ? 'Se aprueba con 7. Necesitas dos llamadas así, de dos negocios distintos.' : 'Se aprueba con 7. El tono pesa un 25 %: la seguridad y la expresión son lo que más se nota.');
    q('[data-k="sim-mot"]').textContent = partes.join(' ');
  }

  // ════════════════════════════════════════════════════════════════════════
  function estado() { return { montada: !!S, capitulo: S ? S.abierto : null, leidos: S ? leidosEnOrden() : [], heroe: DIAG.modo, error3d: DIAG.error3d }; }
  window.WolvesGuia = { montar, actualizar, desmontar, estado, __wg: '1.0.0' };
})();
