/**
 * Convert the vs version (e.g. 2022) or year (e.g. 17.0) to the version number (e.g. 17.0)
 * @param {string | undefined} vsversion the year (e.g. 2022) or version number (e.g. 17.0)
 * @returns {string | undefined} the version number (e.g. 17.0)
 */
export function vsversion_to_versionnumber(version: string | undefined): string | undefined

/**
 * Convert the vs version (e.g. 17.0) or year (e.g. 2022) to the year (e.g. 2022)
 * @param {string} vsversion the version number (e.g. 17.0) or year (e.g. 2022)
 * @returns {string} the year (e.g. 2022)
 */
export function vsversion_to_year(version: string): string

/**
 * Find MSVC tools with vswhere
 * @param {string} pattern the pattern to search for
 * @param {string} version_pattern the version pattern to search for
 * @returns {string | null} the path to the found MSVC tools
 */
export function findWithVswhere(version: string, version_pattern: string): string | null

/**
 * Find the vcvarsall.bat file for the given Visual Studio version
 * @param {string | undefined} vsversion the version of Visual Studio to find (year or version number)
 * @returns {string} the path to the vcvarsall.bat file
 */
export function findVcvarsall(version: string): string

/**
 * Setup MSVC Developer Command Prompt
 * @param {string} arch - Target architecture
 * @param {string | undefined} sdk - Windows SDK number to build for
 * @param {string | undefined} toolset - VC++ compiler toolset version
 * @param {boolean | 'true' | 'false' | undefined} uwp - Build for Universal Windows Platform
 * @param {boolean | 'true' | 'false' | undefined} spectre - Enable Spectre mitigations
 * @param {string | undefined} vsversion - The Visual Studio version to use. This can be the version number (e.g. 16.0 for 2019) or the year (e.g. "2019").
 */
export function setupMSVCDevCmd(
  arch: string,
  sdk?: string,
  toolset?: string,
  uwp?: boolean | 'true' | 'false',
  spectre?: boolean | 'true' | 'false',
  vsversion?: string,
)
