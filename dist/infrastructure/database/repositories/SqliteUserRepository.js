"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteUserRepository = void 0;
const databaseProvider_1 = require("../../../main/ipc/databaseProvider");
class SqliteUserRepository {
    db() {
        return (0, databaseProvider_1.getDatabase)()
            .getConnection();
    }
    findByEmail(email) {
        return this.db()
            .prepare(`
SELECT

id,

email,

password_hash AS passwordHash,

salt

FROM users

WHERE email = ?

COLLATE NOCASE
`)
            .get(email.trim());
    }
    findUserByEmail(email) {
        return this.findByEmail(email);
    }
    addUser(user) {
        this.db()
            .prepare(`
INSERT INTO users
(
id,
email,
password_hash,
salt,
created_at
)

VALUES
(
?,
?,
?,
?,
?
)
`)
            .run(user.id, user.email
            .trim()
            .toLowerCase(), user.passwordHash, user.salt, new Date()
            .toISOString());
        return {
            id: user.id,
            email: user.email
                .trim()
                .toLowerCase()
        };
    }
    getUserById(id) {
        return this.db()
            .prepare(`
SELECT

id,

email,

password_hash AS passwordHash,

salt

FROM users

WHERE id = ?
`)
            .get(id);
    }
    setCurrentUserId(userId) {
        this.db()
            .prepare(`
UPDATE auth_session

SET current_user_id = ?

WHERE id = 1
`)
            .run(userId);
    }
    getCurrentUserId() {
        const row = this.db()
            .prepare(`
SELECT

current_user_id AS userId

FROM auth_session

WHERE id = 1
`)
            .get();
        return row?.userId ?? null;
    }
}
exports.SqliteUserRepository = SqliteUserRepository;
