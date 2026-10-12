/**
 * Applique les clés Info.plist requises pour Pedagogia Drive iOS.
 * Exécuté après `npx cap sync ios`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const plistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../ios/App/App/Info.plist',
)

if (!existsSync(plistPath)) {
  console.warn('[ios-plist] Info.plist introuvable — lancez d’abord `npm run cap:add:ios`.')
  process.exit(0)
}

let xml = readFileSync(plistPath, 'utf8')

const entries = [
  ['CFBundleDisplayName', 'Pedagogia Drive'],
  ['CFBundleName', 'Pedagogia Drive'],
  ['CFBundleIconName', 'AppIcon'],
  ['ITSAppUsesNonExemptEncryption', '<false/>'],
  ['UIViewControllerBasedStatusBarAppearance', '<true/>'],
  ['UIRequiresFullScreen', '<false/>'],
  ['NSCameraUsageDescription', 'Pedagogia Drive utilise l’appareil photo pour joindre des documents et pièces aux dossiers élèves.'],
  ['NSPhotoLibraryUsageDescription', 'Pedagogia Drive accède à vos photos pour importer des documents (pièces d’identité, justificatifs, autorisations).'],
  ['NSPhotoLibraryAddUsageDescription', 'Pedagogia Drive peut enregistrer des documents exportés dans votre photothèque si vous le demandez.'],
  ['NSLocationWhenInUseUsageDescription', 'Pedagogia Drive utilise votre position pendant un trajet de conduite accompagnée pour calculer les kilomètres réellement parcourus. Le suivi s’arrête lorsque vous terminez le trajet.'],
  ['NSLocationAlwaysAndWhenInUseUsageDescription', 'Pendant un trajet de conduite accompagnée, Pedagogia Drive continue d’utiliser votre position lorsque l’iPhone est verrouillé ou lorsque l’application est en arrière-plan, afin de calculer les kilomètres réellement parcourus. Le suivi s’arrête dès que vous appuyez sur Arrêter le trajet. Pedagogia Drive ne suit pas votre position en dehors d’un trajet.'],
]

for (const [key, value] of entries) {
  const stringValue = value.startsWith('<') ? value : `<string>${value}</string>`
  const block = `    <key>${key}</key>\n    ${stringValue}\n`

  if (xml.includes(`<key>${key}</key>`)) {
    xml = xml.replace(
      new RegExp(`<key>${key}</key>\\s*(<string>[\\s\\S]*?</string>|<true/>|<false/>)`),
      `<key>${key}</key>\n    ${stringValue}`,
    )
  } else {
    xml = xml.replace('</dict>\n</plist>', `${block}</dict>\n</plist>`)
  }
}

// iPhone : portrait uniquement (meilleure UX dashboard mobile)
xml = xml.replace(
  /<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/,
  `<key>UISupportedInterfaceOrientations</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t</array>`,
)

// Aucune fonction n'utilise le micro : l'autorisation ne doit pas être déclarée.
xml = xml.replace(/\s*<key>NSMicrophoneUsageDescription<\/key>\s*<string>[\s\S]*?<\/string>/, '')

xml = ensureBackgroundLocationMode(xml)

writeFileSync(plistPath, xml)
console.log('[ios-plist] Info.plist mis à jour (permissions + suivi de trajet en arrière-plan).')

function ensureBackgroundLocationMode(source) {
  if (/<key>UIBackgroundModes<\/key>\s*<array>[\s\S]*?<string>location<\/string>/.test(source)) {
    return source
  }
  if (source.includes('<key>UIBackgroundModes</key>')) {
    return source.replace(
      /(<key>UIBackgroundModes<\/key>\s*<array>)/,
      '$1\n        <string>location</string>',
    )
  }
  return source.replace(
    /<\/dict>\s*<\/plist>\s*$/,
    '    <key>UIBackgroundModes</key>\n    <array>\n        <string>location</string>\n    </array>\n</dict>\n</plist>\n',
  )
}
