console.log("1:", /function gz\$gwx/.test("function gz$gwx"));
console.log("2:", /function gz\$gwx(\d*_\d+)/.test("function gz$gwx_4"));
console.log("3:", /function gz\$gwx(\d*_\d+)\(\)\{/.test("function gz$gwx_4(){"));
console.log("4:", /function gz\$gwx(\d*_\d+)\(\)\{\s*if\( /.test("function gz$gwx_4(){\nif( "));
console.log("5:", /function gz\$gwx(\d*_\d+)\(\)\{\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx/.test("function gz$gwx_4(){\nif( __WXML_GLOBAL__.ops_cached.$gwx"));
console.log("6:", /function gz\$gwx(\d*_\d+)\(\)\{\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx\d*_\d+/.test("function gz$gwx_4(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_4"));
console.log("7:", /function gz\$gwx(\d*_\d+)\(\)\{\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx\d*_\d+\)/.test("function gz$gwx_4(){\nif( __WXML_GLOBAL__.ops_cached.$gwx_4)"));
