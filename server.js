const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tiktokLive = require('tiktok-live-connector');
const WebcastPushConnection = tiktokLive.WebcastPushConnection || tiktokLive;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servimos la carpeta pública para el frontend
app.use(express.static('public'));

// Diccionario de tus 18 jugadores (sin el 9 ni el 19)
const mapaGoles = {
    'Rose': 'matias_galarza.mp4',         // 1. Matías Galarza
    'Doughnut': 'mauricio.mp4',           // 2. Maurício
    'TikTok': 'lionel_messi.mp4',         // 3. Lionel Messi
    'Ice Cream': 'luis_diaz.mp4',         // 4. Luis Díaz
    'Panda': 'raul_jimenez.mp4',          // 5. Raúl Jiménez
    'Love Letter': 'luis_romo.mp4',       // 6. Luis Romo
    'Perfume': 'julian_quinones.mp4',     // 7. Julián Quiñones
    'Corgi': 'maximiliano_araujo.mp4',    // 8. Maximiliano Araújo
    'Mirror': 'jaminton_campaz.mp4',      // 10. Jaminton Campaz
    'Crown': 'vinicius_junior.mp4',       // 11. Vinícius Júnior
    'Motorcycle': 'matheus_cunha.mp4',    // 12. Matheus Cunha
    'Jet': 'kylian_mbappe.mp4',           // 13. Kylian Mbappé
    'Lion': 'erling_haaland.mp4',         // 14. Erling Haaland
    'Meteor': 'harry_kane.mp4',           // 15. Harry Kane
    'Whale': 'kai_havertz.mp4',           // 16. Kai Havertz
    'Trophy': 'cody_gakpo.mp4',           // 17. Cody Gakpo
    'Castle': 'jude_bellingham.mp4',      // 18. Jude Bellingham
    'Fire': 'viktor_gyokeres.mp4'         // 20. Viktor Gyökeres
};

// Configura tu cuenta de TikTok aquí para el Live real
const tiktokUsername = "futbolmundial2026_"; 
let tiktokConnection = new WebcastPushConnection(tiktokUsername);

function conectarTikTok() {
    if (tiktokUsername === "TU_USUARIO_DE_TIKTOK_AQUI") {
        console.log("⚠️ Modo de escucha real en espera: Configura tu usuario en 'server.js' cuando vayas a transmitir.");
        return;
    }
    tiktokConnection.connect().then(state => {
        console.log(`✅ Conectado al Live de ${state.roomId}`);
    }).catch(err => {
        console.error('❌ Error al conectar a TikTok, reintentando en 5s...', err);
        setTimeout(conectarTikTok, 5000);
    });
}

conectarTikTok();

tiktokConnection.on('disconnected', () => {
    console.log('⚠️ Conexión con TikTok interrumpida. Reconectando...');
    conectarTikTok();
});

// Capturar regalos en el Live Real
tiktokConnection.on('gift', (data) => {
    if (data.giftType === 1 && !data.repeatEnd) return; // Evita spam intermedio de combos

    const nombreRegalo = data.giftName;
    const archivoVideo = mapaGoles[nombreRegalo];

    if (archivoVideo) {
        io.emit('mostrar-gol', {
            video: `/videos/${archivoVideo}`,
            usuario: data.uniqueId,
            regalo: nombreRegalo,
            cantidad: data.repeatCount || 1
        });
    }
});

// --- 🧪 CANAL DE COMUNICACIÓN PARA PRUEBAS LOCALES ---
io.on('connection', (socket) => {
    socket.on('simular-regalo', (data) => {
        console.log(`🧪 [TEST] El usuario simulado "${data.usuario}" envió un: ${data.regalo}`);
        const archivoVideo = mapaGoles[data.regalo];
        
        if (archivoVideo) {
            io.emit('mostrar-gol', {
                video: `/videos/${archivoVideo}`,
                usuario: data.usuario,
                regalo: data.regalo,
                cantidad: 1
            });
        }
    });
});

server.listen(3000, () => {
    console.log('🚀 Sistema de Goles iniciado con éxito.');
    console.log('📺 URL para tu OBS (Fuente de Navegador): http://localhost:3000');
    console.log('🧪 URL para Probar tus Videos (Panel de Control): http://localhost:3000/test.html');
});