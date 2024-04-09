const wu = require("./wuLib.js");
const {getZ} = require("./wuRestoreZ.js");
const {wxsBeautify} = require("./wuJs.js");
const fs = require('fs');
const path = require("path");
const esprima = require('esprima');
const {VM} = require('vm2');
const escodegen = require('escodegen');
const { write } = require('./utils.js');

function analyze(core, z, namePool, xPool, fakePool = {}, zMulName = "0") {
    function anaRecursion(core, fakePool = {}) {
        return analyze(core, z, namePool, xPool, fakePool, zMulName);
    }

    function push(name, elem) {
        namePool[name] = elem;
    }

    function pushSon(pname, son) {
        if (fakePool[pname]) fakePool[pname].son.push(son);
        else namePool[pname].son.push(son);
    }

    for (let ei = 0; ei < core.length; ei++) {
        let e = core[ei];
        switch (e.type) {
            case "ExpressionStatement": {
                let f = e.expression;
                if (f.callee) {
                    if (f.callee.type == "Identifier") {
                        switch (f.callee.name) {
                            case "_r":
                                namePool[f.arguments[0].name].v[f.arguments[1].value] = z[f.arguments[2].value];
                                break;
                            case "_rz":
                                try {
                                    namePool[f.arguments[1].name].v[f.arguments[2].value] = z.mul[zMulName][f.arguments[3].value];
                                } catch (error) {
                                    console.error(error);
                                    const rest = [f.arguments[1].name, zMulName, f.arguments[2].value, f.arguments[3].value];
                                    console.log('[f.arguments[1].name, zMulName, f.arguments[2].value, f.arguments[3].value]');
                                    console.log(rest);
                                }
                                break;
                            case "_":
                                pushSon(f.arguments[0].name, namePool[f.arguments[1].name]);
                                break;
                            case "_2": {
                                let item = f.arguments[6].value;//def:item
                                let index = f.arguments[7].value;//def:index
                                let data = z[f.arguments[0].value];
                                let key = escodegen.generate(f.arguments[8]).slice(1, -1);//f.arguments[8].value;//def:""
                                let obj = namePool[f.arguments[5].name];
                                let gen = namePool[f.arguments[1].name];
                                if (gen.tag == "gen") {
                                    let ret = gen.func.body.body.pop().argument.name;
                                    anaRecursion(gen.func.body.body, {[ret]: obj});
                                }
                                obj.v["wx:for"] = data;
                                if (index != "index") obj.v["wx:for-index"] = index;
                                if (item != "item") obj.v["wx:for-item"] = item;
                                if (key != "") obj.v["wx:key"] = key;
                            }
                                break;
                            case "_2z": {
                                let item = f.arguments[7].value;//def:item
                                let index = f.arguments[8].value;//def:index
                                let data = z.mul[zMulName][f.arguments[1].value];
                                let key = escodegen.generate(f.arguments[9]).slice(1, -1);//f.arguments[9].value;//def:""
                                let obj = namePool[f.arguments[6].name];
                                let gen = namePool[f.arguments[2].name];
                                if (gen.tag == "gen") {
                                    let ret = gen.func.body.body.pop().argument.name;
                                    anaRecursion(gen.func.body.body, {[ret]: obj});
                                }
                                obj.v["wx:for"] = data;
                                if (index != "index") obj.v["wx:for-index"] = index;
                                if (item != "item") obj.v["wx:for-item"] = item;
                                if (key != "") obj.v["wx:key"] = key;
                            }
                                break;
                            case "_ic":
                                pushSon(f.arguments[5].name, {
                                    tag: "include",
                                    son: [],
                                    v: {src: xPool[f.arguments[0].property.value]}
                                });
                                break;
                            case "_ai": {//template import
                                let to = Object.keys(fakePool)[0];
                                if (to) pushSon(to, {
                                    tag: "import",
                                    son: [],
                                    v: {src: xPool[f.arguments[1].property.value]}
                                });
                                else throw Error("Unexpected fake pool");
                            }
                                break;
                            case "_af":
                                //ignore _af
                                break;
                            default:
                                throw Error("Unknown expression callee name " + f.callee.name);
                        }
                    } else if (f.callee.type == "MemberExpression") {
                        if (f.callee.object.name == "cs" || f.callee.property.name == "pop") break;
                        throw Error("Unknown member expression");
                    } else throw Error("Unknown callee type " + f.callee.type);
                } else if (f.type == "AssignmentExpression" && f.operator == "=") {
                    //no special use
                } else throw Error("Unknown expression statement.");
                break;
            }
            case "VariableDeclaration":
                for (let dec of e.declarations) {
                    if (dec.init.type == "CallExpression") {
                        switch (dec.init.callee.name) {
                            case "_n":
                                push(dec.id.name, {tag: dec.init.arguments[0].value, son: [], v: {}});
                                break;
                            case "_v":
                                push(dec.id.name, {tag: "block", son: [], v: {}});
                                break;
                            case "_o":
                                var content = z[dec.init.arguments[0].value]
                                push(dec.id.name, {
                                    tag: "__textNode__",
                                    textNode: true,
                                    content
                                });
                                if(!content){
                                    debugger
                                }
                                break;
                            case "_oz":
                                var content = z.mul[zMulName][dec.init.arguments[1].value]
                                push(dec.id.name, {
                                    tag: "__textNode__",
                                    textNode: true,
                                    content
                                });
                                if(!content){
                                    debugger
                                } else {
                                    // debugger;
                                }
                                break;
                            case "_m": {
                                if (dec.init.arguments[2].elements.length > 0)
                                    throw Error("Noticable generics content: " + dec.init.arguments[2].toString());
                                let mv = {};
                                let name = null, base = 0;
                                for (let x of dec.init.arguments[1].elements) {
                                    let v = x.value;
                                    if (!v && typeof v != "number") {
                                        if (x.type == "UnaryExpression" && x.operator == "-") v = -x.argument.value;
                                        else throw Error("Unknown type of object in _m attrs array: " + x.type);
                                    }
                                    if (name === null) {
                                        name = v;
                                    } else {
                                        if (base + v < 0) mv[name] = null; else {
                                            mv[name] = z[base + v];
                                            if (base == 0) base = v;
                                        }
                                        name = null;
                                    }
                                }
                                push(dec.id.name, {tag: dec.init.arguments[0].value, son: [], v: mv});
                            }
                                break;
                            case "_mz": {
                                if (dec.init.arguments[3].elements.length > 0)
                                    throw Error("Noticable generics content: " + dec.init.arguments[3].toString());
                                let mv = {};
                                let name = null, base = 0;
                                for (let x of dec.init.arguments[2].elements) {
                                    let v = x.value;
                                    if (!v && typeof v != "number") {
                                        if (x.type == "UnaryExpression" && x.operator == "-") v = -x.argument.value;
                                        else throw Error("Unknown type of object in _mz attrs array: " + x.type);
                                    }
                                    if (name === null) {
                                        name = v;
                                    } else {
                                        if (base + v < 0) mv[name] = null; else {
                                            // console.info('=========================')
                                            // console.info('zMulName:', zMulName)
                                            // console.info('base:', base)
                                            // console.info('v:', v)
                                            // console.info('name:', name)
                                            // console.info('z.mul[zMulName]:', z.mul[zMulName])
                                            mv[name] = z.mul[zMulName][base + v];
                                            if (base == 0) base = v;
                                            // console.info('=========================')
                                        }
                                        name = null;
                                    }
                                }
                                push(dec.id.name, {tag: dec.init.arguments[1].value, son: [], v: mv});
                            }
                                break;
                            case "_gd"://template use/is
                            {
                                let is = namePool[dec.init.arguments[1].name].content;
                                let data = null, obj = null;
                                ei++;
                                for (let e of core[ei].consequent.body) {
                                    if (e.type == "VariableDeclaration") {
                                        for (let f of e.declarations) {
                                            if (f.init.type == "LogicalExpression" && f.init.left.type == "CallExpression") {
                                                if (f.init.left.callee.name == "_1") data = z[f.init.left.arguments[0].value];
                                                else if (f.init.left.callee.name == "_1z") data = z.mul[zMulName][f.init.left.arguments[1].value];
                                            }
                                        }
                                    } else if (e.type == "ExpressionStatement") {
                                        let f = e.expression;
                                        if (f.type == "AssignmentExpression" && f.operator == "=" && f.left.property && f.left.property.name == "wxXCkey") {
                                            obj = f.left.object.name;
                                        }
                                    }
                                }
                                namePool[obj].tag = "template";
                                Object.assign(namePool[obj].v, {is: is, data: data});
                            }
                                break;
                            default: {
                                let funName = dec.init.callee.name;

                                let zMulNamePatt = /(?<=(gz\$gwx\d{0,1}_(XC_){0,1}))[\d|_]+/;
                                zMulName = funName.match(zMulNamePatt)?.[0];
                                if(!zMulName) {
                                    // 'gz$gwx_wxfa43a4a7041a84de_XC_12_1' 提取12
                                    // 'gz$gwx_wxfa43a4a7041a84de_1' 提取1
                                    // zMulNamePatt = /gz\$gwx_wx[a-z0-9]{16}_(XC_)?(\d+)(_1)?/;
                                    zMulNamePatt = /gz\$gwx_wx[a-z0-9]{16}_(XC_|)(\d+)(_1)?/;
                                    // zMulNamePatt = /gz\$gwx_wx[a-z0-9]{16}_(\d+)/;
                                    zMulName = funName.match(zMulNamePatt)?.[2];
                                    // if(!zMulName){

                                    // }
                                } 
                                if(!zMulName) {
                                    throw Error("Unknown init callee " + funName, "\n出现新类型了, wuWXml.js处理");
                                } 
                                console.log('funName:', funName, ' zMulName', zMulName);
                                debugger;
                                // let prefixList = ["gz$gwx_XC", "gz$gwx"];
                                // if (funName.startsWith(prefixList[0])) {
                                //     zMulName = funName.slice(prefixList[0].length + 1);
                                //     console.log('funName:', funName, ' zMulName', zMulName)
                                // } else if (funName.startsWith(prefixList[1])) {
                                //     zMulName = funName.slice(prefixList[1].length);
                                //     console.log('funName:', funName, ' zMulName', zMulName)
                                // } else throw Error("Unknown init callee " + funName);
                            }
                        }
                    } else if (dec.init.type == "FunctionExpression") {
                        push(dec.id.name, {tag: "gen", func: dec.init});
                    } else if (dec.init.type == "MemberExpression") {
                        if (dec.init.object.type == "MemberExpression" && dec.init.object.object.name == "e_" && dec.init.object.property.type == "MemberExpression" && dec.init.object.property.object.name == "x") {
                            if (dec.init.property.name == "j") {//include
                                //do nothing
                            } else if (dec.init.property.name == "i") {//import
                                //do nothing
                            } else throw Error("Unknown member expression declaration.");
                        } else throw Error("Unknown member expression declaration.");
                    } else throw Error("Unknown declaration init type " + dec.init.type);
                }
                break;
            case "IfStatement":
                if (e.test.callee.name.startsWith("_o")) {
                    function parse_OFun(e) {
                        if (e.test.callee.name == "_o") return z[e.test.arguments[0].value];
                        else if (e.test.callee.name == "_oz") {
                            try{
                                return z.mul[zMulName][e.test.arguments[1].value];
                            }catch(e_){
                                console.log("z.mul\n",z.mul)
                                console.log("zMulName\n",zMulName)
                                console.log("e.test.arguments\n",e?.test?.arguments)
                                debugger;
                                //TODO handle the exception
                                throw new Error(e_);
                            }
                        }
                        else throw Error("Unknown if statement test callee name:" + e.test.callee.name);
                    }

                    let vname = e.consequent.body[0].expression.left.object.name;
                    let nif = {tag: "block", v: {"wx:if": parse_OFun(e)}, son: []};
                    anaRecursion(e.consequent.body, {[vname]: nif});
                    pushSon(vname, nif);
                    if (e.alternate) {
                        while (e.alternate && e.alternate.type == "IfStatement") {
                            e = e.alternate;
                            nif = {tag: "block", v: {"wx:elif": parse_OFun(e)}, son: []};
                            anaRecursion(e.consequent.body, {[vname]: nif});
                            pushSon(vname, nif);
                        }
                        if (e.alternate && e.alternate.type == "BlockStatement") {
                            e = e.alternate;
                            nif = {tag: "block", v: {"wx:else": null}, son: []};
                            anaRecursion(e.body, {[vname]: nif});
                            pushSon(vname, nif);
                        }
                    }
                } else throw Error("Unknown if statement.");
                break;
            default:
                throw Error("Unknown type " + e.type);
        }
    }
}

