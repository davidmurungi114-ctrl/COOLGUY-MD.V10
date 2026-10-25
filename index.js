const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');

console.log(chalk.cyan.bold(`
╔════════════════════════════════════╗
║  COOLGUY-MD.V10 ULTRA LITE 🔥     ║
║  FULL EDITION - By COOLGUY TECH  ║
╚════════════════════════════════════╝
`));

const plugins = new Map();

// LOAD ALL PLUGINS
function loadPlugins() {
    const folders = ['plugins', 'commands', 'lib/commands'];
    for (const folder of folders) {
        const fullPath = path.join(__dirname, folder);
        if (fs.existsSync(fullPath)) {
            const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));
            for (const file of files) {
                try {
                    const plugin = require(path.join(fullPath, file));
                    plugins.set(file, plugin);
                    console.log(chalk.green(`✅ Loaded: ${file}`));
                } catch (e) {
                    console.log(chalk.red(`❌ Failed: ${file} - ${e.message}`));
                }
            }
        }
    }
    console.log(chalk.yellow.bold(`\n📦 Total Plugins: ${plugins.size}\n`));
}
loadPlugins();

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: ['COOLGUY-MD.V10', 'Chrome', '1.0.0'],
        getMessage: async (key) => { return { conversation: 'Hi' } }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log(chalk.red('Reconnecting...'));
                startBot();
            } else {
                console.log(chalk.red.bold('LOGGED OUT! Delete session folder!'));
            }
        } else if (connection === 'open') {
            console.log(chalk.green.bold('✅ COOLGUY V10 ULTRA LITE CONNECTED & READY!'));
            console.log(chalk.cyan(`⏰ Time: ${moment().tz('Africa/Kampala').format('YYYY-MM-DD HH:mm:ss')}`));
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            if (m.key.fromMe) return;

            const from = m.key.remoteJid;
            const type = Object.keys(m.message)[0];
            let body = '';
            if (type === 'conversation') body = m.message.conversation;
            else if (type === 'extendedTextMessage') body = m.message.extendedTextMessage.text;
            else if (type === 'imageMessage') body = m.message.imageMessage.caption || '';
            else if (type === 'videoMessage') body = m.message.videoMessage.caption || '';
            
            const prefix = '.';
            if (!body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            console.log(chalk.yellow(`[${moment().tz('Africa/Kampala').format('HH:mm:ss')}] ${from}: ${prefix}${command}`));

            // Execute plugin
            for (const [file, plugin] of plugins) {
                try {
                    if (typeof plugin === 'function') {
                        await plugin(sock, m, { command, args, body, from, prefix });
                    } else if (plugin.command && plugin.command.includes(command)) {
                        await plugin.execute(sock, m, { args, from });
                    }
                } catch (e) {
                    console.log(chalk.red(`Error in ${file}: ${e.message}`));
                }
            }

        } catch (e) {
            console.log(chalk.red(`Message Error: ${e.message}`));
        }
    });
}

startBot();
