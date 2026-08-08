-- =========================
-- SEED DEFAULT ACHIEVEMENTS
-- =========================

INSERT OR IGNORE INTO achievements
(id, code, name, description, icon, goal, progress, unlocked, sort_order)
VALUES
('headshot_king', 'headshot_king', 'Headshot King', 'Record 500 kills', '🎯', 500, 0, 0, 1),
('first_blood',   'first_blood',   'First Blood',   'Win your first recorded match', '🏆', 1, 0, 0, 2),
('speed_demon',   'speed_demon',   'Speed Demon',   'Reach sub-150ms average reaction time', '⚡', 1, 0, 0, 3),
('on_fire',       'on_fire',       'On Fire',       'Reach a 10-win streak', '🔥', 10, 0, 0, 4),
('diamond_elite', 'diamond_elite', 'Diamond Elite', 'Reach Diamond rank', '💎', 1, 0, 0, 5),
('marathon',      'marathon',      'Marathon',      'Play 1,000 hours', '🎮', 60000, 0, 0, 6);