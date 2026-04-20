const { loadJson, saveJson } = require("./imports");
const path = require("path");
const IGNORED_FILE = path.join(__dirname, "../ignore_list.json");

class IgnoreOptionsManager {
  static FetchIgnored(ServerID) {
    const ignored = loadJson(IGNORED_FILE) || {};

    return (
      ignored[ServerID] || {
        channels: [],
        messages: [],
        targets: [],
        executors: [],
        roles: [],
        categories: [],
      }
    );
  }

  static IsIgnored(ServerID, type, id) {
    const ignored = loadJson(IGNORED_FILE) || {};
    const validTypes = [
      "channels",
      "messages",
      "targets",
      "executors",
      "roles",
      "categories",
    ];
    if (!validTypes.includes(type)) {
      console.log(`Invalid ignore type: ${type}`);

      return false;
    }

    return ignored[ServerID]?.[type]?.includes(id) || false;
  }

  static AddIgnored(ServerID, type, id) {
    const ignored = loadJson(IGNORED_FILE) || {};
    const validTypes = [
      "channels",
      "messages",
      "targets",
      "executors",
      "roles",
      "categories",
    ];
    if (!validTypes.includes(type)) {
      console.log(`Invalid ignore type: ${type}`);
      return;
    }
    if (!ignored[ServerID]) {
      ignored[ServerID] = {
        channels: [],
        messages: [],
        targets: [],
        executors: [],
        roles: [],
        categories: [],
      };
    }
    if (!ignored[ServerID][type].includes(id)) {
      ignored[ServerID][type].push(id);
      saveJson(IGNORED_FILE, ignored);
    }
  }

  static RemoveIgnored(ServerID, type, id) {
    const ignored = loadJson(IGNORED_FILE) || {};
    const validTypes = [
      "channels",
      "messages",
      "targets",
      "executors",
      "roles",
      "categories",
    ];
    if (!validTypes.includes(type)) {
      console.log(`Invalid ignore type: ${type}`);
      return;
    }
    if (ignored[ServerID] && ignored[ServerID][type]) {
      ignored[ServerID][type] = ignored[ServerID][type].filter(
        (item) => item !== id,
      );
      if (Object.values(ignored[ServerID]).every((arr) => arr.length === 0)) {
        delete ignored[ServerID];
      }
      saveJson(IGNORED_FILE, ignored);
    }
  }
}

module.exports = IgnoreOptionsManager;