import nodemailer from "nodemailer";

export type MailOptions = {
  to: string;
  subject: string;
  html: string;
  /** Version texte (générée depuis le HTML si absente — améliore la délivrabilité). */
  text?: string;
};

let primary: nodemailer.Transporter | undefined;
let mirror: nodemailer.Transporter | undefined;

/**
 * Deux transports :
 *
 * - **Principal** (SMTP_HOST/PORT/USER/PASS/FROM/SECURE) : celui qui livre
 *   réellement. Dev par défaut = Mailhog (SMTP_HOST=mailhog, rien ne sort) ;
 *   avec de vrais identifiants (ex. Gmail : smtp.gmail.com:587 + mot de passe
 *   d'application) les emails atteignent de vraies boîtes. STARTTLS sur 587
 *   reste `secure:false` ici, nodemailer met la connexion à niveau ; mettre
 *   SMTP_SECURE=true pour TLS implicite (port 465).
 * - **Copie Mailhog** (facultative, MAIL_MIRROR_TO_MAILHOG=true + MAILHOG_HOST/
 *   MAILHOG_PORT) : chaque email envoyé est aussi déposé dans Mailhog
 *   (http://localhost:8025) pour le voir en dev sans ouvrir la vraie boîte. Elle
 *   est inactive quand le transport principal EST déjà Mailhog, et son échec ne
 *   fait jamais échouer l'envoi.
 */
export function initMailer() {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST not configured");
  }

  primary = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    // Sans délai, une passerelle injoignable bloquerait la requête HTTP (ex. envoi d'OTP).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const mirrorHost = process.env.MAILHOG_HOST;
  mirror =
    process.env.MAIL_MIRROR_TO_MAILHOG === "true" && mirrorHost && mirrorHost !== process.env.SMTP_HOST
      ? nodemailer.createTransport({ host: mirrorHost, port: Number(process.env.MAILHOG_PORT || 1025), secure: false, connectionTimeout: 3_000 })
      : undefined;
}

/** Retire les balises pour produire la version texte d'un email HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Envoie via le transport principal (l'erreur remonte à l'appelant) ; la copie Mailhog est best-effort. */
export async function sendMail(options: MailOptions) {
  if (!primary) initMailer();

  const message = {
    from: `"${process.env.MAIL_FROM_NAME || "Poramma"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    ...options,
    text: options.text ?? htmlToText(options.html),
  };

  const mirrored = mirror
    ? mirror.sendMail(message).catch((err: Error) => console.warn("[mailer] copie Mailhog échouée :", err.message))
    : Promise.resolve();

  try {
    await primary!.sendMail(message);
  } finally {
    await mirrored;
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Gabarit commun de tous les emails (OTP, demandes, rendez-vous, dossier,
 * campagnes) : en-tête aux couleurs de la plateforme, paragraphes échappés,
 * bouton d'action facultatif. `paragraphs` est du TEXTE (jamais du HTML) ;
 * `rawHtml` permet d'insérer un bloc HTML déjà maîtrisé (ex. contenu d'une campagne).
 */
export function renderEmail(params: {
  title: string;
  paragraphs?: string[];
  rawHtml?: string;
  action?: { label: string; url: string };
  footer?: string;
}): string {
  const paragraphs = (params.paragraphs ?? [])
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#374151;">${escapeHtml(p)}</p>`)
    .join("");
  const action = params.action
    ? `<p style="margin:22px 0 6px;"><a href="${escapeHtml(params.action.url)}" style="display:inline-block;background:#00572c;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${escapeHtml(params.action.label)}</a></p>`
    : "";
  const footer = params.footer ?? "Ambassade du Mali au Maroc — Services consulaires. Ceci est un message automatique, merci de ne pas y répondre.";

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:#00572c;padding:18px 24px;color:#ffffff;font-size:17px;font-weight:700;">Ambassade du Mali au Maroc</td></tr>
<tr><td style="padding:26px 24px 20px;">
<h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${escapeHtml(params.title)}</h1>
${paragraphs}${params.rawHtml ?? ""}${action}
</td></tr>
<tr><td style="padding:14px 24px 22px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
