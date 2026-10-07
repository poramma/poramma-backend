-- ============================================================
-- Administration de la plateforme COMMUNAUTAIRE (séparée de l'ambassade).
--
-- Deux rôles de portée COMMUNITY et leurs permissions, jamais héritées par la
-- hiérarchie ambassade : min_role_level = 0 (aucun rôle n'a un niveau <= 0) et
-- aucun rôle ambassade (ADMIN compris) n'y est rattaché. Les niveaux 50 / 60
-- sont volontairement très éloignés des niveaux ambassade (1-6) pour qu'aucun
-- contrôle « niveau suffisant » côté ambassade ne les laisse passer.
--
-- Idempotent (peut être rejoué). Appliquer après la migration identity 0016.
-- ============================================================

INSERT INTO identity.roles (id, name, description, level, is_system, scope)
SELECT gen_random_uuid(), 'COMMUNITY_ADMIN', 'Administrateur de la plateforme communautaire - Supervision, utilisateurs, audit, support', 50, true, 'COMMUNITY'
WHERE NOT EXISTS (SELECT 1 FROM identity.roles WHERE name = 'COMMUNITY_ADMIN');

INSERT INTO identity.roles (id, name, description, level, is_system, scope)
SELECT gen_random_uuid(), 'COMMUNITY_SUPPORT', 'Support de la plateforme communautaire - Traitement des tickets de la communauté', 60, true, 'COMMUNITY'
WHERE NOT EXISTS (SELECT 1 FROM identity.roles WHERE name = 'COMMUNITY_SUPPORT');

INSERT INTO identity.permissions (id, code, name, description, resource, action, category, min_role_level, scope) VALUES
  (gen_random_uuid(), 'community:overview:read', 'community:overview:read', 'Consulter le tableau de bord de la communauté', 'community', 'overview:read', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:user:read', 'community:user:read', 'Consulter les membres de la communauté', 'community', 'user:read', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:user:manage', 'community:user:manage', 'Suspendre ou réactiver un membre de la communauté', 'community', 'user:manage', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:audit:read', 'community:audit:read', 'Consulter le journal d''audit de la communauté', 'community', 'audit:read', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:audit:export', 'community:audit:export', 'Exporter le journal d''audit de la communauté', 'community', 'audit:export', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:support:read', 'community:support:read', 'Consulter les tickets du support communautaire', 'community', 'support:read', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:support:manage', 'community:support:manage', 'Répondre, assigner et clôturer les tickets du support communautaire', 'community', 'support:manage', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:team:read', 'community:team:read', 'Consulter l''équipe d''administration de la communauté', 'community', 'team:read', 'Communauté', 0, 'COMMUNITY'),
  (gen_random_uuid(), 'community:team:manage', 'community:team:manage', 'Ajouter ou retirer un membre de l''équipe d''administration de la communauté', 'community', 'team:manage', 'Communauté', 0, 'COMMUNITY')
ON CONFLICT (code) DO NOTHING;

-- COMMUNITY_ADMIN : toutes les permissions de portée COMMUNITY.
INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r, identity.permissions p
WHERE r.name = 'COMMUNITY_ADMIN' AND p.scope = 'COMMUNITY'
ON CONFLICT DO NOTHING;

-- COMMUNITY_SUPPORT : tickets + lecture des membres pour les aider.
INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r, identity.permissions p
WHERE r.name = 'COMMUNITY_SUPPORT' AND p.code IN (
  'community:overview:read', 'community:user:read', 'community:support:read', 'community:support:manage'
)
ON CONFLICT DO NOTHING;
