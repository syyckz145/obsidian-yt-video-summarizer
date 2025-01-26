import { readFileSync, writeFileSync } from 'fs';

/**
 * Updates version information in manifest.json and versions.json
 * @param {string} targetVersion - The new version to set
 */
function updateVersionFiles(targetVersion) {
	// Validate version format (semver)
	const semverRegex = /^\d+\.\d+\.\d+$/;
	if (!semverRegex.test(targetVersion)) {
		throw new Error(
			`Invalid version format: ${targetVersion}. Expected format: x.y.z`
		);
	}

	// Read manifest.json
	let manifest;
	try {
		manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
	} catch (error) {
		throw new Error(`Failed to read manifest.json: ${error.message}`);
	}

	// Update manifest version
	const { minAppVersion } = manifest;
	manifest.version = targetVersion;

	// Read versions.json
	let versions;
	try {
		versions = JSON.parse(readFileSync('versions.json', 'utf8'));
	} catch (error) {
		throw new Error(`Failed to read versions.json: ${error.message}`);
	}

	// Update versions
	versions[targetVersion] = minAppVersion;

	// Write updated files
	try {
		writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));
		writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));
	} catch (error) {
		throw new Error(`Failed to write version files: ${error.message}`);
	}

	return { targetVersion, minAppVersion };
}

// Main execution
try {
	const targetVersion = process.env.VERSION;
	if (!targetVersion) {
		throw new Error('No version specified in environment variables');
	}

	const { targetVersion: newVersion, minAppVersion } =
		updateVersionFiles(targetVersion);
	console.log(
		`✓ Successfully updated version to ${newVersion} (minAppVersion: ${minAppVersion})`
	);
} catch (error) {
	console.error('Error:', error.message);
	process.exit(1);
}
