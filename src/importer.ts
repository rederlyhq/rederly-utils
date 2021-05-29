import logger from "./shared-logger";
import { getAllMatches } from "./string-helper";
import * as _ from 'lodash';

const httpNegativeLookAhead = '(?!\\s*https?:)';
const assetInPgFileExtensions = '(?:' + // Non capture group to or all the extensions together
[
    '[gG][iI][fF]', // gif
    '[aA]?[pP][nN][gG]', // or apng, png
    '[jJ][pP][eE]?[gG]', // or jpg, jpeg
    '[sS][vV][gG]', // or svg
    '[wW][eE][bB][pP]', // or webp
]
.join('|') // or extensions together
 + ')'; // close non extension capture group

const perlQuotes: Array<[string, string]> = [
    ['"', '"'], // Double quotes
    ["'", "'"], // single quotes
    ['`', '`'], // Backticks
    ['qw\\s*\\(', '\\)'], // qw
    ['qq\\s*\\(', '\\)'], // qq
    ['q\\s*\\(', '\\)'], // q
];

const insideQuoteChacterRegex = (quote: string): string => {
    // if is normal quote
    if (quote === '"' || quote === "'") {
        return `[^${quote}]`;
    } else {
        return '.';
    }
};

export const imageInPGFileRegex = new RegExp(
    [
        '(?<!#.*)(?:', // Comment, using non capture group to spread amongst or
        `(?:image\\s*\\(\\s*(${perlQuotes.map(perlQuote => `${perlQuote[0]}${httpNegativeLookAhead}.+?${perlQuote[1]}`).join('|')})\\s*(?:,(?:\\s|.)*?)?\\))`, // image call
        '|(', // pipe for regex or with capture non image, asset looking strings
        perlQuotes.map(perlQuote => `(?:${perlQuote[0]}${httpNegativeLookAhead}${insideQuoteChacterRegex(perlQuote[0])}*?\.${assetInPgFileExtensions}${perlQuote[1]})`).join('|'), // String check regex
        ')', // close asset looking strings
        ')', // end non capture group for negative look behind
    ].join(''), 'g'
);

export const dequotePerlQuotes = (input: string): string => {
    let result = input;
    perlQuotes.some(quote => {
        const insideRegex = new RegExp(`${quote[0]}(.*)${quote[1]}`, 'g');
        const quoteMatches = getAllMatches(insideRegex, input);
        if (quoteMatches.length > 1) {
            logger.warn(`findFilesFromPGFile: insideRegex expected 1 match but got ${quoteMatches.length}`);
        }
        // Will not be nil if different quotes
        const thisMatch = quoteMatches[0];
        if (!_.isNil(thisMatch)) {
            // index 1 should be first capture group, should not be nil
            if (_.isNil(thisMatch[1])) {
                logger.error(`findFilesFromPGFile: No capture group for quote ${quote[0]}`);
            } else {
                result = thisMatch[1];
            }
            // bow out
            return true;
        }
        return false;
    });
    return result;
};
