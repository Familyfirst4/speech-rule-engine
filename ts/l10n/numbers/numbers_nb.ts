//
// Copyright 2020-21 Volker Sorge
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Translating numbers into German.
 * @author volker.sorge@gmail.com (Volker Sorge)
 */
import {Numbers, NUMBERS as NUMB} from '../messages';

//
// This work was sponsored by TextHelp
//

/**
 * Changes number one 'eins' into a prefix.
 * @param num number string.
 * @return If it is a one, it is made into prefix.
 */
function onePrefix_(num: string, thd: boolean = false): string {
  return num === NUMBERS.ones[1] ? (thd ? 'et' : 'ett') : num;
}


/**
 * Translates a number of up to twelve digits into a string representation.
 * @param num The number to translate.
 * @return The string representation of that number.
 */
function hundredsToWords_(num: number, ordinal: boolean = false): string {
  let n = num % 1000;
  let str = '';
  let ones = NUMBERS.ones[Math.floor(n / 100)];
  str += ones ? onePrefix_(ones) + 'hundre' : '';
  n = n % 100;
  if (n) {
    str += str ? 'og' : '';
    if (ordinal) {
      let ord = smallOrdinals_(n);
      if (ord) {
        return str += ord;
      }
    }
    ones = NUMBERS.ones[n];
    if (ones) {
      str += ones;
    } else {
      let tens = NUMBERS.tens[Math.floor(n / 10)];
      ones = NUMBERS.ones[n % 10];
      str += ones ? ones + 'og' + tens : tens;
    }
  }
  return (ordinal ? (str.match(/n$/) ? str + 'de' : str + 'nde') : str);
}


function smallOrdinals_(num: number) {
  return [
    '', 'første', 'andre', 'tredje', 'fjerde', 'femte', 'sjette',
    'sjuende', 'åttende', 'niende', 'tiende', 'ellevte', 'tolvte'
  ][num];
}



/**
 * Translates a number of up to twelve digits into a string representation.
 * @param num The number to translate.
 * @return The string representation of that number.
 */
function numberToWords(num: number, ordinal: boolean = false): string {
  if (num === 0) {
    return NUMBERS.zero;
  }
  if (num >= Math.pow(10, 36)) {
    return num.toString();
  }
  let pos = 0;
  let str = '';
  while (num > 0) {
    let hundreds = num % 1000;
    if (hundreds) {
      let hund = hundredsToWords_(num % 1000, (pos ? false : ordinal));
      str = (pos === 1 ? onePrefix_(hund, true) : hund) +
        (pos > 1 ? NUMBERS.numSep : '') +
        (pos ?
          // If this is million or above take care oaf the plural.
          (NUMBERS.large[pos] + (pos > 1 && hundreds > 1 ? 'er' : '')) :
          '') +
        (pos > 1 && str ? NUMBERS.numSep : '') + str;
    }
    num = Math.floor(num / 1000);
    pos++;
  }
  return str;
}


/**
 * Translates a number of up to twelve digits into a string representation of
 * its ordinal.
 * @param num The number to translate.
 * @param plural A flag indicating if the ordinal is in plural.
 * @return The ordinal of the number as string.
 */
function numberToOrdinal(num: number, _plural: boolean): string {
  return wordOrdinal(num);
}


/**
 * Creates a word ordinal string from a number.
 * @param num The number to be converted.
 * @return The ordinal string.
 */
function wordOrdinal(num: number): string {
  let ordinal = numberToWords(num, true);
  return ordinal;
}


/**
 * Creates a simple ordinal string from a number.
 * @param num The number to be converted.
 * @return The ordinal string.
 */
function simpleOrdinal(num: number): string {
  return num.toString() + '.';
}


const NUMBERS: Numbers = NUMB();
NUMBERS.wordOrdinal = wordOrdinal;
NUMBERS.simpleOrdinal = simpleOrdinal;
NUMBERS.numberToWords = numberToWords;
NUMBERS.numberToOrdinal = numberToOrdinal;

export default NUMBERS;
