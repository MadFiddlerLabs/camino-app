import LegalPage, { type LegalContent } from '@/components/LegalPage';

// Plain-language privacy policy. DRAFTED BY THE BUILD ASSISTANT, REVIEWED BY THE OPERATOR —
// not legal advice to ourselves either; a professional review is on the pre-launch list.
// Keep in sync with reality: if a processor is added or a data flow changes, this page
// changes in the same PR (same discipline as the homework pages). The ES version is a
// courtesy translation and says so — English prevails (LOCALIZATION.md §10; Cristina-pass
// pending like the rest of the es surface).

const EN: LegalContent = {
  title: 'Privacy',
  updated: '20 October 2026',
  intro: "The short version: we collect your email and your interview answers so we can build and save your roadmap and send you the emails you asked for. We don't sell data, we don't run ads, we don't want your documents, and you can delete everything yourself, in the app, at any time.",
  sections: [
    { h: 'Who we are', body: [
      'Get Camino (getcamino.app) is operated by AELaboratories, Inc, 500 Westover Dr #34489, Sanford, NC 27330, United States.',
      'Questions or requests about your data: use "Report a problem" in the app menu, or email privacy@getcamino.app.',
    ]},
    { h: 'What we collect', body: [
      'Account: your email address and a sign-in identifier (from Apple, Google, or the email code you use to sign in).',
      'Your answers: what you tell Lola in the interview — nationalities, family situation, work situation, an income band, rough dates, and plans like driving, schooling, buying property, or pets. This is what your roadmap is computed from.',
      'Progress and preferences: which steps you\'ve marked done (and on which dates), and email preferences like unsubscribing from the weekly roundup.',
      'Feedback: whatever you type into "Report a problem", plus basic context (platform, app version, which screen).',
      'Free text you volunteer: anything you type into an open box — the interview\'s "anything else?" note, or a step conversation — is saved with your answers so it can shape your plan, including anything sensitive you might volunteer such as a health or criminal-record detail. We ask you not to, and Lola doesn\'t need it; if you do, it lives only with your account, is never sent to our analytics, and is deleted permanently when you delete your account.',
      'Technical: error reports (so we can fix crashes) and product analytics — which screens are used and which interview questions people get stuck on, recorded as the question and the options chosen, never the free text you type. On the web our analytics are cookieless — nothing is stored on your device to track you across visits. To count daily visitors, our analytics provider combines your IP address and browser type into a one-way code that changes every day, then discards the IP address.',
    ]},
    { h: 'What we deliberately do not collect', body: [
      'No document uploads — we\'ve chosen not to be a store of passports and certificates.',
      'No payment details (Get Camino is free), no precise location, no advertising identifiers, no data sales to anyone, ever.',
    ]},
    { h: 'How AI is involved', body: [
      'Lola runs on Anthropic\'s Claude: the text you type in the interview and in step conversations is processed to phrase questions and understand answers. Which steps apply to you, and every date, is computed by our own deterministic engine — not by AI.',
    ]},
    { h: 'Our lawful bases (GDPR)', body: [
      'Contract (Art. 6(1)(b)): building and saving your roadmap from your interview answers is the service you asked for, so we process those answers to provide it.',
      'Consent (Art. 6(1)(a)): the weekly email, and anything you type into a free-text box, are optional — you can withdraw either at any time (unsubscribe, or delete your account). Any special-category detail you volunteer (Art. 9) is processed only on your explicit consent, and we ask you not to provide it.',
      'We run no advertising, no legitimate-interest profiling, and no automated decision-making with legal effect — the engine is deterministic and you can see exactly what it produced.',
    ]},
    { h: 'Share links', body: [
      'If you create a read-only share link, its payload — your interview answers, never your free-text notes — is encoded in the link\'s "#" fragment. Fragments are never sent to a server, so a shared link doesn\'t reach our logs, and we store nothing about it. Anyone you send it to can see those answers, so share it only with people you\'d tell them to.',
    ]},
    { h: 'Who processes data for us', body: [
      'Supabase (accounts and database), Resend (sending email, EU region), PostHog (analytics, EU region, cookieless on web), Sentry (error reporting), Anthropic (interview processing), and Expo/EAS Hosting with Cloudflare (hosting). Some of these providers process data in the United States.',
      'Where data is transferred to the US, the transfer relies on the EU–US Data Privacy Framework and/or the European Commission\'s Standard Contractual Clauses, which these processors provide.',
    ]},
    { h: 'Emails', body: [
      'We send transactional email (sign-in links, a one-time welcome) and a weekly roundup of what\'s due on your roadmap. The roundup has one-click unsubscribe; it also simply stops when there\'s nothing useful to say.',
    ]},
    { h: 'Retention and deletion', body: [
      'Anonymous interview drafts (before you sign in) live only in your browser and are dropped after 30 days. Signed-in profiles, answers and progress are kept for as long as your account exists. Error reports and analytics events are retained up to 90 days. Feedback you email us stays in the support inbox until it\'s resolved.',
      'Delete your account any time in the app: menu → Delete my account. This immediately and permanently removes your account, your answers, and your roadmap. Emails already sent to you obviously remain in your inbox.',
    ]},
    { h: 'Your rights', body: [
      'You can access what we hold (it\'s essentially your interview answers — visible in the app), correct it (tell Lola what changed), delete it (in-app), and complain to your local data-protection authority if we\'ve let you down. EU/EEA residents have these rights under the GDPR; we honor them for everyone.',
    ]},
    { h: 'Changes', body: [
      'If this policy changes materially, we\'ll note it here with a new date. The version history is public in our repository.',
    ]},
  ],
};

