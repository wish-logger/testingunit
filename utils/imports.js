const Discord = require("discord.js");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const humanize = require("humanize-duration");
const { getClient } = require("./clientManager");

const client = getClient();

function loadChannelsLogsChannelId(serverId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("servers.db");
    db.get(
      "SELECT channels_logs_channel_id FROM servers WHERE server_id = ?",
      [serverId],
      (err, row) => {
        db.close();
        if (err) reject(err);
        resolve(row ? row.channels_logs_channel_id : null);
      },
    );
  });
}

function loadJson(filename) {
  try {
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename, "utf8"));
    }
    return {};
  } catch (error) {
    console.error(`Error loading JSON file ${filename}:`, error);
    return {};
  }
}

function saveJson(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 4));
  } catch (error) {
    console.error(`Error saving JSON file ${filename}:`, error);
  }
}

function getServerLanguage(serverId, category, file, key) {
  try {
    return new Promise(async (resolve, reject) => {
      try {
        const db = new sqlite3.Database("servers.db");
        const language = await new Promise(
          (resolveLanguage, rejectLanguage) => {
            db.get(
              "SELECT language FROM servers WHERE server_id = ?",
              [serverId],
              (err, row) => {
                db.close();
                if (err) rejectLanguage(err);

                const lang = row ? row.language : "en_us";
                const languageDirPath = `language/${lang}`;

                if (fs.existsSync(languageDirPath)) {
                  resolveLanguage(lang);
                } else {
                  console.warn(
                    `Language directory ${languageDirPath} not found, falling back to en_us`,
                  );
                  resolveLanguage("en_us");
                }
              },
            );
          },
        );

        const filePath = `language/${language}/${category}/${file}.json`;

        if (!fs.existsSync(filePath)) {
          console.warn(
            `Language file ${filePath} not found, falling back to en_us`,
          );
          if (language !== "en_us") {
            const enFilePath = `language/en_us/${category}/${file}.json`;
            if (fs.existsSync(enFilePath)) {
              const langData = JSON.parse(fs.readFileSync(enFilePath, "utf8"));

              if (key) {
                resolve(langData[key] || "none");
              } else {
                resolve(langData);
              }
              return;
            }
          }
          resolve(key ? "none" : {});
          return;
        }

        const langData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        if (key) {
          if (!langData[key] && language !== "en_us") {
            const enFilePath = `language/en_us/${category}/${file}.json`;
            if (fs.existsSync(enFilePath)) {
              const enLangData = JSON.parse(
                fs.readFileSync(enFilePath, "utf8"),
              );
              resolve(enLangData[key] || "none");
              return;
            }
          }
          resolve(langData[key] || "none");
        } else {
          resolve(langData);
        }
      } catch (error) {
        console.error(
          `Error loading language string [${serverId}/${category}/${file}${key ? "/" + key : ""}]:`,
          error,
        );
        resolve(key ? "none" : {});
      }
    });
  } catch (error) {
    console.error(
      `Error loading language string [${serverId}/${category}/${file}${key ? "/" + key : ""}]:`,
      error,
    );
    return key ? "none" : {};
  }
}

module.exports = {
  client,
  loadChannelsLogsChannelId,
  loadJson,
  saveJson,
  getServerLanguage,
};