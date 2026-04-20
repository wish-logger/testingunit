const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const db = new sqlite3.Database(path.join(__dirname, "../messages.db"));

let isFirstRun = true;

async function cleanOldMessages(client) {
  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const CLEANUP_CHANNEL_ID = "1329496632185716737"; // Wjeb tutaj ID kanalu gdzie bedzie te Initial Checkup !!!!!!!

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM messages WHERE created_at < ? AND attachments IS NOT NULL",
      [fourWeeksAgo],
      async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        let r2FilesDeleted = 0;

        db.get(
          "SELECT COUNT(*) as count FROM messages WHERE created_at < ?",
          [fourWeeksAgo],
          async (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            const messagesToDelete = row.count;

            db.run(
              "DELETE FROM messages WHERE created_at < ?",
              [fourWeeksAgo],
              async (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                try {
                  const channel =
                    await client.channels.fetch(CLEANUP_CHANNEL_ID);

                  if (channel) {
                    const embed = new EmbedBuilder()
                      .setTitle("Database Cleanup Report")
                      .setColor("#00FF00")
                      .addFields(
                        {
                          name: "Messages Deleted",
                          value: isFirstRun
                            ? "`Bot Started - Initial Check`"
                            : `\`${messagesToDelete}\` messages older than 4 weeks were deleted from the database`,
                          inline: false,
                        },
                        {
                          name: "R2 Files Deleted",
                          value: `\`${r2FilesDeleted}\` files deleted from Cloudflare R2`,
                          inline: false,
                        },
                        {
                          name: "Cleanup Time",
                          value: `${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
                          inline: false,
                        },
                      );

                    await channel.send({ embeds: [embed] });
                  }
                } catch (error) {
                  console.error("Error sending cleanup report:", error);
                  DebugManager.logError(
                    "GLOBAL",
                    "DATABASE_CLEANUP_REPORT",
                    error,
                  );
                }

                isFirstRun = false;

                db.run("VACUUM", (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              },
            );
          },
        );
      },
    );
  });
}

module.exports = {
  db,
  cleanOldMessages,
};