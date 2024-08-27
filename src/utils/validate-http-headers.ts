/**
 * The following rules are copy/pasted from Node core library
 * at the time this comment was made April 5, 2016, the following two funcitons
 * are the latest version from https://github.com/nodejs/node/blob/master/lib/_http_common.js
 *
 * This code may need to be updated in the future, to stay in line with newer Node implementations
 *
 * Two more functions were added to follow similar rules, but to remove(clean out) all invalid
 * characters returning a valid string
 */

/***** Copy Pated Block *******/
/**
 * Verifies that the given val is a valid HTTP token
 * per the rules defined in RFC 7230
 * See https://tools.ietf.org/html/rfc7230#section-3.2.6
 *
 * This implementation of checkIsHttpToken() loops over the string instead of
 * using a regular expression since the former is up to 180% faster with v8 4.9
 * depending on the string length (the shorter the string, the larger the
 * performance difference)
 **/
function checkIsHttpToken(val: unknown) {
  if (typeof val !== "string" || val.length === 0) return false;

  for (var i = 0, len = val.length; i < len; i++) {
    var ch = val.charCodeAt(i);

    if (ch >= 65 && ch <= 90)
      // A-Z
      continue;

    if (ch >= 97 && ch <= 122)
      // a-z
      continue;

    // ^ => 94
    // _ => 95
    // ` => 96
    // | => 124
    // ~ => 126
    if (ch === 94 || ch === 95 || ch === 96 || ch === 124 || ch === 126)
      continue;

    if (ch >= 48 && ch <= 57)
      // 0-9
      continue;

    // ! => 33
    // # => 35
    // $ => 36
    // % => 37
    // & => 38
    // ' => 39
    // * => 42
    // + => 43
    // - => 45
    // . => 46
    if (ch >= 33 && ch <= 46) {
      if (ch === 34 || ch === 40 || ch === 41 || ch === 44) return false;
      continue;
    }

    return false;
  }
  return true;
}
/***** End of Copy Pated Block *******/

// Same logic as checkIsHttpToken, but removes invalid characters
function cleanHeaderName(val: string) {
  if (!val) throw new Error("cleanHeaderName is called without a header name");

  var cleanName = "";
  val = String(val);

  for (var i = 0, len = val.length; i < len; i++) {
    var ch = val.charCodeAt(i);

    if (ch >= 65 && ch <= 90)
      // A-Z
      cleanName += val[i];

    if (ch >= 97 && ch <= 122)
      // a-z
      cleanName += val[i];

    // ^ => 94
    // _ => 95
    // ` => 96
    // | => 124
    // ~ => 126
    if (ch === 94 || ch === 95 || ch === 96 || ch === 124 || ch === 126)
      cleanName += val[i];

    if (ch >= 48 && ch <= 57)
      // 0-9
      cleanName += val[i];

    // ! => 33
    // # => 35
    // $ => 36
    // % => 37
    // & => 38
    // ' => 39
    // * => 42
    // + => 43
    // - => 45
    // . => 46
    if (ch >= 33 && ch <= 46) {
      if (ch === 34 || ch === 40 || ch === 41 || ch === 44) {
        continue;
      } else {
        cleanName += val[i];
      }
    }
  }
  return cleanName;
}

/***** Copy Pated Block *******/
/**
 * True if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 **/
function checkInvalidHeaderChar(val: string) {
  val = "" + val;
  for (var i = 0; i < val.length; i++) {
    var ch = val.charCodeAt(i); //Changed const to var, since const didn't update in node v4.4
    if (ch === 9) continue;
    if (ch <= 31 || ch > 255 || ch === 127) {
      return true;
    }
  }
  return false;
}
/***** End of Copy Pated Block *******/

//Reverse the logic to keep interface consistent
export function validHeaderValue(val: string) {
  return !checkInvalidHeaderChar(val);
}

//Same logic as checkInvalidHeaderChar, which removes all invalid chars
export const cleanHeaderValue = (val: string) => {
  val = String(val);
  var cleanVal = "";
  for (var i = 0; i < val.length; i++) {
    var ch = val.charCodeAt(i);
    if (ch === 9 || ch <= 31 || ch > 255 || ch === 127) {
      continue;
    } else {
      cleanVal += val[i];
    }
  }
  return cleanVal;
};
