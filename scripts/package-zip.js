// scripts/package-zip.js
// Empaqueta el proyecto para entrega excluyendo node_modules, .env, dist y temporales.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Preparando archivo ZIP para entrega...');

const zipName = 'Proyecto3_Irina_Rivera_Chavarria.zip';
const rootDir = path.resolve(__dirname, '..');

// Usar PowerShell Compress-Archive en Windows
const psCommand = `
$exclude = @('node_modules', '.env', '.git', 'dist', '.netlify');
Get-ChildItem -Path '${rootDir}' -Exclude $exclude | Where-Object { $_.Name -notin $exclude -and $_.Name -notmatch '\\.zip$' } | Compress-Archive -DestinationPath '${path.join(rootDir, zipName)}' -Force
`;

try {
  // Ejecutar empaquetado
  execSync(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  console.log(`✅ Archivo ZIP generado exitosamente: ${zipName}`);
} catch (e) {
  console.error('❌ Error generando el archivo ZIP:', e.message);
}
