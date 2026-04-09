const fs = require("fs");
const { VM } = require("vm2");
const code = fs.readFileSync("/Users/guifengxiao/gitstore/unpacker_workspace/wx14210fe3a319f5df/__APP__/app-service.js", "utf8");
const re = /function gz\$gwx(\d*_\d+)\(\)\{\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx\d*_\d+\)/g;
const groupMatch = code.match(re);

function catchZGroup(code, groupPreStr, cb) {
	const debugPre = "(function(z){var a=11;function Z(ops,debugLine){";
	let zArr = {};
	for (let preStr of groupPreStr) {
		let content = code.slice(code.indexOf(preStr)), z = [];
		content = content.slice(content.indexOf("(function(z){var a=11;"));
		content = content.slice(0, content.indexOf("})(__WXML_GLOBAL__.ops_cached.$gwx")) + "})(z);";
		let vm = new VM({sandbox: {z: z, debugInfo: []}});
		vm.run(content);
		if (content.startsWith(debugPre)) for (let i = 0; i < z.length; i++) z[i] = z[i][1];
		zArr[preStr.match(/function gz\$gwx\d*_(\d+)/)[1]] = z; 
	}
	cb({"mul": zArr});
}
catchZGroup(code, groupMatch, (res) => {
    console.log(Object.keys(res.mul).length);
});
