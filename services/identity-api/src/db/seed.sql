-- ============================================================
-- Identity seed: system roles, permission catalog, role_permissions,
-- and a default ADMIN account.
--
-- Hierarchy (see project memory rbac_hierarchy_decision):
--   1 = ADMIN (carte blanche), 2 = AMBASSADOR (supervision, no technical
--   management), 3 = SENIOR_AGENT, 4 = AGENT, 5 = RECEPTIONIST,
--   6 = AUDITOR. A role of level N gets every permission whose
--   min_role_level is >= N (i.e. inherits from levels N+1..6), computed
--   below via `r.level <= p.min_role_level`.
--
-- Permission codes and minRoleLevel values mirror
-- poramma-frontend-ambassy/src/config/permissions.ts exactly, EXCEPT for
-- service:create/update/delete/admin and user:create/update/admin, whose
-- minRoleLevel is forced to 1 here so they are NOT inherited by AMBASSADOR
-- (level 2) under the new hierarchy — the frontend still has them at 2
-- because it was written for the old hierarchy; a frontend sync is a
-- separate, deferred task.
--
-- Meant to run once against a fresh database. Not idempotent (no
-- ON CONFLICT) — do not re-run against a database that already has roles.
-- ============================================================

INSERT INTO identity.roles (id, name, description, level, is_system) VALUES
  (gen_random_uuid(), 'ADMIN', 'Administrateur système - Configuration et gestion', 1, true),
  (gen_random_uuid(), 'AMBASSADOR', 'Chef de mission diplomatique - Supervision', 2, true),
  (gen_random_uuid(), 'SENIOR_AGENT', 'Agent consulaire senior - Validation et supervision', 3, true),
  (gen_random_uuid(), 'AGENT', 'Agent consulaire - Traitement standard', 4, true),
  (gen_random_uuid(), 'RECEPTIONIST', 'Agent d''accueil - Urgences et orientation', 5, true),
  (gen_random_uuid(), 'AUDITOR', 'Auditeur - Lecture seule et contrôle', 6, true);

