
/**
 * Converts spoken number phrases into digits.
 * Handles:
 * - "zero" to "nine" -> 0-9
 * - "double X" -> XX
 * - "triple X" -> XXX
 * - Spaced digits "one two three" -> "123"
 */
export function parseSpokenPhoneNumber(text: string): string {
    const numberMap: Record<string, string> = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'shunya': '0', 'ek': '1', 'don': '2', 'teen': '3', 'char': '4',
        'paach': '5', 'saha': '6', 'saat': '7', 'aath': '8', 'nau': '9',
        'dash': '-'
    };

    let processed = text.toLowerCase();

    // Handle "double <number>" and "triple <number>"
    // This regex looks for 'double' or 'triple' followed by a number word or digit
    processed = processed.replace(/(double|triple)\s+(\w+)/g, (match, multiplier, numberWord) => {
        let digit = numberMap[numberWord];
        // If not in map, maybe it's already a digit like "5"
        if (!digit && /^\d$/.test(numberWord)) {
            digit = numberWord;
        }

        if (digit) {
            const count = multiplier === 'double' ? 2 : 3;
            return digit.repeat(count);
        }
        return match; // Return original if not a number
    });

    // now replace all remaining number words with digits
    Object.keys(numberMap).forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        processed = processed.replace(regex, numberMap[word]);
    });

    // Remove non-digit characters (preserving specific symbols if needed, but for phone usually just digits)
    // However, user might speak mixed content "My phone is 123", so we extract digits?
    // Or just clean up what we have? 
    // Let's just strip non-digit/non-plus/non-dash characters to be safe for a phone field
    // But sometimes voice input returns "Call me at..." -> we want just the number.
    // For now, let's just return the text with digits replacing words, user can edit rest.
    // Actually, for a phone input, we usually want to strip everything else.

    // Simple heuristic: if the field is strictly phone, filter to allowed chars.
    const allowedChars = /[0-9+\-\s]/g;
    const matches = processed.match(allowedChars);
    if (matches) {
        return matches.join('').replace(/\s+/g, '');
    }

    return text; // Fallback
}
