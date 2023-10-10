import { parse as uuidParse } from "uuid";

export function Format(guid) {
  let num = [];
  let i;
  let n;
  const comp = uuidParse(guid);
  const data1 = bytesToUInt32(comp);
  const data2 = bytesToUInt16(comp.slice(4, comp.length));
  const data3 = bytesToUInt16(comp.slice(6, comp.length));
  let data4_0 = comp[8];
  let data4_1 = comp[9];
  let data4_2 = comp[10];
  let data4_3 = comp[11];
  let data4_4 = comp[12];
  let data4_5 = comp[13];
  let data4_6 = comp[14];
  let data4_7 = comp[15];
  num[0] = data1 / 16777216;
  num[1] = data1 % 16777216;
  num[2] = data2 * 256 + data3 / 256;
  num[3] = (data3 % 256) * 65536 + data4_0 * 256 + data4_1;
  num[4] = data4_2 * 65536 + data4_3 * 256 + data4_4;
  num[5] = data4_5 * 65536 + data4_6 * 256 + data4_7;
  let comp_arr = [];
  n = 2;
  for (i = 0; i < 6; i++) {
    const temp = cv_to_64(num[i], n);
    comp_arr.push(temp);
    n = 4;
  }
  return comp_arr.join('')
}
function cv_to_64(number, nDigits) {
  const mapping = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
  let act;
  let iDigit;
  let result = [];

  act = number;

  for (iDigit = 0; iDigit < nDigits; iDigit++) {
    result[nDigits - iDigit - 1] =
      mapping[Math.floor(act % 64)];
    act /= 64;
  }
  return result.join('');
}
function bytesToUInt32(bytes) {
  let value = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return value >>> 0;
}
function bytesToUInt16(bytes) {
  let value = (bytes[0] << 8) | bytes[1];
  return value >>> 0;
}
