const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// ============================================================================
// 🗺️ DICCIONARIO DE REGALOS A JUGADORES
// ============================================================================
const mapaGoles = {
    'Rose': 'matias_galarza.mp4',         
    'Doughnut': 'mauricio.mp4',           
    'TikTok': 'lionel_messi.mp4',         
    'Ice Cream': 'luis_diaz.mp4',         
    'Panda': 'raul_jimenez.mp4',          
    'Love Letter': 'luis_romo.mp4',       
    'Perfume': 'julian_quinones.mp4',     
    'Corgi': 'maximiliano_araujo.mp4',    
    'Mirror': 'jaminton_campaz.mp4',      
    'Crown': 'vinicius_junior.mp4',       
    'Motorcycle': 'matheus_cunha.mp4',    
    'Jet': 'kylian_mbappe.mp4',           
    'Lion': 'erling_haaland.mp4',         
    'Meteor': 'harry_kane.mp4',           
    'Whale': 'kai_havertz.mp4',           
    'Trophy': 'cody_gakpo.mp4',           
    'Castle': 'jude_bellingham.mp4',      
    'Fire': 'viktor_gyokeres.mp4'         
};

let tiktokConnection = null;

// ============================================================================
// 🔌 SISTEMA DE COMUNICACIÓN CON EL PANEL DE CONTROL
// ============================================================================
io.on('connection', (socket) => {
    console.log('🔌 Cliente (Panel/OBS) conectado');

    // 1️⃣ ORDEN DE CONECTAR MANUALMENTE
    socket.on('iniciar-conexion-tiktok', (username) => {
        console.log(`\n⏳ Orden manual recibida: Conectando a @${username}...`);
        
        // Si ya había una conexión previa, la cerramos
        if (tiktokConnection) {
            try { tiktokConnection.disconnect(); } catch(e){}
        }

        // Emitimos estado al panel
        io.emit('estado-conexion', { status: '⏳ Conectando...', color: '#ffcc00' });

        // Inicializamos la conexión
        tiktokConnection = new WebcastPushConnection(username, {
            processInitialData: false,     
            enableExtendedGiftInfo: true,  
            enableWebsocketUpgrade: true,  
            requestPollingIntervalMs: 2000
        });

        // Intentamos conectar
        tiktokConnection.connect().then(state => {
            console.log(`✅ ¡Conectado exitosamente al Live! Room ID: ${state.roomId}`);
            io.emit('estado-conexion', { status: `✅ Conectado al Live de @${username}`, color: '#00ffcc' });
        }).catch(err => {
            console.error('❌ Error al conectar:', err.message || err);
            io.emit('estado-conexion', { status: '❌ Error: Asegúrate de estar en vivo o revisa el usuario.', color: '#ff4444' });
        });

        // Eventos de la conexión
        tiktokConnection.on('disconnected', () => {
            console.log('⚠️ Live finalizado o desconectado.');
            io.emit('estado-conexion', { status: '⚠️ Desconectado', color: '#ffaa00' });
        });

        // 2️⃣ ESCUCHAR REGALOS REALES
        tiktokConnection.on('gift', (data) => {
            if (data.giftType === 1 && !data.repeatEnd) return; 

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
    });

    // 3️⃣ PRUEBAS LOCALES (Botones del panel)
    socket.on('simular-regalo', (data) => {
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

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// ============================================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 SERVIDOR MANUAL INICIADO EN PUERTO: ${PORT}`);
});