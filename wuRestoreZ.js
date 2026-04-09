const {VM} = require('vm2');
const logger = require("./utils/logger.js");

const debugPrefixes = [
	"(function(z){var a=11;function Z(ops,debugLine){",
	"(function(z){var a=11;function Z(ops){"
];
const IIFE_END_MARKER = "})(__WXML_GLOBAL__.ops_cached.$gwx";

function normalizeZArray(content, z) {
	for (let debugPrefix of debugPrefixes) {
		if (content.startsWith(debugPrefix)) {
			for (let i = 0; i < z.length; i++) z[i] = z[i][1];
			return;
		}
	}
}

function buildGroupContent(code, preStr, patternType) {
	let content = code.slice(code.indexOf(preStr));
	const startPtr = content.indexOf("(function(z){var a=11;");
	const endMarkerPos = content.indexOf(IIFE_END_MARKER);
	if (startPtr === -1 || endMarkerPos === -1) {
		throw new Error(`[restoreZ] ${patternType} 片段截取失败: ${preStr}`);
	}
	return content.slice(startPtr, endMarkerPos) + "})(z);";
}

/**
 * 在 VM 沙箱中批量提取 gz$gwx... 分组的 Z 数组
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 正则匹配到的函数头列表
 * @param {Object} opts
 * @param {string} opts.patternType - 模式标识，用于日志和错误信息
 * @param {RegExp} opts.keyRegex - 从函数头中提取 key 的正则，捕获组 1 为归一化 key
 * @returns {Object} zArr - { [归一化key]: Z数组 }
 */
function extractZGroupMap(code, groupPreStr, {patternType, keyRegex}) {
	let zArr = {};
	for (let preStr of groupPreStr) {
		const matched = preStr.match(keyRegex);
		if (!matched) {
			throw new Error(`[restoreZ] ${patternType} key 解析失败: ${preStr}`);
		}
		let z = [];
		const content = buildGroupContent(code, preStr, patternType);
		let vm = new VM({sandbox: {z: z, debugInfo: []}});
		vm.run(content);
		normalizeZArray(content, z);
		zArr[matched[1]] = z;
	}
	if (groupPreStr.length > 0 && Object.keys(zArr).length === 0) {
		throw new Error(`[restoreZ] ${patternType} 提取结果为空`);
	}
	logger.debug("[restoreZ] pattern matched", {
		patternType,
		matched: groupPreStr.length,
		keys: Object.keys(zArr)
	});
	return zArr;
}

/**
 * 提取旧版小程序 WXML 编译函数组（无 XC 标识）
 * 匹配模式：function gz$gwx(\d*_\d+)
 * Key 归一化策略：统一取末尾数字段，支持 gz$gwx_1 和 gz$gwx1_2 两种旧式命名
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 匹配到的函数头列表
 * @param {function} cb - 回调函数
 */
function catchZGroup(code, groupPreStr, cb) {
	cb({
		"mul": extractZGroupMap(code, groupPreStr, {
			patternType: "legacy",
			keyRegex: /function gz\$gwx\d*_(\d+)/
		}),
		patternType: "legacy"
	});
}

/**
 * 提取新版小程序 WXML 编译函数组（含 XC 标识，简单格式）
 * 匹配模式：function gz$gwx\d?_XC_(\d*_\d+)
 * 典型场景：普通小程序页面
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 匹配到的函数头列表
 * @param {function} cb - 回调函数
 */
function catchZGroupWithXC(code, groupPreStr, cb) {
	cb({
		"mul": extractZGroupMap(code, groupPreStr, {
			patternType: "xc",
			keyRegex: /function gz\$gwx\d?_XC_(\d*_\d+)/
		}),
		patternType: "xc"
	});
}

/**
 * 提取复杂版小程序 WXML 编译函数组（含 appid 与 XC 标识）
 * 匹配模式：function gz$gwx_wx[a-z0-9]{16}_XC_\d+_1
 * 典型场景：分包或特殊构建的小程序页面
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 匹配到的函数头列表
 * @param {function} cb - 回调函数
 */
