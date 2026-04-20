const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Partials,
  Events,
  ApplicationCommandType,
} = require("discord.js");
const fs = require("fs");
const shcl = require("@impulsedev/shcl");
const path = require("path");
require("dotenv").config();
const clientManager = require("./utils/clientManager");
const sqlite3 = require("sqlite3");
const ServerEvents = require("./events/ServerEvents");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const { cleanOldMessages } = require("./utils/database");

const Error = shcl.red;
const Warning = shcl.yellow;
const Success = shcl.green;
const Info = shcl.cyan;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.GuildMember, Partials.User],
  shards: getInfo().SHARD_LIST,
  shardCount: getInfo().TOTAL_SHARDS,
});

clientManager.setClient(client);
client.commands = new Collection();

client.cluster = new ClusterClient(client);
console.log(Info("[Cluster] initialized with info:"), {
  id: client.cluster.id,
  count: client.cluster.count,
  info: getInfo(),
});

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  const contextCommandsPath = path.join(__dirname, "contextcommands");
  const contextCommandFiles = fs
    .readdirSync(contextCommandsPath)
    .filter(
      (file) => file.endsWith(".js") && file !== "register-menu-commands.js",
    );

  const allCommandFiles = [
    ...commandFiles,
    ...contextCommandFiles.map((file) => path.join("contextcommands", file)),
  ];

  console.log(Info("Found command files:"), allCommandFiles);
  console.log("\n");

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command) {
      const commandData = command.data.toJSON();
      commands.push(commandData);

      if (command.data.type === ApplicationCommandType.ChatInput) {
        console.log(Info(`Registering slash command: ${command.data.name}`));
      } else if (command.data.type === 2) {
        console.log(
          Info(`Registering USER context menu: ${command.data.name}`),
        );
      } else if (command.data.type === 3) {
        console.log(
          Info(`Registering MESSAGE context menu: ${command.data.name}`),
        );
      }
    }
  }

  for (const file of contextCommandFiles) {
    const filePath = path.join(contextCommandsPath, file);
    const command = require(filePath);
    if ("data" in command) {
      const commandData = command.data.toJSON();
      commands.push(commandData);

      if (command.data.type === 2) {
        console.log(
          Info(`Registering USER context menu: ${command.data.name}`),
        );
      } else if (command.data.type === 3) {
        console.log(
          Info(`Registering MESSAGE context menu: ${command.data.name}`),
        );
      }
    }
  }

  const rest = new REST().setToken(process.env.TOKEN);

  try {
    console.log(
      Info(`Starting to refresh ${commands.length} application (/) commands.`),
    );
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log(
      Success(
        `✅ Successfully registered ${data.length} application commands.`,
      ),
    );
    console.log("\n");
  } catch (error) {
    console.error(Error("❌ Error during command deployment! -> "), error);
  }
}

async function initializeCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  const contextCommandsPath = path.join(__dirname, "contextcommands");
  const contextCommandFiles = fs
    .readdirSync(contextCommandsPath)
    .filter(
      (file) => file.endsWith(".js") && file !== "register-menu-commands.js",
    );

  const totalFiles = commandFiles.length + contextCommandFiles.length;
  console.log(
    Info(
      `Found ${totalFiles} command files (${commandFiles.length} regular, ${contextCommandFiles.length} context menu)`,
    ),
  );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    try {
      if ("data" in command && "execute" in command) {
        if (command.data.type === ApplicationCommandType.ChatInput) {
          client.commands.set(command.data.name, command);
        } else if (command.data.type === 2 || command.data.type === 3) {
          client.commands.set(command.data.name, command);
        } else {
          client.commands.set(command.data.name, command);
        }
      } else {
        console.log(
          Error(
            `❌ Failed to load command ${file}: Missing required "data" or "execute" property`,
          ),
        );
      }
    } catch (error) {
      console.log(Error(`❌ Failed to load command ${file}: ${error.message}`));
    }
  }

  for (const file of contextCommandFiles) {
    const filePath = path.join(contextCommandsPath, file);
    const command = require(filePath);

    try {
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        console.log(
          Info(
            `Loaded context menu command: ${command.data.name} from ${file}`,
          ),
        );
      } else {
        console.log(
          Error(
            `❌ Failed to load context command ${file}: Missing required "data" or "execute" property`,
          ),
        );
      }
    } catch (error) {
      console.log(
        Error(`❌ Failed to load context command ${file}: ${error.message}`),
      );
    }
  }

  console.log(Success(`Successfully loaded: ${client.commands.size}`));
  console.log(Error(`Failed to load! -> ${totalFiles - client.commands.size}`));
  console.log("\n");
}

