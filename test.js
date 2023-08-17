function findTheEnd({str, prefix = 'if(path&&e_[path]){', start = '{', end = '}'}) {
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
  const [str_list_0, ...str_list_rest] = str_list;
  const _str_list = [str_list_0, ...str_list_rest.map(item => {
      return findTheEndCore(item, '{', '}')
  })];
  return _str_list.join('');
}

var str = `
var x=[];if(path&&e_[path]){
  return function(env,dd,global){$gwxc=0;var root={"tag":"wx-page"};root.children=[]
  ;g="$gwx";var main=e_[path].f
  if (typeof global==="undefined")global={};global.f=$gdc(f_[path],"",1);
  try{
  main(env,{},root,global);
  _tsd(root)
  }catch(err){
  console.log(err)
  }
  ;g="";
  return root;
  }
  if(true){}
}
var y = '';
`

console.log(findTheEnd({str}));
// findTheEnd({str, prefix: 'if(path&&e_[path]){', start: '{', end: '}'})