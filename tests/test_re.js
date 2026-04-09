const code = `function gz$gwx_4(){
if( __WXML_GLOBAL__.ops_cached.$gwx_4)return __WXML_GLOBAL__.ops_cached.$gwx_4`;
const re = /function gz\$gwx(\d*_\d+)\(\)\{\s*if\( __WXML_GLOBAL__\.ops_cached\.\$gwx\d*_\d+\)/g;
console.log(code.match(re));
