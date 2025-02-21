class Video {
    static async createTable() {
        const queries = [
            // Drop existing table if exists
            `DROP TABLE IF EXISTS videos_new`,

            // Create new table with all columns
            `CREATE TABLE IF NOT EXISTS videos_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                path TEXT NOT NULL,
                duration INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                share_token TEXT UNIQUE,
                expires_at DATETIME
            )`,

            // Copy data from old table if it exists
            `INSERT OR IGNORE INTO videos_new (id, title, path, duration, created_at)
             SELECT id, title, path, duration, created_at
             FROM videos
             WHERE EXISTS (SELECT 1 FROM videos)`,

            // Drop old table
            `DROP TABLE IF EXISTS videos`,

            // Rename new table to videos
            `ALTER TABLE videos_new RENAME TO videos`,
        ];

        return new Promise((resolve, reject) => {
            // Run queries in sequence
            const runQuery = (index) => {
                if (index >= queries.length) {
                    // All queries completed
                    global.db.all(
                        "PRAGMA table_info(videos)",
                        [],
                        (err, columns) => {
                            if (err) {
                                console.error(
                                    "Failed to verify table structure:",
                                    err
                                );
                                reject(err);
                            } else {
                                console.log("Table structure:", columns);
                                resolve();
                            }
                        }
                    );
                    return;
                }

                global.db.run(queries[index], (err) => {
                    if (err) {
                        console.error(`Query ${index} error:`, err);
                        reject(err);
                    } else {
                        console.log(`Query ${index} completed successfully`);
                        runQuery(index + 1);
                    }
                });
            };

            // Run in transaction
            global.db.run("BEGIN TRANSACTION", (err) => {
                if (err) {
                    console.error("Transaction start error:", err);
                    reject(err);
                    return;
                }

                runQuery(0);
            });
        })
            .then(() => {
                return new Promise((resolve, reject) => {
                    global.db.run("COMMIT", (err) => {
                        if (err) {
                            console.error("Transaction commit error:", err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            })
            .catch((err) => {
                return new Promise((resolve, reject) => {
                    global.db.run("ROLLBACK", () => {
                        reject(err);
                    });
                });
            });
    }

    static async clearExpiredTokens() {
        const sql = `
            UPDATE videos 
            SET share_token = NULL, expires_at = NULL 
            WHERE datetime(expires_at) < datetime('now')
        `;
        return new Promise((resolve, reject) => {
            global.db.run(sql, [], (err) => {
                if (err) {
                    console.error("Clear tokens error:", err);
                    reject(err);
                } else resolve();
            });
        });
    }
}

module.exports = Video;
