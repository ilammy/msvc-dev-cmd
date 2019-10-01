const core = require('@actions/core')

async function main() {
}

main().catch(() => core.setFailed('could not setup Developer Command Prompt'))