INSERT INTO identity.permissions (id, code, name, description, resource, action, category, min_role_level) VALUES
  -- Demandes
  (gen_random_uuid(), 'demande:read', 'demande:read', 'Lire les demandes', 'demande', 'read', 'Demandes', 5),
  (gen_random_uuid(), 'demande:create', 'demande:create', 'Créer une demande', 'demande', 'create', 'Demandes', 4),
  (gen_random_uuid(), 'demande:update', 'demande:update', 'Modifier une demande', 'demande', 'update', 'Demandes', 4),
  (gen_random_uuid(), 'demande:delete', 'demande:delete', 'Supprimer une demande', 'demande', 'delete', 'Demandes', 2),
  (gen_random_uuid(), 'demande:validate', 'demande:validate', 'Valider une demande', 'demande', 'validate', 'Demandes', 3),
  (gen_random_uuid(), 'demande:reject', 'demande:reject', 'Rejeter une demande', 'demande', 'reject', 'Demandes', 3),
  (gen_random_uuid(), 'demande:assign', 'demande:assign', 'Assigner une demande', 'demande', 'assign', 'Demandes', 3),
  -- Rendez-vous
  (gen_random_uuid(), 'rdv:read', 'rdv:read', 'Lire les rendez-vous', 'rdv', 'read', 'Rendez-vous', 5),
  (gen_random_uuid(), 'rdv:create', 'rdv:create', 'Créer un rendez-vous', 'rdv', 'create', 'Rendez-vous', 4),
  (gen_random_uuid(), 'rdv:create-urgence', 'rdv:create-urgence', 'Créer un rdv d''urgence', 'rdv', 'create-urgence', 'Rendez-vous', 5),
  (gen_random_uuid(), 'rdv:update', 'rdv:update', 'Modifier un rendez-vous', 'rdv', 'update', 'Rendez-vous', 4),
  (gen_random_uuid(), 'rdv:cancel', 'rdv:cancel', 'Annuler un rendez-vous', 'rdv', 'cancel', 'Rendez-vous', 2),
  (gen_random_uuid(), 'rdv:print-daily', 'rdv:print-daily', 'Imprimer le planning journalier', 'rdv', 'print-daily', 'Rendez-vous', 5),
  -- Disponibilités
  (gen_random_uuid(), 'availability:read', 'availability:read', 'Lire les disponibilités', 'availability', 'read', 'Disponibilités', 5),
  (gen_random_uuid(), 'availability:create', 'availability:create', 'Créer une disponibilité', 'availability', 'create', 'Disponibilités', 5),
  (gen_random_uuid(), 'availability:update', 'availability:update', 'Modifier une disponibilité', 'availability', 'update', 'Disponibilités', 5),
  (gen_random_uuid(), 'availability:delete', 'availability:delete', 'Supprimer une disponibilité', 'availability', 'delete', 'Disponibilités', 5),
  (gen_random_uuid(), 'availability:config', 'availability:config', 'Configurer les disponibilités', 'availability', 'config', 'Disponibilités', 2),
  -- Services (create/update/delete/admin forced to level 1 — ADMIN-exclusive)
  (gen_random_uuid(), 'service:read', 'service:read', 'Lire les services', 'service', 'read', 'Services', 5),
  (gen_random_uuid(), 'service:create', 'service:create', 'Créer un service', 'service', 'create', 'Services', 1),
  (gen_random_uuid(), 'service:update', 'service:update', 'Modifier un service', 'service', 'update', 'Services', 1),
  (gen_random_uuid(), 'service:delete', 'service:delete', 'Supprimer un service', 'service', 'delete', 'Services', 1),
  (gen_random_uuid(), 'service:admin', 'service:admin', 'Administrer les services', 'service', 'admin', 'Services', 1),
  -- Utilisateurs / Agents (create/update/admin forced to level 1 — ADMIN-exclusive; delete was already 1)
  (gen_random_uuid(), 'user:read', 'user:read', 'Lire les utilisateurs', 'user', 'read', 'Utilisateurs', 5),
  (gen_random_uuid(), 'user:create', 'user:create', 'Créer un utilisateur', 'user', 'create', 'Utilisateurs', 1),
  (gen_random_uuid(), 'user:update', 'user:update', 'Modifier un utilisateur', 'user', 'update', 'Utilisateurs', 1),
  (gen_random_uuid(), 'user:delete', 'user:delete', 'Supprimer un utilisateur', 'user', 'delete', 'Utilisateurs', 1),
  (gen_random_uuid(), 'user:admin', 'user:admin', 'Administrer les utilisateurs', 'user', 'admin', 'Utilisateurs', 1),
  -- Documents
  (gen_random_uuid(), 'document:read', 'document:read', 'Lire les documents', 'document', 'read', 'Documents', 5),
  (gen_random_uuid(), 'document:validate', 'document:validate', 'Valider un document', 'document', 'validate', 'Documents', 3),
  (gen_random_uuid(), 'document:upload', 'document:upload', 'Uploader un document', 'document', 'upload', 'Documents', 4),
  (gen_random_uuid(), 'document:archive', 'document:archive', 'Archiver un document', 'document', 'archive', 'Documents', 4),
  (gen_random_uuid(), 'document:share', 'document:share', 'Partager un document interne', 'document', 'share', 'Documents', 4),
  -- Étudiants (même paire read/validate que Documents — n'importe quel agent
  -- habilité peut valider, pas seulement l'ADMIN ; voir module etudiants).
  (gen_random_uuid(), 'etudiant:read', 'etudiant:read', 'Lire les dossiers étudiants', 'etudiant', 'read', 'Étudiants', 5),
  (gen_random_uuid(), 'etudiant:validate', 'etudiant:validate', 'Valider, rejeter, suspendre un étudiant ou lui attribuer un INUE', 'etudiant', 'validate', 'Étudiants', 3),
  -- Communication
  (gen_random_uuid(), 'comm:read', 'comm:read', 'Lire les communications', 'comm', 'read', 'Communication', 3),
  (gen_random_uuid(), 'comm:create', 'comm:create', 'Créer une communication', 'comm', 'create', 'Communication', 3),
  (gen_random_uuid(), 'comm:send', 'comm:send', 'Envoyer une communication', 'comm', 'send', 'Communication', 3),
  -- Messagerie interne
  (gen_random_uuid(), 'message:read', 'message:read', 'Lire la messagerie interne', 'message', 'read', 'Messagerie', 6),
  (gen_random_uuid(), 'message:create', 'message:create', 'Envoyer un message interne', 'message', 'create', 'Messagerie', 6),
  -- Audit
  (gen_random_uuid(), 'audit:read', 'audit:read', 'Lire le journal d''audit', 'audit', 'read', 'Audit', 2),
  (gen_random_uuid(), 'audit:export', 'audit:export', 'Exporter le journal d''audit', 'audit', 'export', 'Audit', 2),
  -- Paiements
  (gen_random_uuid(), 'payment:read', 'payment:read', 'Lire les paiements', 'payment', 'read', 'Paiements', 3),
  (gen_random_uuid(), 'payment:create', 'payment:create', 'Créer un paiement', 'payment', 'create', 'Paiements', 2),
  (gen_random_uuid(), 'payment:refund', 'payment:refund', 'Rembourser un paiement', 'payment', 'refund', 'Paiements', 2),
  -- Stats & Rapports
  (gen_random_uuid(), 'stats:read', 'stats:read', 'Lire les statistiques', 'stats', 'read', 'Statistiques', 3),
  (gen_random_uuid(), 'stats:export', 'stats:export', 'Exporter les statistiques', 'stats', 'export', 'Statistiques', 2);

-- Cross-join: role of level N gets every permission whose min_role_level >= N.
INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r
JOIN identity.permissions p ON r.level <= p.min_role_level;

-- Default ADMIN account (level 1, carte blanche).
-- Email: admin@poramma.ml / Password: Admin@Poramma2026!
WITH new_user AS (
  INSERT INTO identity.users (id, email, password_hash, email_verified, status)
  VALUES (
    gen_random_uuid(),
    'admin@poramma.ml',
    '$2b$10$3krXY/29ksE7DTOJ2n4PruKZYIbooLHTTehoU1PIkVTbXyV8qBrl2',
    true,
    'VERIFIED'
  )
  RETURNING id
),
new_profile AS (
  INSERT INTO identity.user_profiles (id, user_id, user_type, first_name, last_name)
  SELECT gen_random_uuid(), new_user.id, 'other', 'Admin', 'Système'
  FROM new_user
  RETURNING user_id
),
new_agent AS (
  -- Gives the seeded admin an agents row too, matching how every other
  -- staff account works (frontend's own mock data treats ADMIN as an
  -- Agent, e.g. matricule AGT-004-AK) — without this, GET /profile 404s
  -- for the admin account since it has no linked agents row.
  INSERT INTO identity.agents (id, user_id, matricule, role_title, department, active, hired_at)
  SELECT gen_random_uuid(), new_profile.user_id, 'AGT-001-ADM', 'Administrateur Système', 'ADMINISTRATIVE', true, now()
  FROM new_profile
  RETURNING user_id
)
INSERT INTO identity.user_roles (id, user_id, role_id, assigned_by, is_active)
SELECT gen_random_uuid(), new_agent.user_id, r.id, new_agent.user_id, true
FROM new_agent, identity.roles r
WHERE r.name = 'ADMIN';

-- Rôle CULTURAL_ADVISOR, permissions de l accueil et service Espace culturel :
-- appliquer ensuite seed-culture-reception.sql (idempotent).
