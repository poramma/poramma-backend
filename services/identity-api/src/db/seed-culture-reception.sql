-- ============================================================
-- Rôle CONSEILLER CULTUREL + permissions de l'accueil + service « Espace culturel ».
--
-- Idempotent (peut être rejoué) — à appliquer sur une base déjà seedée :
--   docker exec -i poramma-db psql -U poramma -d poramma < seed-culture-reception.sql
-- Les mêmes lignes sont ajoutées à seed.sql pour une base neuve.
--
-- Les nouvelles permissions ont min_role_level = 1 : la règle « niveau ≤ min »
-- ne les donne donc qu'à l'ADMIN ; les autres rôles les reçoivent par une
-- attribution EXPLICITE ci-dessous (moindre privilège, hors hiérarchie).
-- ============================================================

INSERT INTO identity.roles (id, name, description, level, is_system)
SELECT gen_random_uuid(), 'CULTURAL_ADVISOR', 'Conseiller Culturel - Espace culturel dédié, échanges à visage découvert', 4, true
WHERE NOT EXISTS (SELECT 1 FROM identity.roles WHERE name = 'CULTURAL_ADVISOR');

INSERT INTO identity.permissions (id, code, name, description, resource, action, category, min_role_level) VALUES
  (gen_random_uuid(), 'rdv:checkin', 'rdv:checkin', 'Valider l''arrivée d''un usager (ticket de rendez-vous)', 'rdv', 'checkin', 'Rendez-vous', 1),
  (gen_random_uuid(), 'walkin:read', 'walkin:read', 'Lire le registre des demandes sur place', 'walkin', 'read', 'Accueil', 1),
  (gen_random_uuid(), 'walkin:manage', 'walkin:manage', 'Enregistrer et traiter les demandes sur place', 'walkin', 'manage', 'Accueil', 1),
  (gen_random_uuid(), 'culture:manage', 'culture:manage', 'Gérer l''espace culturel (échanges, rendez-vous, demandes)', 'culture', 'manage', 'Culture', 1)
ON CONFLICT (code) DO NOTHING;

-- ADMIN : carte blanche sur les nouvelles permissions.
INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r, identity.permissions p
WHERE r.name = 'ADMIN' AND p.code IN ('rdv:checkin', 'walkin:read', 'walkin:manage', 'culture:manage')
ON CONFLICT DO NOTHING;

-- RECEPTIONIST : valider les tickets, tenir le registre de l'accueil.
INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r, identity.permissions p
WHERE r.name = 'RECEPTIONIST' AND p.code IN ('rdv:checkin', 'walkin:read', 'walkin:manage')
ON CONFLICT DO NOTHING;

-- CULTURAL_ADVISOR : uniquement ce qui sert son espace (portée limitée à ses services par affectation).
INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r, identity.permissions p
WHERE r.name = 'CULTURAL_ADVISOR' AND p.code IN (
  'culture:manage', 'rdv:read', 'rdv:update', 'rdv:cancel',
  'demande:read', 'demande:update', 'demande:validate', 'demande:reject',
  'service:read', 'availability:read', 'message:read', 'message:create'
)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Service « Espace culturel » (ambassade.*) : rendez-vous + demandes adressés au Conseiller Culturel.
-- ------------------------------------------------------------
INSERT INTO ambassade.services (id, name, code, description, icon, "order", active, requires_appointment, is_cultural)
VALUES ('svc-culture', 'Espace culturel', 'CULTURE', 'Rendez-vous, projets et échanges avec le Conseiller Culturel de l''ambassade', 'Palette', 90, true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ambassade.sub_services (id, service_id, name, code, description, active, base_price, currency, sla_days, allow_custom_request, requires_in_person) VALUES
  ('sub-culture-rdv', 'svc-culture', 'Rendez-vous avec le Conseiller Culturel', 'CULTURE-RDV', 'Entretien avec le Conseiller Culturel : projet, partenariat, événement, orientation culturelle', true, NULL, 'MAD', 3, false, true),
  ('sub-culture-projet', 'svc-culture', 'Projet ou partenariat culturel', 'CULTURE-PROJET', 'Proposer un projet, une collaboration ou une initiative culturelle', true, NULL, 'MAD', 15, true, false),
  ('sub-culture-evenement', 'svc-culture', 'Soutien à un événement culturel', 'CULTURE-EVENEMENT', 'Demander le soutien ou la présence de l''ambassade pour un événement (soirée, exposition, conférence)', true, NULL, 'MAD', 15, true, false),
  ('sub-culture-info', 'svc-culture', 'Demande d''information culturelle', 'CULTURE-INFO', 'Poser une question ou demander une ressource (programme, contacts, documentation)', true, NULL, 'MAD', 7, true, false)
ON CONFLICT (id) DO NOTHING;

-- Permanences : mardi et jeudi, 10h00 - 12h30, créneaux de 30 min (modifiables depuis « Horaires et exceptions »).
INSERT INTO ambassade.service_schedules (id, sub_service_id, day_of_week, start_time, end_time, slot_duration_minutes, max_concurrent_slots, is_active, valid_from)
VALUES
  ('sch-culture-tue', 'sub-culture-rdv', 2, '10:00', '12:30', 30, 1, true, CURRENT_DATE),
  ('sch-culture-thu', 'sub-culture-rdv', 4, '10:00', '12:30', 30, 1, true, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;
