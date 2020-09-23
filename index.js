const core = require('@actions/core')
const child_process = require('child_process')
const exec = require('util').promisify(child_process.exec)
const fs = require('fs')
const process = require('process')

const EDITIONS = ['Enterprise', 'Professional', 'Community']
const VERSIONS = ['2019', '2017']

const InterestingVariables = [
    'INCLUDE',
    'LIB',
    'LIBPATH',
    'Path',
    'Platform',
    'VisualStudioVersion',
    /^VCTools/,
    /^VSCMD_/,
    /^WindowsSDK/i,
]

function findWithVswhere(pattern) {
    let path = null;
    try {
        path = child_process.execSync(`vswhere -products * -latest -prerelease -find ${pattern}`).toString().trim()
    } catch (e) {
        console.log(e)
    }
    return path
}

function findVcvarsall() {
    // use vswhere
    let path = findWithVswhere('**/Auxiliary/Build/vcvarsall.bat')
    if (path && fs.existsSync(path)) {
        return path
    }

    const programFiles = process.env['ProgramFiles(x86)']
    // Given the order of each list it should check
    // for the more recent versions first and the
    // highest grade edition first.
    for (const ver of VERSIONS) {
        for (const ed of EDITIONS) {
            path = `${programFiles}\\Microsoft Visual Studio\\${ver}\\${ed}\\VC\\Auxiliary\\Build\\vcvarsall.bat`
            if (fs.existsSync(path)) {
                return path
            }
        }
    }
    // Special case for Visual Studio 2015 (and maybe earlier), try it out too.
    // us vswhere
    path = findWithVswhere('**/vcbuildtools.bat')
    if (path && fs.existsSync(path)) {
        return path
    }
    path = `${programFiles}\\Microsoft Visual C++ Build Tools\\vcbuildtools.bat`
    if (fs.existsSync(path)) {
        return path
    }
    throw new Error('Microsoft Visual Studio not found')
}

async function main() {
    if (process.platform != 'win32') {
        core.info('This is not a Windows virtual environment, bye!')
        return
    }

    const arch    = core.getInput('arch')
    const sdk     = core.getInput('sdk')
    const toolset = core.getInput('toolset')
    const uwp     = core.getInput('uwp')
    const spectre = core.getInput('spectre')

    // Due to the way Microsoft Visual C++ is configured, we have to resort to the following hack:
    // Call the configuration batch file and then output *all* the environment variables.

    var args = [arch]
    if (uwp == 'true') {
        args.push('uwp')
    }
    if (sdk) {
        args.push(sdk)
    }
    if (toolset) {
        args.push(`-vcvars_ver=${toolset}`)
    }
    if (spectre == 'true') {
        args.push('-vcvars_spectre_libs=spectre')
    }

    const command = `"${findVcvarsall()}" ${args.join(' ')} && set`
    core.debug(`Running: ${command}`)
    const { stdout } = await exec(command, {shell: "cmd"})
    const environment = stdout.split('\r\n')

    for (let string of environment) {
        const [name, value] = string.split('=')
        for (let pattern of InterestingVariables) {
            if (name.match(pattern)) {
                core.exportVariable(name, value)
                break
            }
        }
    }

    core.info(`Configured Developer Command Prompt`)
}

main().catch((e) => core.setFailed('Could not setup Developer Command Prompt: ' + e.message))
