// I'm not even asking why

class EmbedFormatter {
  static FormatEmbed(embed) {
    if (!embed) return null;

    const formattedEmbed = {
      title: embed.title || "No Title",
      description: embed.description || "No Description",
      color: embed.color
        ? `#${embed.color.toString(16).padStart(6, "0")}`
        : "No Color",
      fields: [],
      footer: embed.footer ? embed.footer.text : null,
      timestamp: embed.timestamp,
      author: embed.author
        ? {
            name: embed.author.name,
            iconURL: embed.author.iconURL,
            url: embed.author.url,
          }
        : null,
      thumbnail: embed.thumbnail ? embed.thumbnail.url : null,
      image: embed.image ? embed.image.url : null,
      url: embed.url || null,
    };

    // Format fields
    if (embed.fields && embed.fields.length > 0) {
      formattedEmbed.fields = embed.fields.map((field) => ({
        name: field.name || "Unnamed Field",
        value: field.value || "No Value",
        inline: field.inline || false,
      }));
    }

    return formattedEmbed;
  }
}

module.exports = EmbedFormatter;