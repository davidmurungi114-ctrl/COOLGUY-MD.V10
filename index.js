const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');

console.log(chalk.cyan.bold(`
╔════════════════════════════════════╗
║   COOLGUY-MD.V10 ULTRA LITE 🔥    ║
║   By COOLGUY TECH 🇺🇬              ║
╚════════════════════════════════════╝
`));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: ['COOLGUY-MD.V10', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red('Connection closed, reconnecting...'));
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(chalk.green.bold('✅ COOLGUY-MD.V10 CONNECTED! ULTRA LITE RUNNING!'));
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            if (m.key.fromMe) return;
            
            const from = m.key.remoteJid;
            const type = Object.keys(m.message)[0];
            const body = type === 'conversation' ? m.message.conversation : type === 'extendedTextMessage' ? m.message.extendedTextMessage.text : '';
            
            console.log(chalk.yellow(`[${moment().tz('Africa/Kampala').format('HH:mm:ss')}] ${from}: ${body}`));

            // Load your commands handler here
            // require('./handler')(sock, m);

        } catch (e) {
            console.log(e);
        }
    });
}

startBot();
