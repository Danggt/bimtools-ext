import { Uuid } from "uuid-tool";

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
  const data1 = num[0] * 16777216 + num[1]
  const data2 = Math.floor(num[2] / 256)
  const data3 = Math.floor((num[2] % 256) * 256 + num[3] / 65536)
  const data4_0 = Math.floor((num[3] / 256) % 256);                   //    08. byte
  const data4_1 = Math.floor(num[3] % 256);                           //    07. byte
  const data4_2 = Math.floor(num[4] / 65536);                         //    06. byte
  const data4_3 = Math.floor((num[4] / 256) % 256);                   //    05. byte
  const data4_4 = Math.floor(num[4] % 256);                           //    04. byte
  const data4_5 = Math.floor(num[5] / 65536);                         //    03. byte
  const data4_6 = Math.floor((num[5] / 256) % 256);                   //    02. byte
  const data4_7 = Math.floor(num[5] % 256);                           //    01. byte
  const bytes= [data1,data2,data3,data4_0,data4_1,data4_2,data4_3,data4_4,data4_5,data4_6,data4_7];
  const Uuid = require('uuid-tool').Uuid;
  const guid = Uuid.fr
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
