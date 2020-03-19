const core = require('@actions/core')
const execFile = require('util').promisify(require('child_process').execFile)
const fs = require('fs').promises
const os = require('os')
const path = require('path')
const process = require('process')

const MSVS_2017 = '%ProgramFiles(x86)%\\Microsoft Visual Studio\\2017\\Enterprise\\VC\\Auxiliary\\Build'
const MSVS_2019 = '%ProgramFiles(x86)%\\Microsoft Visual Studio\\2019\\Enterprise\\VC\\Auxiliary\\Build'

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

    core.debug(`Writing helper file: ${helper}`)
    await fs.writeFile(helper, `
        @IF EXIST "${MSVS_2017}\\vcvarsall.bat" GOTO :2017
        @IF EXIST "${MSVS_2019}\\vcvarsall.bat" GOTO :2019
        @ECHO "Microsoft Visual Studio not found"
        @EXIT 1
        :2017
        @CALL "${MSVS_2017}\\vcvarsall.bat" ${args.join(' ')}
        @GOTO ENV
        :2019
        @CALL "${MSVS_2019}\\vcvarsall.bat" ${args.join(' ')}
        @GOTO ENV
        :ENV
        @IF ERRORLEVEL 1 EXIT
        @SET
    `)

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

main().catch(() => core.setFailed('Could not setup Developer Command Prompt'))
