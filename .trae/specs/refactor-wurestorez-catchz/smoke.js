const assert = require("assert");

const restoreZ = require("../../../wuRestoreZ.js");

function getZAsync(code, targetType) {
	return new Promise((resolve, reject) => {
		try {
			restoreZ.getZ(code, resolve, targetType);
		} catch (e) {
			reject(e);
		}
	});
}

async function main() {
	const groupHitCode = [
		"function gz$gwx_1(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_1)",
		"(function(z){var a=11;function Z(ops){z.push(ops)};Z([3,'group']);})(__WXML_GLOBAL__.ops_cached.$gwx_1)",
		"}"
	].join("");

	const pluginAndFallbackCode = [
		"function gz$gwx_wxabcdef0123_7(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_wxabcdef0123_7)",
		"(function(z){var a=11;function Z(ops){z.push(ops)};Z([3,'plugin-group']);})(__WXML_GLOBAL__.ops_cached.$gwx_wxabcdef0123_7)",
		"};",
		"(function(z){var a=11;function Z(ops){z.push(ops)};Z([3,'fallback-miniapp']);})(z);__WXML_GLOBAL__.ops_set.$gwx=z;"
	].join("");

	const fallbackOnlyCode = [
		"(function(z){var a=11;function Z(ops){z.push(ops)}",
		";Z([3,'fallback-only']);",
		"})(z);__WXML_GLOBAL__.ops_set.$gwx=z;"
	].join("");

	const groupResult = await getZAsync(groupHitCode, "miniapp");
	assert.ok(groupResult && groupResult.mul, "groupResult.mul should exist");
	assert.deepStrictEqual(groupResult.mul["1"], ["group"]);

	const miniappPluginCodeResult = await getZAsync(pluginAndFallbackCode, "miniapp");
	assert.ok(!miniappPluginCodeResult.mul, "miniapp should not match plugin group branch");
	assert.deepStrictEqual(miniappPluginCodeResult, ["fallback-miniapp"]);

	const pluginResult = await getZAsync(pluginAndFallbackCode, "plugin");
	assert.ok(pluginResult && pluginResult.mul, "pluginResult.mul should exist");
	assert.deepStrictEqual(pluginResult.mul["7"], ["plugin-group"]);

	const fallbackResult = await getZAsync(fallbackOnlyCode, "miniapp");
	assert.deepStrictEqual(fallbackResult, ["fallback-only"]);

	console.log("[smoke] ok");
}

main().catch(err => {
	console.error("[smoke] failed:", err && err.stack ? err.stack : err);
	process.exitCode = 1;
});