async function initializeEvents() {
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));
  console.log(Info(`Found ${eventFiles.length} event files`));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    console.log(Info(`Loading event file: ${file}`));
    const eventModule = require(filePath);

    try {
      if (Array.isArray(eventModule)) {
        console.log(Info(`Loading multiple events from ${file}`));
        eventModule.forEach((event) => {
          if (event.name) {
            console.log(Info(`Registering event: ${event.name} from ${file}`));
            if (event.once) {
              client.once(event.name, (...args) => event.execute(...args));
            } else {
              client.on(event.name, (...args) => event.execute(...args));
            }
            console.log(
              Success(
                `✅ Successfully loaded event: ${event.name} from ${file}`,
              ),
            );
          }
        });
      } else if (eventModule.name) {
        console.log(
          Info(`Registering single event: ${eventModule.name} from ${file}`),
        );
        if (eventModule.once) {
          client.once(eventModule.name, (...args) =>
            eventModule.execute(...args),
          );
        } else {
          client.on(eventModule.name, (...args) =>
            eventModule.execute(...args),
          );
        }
        console.log(
          Success(
            `✅ Successfully loaded event: ${eventModule.name} from ${file}`,
          ),
        );
      }
    } catch (error) {
      console.log(
        Error(`❌ Failed to load event! -> ${file}: ${error.message}`),
      );
    }
  }
  console.log("\n");
}