function catchZGroupWithAppIdXC(code, groupPreStr, cb) {
	cb({
		"mul": extractZGroupMap(code, groupPreStr, {
			patternType: "appid_xc",
			keyRegex: /function gz\$gwx_wx[a-z0-9]{16}_XC_(\d+)_1/
		}),
		patternType: "appid_xc"
	});
}

/**
 * 提取小程序插件 WXML 编译函数组
 * 匹配模式：function gz$gwx_wx[a-z0-9]+_\d+(_\d+)?
 * 典型场景：微信小程序插件（Plugin）代码
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 匹配到的函数头列表
 * @param {function} cb - 回调函数
 */
function catchZGroupWxPlugin(code, groupPreStr, cb) {
	cb({
		"mul": extractZGroupMap(code, groupPreStr, {
			patternType: "plugin",
			keyRegex: /function gz\$gwx_wx[a-z0-9]+_(\d+)/
		}),
		patternType: "plugin"
	});
}

function normalizeTargetType(targetType) {
	return targetType === "plugin" ? "plugin" : "miniapp";
}

/**
 * 从编译后的 JS 代码中提取 WXML 结构生成函数（Z 数组）
 * 
 * 核心逻辑：
 * 1. 优先尝试正则匹配多种 `gz$gwx...` 分组模式（新版编译特征），利用 VM 逐个提取。
 * 2. 若未命中分组，则回退到从文件尾部截取 `ops_set.$gwx` 的旧模式逻辑。
 * 
 * 关于 Empty 字符排查：
 * - 如果还原结果出现大量 Empty 字符，通常意味着 WXML 与 JS/JSON/WXSS 版本不匹配。
 * - 请优先检查 targetType 参数是否正确：
 *   - "miniapp"（默认）：仅匹配小程序自身的编译函数。
 *   - "plugin"：会额外开启对插件特征函数（gz$gwx_wx...）的匹配。
 * - 若确认 targetType 正确但仍报错，可能需要新增正则来支持该版本的编译特征。
 * 
 * @param {string} code - 包含编译后 WXML 逻辑的 JS 代码
 * @param {function} cb - 回调函数，接收提取到的 Z 数组或对象
 * @param {string} targetType - 目标类型："miniapp" (默认) | "plugin"
 */
