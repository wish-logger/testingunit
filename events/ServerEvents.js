const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class ServerEvents {
    constructor(client) {
        this.client = client;
    }

    async handleGuildJoin(guild) {
        const disallowedPath = path.join(__dirname, '../utils/DisallowedServers.json');
        const disallowedData = JSON.parse(fs.readFileSync(disallowedPath, 'utf8'));

        if (disallowedData.Banned[guild.id]) {
            console.log(`Attempted to join banned server: ${guild.name} (${guild.id})`);
            await guild.leave();
            return;
        }

        const owner = await guild.fetchOwner();
        const serverInfo = {
            name: guild.name,
            description: guild.description || "No description",
            ownerId: guild.ownerId,
            ownerTag: owner.user.tag,
            joinedAt: new Date().toISOString()
        };

        disallowedData.Servers[guild.id] = serverInfo;
        fs.writeFileSync(disallowedPath, JSON.stringify(disallowedData, null, 2));

        const db = new sqlite3.Database('servers.db');
        
        try {
            const exists = await new Promise((resolve, reject) => {
                db.get('SELECT server_id FROM servers WHERE server_id = ?', [guild.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? true : false);
                });
            });

            if (!exists) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO servers (
                            server_id, server_name, 
                            owner_id, owner_tag,
                            mod_actions_logs_channel_id, mod_actions_logs_channel_name,
                            members_logs_channel_id, members_logs_channel_name,
                            messages_logs_channel_id, messages_logs_channel_name,
                            voice_logs_channel_id, voice_logs_channel_name,
                            actions_logs_channel_id, actions_logs_channel_name,
                            server_logs_channel_id, server_logs_channel_name,
                            roles_logs_channel_id, roles_logs_channel_name,
                            channels_logs_channel_id, channels_logs_channel_name,
                            wish_events_channel_id, wish_events_channel_name,
                            language
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        guild.id, guild.name,
                        owner.id, owner.user.tag,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        null, null,
                        'en_us'
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } finally {
            db.close();
        }
    }

    async handleGuildRemove(guild) {
        const disallowedPath = path.join(__dirname, '../utils/DisallowedServers.json');
        const disallowedData = JSON.parse(fs.readFileSync(disallowedPath, 'utf8'));

        if (!disallowedData.Banned[guild.id] && disallowedData.Servers[guild.id]) {
            delete disallowedData.Servers[guild.id];
            fs.writeFileSync(disallowedPath, JSON.stringify(disallowedData, null, 2));
            console.log(`Removed server from Servers list: ${guild.name} (${guild.id})`);
        } else if (disallowedData.Banned[guild.id]) {
            console.log(`Server ${guild.name} (${guild.id}) remains in banned list`);
        }

        const db = new sqlite3.Database('servers.db');
        
        try {
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM servers WHERE server_id = ?', [guild.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } finally {
            db.close();
        }
    }
}

module.exports = {
    name: 'guildEvents',
    execute(client) {
        const serverEvents = new ServerEvents(client);

        client.on('guildCreate', async (guild) => {
            try {
                await serverEvents.handleGuildJoin(guild);
            } catch (error) {
                DebugManager.logError(guild.id, 'GUILD_JOIN', error, {
                    guildName: guild.name
                });
            }
        });

        client.on('guildDelete', async (guild) => {
            try {
                await serverEvents.handleGuildRemove(guild);
            } catch (error) {
                DebugManager.logError(guild.id, 'GUILD_REMOVE', error, {
                    guildName: guild.name
                });
            }
        });
    }
};