client.on(Events.ClientReady, async () => {
  console.log(Info(`\n=== BOT STARTUP ===`));
  console.log(Info(`Logged in as ${client.user.tag}`));

  // const FileManager = require('./utils/FileManager');
  // FileManager.setClient(client);

  // R2 UPLOAD KILL SWITCH
  // Set to false to disable R2 uploads and use Discord URLs only
  // FileManager.setR2Upload(true);

  // console.log(Info(`\nFile Manager initialized with bot ID: ${client.user.id} | Bucket: ${FileManager.bucketName}\n`));

  ServerEvents.execute(client);

  console.log(Info("\n=== CHECKING BANNED SERVERS ==="));
  const disallowedPath = path.join(__dirname, "utils/DisallowedServers.json");
  const disallowedData = JSON.parse(fs.readFileSync(disallowedPath, "utf8"));

  for (const guild of client.guilds.cache.values()) {
    if (disallowedData.Banned[guild.id]) {
      console.log(
        Warning(`Leaving banned server: ${guild.name} (${guild.id})`),
      );
      await guild.leave();
    }
  }

  console.log(Success("Banned servers check complete.\n"));
  console.log(Info("\n=== CHECKING SERVERS LIST ==="));

  try {
    await Promise.all(
      client.guilds.cache.map(async (guild) => {
        if (!disallowedData.Servers[guild.id]) {
          const serverInfo = {
            name: guild.name,
            description: guild.description || "No description",
            ownerId: guild.ownerId,
            ownerTag: (await guild.fetchOwner()).user.tag,
            joinedAt: new Date().toISOString(),
          };

          disallowedData.Servers[guild.id] = serverInfo;
          console.log(
            Info(
              `Added missing server to DisallowedServers.json: ${guild.name}`,
            ),
          );
        }
      }),
    );

    for (const serverId in disallowedData.Servers) {
      if (!client.guilds.cache.has(serverId)) {
        delete disallowedData.Servers[serverId];
        console.log(
          Warning(
            `Removed non-existent server from DisallowedServers.json: ${serverId}`,
          ),
        );
      }
    }

    fs.writeFileSync(disallowedPath, JSON.stringify(disallowedData, null, 2));
  } catch (error) {
    console.error(Error("Error during servers list check! ->"), error);
  }
  console.log(Success("Servers list check complete.\n"));

  await deployCommands();
  await initializeCommands();
  await initializeEvents();

  console.log(Info("\n=== DATABASE CHECK ==="));
  const db = new sqlite3.Database("servers.db");

  try {
    await Promise.all(
      client.guilds.cache.map(async (guild) => {
        return new Promise((resolve, reject) => {
          db.get(
            "SELECT server_id FROM servers WHERE server_id = ?",
            [guild.id],
            async (err, row) => {
              if (err) {
                console.error(
                  Error(`Error checking server ${guild.name}: ${err}`),
                );
                resolve();
                return;
              }

              if (!row) {
                const owner = await guild.fetchOwner();

                db.run(
                  `
                            INSERT INTO servers (
                                server_id, server_name,
                                owner_id, owner_tag,
                                mod_actions_logs_channel_id, mod_actions_logs_channel_name,
                                members_logs_channel_id, members_logs_channel_name,
                                messages_logs_channel_id, messages_logs_channel_name,
                                voice_logs_channel_id, voice_logs_channel_name,
                                actions_logs_channel_id, actions_logs_channel_name,
                                roles_logs_channel_id, roles_logs_channel_name,
                                server_logs_channel_id, server_logs_channel_name,
                                channels_logs_channel_id, channels_logs_channel_name,
                                wish_events_channel_id, wish_events_channel_name,
                                language
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                  [
                    guild.id,
                    guild.name,
                    owner.id,
                    owner.user.tag,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "en_us",
                  ],
                  (err) => {
                    if (err) {
                      console.error(
                        Error(
                          `Failed to add server ${guild.name} (${guild.id}): ${err}`,
                        ),
                      );
                    } else {
                      console.log(
                        Info(
                          `Added missing server to database! -> ${guild.name}`,
                        ),
                      );
                    }
                    resolve();
                  },
                );
              } else {
                db.get(
                  "SELECT owner_id FROM servers WHERE server_id = ?",
                  [guild.id],
                  async (err, ownerRow) => {
                    if (err) {
                      console.error(
                        Error(
                          `Error checking owner for server ${guild.name}: ${err}`,
                        ),
                      );
                      resolve();
                      return;
                    }

                    if (!ownerRow || !ownerRow.owner_id) {
                      try {
                        const owner = await guild.fetchOwner();
                        db.run(
                          "UPDATE servers SET owner_id = ?, owner_tag = ? WHERE server_id = ?",
                          [owner.id, owner.user.tag, guild.id],
                          (err) => {
                            if (err) {
                              console.error(
                                Error(
                                  `Failed to update owner for ${guild.name}: ${err}`,
                                ),
                              );
                            } else {
                              console.log(
                                Info(
                                  `Updated owner info for server ${guild.name}`,
                                ),
                              );
                            }
                            resolve();
                          },
                        );
                      } catch (error) {
                        console.error(
                          Error(
                            `Error fetching owner for ${guild.name}: ${error}`,
                          ),
                        );
                        resolve();
                      }
                    } else {
                      resolve();
                    }
                  },
                );
              }
            },
          );
        });
      }),
    );
  } catch (error) {
    console.error(Error("Error during database check! -> "), error);
  } finally {
    db.close();
    console.log(Success("Database check complete.\n"));
  }

  console.log(`\n=== SERVER STATUS ===`);
  console.log("Bot cluster starting...");
  console.log(`Serving ${client.guilds.cache.size} servers`);
  console.log("Bot cluster started");
  console.log(`Wish Logger is ready!`);

  if (client.cluster) {
    client.cluster
      .fetchClientValues("guilds.cache.size")
      .then((results) => {
        const totalGuilds = results.reduce(
          (acc, guildCount) => acc + guildCount,
          0,
        );
        const clusterId = client.cluster.id;
        const clusterCount = client.cluster.count;

        if (client.user.id === "1365340092524134521") {
          client.user.setPresence({
            activities: [
              {
                name: `WISH DEVELOPMENT BRANCH`,
                type: 4,
              },
            ],
            status: "online",
          });
        } else {
          client.user.setPresence({
            activities: [
              {
                name: `/help | ${clusterCount || "N/A"} cluster(s)`,
                type: 4,
              },
            ],
            status: "online",
          });
        }
        console.log(
          Info(
            `Cluster ${clusterId !== undefined ? clusterId : "ID"} is ready, serving ${client.guilds.cache.size} servers (total across all clusters: ${totalGuilds})`,
          ),
        );
      })
      .catch(console.error);
  } else {
    client.user.setPresence({
      activities: [
        {
          name: `oops.. something went wrong!`,
          type: 4,
        },
      ],
      status: "online",
    });
  }

  try {
    await cleanOldMessages(client);
    console.log(Success("Initial database cleanup completed"));
  } catch (error) {
    console.error(Error("Error during initial database cleanup:"), error);
  }

  setInterval(
    async () => {
      try {
        await cleanOldMessages(client);
        console.log(Success("Cleaned old messages from database"));
      } catch (error) {
        console.error(Error("Error cleaning old messages:"), error);
      }
    },
    24 * 60 * 60 * 1000,
  );
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return;
    }

    if (!command.autocomplete) {
      console.error(
        Error(
          `Command ${interaction.commandName} does not have an autocomplete handler.`,
        ),
      );
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      DebugManager.logError(interaction.guild.id, "AUTOCOMPLETE_ERROR", error, {
        command: interaction.commandName,
      });
    }
    return;
  }

  if (!interaction.isCommand() && !interaction.isContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(
      Error(`No command matching ${interaction.commandName} was found.`),
    );
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    try {
      const errorMessage = {
        content: "There was an error while executing this command!",
        ephemeral: true,
      };

      if (interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else if (!interaction.replied) {
        await interaction.reply(errorMessage);
      }
    } catch (e) {
      console.error(Error("Error while handling command error! -> "), e);
    }
  }
});

client.on("error", (error) => {
  console.error(Error("Discord client error! -> "), error);
});

process.on("unhandledRejection", (error) => {
  if (error.code === 10062) return;
  console.error(Error("Unhandled promise rejection! -> "), error);
});

client.on("debug", console.log);
client.on("guildMemberRemove", (member) => {
  console.log(
    "RAW guildMemberRemove event triggered for! -> ",
    member.user.tag,
  );
});

client.login(process.env.TOKEN);