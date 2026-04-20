Wish Logger - Testing Unit

Code given to Wish's developers for testing purposes
Do whatever you want with it, I don't care

index.js has our event & command loaders, R2 kill switch, and main bot logic

/events & /commands would be our event files, like: messageDeleted, messageEdited, etc., same thing with commands

/contextcommands were poorly supported, but they worked (somehow)

In the /events you can see the main event called ServerEvents.js, we would use it as the main logic for adding and removing Wish from different servers, as well as other logic that got cut from the testing unit

/Actions - had our action logs from events & commands, something like: "Logs channel ${channelLogId} is ignored, skipping channel deleted log" from the correct server and other stuff. Most of them would be disabled in prod, however button actions, premium, and some other systems had them enabled

/Flags - our errors folder, when you executed the command /debug share:true, we would receive a JSON file with your configuration as well as a .txt file with your "Flags." We meant this as "Flags of your server," that's why it's called flags. Normal users who executed /debug share:false or just /debug wouldn't receive the .txt file

/language was our language repository, however it differs from the one on our GitHub, because we just bundled English strings here. We didn't bother to bundle other languages, too much of a pain in the ass

/wish_logs_queue was an idea of a "queue" for logs, however it was only used for website dashboard logs, to not clutter logs, plus some internal ones like detecting the person who used /clear, /ban, /kick, so instead of the executor being the bot, it would show the moderator who did it

And yeah, I think that's all. The code is terrible, and I mean it. Nothing to see here, just history
