const { loadJson, saveJson } = require("./imports");
const path = require("path");

const OPTIONS_FILE = path.join(__dirname, "../options.json");

class EvaluateOptionManager {
  static GetServerOptions(ServerID) {
    const options = loadJson(OPTIONS_FILE) || {};

    return (
      options[ServerID] ||
      options.defaults || {
        DoIgnoreBots: false,
        SendAttachmentsAsSpoilers: true,
      }
    );
  }

  static SaveServerOptions(ServerID, newOptions) {
    const options = loadJson(OPTIONS_FILE) || {};

    options[ServerID] = { ...this.GetServerOptions(ServerID), ...newOptions };
    saveJson(OPTIONS_FILE, options);

    return options[ServerID];
  }

  static ResetServerOptions(ServerID) {
    const options = loadJson(OPTIONS_FILE) || {};
    const defaults = options.defaults || {
      DoIgnoreBots: false,
      SendAttachmentsAsSpoilers: true,
    };
    options[ServerID] = { ...defaults };
    saveJson(OPTIONS_FILE, options);

    return options[ServerID];
  }

  static DoIgnoreBots(ServerID) {
    const options = this.GetServerOptions(ServerID);

    return options.DoIgnoreBots === undefined ? false : options.DoIgnoreBots;
  }

  static GetSendAttachmentsAsSpoilers(ServerID) {
    const options = this.GetServerOptions(ServerID);

    return options.SendAttachmentsAsSpoilers === undefined
      ? true
      : options.SendAttachmentsAsSpoilers;
  }
}

module.exports = EvaluateOptionManager;