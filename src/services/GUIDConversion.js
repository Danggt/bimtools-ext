export function ParseGuid(ifc_guid) {
  let i = 0,
    j = 2,
    m;
  let num = [];
  if (typeof ifc_guid === "undefined" || ifc_guid === "") return "";
  if (ifc_guid.includes("-")) return ifc_guid;
  for (i = 0; i <= 6; i++) {
    const temp = ifc_guid.sunstring(j, m);
    j = j + m;
    m = 4;
    num[i]= cv_from_64()
  }
}
function cv_from_64(str) {
  let len, i, j, index;
  len = str.len;
  if (len > 4) throw new Error("Invalid ID format");
  let pRes = 0;
  for (i = 0; i < len; i++) {
    index=-1;
    for(j=0;j<64;j++){
      if(process.env.REACT_APP_CONVERSION_TABLE[j]===str[i]){
        index=j;
        break;
      }
    }
    if(index ===-1) throw new Error("Invalid ID format");
    pRes = Math.abs(pRes*64+index);
  }
  return pRes;
}
