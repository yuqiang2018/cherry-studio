const { Arch } = require('electron-builder')
const { execSync } = require('child_process')
const { xor } = require('lodash')

// if you want to add new prebuild binaries packages with different architectures, you can add them here
// please add to allX64 and allArm64 from pnpm-lock.yaml
const packages = [
  '@img/sharp-darwin-arm64',
  '@img/sharp-darwin-x64',
  '@img/sharp-linux-arm64',
  '@img/sharp-linux-x64',
  '@img/sharp-win32-arm64',
  '@img/sharp-win32-x64',
  '@img/sharp-libvips-darwin-arm64',
  '@img/sharp-libvips-darwin-x64',
  '@img/sharp-libvips-linux-arm64',
  '@img/sharp-libvips-linux-x64',
  '@libsql/darwin-arm64',
  '@libsql/darwin-x64',
  '@libsql/linux-arm64-gnu',
  '@libsql/linux-x64-gnu',
  '@libsql/win32-x64-msvc',
  '@napi-rs/system-ocr-darwin-arm64',
  '@napi-rs/system-ocr-darwin-x64',
  '@napi-rs/system-ocr-win32-arm64-msvc',
  '@napi-rs/system-ocr-win32-x64-msvc',
  '@strongtz/win32-arm64-msvc'
]

const platformToArch = {
  mac: 'darwin',
  windows: 'win32',
  linux: 'linux'
}

exports.default = async function (context) {
  const arch = context.arch === Arch.arm64 ? 'arm64' : 'x64'
  const platformName = context.packager.platform.name
  const platform = platformToArch[platformName]

  const excludePackages = async (packagesToExclude) => {
    // remove filters for the target architecture (allow inclusion)
    let filters = context.packager.config.files[0].filter

    // add filters for other architectures (exclude them)
    filters.push(...packagesToExclude)

    context.packager.config.files[0].filter = filters
  }

  const arm64Packages = packages.filter((p) => p.includes('arm64')).filter((p) => p.includes(platform))
  const x64Packages = packages.filter((p) => p.includes('x64')).filter((p) => p.includes(platform))

  const arm64ExcludePackages = xor(packages, x64Packages).map((p) => '!node_modules/' + p + '/**')
  const x64ExcludePackages = xor(packages, arm64Packages).map((p) => '!node_modules/' + p + '/**')

  console.log('Exclude packages for arm64', arm64ExcludePackages)
  console.log('Exclude packages for x64', x64ExcludePackages)

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
    await excludePackages([...arm64ExcludePackages, ...excludeRipgrepFilters])
  } else {
    await excludePackages([...x64ExcludePackages, ...excludeRipgrepFilters])
  }
}
