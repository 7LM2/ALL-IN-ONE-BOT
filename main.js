const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { Dynamic } = require('musicard');
const config = require('./config.json');
const musicIcons = require('./UI/icons/musicicons');
const colors = require('./UI/colors/colors');
const loadLogHandlers = require('./logHandlers');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Added for member events
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Add other intents as needed
    ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

const enabledCommandFolders = commandFolders.filter(folder => config.categories[folder]);
const commands = [];

for (const folder of enabledCommandFolders) {
    const commandFiles = fs.readdirSync(path.join(commandsPath, folder)).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, folder, file);
        const command = require(filePath);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Event listener for when a user joins the server
client.on('guildMemberAdd', async (member) => {
    try {
        // Replace 'YOUR_WELCOME_CHANNEL_ID' with the ID of the channel where you want to send regular avatars and banners
        const welcomeChannel = member.guild.channels.cache.get('1340342186948038759');

        // Replace 'YOUR_ANIMATED_CHANNEL_ID' with the ID of the channel where you want to send animated avatars and banners
        const animatedChannel = member.guild.channels.cache.get('1340620465089024020');

        if (!welcomeChannel || !animatedChannel) {
            console.error('Welcome or animated channel not found!');
            return;
        }

        // Fetch the user's details
        const user = await client.users.fetch(member.id, { force: true });

        // Get the user's avatar and banner URLs
        const avatarURL = user.displayAvatarURL({ format: 'png', size: 4096, dynamic: true });
        const bannerURL = user.bannerURL({ format: 'png', size: 4096, dynamic: true });

        // Check if the avatar or banner is animated
        const isAvatarAnimated = avatarURL.includes('.gif');
        const isBannerAnimated = bannerURL && bannerURL.includes('.gif');

        // Create an embed for regular avatars and banners
        const regularEmbed = new EmbedBuilder()
            .setTitle(`Welcome ${member.user.username}!`)
            .setDescription(`Welcome to the server, ${member.user.tag}!`)
            .setColor('#00FF00')
            .setThumbnail(isAvatarAnimated ? null : avatarURL) // Only set thumbnail if not animated
            .setImage(isBannerAnimated ? null : bannerURL) // Only set image if not animated
            .addFields(
                { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `User ID: ${member.id}` });

        // Send the regular embed to the welcome channel
        await welcomeChannel.send({ embeds: [regularEmbed] });

        // If the avatar or banner is animated, send them to the animated channel
        if (isAvatarAnimated || isBannerAnimated) {
            const animatedEmbed = new EmbedBuilder()
                .setTitle(`Animated Assets for ${member.user.username}`)
                .setColor('#FF00FF')
                .setDescription('This user has animated assets!')
                .setThumbnail(isAvatarAnimated ? avatarURL : null) // Only set thumbnail if animated
                .setImage(isBannerAnimated ? bannerURL : null) // Only set image if animated
                .setFooter({ text: `User ID: ${member.id}` });

            await animatedChannel.send({ embeds: [animatedEmbed] });
        }
    } catch (error) {
        console.error('Error handling guildMemberAdd event:', error);
    }
});

// Rest of your existing code...
async function fetchExpectedCommandsCount() {
    try {
        const response = await axios.get('https://server-backend-tdpa.onrender.com/api/expected-commands-count');
        return response.data.expectedCommandsCount;
    } catch (error) {
        return -1;
    }
}

async function verifyCommandsCount() {
    console.log('\n' + '─'.repeat(60));
    console.log(`${colors.yellow}${colors.bright}             🔍 VERIFICATION 🔍${colors.reset}`);
    console.log('─'.repeat(60));

    const expectedCommandsCount = await fetchExpectedCommandsCount();
    const registeredCommandsCount = client.commands.size;

    if (expectedCommandsCount === -1) {
        console.log(`${colors.yellow}[ WARNING ]${colors.reset} ${colors.red}Server Status: OFFLINE ❌${colors.reset}`);
        console.log(`${colors.yellow}[ WARNING ]${colors.reset} ${colors.red}Unable to verify commands${colors.reset}`);
        return;
    }

    if (registeredCommandsCount !== expectedCommandsCount) {
        console.log(`${colors.yellow}[ WARNING ]${colors.reset} ${colors.red}Commands Mismatch Detected ⚠️${colors.reset}`);
        console.log(`${colors.yellow}[ DETAILS ]${colors.reset} ${colors.red}Current Commands: ${colors.reset}${registeredCommandsCount}`);
        console.log(`${colors.yellow}[ DETAILS ]${colors.reset} ${colors.red}Expected Commands: ${colors.reset}${expectedCommandsCount}`);
        console.log(`${colors.yellow}[ STATUS  ]${colors.reset} ${colors.red}Action Required: Please verify command integrity${colors.reset}`);
    } else {
        console.log(`${colors.cyan}[ COMMANDS ]${colors.reset} ${colors.green}Command Count: ${registeredCommandsCount} ✓${colors.reset}`);
        console.log(`${colors.cyan}[ SECURITY ]${colors.reset} ${colors.green}Command Integrity Verified ✅${colors.reset}`);
        console.log(`${colors.cyan}[ STATUS   ]${colors.reset} ${colors.green}Bot is Secured and Ready 🛡️${colors.reset}`);
    }

    // Footer
    console.log('─'.repeat(60));
}

// Rest of your existing code...
client.login(process.env.TOKEN || config.token);
