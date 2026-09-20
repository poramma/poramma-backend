import { text, varchar, integer, boolean, timestamp, jsonb, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ambassade } from "./services";
import { storedFiles } from "./documents";

// Tables "campagnes" déplacées d'ambassade-api vers ce package (partagées avec
// communaute-api : le fil d'annonces des citoyens et leurs interactions).
// Les migrations restent gérées par ambassade-api (voir schema.communication.ts).

// --- CAMPAGNES (communication institutionnelle envoyée à une cible
// filtrée de la communauté) — les compteurs stats* sont dénormalisés sur la
// ligne plutôt que recalculés par agrégation SQL à chaque lecture: une
// campagne SENT ne bouge plus (sauf resend-failed), donc pas de risque de
// dérive, et ça évite un join lourd sur campagne_deliveries pour la liste.
// statsOpened / statsClicked sont recalculés à partir de campagne_interactions
// (utilisateurs distincts) à chaque première interaction d'un citoyen. ---
export const campagnes = ambassade.table("campagnes", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  coverImageId: text("cover_image_id").references(() => storedFiles.id),
  targetFilters: jsonb("target_filters").notNull().default({}),
  channels: jsonb("channels").notNull().default([]),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"),
  sentBy: uuid("sent_by").notNull(),
  statsTotalRecipients: integer("stats_total_recipients").notNull().default(0),
  statsSent: integer("stats_sent").notNull().default(0),
  statsDelivered: integer("stats_delivered").notNull().default(0),
  statsOpened: integer("stats_opened").notNull().default(0),
  statsClicked: integer("stats_clicked").notNull().default(0),
  statsFailed: integer("stats_failed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- PIÈCES JOINTES DE CAMPAGNE (galerie/vidéo/document annexe) ---
export const campagneAttachments = ambassade.table("campagne_attachments", {
  id: text("id").primaryKey(),
  campagneId: text("campagne_id")
    .notNull()
    .references(() => campagnes.id, { onDelete: "cascade" }),
  fileId: text("file_id")
    .notNull()
    .references(() => storedFiles.id),
  type: varchar("type", { length: 20 }).notNull(),
  order: integer("order").notNull().default(0),
  caption: text("caption"),
  // Image ou vidéo affichée dans le carrousel « bannière » entre le titre et le contenu de l'annonce.
  isBanner: boolean("is_banner").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- LIVRAISONS (une ligne par destinataire × canal, écrite à l'envoi) ---
export const campagneDeliveries = ambassade.table("campagne_deliveries", {
  id: text("id").primaryKey(),
  campagneId: text("campagne_id")
    .notNull()
    .references(() => campagnes.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("QUEUED"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
});

// --- INTERACTIONS DES CITOYENS (statistiques pour l'ambassade) ---
// VIEW        : ouverture du détail d'une annonce (au plus une ligne / 30 min / citoyen)
// CLICK       : clic sur un média, un document ou un lien (targetId = id de pièce jointe, ou "link")
// LIKE        : « j'aime » — au plus une ligne active par citoyen et par campagne
// PARTICIPATE : « je participe » (campagnes de type EVENT) — idem
export const campagneInteractions = ambassade.table(
  "campagne_interactions",
  {
    id: text("id").primaryKey(),
    campagneId: text("campagne_id")
      .notNull()
      .references(() => campagnes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // VIEW | CLICK | LIKE | PARTICIPATE
    targetId: text("target_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("campagne_interactions_campagne_type_idx").on(t.campagneId, t.type),
    // Une réaction (LIKE / PARTICIPATE) par citoyen et par campagne : le basculement est sûr en concurrence.
    uniqueIndex("campagne_interactions_reaction_uq")
      .on(t.campagneId, t.userId, t.type)
      .where(sql`${t.type} in ('LIKE','PARTICIPATE')`),
  ]
);
