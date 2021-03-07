const core = require('@actions/core')
const child_process = require('child_process')
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
    'VCINSTALLDIR',
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
        core.info(`Found with vswhere: ${path}`)
        return path
    }
    core.info("Not found with vswhere")

    // If that does not work, try the standard installation locations,
    // starting with the latest and moving to the oldest.
    for (const ver of VERSIONS) {
        for (const ed of EDITIONS) {
            path = `${PROGRAM_FILES_X86}\\Microsoft Visual Studio\\${ver}\\${ed}\\VC\\Auxiliary\\Build\\vcvarsall.bat`
            core.info(`Trying standard location: ${path}`)
            if (fs.existsSync(path)) {
                core.info(`Found standard location: ${path}`)
                return path
            }
        }
    }
    core.info("Not found in standard locations")

    // Special case for Visual Studio 2015 (and maybe earlier), try it out too.
    path = `${PROGRAM_FILES_X86}\\Microsoft Visual C++ Build Tools\\vcbuildtools.bat`
    if (fs.existsSync(path)) {
        core.info(`Found VS 2015: ${path}`)
        return path
    }
    core.info(`Not found in VS 2015 location: ${path}`)

    throw new Error('Microsoft Visual Studio not found')
}

function main() {
    if (process.platform != 'win32') {
        core.info('This is not a Windows virtual environment, bye!')
        return
    }

    // Add standard location of "vswhere" to PATH, in case it's not there.
    process.env.PATH += path.delimiter + VSWHERE_PATH

    var   arch    = core.getInput('arch')
    const sdk     = core.getInput('sdk')
    const toolset = core.getInput('toolset')
    const uwp     = core.getInput('uwp')
    const spectre = core.getInput('spectre')

    // There are all sorts of way the architectures are called. In addition to
    // values supported by Microsoft Visual C++, recognize some common aliases.
    let arch_aliases = {
        "win32": "x86",
        "win64": "x64",
    }
    // Ignore case when matching as that's what humans expect.
    if (arch.toLowerCase() in arch_aliases) {
        arch = arch_aliases[arch.toLowerCase()]
    }

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
    const environment = child_process.execSync(command, {shell: "cmd"}).toString().split('\r\n')

    // If vsvars.bat is given an incorrect command line, it will print out
    // an error and *still* exit successfully. Parse out errors from output
    // which don't look like environment variables, and fail if appropriate.
    var failed = false
    for (let line of environment) {
        if (line.match(/^\[ERROR.*\]/)) {
            failed = true
            // Don't print this particular line which will be confusing in output.
            if (line.match(/Error in script usage. The correct usage is:$/)) {
                continue
            }
            core.error(line)
        }
    }
    if (failed) {
        throw new Error('invalid parameters')
    }

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

try {
    main()
}
catch (e) {
    core.setFailed('Could not setup Developer Command Prompt: ' + e.message)
}
