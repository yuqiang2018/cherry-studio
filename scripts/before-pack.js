const { Arch } = require('electron-builder')
const { execSync } = require('child_process')

// if you want to add new prebuild binaries packages with different architectures, you can add them here
// please add to allX64 and allArm64 from pnpm-lock.yaml
const allArm64 = {
  '@img/sharp-darwin-arm64': '0.34.3',
  '@img/sharp-win32-arm64': '0.34.3',
  '@img/sharp-linux-arm64': '0.34.3',

  '@img/sharp-libvips-darwin-arm64': '1.2.4',
  '@img/sharp-libvips-linux-arm64': '1.2.4',

  '@libsql/darwin-arm64': '0.4.7',
  '@libsql/linux-arm64-gnu': '0.4.7',
  '@strongtz/win32-arm64-msvc': '0.4.7',

  '@napi-rs/system-ocr-darwin-arm64': '1.0.2',
  '@napi-rs/system-ocr-win32-arm64-msvc': '1.0.2'
}

const allX64 = {
  '@img/sharp-darwin-x64': '0.34.3',
  '@img/sharp-linux-x64': '0.34.3',
  '@img/sharp-win32-x64': '0.34.3',

  '@img/sharp-libvips-darwin-x64': '1.2.4',
  '@img/sharp-libvips-linux-x64': '1.2.4',

  '@libsql/darwin-x64': '0.4.7',
  '@libsql/linux-x64-gnu': '0.4.7',
  '@libsql/win32-x64-msvc': '0.4.7',

  '@napi-rs/system-ocr-darwin-x64': '1.0.2',
  '@napi-rs/system-ocr-win32-x64-msvc': '1.0.2'
}

const platformToArch = {
  mac: 'darwin',
  windows: 'win32',
  linux: 'linux'
}

exports.default = async function (context) {
  const arch = context.arch === Arch.arm64 ? 'arm64' : 'x64'
  const platformName = context.packager.platform.name
  const platform = platformToArch[platformName]

  const downloadPackages = async (packages) => {
    // Skip if target architecture matches current system architecture
    if (arch === process.arch) {
      console.log(`Skipping install: target architecture (${arch}) matches current system`)
      return
    }

    console.log('installing packages ......')
    const packagesToInstall = []

    for (const name of Object.keys(packages)) {
      if (name.includes(`${platform}`) && name.includes(`-${arch}`)) {
        packagesToInstall.push(`${name}@${packages[name]}`)
      }
    }

    if (packagesToInstall.length > 0) {
      console.log('Installing:', packagesToInstall.join(' '))
      execSync(
        `pnpm install --config.platform=${platform} --config.architecture=${arch} ${packagesToInstall.join(' ')}`,
        { stdio: 'inherit' }
      )
    }
  }

  const changeFilters = async (filtersToExclude, filtersToInclude) => {
    // remove filters for the target architecture (allow inclusion)
    let filters = context.packager.config.files[0].filter
    filters = filters.filter((filter) => !filtersToInclude.includes(filter))

    // add filters for other architectures (exclude them)
    filters.push(...filtersToExclude)

    context.packager.config.files[0].filter = filters
  }

  await downloadPackages(context.arch === Arch.arm64 ? allArm64 : allX64)

  const arm64Filters = Object.keys(allArm64).map((f) => '!node_modules/' + f + '/**')
  const x64Filters = Object.keys(allX64).map((f) => '!node_modules/' + f + '/**')

  const excludeRipgrepFilters = ['arm64-darwin', 'arm64-linux', 'x64-darwin', 'x64-linux', 'x64-win32']
    .filter((f) => {
      // On Windows ARM64, also keep x64-win32 for emulation compatibility
      if (platform === 'windows' && context.arch === Arch.arm64 && f === 'x64-win32') {
        return false
      }
      return f !== `${arch}-${platform}`
    })
    .map((f) => '!node_modules/@anthropic-ai/claude-agent-sdk/vendor/ripgrep/' + f + '/**')

  if (context.arch === Arch.arm64) {
    await changeFilters([...x64Filters, ...excludeRipgrepFilters], arm64Filters)
  } else {
    await changeFilters([...arm64Filters, ...excludeRipgrepFilters], x64Filters)
  }
}
