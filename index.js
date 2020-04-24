const core = require('@actions/core')
const execFile = require('util').promisify(require('child_process').execFile)
const fs = require('fs').promises
const os = require('os')
const path = require('path')
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

async function main() {
    if (process.platform != 'win32') {
        core.info('This is not a Windows virtual environment, bye!')
        return
    }

    // this should generate an object like
    // {
    //     P2017: 'path\to\2017\Professional...',
    //     C2017: 'path\to\2017\Entreprise...',
    //     etc...
    // }
    // Given the order of each list it should check
    // for the more recent versions first and the
    // highest grade edition first.
    var search_map = {}

    VERSIONS.forEach(ver => {
        EDITIONS.forEach(ed => {
            let prop = ed.charAt(0) + ver
            let path = `%ProgramFiles(x86)%\\Microsoft Visual Studio\\${ver}\\${ed}\\VC\\Auxiliary\\Build\\vcvarsall.bat`

            search_map[prop] = path
        })
    })

    const arch    = core.getInput('arch')
    const sdk     = core.getInput('sdk')
    const toolset = core.getInput('toolset')
    const uwp     = core.getInput('uwp')
    const spectre = core.getInput('spectre')

    // Due to the way Microsoft Visual C++ is configured, we have to resort to the following hack:
    // write a helper batch file which calls the configuration batch file and then outputs the
    // configured environment variables, which we then pass to GitHub Actions.

    const helper = path.join(os.homedir(), 'msvc-dev-cmd.bat')

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
    core.debug(`Arguments: ${args.join(' ')}`)

    var script = '';

    for(let key in search_map) {
        script += `@IF EXIST "${search_map[key]}" GOTO :${key}\n`
    }

    script += `@ECHO "Microsoft Visual Studio not found"\n
               @EXIT 1\n`

    for(let key in search_map) {
        script += `:${key}\n
                   @CALL "${search_map[key]}" ${args.join(' ')}\n
                   @GOTO ENV\n`
    }

    script += `:ENV\n
               @IF ERRORLEVEL 1 EXIT\n
               @SET`

    console.log(script)
    core.debug(script)

    core.debug(`Writing helper file: ${helper}`)
    await fs.writeFile(helper, script)

    var environment
    try {
        core.debug('Executing helper')
        const { stdout } = await execFile('cmd.exe', ['/q', '/c', helper])
        environment = stdout.split('\r\n')
    }
    catch (error) {
        core.debug(`Helper failed: ${error.message}`)
        throw error
    }
    finally {
        core.debug('Removing helper')
        await fs.unlink(helper)
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

main().catch((e) => core.setFailed('Could not setup Developer Command Prompt: ' + e.message))