function wxmlify(str, isText) {
    if (typeof str == "undefined" || str === null) {
        console.trace("str, isText", str, isText)
        return "Empty";//throw Error("Empty str in "+(isText?"text":"prop"));
    }
    if (isText) return str;//may have some bugs in some specific case(undocumented by tx)
    else return str.replace(/"/g, '\\"');
}

function elemToString(elem, dep, moreInfo = false) {
    const longerList = [];//put tag name which can't be <x /> style.
    const indent = ' '.repeat(4);

    if(!elem.content && isTextTag(elem)){
        debugger;
    }

    function isTextTag(elem) {
        return elem.tag == "__textNode__" && elem.textNode;
    }

    function elemRecursion(elem, dep) {
        return elemToString(elem, dep, moreInfo);
    }

    function trimMerge(rets) {
        let needTrimLeft = false, ans = "";
        for (let ret of rets) {
            if (ret.textNode == 1) {
                if (!needTrimLeft) {
                    needTrimLeft = true;
                    ans = ans.trimRight();
                }
            } else if (needTrimLeft) {
                needTrimLeft = false;
                ret = ret.trimLeft();
            }
            ans += ret;
        }
        return ans;
    }

    if (isTextTag(elem)) {
        //In comment, you can use typify text node, which beautify its code, but may destroy ui.
        //So, we use a "hack" way to solve this problem by letting typify program stop when face textNode
        let str = new String(wxmlify(elem.content, true));
        str.textNode = 1;
        return wxmlify(str, true);//indent.repeat(dep)+wxmlify(elem.content.trim(),true)+"\n";
    }
    if (elem.tag == "block" && !moreInfo) {
        if (elem.son.length == 1 && !isTextTag(elem.son[0])) {
            let ok = true, s = elem.son[0];
            for (let x in elem.v) if (x in s.v) {
                ok = false;
                break;
            }
            if (ok && !(("wx:for" in s.v || "wx:if" in s.v) && ("wx:if" in elem.v || "wx:else" in elem.v || "wx:elif" in elem.v))) {//if for and if in one tag, the default result is an if in for. And we should block if nested in elif/else been combined.
                Object.assign(s.v, elem.v);
                return elemRecursion(s, dep);
            }
        } else if (Object.keys(elem.v).length == 0) {
            let ret = [];
            for (let s of elem.son) ret.push(elemRecursion(s, dep));
            return trimMerge(ret);
        }
    }
    let ret = indent.repeat(dep) + "<" + elem.tag;
    for (let v in elem.v) ret += " " + v + (elem.v[v] !== null ? "=\"" + wxmlify(elem.v[v]) + "\"" : "");
    if (elem.son.length == 0) {
        if (longerList.includes(elem.tag)) return ret + " />\n";
        else return ret + "></" + elem.tag + ">\n";
    }
    ret += ">\n";
    let rets = [ret];
    for (let s of elem.son) rets.push(elemRecursion(s, dep + 1));
    rets.push(indent.repeat(dep) + "</" + elem.tag + ">\n");
    return trimMerge(rets);
}

function doWxml(state, dir, name, code, z, xPool, rDs, wxsList, moreInfo) {
    let rname = code.slice(code.lastIndexOf("return") + 6).replace(/[\;\}]/g, "").trim();
    code = code.slice(code.indexOf("\n"), code.lastIndexOf("return")).trim();
    //// console.log('============================');
    // //// console.log("code: ", code)
    let r = {son: []};
    //// console.log('============================');
    // //// console.log("z: ", z)
    analyze(esprima.parseScript(code).body, z, {[rname]: r}, xPool, {[rname]: r});
    //// console.log('============================');
    // //// console.log("z: after", z)
    let ans = [];
    for (let elem of r.son) ans.push(elemToString(elem, 0, moreInfo));
    //// console.log('============================');
    //// console.log("r.son", r.son);
    //// console.log('============================');
    // //// console.log("ans", ans.join(""));
    let result = [ans.join("")];
    for (let v in rDs) {
        state[0] = v;
        let oriCode = rDs[v].toString();
        let rname = oriCode.slice(oriCode.lastIndexOf("return") + 6).replace(/[\;\}]/g, "").trim();
        let tryPtr = oriCode.indexOf("\ntry{");
        let zPtr = oriCode.indexOf("var z=gz$gwx");
        let code = oriCode.slice(tryPtr + 5, oriCode.lastIndexOf("\n}catch(")).trim();
        if (zPtr != -1 && tryPtr > zPtr) {
            let attach = oriCode.slice(zPtr);
            attach = attach.slice(0, attach.indexOf("()")) + "()\n";
            code = attach + code;
            //// console.log("attach: ", attach)
        }
        // //// console.log("code: ", code)
        let r = {tag: "template", v: {name: v}, son: []};
        analyze(esprima.parseScript(code).body, z, {[rname]: r}, xPool, {[rname]: r});
        result.unshift(elemToString(r, 0, moreInfo));
    }
    // console.log('state[0]', state[0], ' rDs', rDs)
    name = path.resolve(dir, name);
    if (wxsList[name]) result.push(wxsList[name]);
    //// console.log('============================');
    // //// console.log('result.join(""): ', result.join(""));
    //// console.log('============================');
    wu.save(name, result.join(""));
}

