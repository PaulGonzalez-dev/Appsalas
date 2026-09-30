// Fija la zona horaria del negocio (Argentina, UTC-3 sin horario de verano)
// salvo que el entorno haya definido una explicitamente.
if (!process.env.TZ) {
  process.env.TZ = 'America/Argentina/Buenos_Aires';
}