const ES: LegalContent = {
  title: 'Privacidad',
  updated: '20 de octubre de 2026',
  intro: 'La versión corta: recogemos tu correo y tus respuestas de la entrevista para construir y guardar tu hoja de ruta y enviarte los correos que pediste. No vendemos datos, no ponemos anuncios, no queremos tus documentos, y puedes borrarlo todo tú mismo, en la app, cuando quieras.',
  sections: [
    { h: 'Quiénes somos', body: [
      'Get Camino (getcamino.app) está operado por AELaboratories, Inc, 500 Westover Dr #34489, Sanford, NC 27330, Estados Unidos.',
      'Preguntas o solicitudes sobre tus datos: usa «Informar de un problema» en el menú de la app, o escribe a privacy@getcamino.app.',
    ]},
    { h: 'Qué recogemos', body: [
      'Cuenta: tu dirección de correo y un identificador de acceso (de Apple, Google o el código de correo con el que inicias sesión).',
      'Tus respuestas: lo que le cuentas a Lola en la entrevista — nacionalidades, situación familiar, situación laboral, una franja de ingresos, fechas aproximadas y planes como conducir, escolarizar, comprar vivienda o mascotas. De ahí se calcula tu hoja de ruta.',
      'Progreso y preferencias: qué pasos has marcado como hechos (y en qué fechas), y preferencias de correo como darte de baja del resumen semanal.',
      'Comentarios: lo que escribas en «Informar de un problema», más contexto básico (plataforma, versión de la app, pantalla).',
      'Texto libre que facilitas: lo que escribas en un campo abierto — la nota final «¿algo más?» de la entrevista o una conversación de un paso — se guarda con tus respuestas para dar forma a tu plan, incluida cualquier información sensible que facilites, como un dato de salud o de antecedentes penales. Te pedimos que no lo hagas, y Lola no lo necesita; si lo haces, solo vive con tu cuenta, nunca se envía a nuestra analítica y se elimina de forma permanente cuando borras tu cuenta.',
      'Técnico: informes de errores (para arreglar fallos) y analítica de producto — qué pantallas se usan y en qué preguntas de la entrevista se atasca la gente, registrado como la pregunta y las opciones elegidas, nunca el texto libre que escribes. En la web nuestra analítica es sin cookies — no se guarda nada en tu dispositivo para rastrearte entre visitas. Para contar las visitas diarias, nuestro proveedor de analítica combina tu dirección IP y el tipo de navegador en un código irreversible que cambia cada día, y después descarta la dirección IP.',
    ]},
    { h: 'Lo que deliberadamente no recogemos', body: [
      'Sin subida de documentos — hemos decidido no ser un almacén de pasaportes y certificados.',
      'Sin datos de pago (Get Camino es gratis), sin ubicación precisa, sin identificadores publicitarios, sin venta de datos a nadie, nunca.',
    ]},
    { h: 'Cómo interviene la IA', body: [
      'La conversación de Lola funciona con Claude, de Anthropic: el texto que escribes en la entrevista y en las conversaciones de cada paso se procesa para formular preguntas y entender respuestas. Qué pasos te aplican, y cada fecha, lo calcula nuestro propio motor determinista — no la IA.',
    ]},
    { h: 'Nuestras bases legales (RGPD)', body: [
      'Contrato (art. 6.1.b): construir y guardar tu hoja de ruta a partir de tus respuestas es el servicio que pediste, así que procesamos esas respuestas para prestarlo.',
      'Consentimiento (art. 6.1.a): el correo semanal, y lo que escribas en un campo de texto libre, son opcionales — puedes retirarlo cuando quieras (baja, o eliminar tu cuenta). Cualquier dato de categoría especial que facilites (art. 9) se procesa solo con tu consentimiento explícito, y te pedimos que no lo facilites.',
      'No hacemos publicidad, ni elaboración de perfiles por interés legítimo, ni decisiones automatizadas con efectos jurídicos — el motor es determinista y puedes ver exactamente lo que produjo.',
    ]},
    { h: 'Enlaces para compartir', body: [
      'Si creas un enlace de solo lectura, su contenido — tus respuestas de la entrevista, nunca tus notas de texto libre — va codificado en el fragmento "#" del enlace. Los fragmentos no se envían a ningún servidor, así que un enlace compartido no llega a nuestros registros y no guardamos nada sobre él. Quien lo reciba verá esas respuestas, así que compártelo solo con personas a las que se las contarías.',
    ]},
    { h: 'Quién procesa datos por nosotros', body: [
      'Supabase (cuentas y base de datos), Resend (envío de correo, región UE), PostHog (analítica, región UE, sin cookies en web), Sentry (informes de errores), Anthropic (procesamiento de la entrevista) y Expo/EAS Hosting con Cloudflare (alojamiento). Algunos de estos proveedores procesan datos en Estados Unidos.',
      'Cuando se transfieren datos a EE. UU., la transferencia se ampara en el Marco de Privacidad de Datos UE–EE. UU. y/o en las Cláusulas Contractuales Tipo de la Comisión Europea, que estos proveedores aplican.',
    ]},
    { h: 'Correos', body: [
      'Enviamos correo transaccional (enlaces de acceso, una bienvenida única) y un resumen semanal de lo que vence en tu hoja de ruta. El resumen tiene baja en un clic; y, sencillamente, deja de llegar cuando no hay nada útil que decir.',
    ]},
    { h: 'Conservación y borrado', body: [
      'Los borradores anónimos de la entrevista (antes de iniciar sesión) viven solo en tu navegador y se descartan a los 30 días. Los perfiles, respuestas y progreso con sesión se conservan mientras exista tu cuenta. Los informes de errores y los eventos de analítica se guardan hasta 90 días. Los comentarios que nos escribes quedan en la bandeja de soporte hasta resolverse.',
      'Borra tu cuenta cuando quieras en la app: menú → Eliminar mi cuenta. Esto elimina de inmediato y permanentemente tu cuenta, tus respuestas y tu hoja de ruta. Los correos que ya te enviamos, obviamente, permanecen en tu bandeja.',
    ]},
    { h: 'Tus derechos', body: [
      'Puedes acceder a lo que tenemos (esencialmente tus respuestas de la entrevista — visibles en la app), corregirlo (cuéntale a Lola qué cambió), borrarlo (en la app) y reclamar ante tu autoridad de protección de datos si te hemos fallado. Los residentes de la UE/EEE tienen estos derechos bajo el RGPD; nosotros los respetamos para todo el mundo.',
    ]},
    { h: 'Cambios', body: [
      'Si esta política cambia de forma sustancial, lo anotaremos aquí con una fecha nueva. El historial de versiones es público en nuestro repositorio.',
    ]},
    { h: 'Idioma', body: [
      'Esta página es una traducción por comodidad. En caso de discrepancia, prevalece la versión en inglés.',
    ]},
  ],
};

