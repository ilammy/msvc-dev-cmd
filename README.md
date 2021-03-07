<a href="https://github.com/ilammy/msvc-dev-cmd"><img alt="GitHub Actions status" src="https://github.com/ilammy/msvc-dev-cmd/workflows/msvc-dev-cmd/badge.svg"></a>

# msvc-dev-cmd

[GitHub Action](https://github.com/features/actions) for configuring Developer Command Prompt for Microsoft Visual C++.

This sets up the environment for compiling C/C++ code from command line.

Supports Windows. Does nothing on Linux and macOS.

## Inputs

- `arch` – target architecture
  - native compilation:
    - `x64` (default) or its synonyms: `amd64`, `win64`
    - `x86` or its synonyms: `win32`
  - cross-compilation: `x86_amd64`, `x86_arm`, `x86_arm64`,
  	`amd64_x86`, `amd64_arm`, `amd64_arm64`
- `sdk` – Windows SDK to use
  - do not specify to use the default SDK
  - or specify full Windows 10 SDK number (e.g, `10.0.10240.0`)
  - or write `8.1` to use Windows 8.1 SDK
- `toolset` – select VC++ compiler toolset version
  - do not specify to use the default toolset
  - `14.0` for VC++ 2015 Compiler Toolset
  - `14.XX` for the latest 14.XX toolset installed (e.g, `14.11`)
  - `14.XX.YYYYY` for a specific full version number (e.g, `14.11.25503`)
- `uwp` – set `true` to build for Universal Windows Platform (i.e., for Windows Store)
- `spectre` – set `true` to use Visual Studio libraries with [Spectre](https://meltdownattack.com) mitigations

## Example usage

```yaml
jobs:
  test:
    - uses: actions/checkout@v1
    - uses: ilammy/msvc-dev-cmd@v1
    - name: Build something requiring CL.EXE
      run: |
        cmake -G "NMake Makefiles" .
        nmake
    # ...
```

## License

MIT, see [LICENSE](LICENSE).
