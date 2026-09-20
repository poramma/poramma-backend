-- ============================================================
-- Fix ponctuel : restreint audit:read à ADMIN (niveau 1) et
-- Ambassadeur (niveau 2), au lieu de "toutes les 6 roles" (héritage
-- via min_role_level = 6 dans le seed initial — audit:export, lui,
-- était déjà correctement à 2).
--
-- Utile uniquement sur une base DÉJÀ seedée (seed.sql n'est pas
-- rejouable). Idempotent : peut être exécuté plusieurs fois sans effet
-- de bord.
-- ============================================================

UPDATE identity.permissions
SET min_role_level = 2
WHERE code = 'audit:read';

DELETE FROM identity.role_permissions rp
USING identity.permissions p, identity.roles r
WHERE rp.permission_id = p.id
  AND rp.role_id = r.id
  AND p.code = 'audit:read'
  AND r.level > 2;
