const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servimos la carpeta public donde estará el index.html y los videos
app.use(express.static('public'));

// -----------------------------------------------------------------
// 🗺️ MAPA DE REGALOS A JUGADORES
// Aquí asocias el nombre del regalo en TikTok con el archivo de video.
// Nota: Deberás ajustar el lado izquierdo ('Rose', 'GG', etc.) al nombre 
// exacto del regalo que quieras asociar.
// -----------------------------------------------------------------
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

// Configura el usuario que hará el directo (sin el @)
const tiktokUsername = "futbolmundial2026_"; 

let tiktokConnection = new WebcastPushConnection(tiktokUsername);

// Función para conectar y reconectar en caso de caída
function conectarTikTok() {
    tiktokConnection.connect().then(state => {
        console.log(`✅ Conectado al Live de ${state.roomId}`);
    }).catch(err => {
        console.error('❌ Error al conectar, reintentando en 5s...', err);
        setTimeout(conectarTikTok, 5000);
    });
}

conectarTikTok();

// Evento cuando se desconecta
tiktokConnection.on('disconnected', () => {
    console.log('⚠️ Desconectado de TikTok. Reconectando...');
    conectarTikTok();
});

// Escuchar los regalos
tiktokConnection.on('gift', (data) => {
    // Solo disparamos el evento si el regalo terminó de enviarse (evita spam por combos de 100 rosas seguidas)
    if (data.giftType === 1 && !data.repeatEnd) {
        return; // Ignoramos si es un combo y aún no termina
    }

    const nombreRegalo = data.giftName;
    const archivoVideo = mapaGoles[nombreRegalo];

    console.log(`🎁 Regalo recibido: ${nombreRegalo} de ${data.uniqueId}`);

    // Si el regalo está en nuestro mapa, mandamos la señal al frontend
    if (archivoVideo) {
        console.log(`⚽ Reproduciendo gol de: ${archivoVideo}`);
        
        io.emit('mostrar-gol', {
            video: `/videos/${archivoVideo}`,
            usuario: data.uniqueId,
            cantidad: data.repeatCount // Por si mandan x10 rosas, enviamos el gol 10 veces a la cola
        });
    }
});

server.listen(3000, () => {
    console.log('🚀 Servidor corriendo en http://localhost:3000');
});