function catchZ(code, cb, targetType = "miniapp") {
	const resolvedTargetType = normalizeTargetType(targetType);
	const enablePluginMatch = resolvedTargetType === "plugin";
	let zGroupMap = {};
	let zGroupSources = {};
	function merge2ZGroups({mul, patternType}) {
		for (let key in mul) {
			if (key in zGroupMap) {
				logger.warn("[restoreZ] key collision", { key, oldPattern: zGroupSources[key], newPattern: patternType });
			}
			zGroupMap[key] = mul[key];
			zGroupSources[key] = patternType;
		}
	}

	// 1. 尝试匹配普通小程序的分组模式（无 XC 标识）
	let groupMatch = code.match(/function gz\$gwx(\d*_\d+)\(\)\{\n?\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx\1\)/g);
	if (groupMatch !== null) {
		catchZGroup(code, groupMatch, merge2ZGroups);
		if (!Object.keys(zGroupMap).length) {
			throw new Error("catchZGroup: 未命中");
		}
	}

	// 2. 尝试匹配新版小程序的分组模式（含 XC 标识，普通页面）
	groupMatch = code.match(/function gz\$gwx\d?_XC_(\d*_\d+)\(\)\{\n?\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx\d?_XC_\d*_\d+\)/g);
	if (groupMatch !== null) catchZGroupWithXC(code, groupMatch, merge2ZGroups);

	// 3. 尝试匹配复杂版小程序的分组模式（含 XC 标识与appid，分包/特殊构建）
	groupMatch = code.match(/function gz\$gwx_wx[a-z0-9]{16}_XC_\d+_1\(\)\{\n?\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx_wx[a-z0-9]{16}_XC_\d+_1\)/g);
	if (groupMatch !== null) {
		catchZGroupWithAppIdXC(code, groupMatch, merge2ZGroups);
		if (!Object.keys(zGroupMap).length) {
			throw new Error("catchZGroupWithAppIdXC: 未命中");
		}
	}

	// 4. 尝试匹配小程序插件模式（仅当 targetType="plugin" 时启用）
	let pluginMatchCount = 0;
	let pluginGroupMatch = enablePluginMatch
		? code.match(/function gz\$gwx_wx[a-z0-9]+_\d+(_\d+)?\(\)\{\n?\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx_wx[a-z0-9]+_\d+(_\d+)?\)/g)
		: null;
	if (pluginGroupMatch !== null) {
		pluginMatchCount = pluginGroupMatch.length;
		catchZGroupWxPlugin(code, pluginGroupMatch, merge2ZGroups);
		if (!Object.keys(zGroupMap).length) {
			throw new Error("catchZGroupWxPlugin: 未命中");
		}
	}
	logger.progress("restoreZ", "group-match", "done", `target=${resolvedTargetType} pluginHits=${pluginMatchCount}`);

	// 完善分组提取的获取逻辑，兼容同时包含多种 gz$gwx 分组模式的情况
	if (Object.keys(zGroupMap).length) {
		return cb({"mul": zGroupMap});
	}
	// groupTest: [
	// 	'function gz$gwx_1(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_1)',
	// 	'function gz$gwx_2(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_2)',
	// 	'function gz$gwx_3(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_3)',
	// 	'function gz$gwx_4(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_4)',
	// 	'function gz$gwx_5(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_5)',
	// 	'function gz$gwx_6(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_6)',
	// 	'function gz$gwx_7(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_7)',
	// 	'function gz$gwx_8(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_8)',
	// 	'function gz$gwx_9(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_9)',
	// 	'function gz$gwx_10(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_10)',
	// 	'function gz$gwx_11(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_11)',
	// 	'function gz$gwx_12(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_12)',
	// 	'function gz$gwx_13(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_13)'
	// ]
	// if (groupTest !== null) return catchZGroup(code, groupTest, cb);
	function findOpsSetTailInfo(sourceCode) {
		let tailPtr = sourceCode.lastIndexOf("(z);__WXML_GLOBAL__.ops_set.$gwx=z;");
		if (tailPtr !== -1) return {tailPtr, tailStep: 4};

		tailPtr = sourceCode.lastIndexOf("(z);__WXML_GLOBAL__.ops_set.$gwx");
		if (tailPtr !== -1) return {tailPtr, tailStep: 4};

		tailPtr = sourceCode.lastIndexOf("__WXML_GLOBAL__.ops_set.$gwx=z;");
		if (tailPtr !== -1) return {tailPtr, tailStep: 0};

		tailPtr = sourceCode.lastIndexOf("__WXML_GLOBAL__.ops_set.$gwx");
		if (tailPtr !== -1) return {tailPtr, tailStep: 0};

		return {tailPtr: -1, tailStep: 0};
	}

	let z = [], vm = new VM({
		sandbox: {
			z: z,
			debugInfo: []
		}
	});
	// 回退路径：不命中任何 gz$gwx 分组模式时，从尾部 ops_set.$gwx 截取可执行片段运行得到 z
	let { tailPtr, tailStep } = findOpsSetTailInfo(code);
	if (tailPtr == -1) {
		logger.error("[restoreZ] ops tail not found", { codeLength: code.length });
		logger.debug("[restoreZ] code head", { codeHead: code.slice(0, 120) });
		throw new Error("lastPtr == -1");
	} 
	code = code.slice(code.lastIndexOf('(function(z){var a=11;function Z(ops){z.push(ops)}'), tailPtr + tailStep);
	vm.run(code);
	cb(z);
}

