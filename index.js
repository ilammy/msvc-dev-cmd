const core = require('@actions/core')
const child_process = require('child_process')
const exec = require('util').promisify(child_process.exec)
const fs = require('fs')
const path = require('path')
const process = require('process')

const PROGRAM_FILES_X86 = process.env['ProgramFiles(x86)']

const EDITIONS = ['Enterprise', 'Professional', 'Community']
const VERSIONS = ['2019', '2017']

const VSWHERE_PATH = `${PROGRAM_FILES_X86}\\Microsoft Visual Studio\\Installer`

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
    try {
        let installationPath = child_process.execSync(`vswhere -products * -latest -prerelease -property installationPath`).toString().trim()
        return installationPath + '\\' + pattern
    } catch (e) {
        core.warning(`vswhere failed: ${e}`)
    }
    return null
}

function findVcvarsall() {
    // If vswhere is available, ask it about the location of the latest Visual Studio.
    let path = findWithVswhere('VC\\Auxiliary\\Build\\vcvarsall.bat')
    if (path && fs.existsSync(path)) {
        core.debug(`found with vswhere: ${path}`)
        return path
    }

    // If that does not work, try the standard installation locations,
    // starting with the latest and moving to the oldest.
    for (const ver of VERSIONS) {
        for (const ed of EDITIONS) {
            path = `${PROGRAM_FILES_X86}\\Microsoft Visual Studio\\${ver}\\${ed}\\VC\\Auxiliary\\Build\\vcvarsall.bat`
            if (fs.existsSync(path)) {
                core.debug(`found standard location: ${path}`)
                return path
            }
        }
    }

    // Special case for Visual Studio 2015 (and maybe earlier), try it out too.
    path = `${PROGRAM_FILES_X86}\\Microsoft Visual C++ Build Tools\\vcbuildtools.bat`
    if (fs.existsSync(path)) {
        core.debug(`found VS 2015: ${path}`)
        return path
    }

    throw new Error('Microsoft Visual Studio not found')
}

async function main() {
    if (process.platform != 'win32') {
        core.info('This is not a Windows virtual environment, bye!')
        return
    }

    // Add standard location of "vswhere" to PATH, in case it's not there.
    process.env.PATH += path.delimiter + VSWHERE_PATH

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
