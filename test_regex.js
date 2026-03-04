
const funName = "gz$gwx15_1";
const zMulNamePatt = /(?<=(gz\$gwx\d{0,2}_(XC_){0,1}))[\d|_]+/;
const match = funName.match(zMulNamePatt);
console.log("Input:", funName);
console.log("Match:", match ? match[0] : "null");

const funName2 = "gz$gwx_1";
const match2 = funName2.match(zMulNamePatt);
console.log("Input:", funName2);
console.log("Match:", match2 ? match2[0] : "null");