function restoreSingle(ops, withScope = false) {
	if (typeof ops == "undefined") return "";

	function scope(value) {
		if (value.startsWith('{') && value.endsWith('}')) return withScope ? value : "{" + value + "}";
		return withScope ? value : "{{" + value + "}}";
	}

	function enBrace(value, type = '{') {
		if (value.startsWith('{') || value.startsWith('[') || value.startsWith('(') || value.endsWith('}') || value.endsWith(']') || value.endsWith(')')) value = ' ' + value + ' ';
		switch (type) {
			case '{':
				return '{' + value + '}';
			case '[':
				return '[' + value + ']';
			case '(':
				return '(' + value + ')';
			default:
				throw Error("Unknown brace type " + type);
		}
	}

	function restoreNext(ops, w = withScope) {
		return restoreSingle(ops, w);
	}

	function jsoToWxon(obj) {//convert JS Object to Wechat Object Notation(No quotes@key+str)
		let ans = "";
		if (typeof obj === "undefined") {
			return 'undefined';
		} else if (obj === null) {
			return 'null';
		} else if (obj instanceof RegExp) {
			return obj.toString();
		} else if (obj instanceof Array) {
			for (let i = 0; i < obj.length; i++) ans += ',' + jsoToWxon(obj[i]);
			return enBrace(ans.slice(1), '[');
		} else if (typeof obj == "object") {
			for (let k in obj) ans += "," + k + ":" + jsoToWxon(obj[k]);
			return enBrace(ans.slice(1), '{');
		} else if (typeof obj == "string") {
			let parts = obj.split('"'), ret = [];
			for (let part of parts) {
				let atoms = part.split("'"), ans = [];
				for (let atom of atoms) ans.push(JSON.stringify(atom).slice(1, -1));
				ret.push(ans.join("\\'"));
			}
			return "'" + ret.join('"') + "'";
		} else return JSON.stringify(obj);
	}

	let op = ops[0];
	if (typeof op != "object") {
		switch (op) {
			case 3://string
				return ops[1];//may cause problems if wx use it to be string
			case 1://direct value
				return scope(jsoToWxon(ops[1]));
			case 11://values list, According to var a = 11;
				let ans = "";
				ops.shift();
				for (let perOp of ops) ans += restoreNext(perOp);
				return ans;
		}
	} else {
		let ans = "";
		switch (op[0]) {//vop
			case 2://arithmetic operator
			{
				function getPrior(op, len) {
					const priorList = {
						"?:": 4,
						"&&": 6,
						"||": 5,
						"+": 13,
						"*": 14,
						"/": 14,
						"%": 14,
						"|": 7,
						"^": 8,
						"&": 9,
						"!": 16,
						"~": 16,
						"===": 10,
						"==": 10,
						"!=": 10,
						"!==": 10,
						">=": 11,
						"<=": 11,
						">": 11,
						"<": 11,
						"<<": 12,
						">>": 12,
						"-": len == 3 ? 13 : 16
					};
					return priorList[op] ? priorList[op] : 0;
				}

				function getOp(i) {
					let ret = restoreNext(ops[i], true);
					if (ops[i] instanceof Object && typeof ops[i][0] == "object" && ops[i][0][0] == 2) {
						//Add brackets if we need
						if (getPrior(op[1], ops.length) > getPrior(ops[i][0][1], ops[i].length)) ret = enBrace(ret, '(');
						;
					}
					return ret;
				}

				switch (op[1]) {
					case"?:":
						ans = getOp(1) + "?" + getOp(2) + ":" + getOp(3);
						break;
					case "!":
					case "~":
						ans = op[1] + getOp(1);
						break;
					case"-":
						if (ops.length != 3) {
							ans = op[1] + getOp(1);
							break;
						}//shoud not add more in there![fall through]
					default:
						ans = getOp(1) + op[1] + getOp(2);
				}
				break;
			}
			case 4://unkown-arrayStart?
				ans = restoreNext(ops[1], true);
				break;
			case 5://merge-array
			{
				switch (ops.length) {
					case 2:
						ans = enBrace(restoreNext(ops[1], true), '[');
						break;
					case 1:
						ans = '[]';
						break;
					default: {
						let a = restoreNext(ops[1], true);
						//console.log(a,a.startsWith('[')&&a.endsWith(']'));
						if (a.startsWith('[') && a.endsWith(']')) {
							if (a != '[]') {
								ans = enBrace(a.slice(1, -1).trim() + ',' + restoreNext(ops[2], true), '[');
								//console.log('-',a);
							} else {
								ans = enBrace(restoreNext(ops[2], true), '[');
							}
						} else {
							ans = enBrace('...' + a + ',' + restoreNext(ops[2], true), '[');//may/must not support in fact
						}
					}
				}
				break;
			}
			case 6://get value of an object
			{
				let sonName = restoreNext(ops[2], true);
				if (sonName._type === "var")
					ans = restoreNext(ops[1], true) + enBrace(sonName, '[');
				else {
					let attach = "";
					if (/^[A-Za-z_][A-Za-z\d_]*$/.test(sonName)/*is a qualified id*/)
						attach = '.' + sonName;
					else attach = enBrace(sonName, '[');
					ans = restoreNext(ops[1], true) + attach;
				}
				break;
			}
			case 7://get value of str
			{
				switch (ops[1][0]) {
					case 11:
						ans = enBrace("__unTestedGetValue:" + enBrace(jsoToWxon(ops), '['), '{');
						break;
					case 3:
						ans = new String(ops[1][1]);
						ans._type = "var";
						break;
					default:
						throw Error("Unknown type to get value");
				}
				break;
			}
			case 8://first object
				ans = enBrace(ops[1] + ':' + restoreNext(ops[2], true), '{');//ops[1] have only this way to define
				break;
			case 9://object
			{
				function type(x) {
					if (x.startsWith('...')) return 1;
					if (x.startsWith('{') && x.endsWith('}')) return 0;
					return 2;
				}

				let a = restoreNext(ops[1], true);
				let b = restoreNext(ops[2], true);
				let xa = type(a), xb = type(b);
				if (xa == 2 || xb == 2) ans = enBrace("__unkownMerge:" + enBrace(a + "," + b, '['), '{');
				else {
					if (!xa) a = a.slice(1, -1).trim();
					if (!xb) b = b.slice(1, -1).trim();
					//console.log(l,r);
					ans = enBrace(a + ',' + b, '{');
				}
				break;
			}
			case 10://...object
				ans = '...' + restoreNext(ops[1], true);
				break;
			case 12: {
				let arr = restoreNext(ops[2], true);
				if (arr.startsWith('[') && arr.endsWith(']'))
					ans = restoreNext(ops[1], true) + enBrace(arr.slice(1, -1).trim(), '(');
				else ans = restoreNext(ops[1], true) + '.apply' + enBrace('null,' + arr, '(');
				break;
			}
			default:
				ans = enBrace("__unkownSpecific:" + jsoToWxon(ops), '{');
		}
		return scope(ans);
	}
}

function restoreGroup(z) {
	let ans = [];
	for (let g in z.mul) {
		let singleAns = [];
		for (let e of z.mul[g]) singleAns.push(restoreSingle(e, false));
		ans[g] = singleAns;
	}
	let ret = [];//Keep a null array for remaining global Z array.
	ret.mul = ans;
	return ret;
}

function restoreAll(z) {
	if (z.mul) return restoreGroup(z);
	let ans = [];
	for (let e of z) ans.push(restoreSingle(e, false));
	return ans;
}

module.exports = {
	getZ(code, cb, targetType = "miniapp") {
		catchZ(code, z => cb(restoreAll(z)), targetType);
	}
};