// C5 (Legal #8): the plain-language "short version" translated for the fr/de/it pages (the body
// below stays English + the "English prevails" notice).
const SUMMARIES: Record<string, string> = {
  fr: "En bref : nous recueillons ton e-mail et tes réponses à l'entretien pour construire et enregistrer ta feuille de route et t'envoyer les e-mails que tu as demandés. Nous ne vendons pas de données, ne diffusons pas de publicité, ne voulons pas tes documents, et tu peux tout supprimer toi-même, dans l'appli, à tout moment.",
  de: "Kurz gesagt: Wir erfassen deine E-Mail und deine Interviewantworten, um deinen Fahrplan zu erstellen und zu speichern und dir die E-Mails zu schicken, die du angefordert hast. Wir verkaufen keine Daten, schalten keine Werbung, wollen deine Dokumente nicht — und du kannst alles jederzeit selbst in der App löschen.",
  it: "In breve: raccogliamo la tua e-mail e le tue risposte all'intervista per costruire e salvare la tua tabella di marcia e inviarti le e-mail che hai richiesto. Non vendiamo dati, non facciamo pubblicità, non vogliamo i tuoi documenti, e puoi cancellare tutto tu stesso, nell'app, in qualsiasi momento.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      metaTitle="Privacy policy | Get Camino"
      description="What Get Camino collects, why, where it goes, and how to delete it — in plain language."
      canonical="https://getcamino.app/privacy"
      en={EN}
      es={ES}
      summaries={SUMMARIES}
    />
  );
}