function tryWxml(dir, name, code, z, xPool, rDs, ...args) {
    console.log("Decompile " + name + "...");
    let state = [null];
    try {
        doWxml(state, dir, name, code, z, xPool, rDs, ...args);
        console.log("Decompile success!");
    } catch (e) {
        console.error("dir:", dir, " error: ", e);
        // console.error("error on " + name + "(" + (state[0] === null ? "Main" : "Template-" + state[0]) + ")\nerr: ", e);
        if (state[0] === null) wu.save(path.resolve(dir, name + ".ori.js"), code);
        else wu.save(path.resolve(dir, name + ".tem-" + state[0] + ".ori.js"), rDs[state[0]].toString());
    }
}

function doWxs(code, name) {
    name = name || '';
    name = name.substring(0, name.lastIndexOf('/') + 1);
    const before = 'nv_module={nv_exports:{}};';
    return wxsBeautify(code.slice(code.indexOf(before) + before.length, code.lastIndexOf('return nv_module.nv_exports;}')).replace(eval('/' + ('p_' + name).replace(/\//g, '\\/') + '/g'), '').replace(/nv\_/g, '').replace(/(require\(.*?\))\(\)/g,'$1'));
}

// 写一个 有bug, 不支持 var x = ['xxx','xxx', ...]; 类型
function transformCode({str, prefix = 'if(path&&e_[path]){', start = '{', end = '}'}) {
    if(!str.includes(prefix)){
        return str;
    }
    const str_list = str.split(prefix);
  
    function findTheEndCore(str, start, end) {
        let [startNum, endNum] = [1, 0];
        let _str = str;
        for(let i = 0; i < str.length; i++){
            let temp = str[i];
            if(temp === start){
                startNum += 1;
            } else if(temp === end){
                endNum += 1;
            }
            if(startNum === endNum){
                _str = str.slice(i+1);
                break;
            }
        }
        return _str;
    }
    // const [str_list_0, ...str_list_rest] = str_list;
    // const _str_list = [str_list_0, ...str_list_rest.map(item => {
    //     return findTheEndCore(item, start, end)
    // })];
    const [var_start, var_end] = ["var x=[", "];"];
    const _str_list = str_list.map((item, index) => {
        if(item.includes('var x=[];')){
            return item;
        }
        // 1只去掉了条件判断语句
        let _item = findTheEndCore(item, start, end); 
        // 2去掉var x=[字段前的所有字段
        _item = _item.slice(_item.indexOf(var_start));
        // 3 批量替换x[0]
        _item = _item.replace(/x\[0\]/g, `x[${index}]`);
        // 4 转换第一条语句
        const value = _item.slice(_item.indexOf(var_start) + var_start.length, _item.indexOf(var_end));
        _item = _item.slice(_item.indexOf(var_end) + var_end.length);
        _item = `x[${index}]=${value};${_item}`;

        // 3 批量替换m0
        _item = _item.replace(/m0/g, `m${index}`);
        console.log(`str_list[${index}]: `, value);
        console.log(`str_list[${index}]: `, _item);
        console.log('========================');
        return _item;
    });
    if(_str_list)
    return _str_list.join('');
}

// 全新逻辑
function isTransformNew(code, patt) {
    // let patt = /var nv_require=function\(\)\{var nnm=\{.*\}.*\}.*return function\(n\)\{.*[\r\n\}]*\(\)/
    let flag = patt.test(code);
    return flag;
}
// 全新逻辑
function transformNew(code, nv_require_patt) { // 从0提取所需代码
    // 1 获取 nv_require
    // let patt = /var nv_require=function\(\)\{var nnm=\{.*\}.*\}.*return function\(n\)\{.*[\r\n\}]*\(\)/
    let nv_require_func = code.match(nv_require_patt)?.[0]; // nv_require 函数
    // ToFixed TypeError [Error]: $gstack is not a function
    nv_require_func = nv_require_func.replace('e.stack = $gstack(e.stack);', '');

    // 2 获取 np_d 系列函数
    let np_d_func_patt = /function np_\d+\(\)\{.*\}(\r|\n)*/g;
    let np_d_func_list = code.match(np_d_func_patt) || []; // np_d 函数

    // 3 获取核心语句
    let core_patt = /var x=\['.*'\];(.|\r|\n)*?(?=(if\(path&&e_\[path\]\)\{))/g
    let core_list = code.match(core_patt);

    // 4 拼接
    let _code = [nv_require_func, ...np_d_func_list, ...core_list].join('\n\n');

    write(code, path.join(__dirname, 'new_code_before.js'));
    write(_code, path.join(__dirname, 'new_code_after.js'));

    return _code;
}

function doFrame(name, cb, order, mainDir) {
    let moreInfo = order.includes("m");
    wxsList = {};
    wu.get(name, code => {
        getZ(code, z => {
            //// console.log('==============================');
            // console.info('name', name, '\nz', z);
            //// console.log('==============================');
            // console.info('code', code.slice(0,2000));
            //// console.log('==============================');
            let rD = {}, rE = {}, rF = {}, requireInfo = {}, x, vm;
            let patt = /var nv_require=function\(\)\{var nnm=\{.*\}.*\}.*return function\(n\)\{.*[\r\n\}]*\(\)/;

            if(isTransformNew(code, patt)){
                // 新逻辑: nv_require 是一个小函数,闭包函数
                // var nv_require=function\(\)\{var nnm=\{.*\}.*\}[\r\n\}]*\(\)
                // var nv_require=function\(\)\{var nnm=\{.*\}.*\}.*return function\(n\)\{.*[\r\n\}]*\(\)
    
                // x 的话, 可以通过正则来算出全部
                code = transformNew(code, patt);
                vm = new VM({
                    sandbox: {
                        d_: rD, e_: rE, f_: rF, 
                        _vmRev_(data) {
                            [x, requireInfo] = data;
                        }, 
                        // nv_require(path) {
                        //     return () => path;
                        // }
                    }
                });
                let json = '{}';
                let vmCode = code + "\n_vmRev_([x," + json + "])";
                
                // //// console.log('vmCode\n', vmCode);
                try{
                    vm.run(vmCode);
                    x = Object.keys(rE);
                }catch(e){
                    //TODO handle the exception
                    // 还出错就没办法了
                    console.error('[New]', e);
                    throw new Error('[New]', e);
                }

            } else {
                // 原逻辑是建立在 nv_require 是一个大函数的前提下的,所有的代码都是在nv_require里提取的.
                const before = "\nvar nv_require=function(){var nnm=";
                code = code.slice(code.lastIndexOf(before) + before.length, code.lastIndexOf("if(path&&e_[path]){"));
                let json = code.slice(0, code.indexOf("};") + 1);
                try{
                    JSON.parse(json);
                    let endOfRequire = code.indexOf("()\r\n") + 4;
                    
                    if (endOfRequire == 4 - 1) endOfRequire = code.indexOf("()\n") + 3;
                    code = code.slice(endOfRequire);
                }catch(e){
                    let endOfRequire = code.indexOf("()\r\n") + 4;
                    
                    if (endOfRequire == 4 - 1) endOfRequire = code.indexOf("()\n") + 3;
                    code = code.slice(endOfRequire);

                    const _json = '{}';
                    // 如果格式化失败，则说明json不对
                    // code = code.replace(json, _json) // 可以不拿掉
                    json = _json;
                    endOfRequire = code.indexOf("var x=[];");
                    let isMatchX = false; // 标识符,判断是否是 var x=\[.*?\];
                    if(endOfRequire === -1){
                        let patt = /var x=\[.*?\];/
                        let var_X = code.match(patt)?.[0];
                        if(!var_X){
                            throw new Error('找不到 var x=\[.*?\];');
                        }
                        isMatchX = true; 
                        endOfRequire = code.indexOf(var_X);
                    }
                    
                    // 不兼容以下这种
                    // var x=['./components/courseRecord.wxml',...];
                    
                    
                    code = code.slice(endOfRequire);
                    //// console.log('endOfRequireendOfRequireendOfRequireendOfRequireendOfRequire', endOfRequire);
                    //// console.log('CCCCCode:', code.slice(0, 100));
                    if(!isMatchX) {
                        code = transformCode({ str: code });
                    }
                    // //// console.log('JJJJJJJJJJJson:', json);
                    //TODO handle the exception
                    // 需要拿掉json的那一段
                    //// console.log('CCCCCode:', code.slice(0, 100));
                    //// console.log('==============================');
                    // code = code.replace(json, '{}');
                    // //// console.log('code:', code.slice(0, 50));
                }
                


                // let endOfRequire = code.indexOf("()\r\n") + 4;
                // if (endOfRequire == 4 - 1) endOfRequire = code.indexOf("()\n") + 3;
                // code = code.slice(endOfRequire);
                // let rD = {}, rE = {}, rF = {}, requireInfo = {},  x, 
                vm = new VM({
                    sandbox: {
                        d_: rD, e_: rE, f_: rF, _vmRev_(data) {
                            [x, requireInfo] = data;
                        }, nv_require(path) {
                            return () => path;
                        }
                    }
                });

                let vmCode = code + "\n_vmRev_([x," + json + "])";
                // //// console.log('vmCode\n', vmCode);
                try{
                    vm.run(vmCode);
                }catch(e){
                    console.error(552, e);

                    // 运行失败,尝试转化一下代码
                    let endOfRequire = code.indexOf("var x=[];");
                    let isMatchX = false;
                    if(endOfRequire === -1){
                        let patt = /var x=\[.*?\];/
                        let var_X = code.match(patt)?.[0];
                        if(!var_X){
                            throw new Error('找不到 var x=\[.*?\];');
                        }
                        isMatchX = true;
                        endOfRequire = code.indexOf(var_X);
                    }
                    code = code.slice(endOfRequire);
                    write(code, path.join(__dirname, '_code_before.js'));
                    !isMatchX && (code = transformCode({ str: code }));
                    write(code, path.join(__dirname, '_code_after.js'));
                    let vmCode = code + "\n_vmRev_([x," + json + "])";
                    try{
                        vm.run(vmCode);
                    }catch(e){
                        //TODO handle the exception
                        // 还出错就没办法了
                        console.error(577, e);
                    }
                    
                    // write(vmCode, path.join(__dirname, '____vmCode.js'));
                    //TODO handle the exception
                }
            }
            //// console.log('==============================');
            console.log("rE:\n", rE);
            console.log('==============================');
            //// console.log("rD:\n", rD);
            console.log('==============================');
            console.log("rF:\n", rF);
            //// console.log('==============================');
            console.log("x:\n", x);
            //// console.log('==============================');
            console.log("requireInfo:\n", requireInfo);
            //// console.log('==============================');
            let dir = mainDir || path.dirname(name), pF = [];
            for (let info in rF) if (typeof rF[info] == "function") {
                let name = path.resolve(dir, (info[0] == '/' ? '.' : '') + info), ref = rF[info]();
                pF[ref] = info;
                wu.save(name, doWxs(requireInfo[ref].toString(), info));
            }
            for (let info in rF) if (typeof rF[info] == "object") {
                let name = path.resolve(dir, (info[0] == '/' ? '.' : '') + info);
                let res = [], now = rF[info];
                for (let deps in now) {
                    let ref = now[deps]();
                    if (ref.includes(":")) res.push("<wxs module=\"" + deps + "\">\n" + doWxs(requireInfo[ref].toString()) + "\n</wxs>");
                    else if (pF[ref]) res.push("<wxs module=\"" + deps + "\" src=\"" + wu.toDir(pF[ref], info) + "\" />");
                    else res.push("<wxs module=\"" + deps + "\" src=\"" + wu.toDir(ref.slice(2), info) + "\" />");
                    wxsList[name] = res.join("\n");
                }
            }
            for (let name in rE) tryWxml(dir, name, rE[name].f.toString(), z, x, rD[name], wxsList, moreInfo);
            cb({[name]: 4});
        });
    });
}

module.exports = {doFrame: doFrame};
if (require.main === module) {
    wu.commandExecute(doFrame, "Restore wxml files.\n\n<files...>\n\n<files...> restore wxml file from page-frame.html or app-wxss.js.");
}
