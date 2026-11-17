// govuk-prototype-kit 14.0.2 bundles its dependencies, so npm overrides and
// `npm audit fix` cannot update them. This replaces the bundled copies that have
// known vulnerabilities with patched releases. Remove once the kit ships updated
// dependencies. Note: `npm audit` reads the lockfile and will still report them.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const kitModules = path.join(__dirname, '..', 'node_modules', 'govuk-prototype-kit', 'node_modules')

const replacements = [
  { name: 'body-parser', version: '2.4.0', dir: 'body-parser' },
  { name: 'content-type', version: '2.1.0', dir: 'body-parser/node_modules/content-type' },
  { name: 'qs', version: '6.17.1', dir: 'qs' },
  { name: 'follow-redirects', version: '1.16.3', dir: 'follow-redirects' }
]

function installedVersion (target) {
  try {
    return JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).version
  } catch {
    return undefined
  }
}

if (!fs.existsSync(kitModules)) {
  process.exit(0)
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-patch-'))
try {
  for (const { name, version, dir } of replacements) {
    const target = path.join(kitModules, dir)
    if (installedVersion(target) === version) continue

    const [{ filename }] = JSON.parse(
      execFileSync('npm', ['pack', `${name}@${version}`, '--json', '--pack-destination', tmp], { encoding: 'utf8' })
    )
    const tarball = filename.replace(/\//g, '-')

    const extractDir = path.join(tmp, `${path.basename(tarball, '.tgz')}-x`)
    fs.mkdirSync(extractDir)
    execFileSync('tar', ['-xzf', path.join(tmp, tarball), '-C', extractDir, '--strip-components=1'])

    // Keep the package's own nested node_modules (body-parser has some).
    const nested = path.join(target, 'node_modules')
    const keepNested = fs.existsSync(nested) ? path.join(tmp, `${path.basename(extractDir)}-nested`) : undefined
    if (keepNested) fs.renameSync(nested, keepNested)
    fs.rmSync(target, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.renameSync(extractDir, target)
    if (keepNested) fs.renameSync(keepNested, path.join(target, 'node_modules'))
    console.log(`patched govuk-prototype-kit bundled ${name}@${version}`)
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
