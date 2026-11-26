#include "Validator.h"
#include "BinaryTree.h"
#include <cctype>
#include <sstream>

namespace treevault {

bool Validator::isValidLabel(const std::string& label, std::string& outError) {
    if (label.empty()) {
        outError = "Node label cannot be empty.";
        return false;
    }
    bool allSpace = true;
    for (unsigned char c : label) {
        if (c == '\n' || c == '\r') {
            outError = "Node label cannot contain newline characters.";
            return false;
        }
        if (!std::isspace(c)) {
            allSpace = false;
        }
    }
    if (allSpace) {
        outError = "Node label cannot consist solely of whitespace.";
        return false;
    }
    if (label.size() > BinaryTree::MAX_LABEL_LENGTH) {
        outError = "Node label exceeds maximum length of 64 characters.";
        return false;
    }
    return true;
}

static std::string normalizeNewlines(const std::string& input) {
    std::string out;
    out.reserve(input.size());
    for (size_t i = 0; i < input.size(); ++i) {
        if (input[i] == '\r') {
            if (i + 1 < input.size() && input[i + 1] == '\n') {
                continue; // skip \r before \n
            }
            out.push_back('\n');
        } else {
            out.push_back(input[i]);
        }
    }
    return out;
}

static std::vector<std::string> splitLines(const std::string& text) {
    std::string norm = normalizeNewlines(text);
    if (!norm.empty() && norm.back() == '\n') {
        norm.pop_back();
    }
    std::vector<std::string> lines;
    std::string current;
    for (char c : norm) {
        if (c == '\n') {
            lines.push_back(current);
            current.clear();
        } else {
            current.push_back(c);
        }
    }
    lines.push_back(current);
    return lines;
}

ValidationResult Validator::validateArchive(const std::string& archiveText) {
    ValidationResult res;

    // Check empty or whitespace-only archive
    bool allWs = true;
    for (unsigned char c : archiveText) {
        if (!std::isspace(c)) {
            allWs = false;
            break;
        }
    }
    if (archiveText.empty() || allWs) {
        res.errorCode = "EMPTY_ARCHIVE";
        res.ruleFailed = "Archive Presence Check";
        res.message = "The archive input is empty. Expected TREEVAULT_V1 header and serialized tokens.";
        res.lineNumber = 1;
        return res;
    }

    std::vector<std::string> lines = splitLines(archiveText);

    // Rule 1: Header validation (Line 1)
    if (lines[0] != "TREEVAULT_V1") {
        if (lines[0].rfind("TREEVAULT_V", 0) == 0) {
            res.errorCode = "UNSUPPORTED_VERSION";
            res.ruleFailed = "Archive Version Check";
            res.message = "Unsupported archive version '" + lines[0] + "'. This engine supports only 'TREEVAULT_V1'.";
        } else {
            res.errorCode = "INVALID_HEADER";
            res.ruleFailed = "Archive Header Check";
            res.message = "Invalid archive header on line 1. Expected 'TREEVAULT_V1', found '" + lines[0] + "'.";
        }
        res.lineNumber = 1;
        return res;
    }

    // Rule 2: Token count header validation (Line 2)
    if (lines.size() < 2) {
        res.errorCode = "MISSING_TOKEN_COUNT_HEADER";
        res.ruleFailed = "Token Count Header Check";
        res.message = "Missing 'TOKENS: <count>' header on line 2.";
        res.lineNumber = 2;
        return res;
    }

    const std::string& countLine = lines[1];
    const std::string prefix = "TOKENS: ";
    if (countLine.rfind(prefix, 0) != 0 || countLine.size() <= prefix.size()) {
        res.errorCode = "INVALID_TOKEN_COUNT_HEADER";
        res.ruleFailed = "Token Count Header Syntax";
        res.message = "Invalid token count header on line 2. Expected 'TOKENS: <positive_integer>', found '" + countLine + "'.";
        res.lineNumber = 2;
        return res;
    }

    std::string numStr = countLine.substr(prefix.size());
    for (unsigned char c : numStr) {
        if (!std::isdigit(c)) {
            res.errorCode = "INVALID_TOKEN_COUNT_HEADER";
            res.ruleFailed = "Token Count Numeric Validation";
            res.message = "Token count value '" + numStr + "' on line 2 is not a valid non-negative integer.";
            res.lineNumber = 2;
            return res;
        }
    }

    long long parsedCount = 0;
    try {
        parsedCount = std::stoll(numStr);
    } catch (...) {
        res.errorCode = "TOKEN_COUNT_OUT_OF_RANGE";
        res.ruleFailed = "Token Count Range Validation";
        res.message = "Declared token count overflows integer range.";
        res.lineNumber = 2;
        return res;
    }

    const int maxTokens = 2 * BinaryTree::MAX_NODES + 1;
    if (parsedCount < 1 || parsedCount > maxTokens) {
        res.errorCode = "TOKEN_COUNT_OUT_OF_RANGE";
        res.ruleFailed = "Token Count Range Validation (1 to 4001)";
        res.message = "Declared token count (" + std::to_string(parsedCount) + ") is out of valid range [1, " + std::to_string(maxTokens) + "] for max 2,000 nodes.";
        res.expectedTokens = static_cast<int>(parsedCount);
        res.lineNumber = 2;
        return res;
    }

    res.expectedTokens = static_cast<int>(parsedCount);

    // Optional single blank separator line on line 3 (index 2)
    size_t tokenStartIdx = 2;
    if (tokenStartIdx < lines.size() && lines[tokenStartIdx].empty()) {
        tokenStartIdx = 3;
    }

    int actualCount = static_cast<int>(lines.size() - tokenStartIdx);
    res.receivedTokens = actualCount;

    // Validate token syntax on available lines first if a line itself is corrupt,
    // OR check token count mismatch cleanly. Checking syntax first if count <= expected
    // helps pinpoint corrupted prefixes/empty labels immediately, while count mismatch
    // gives exact expected vs received counts.
    for (size_t i = tokenStartIdx; i < lines.size(); ++i) {
        const std::string& tok = lines[i];
        int humanLine = static_cast<int>(i + 1);
        if (tok == "N") {
            res.tokens.push_back(tok);
        } else if (tok.rfind("V:", 0) == 0) {
            std::string label = tok.substr(2);
            std::string labelErr;
            if (!isValidLabel(label, labelErr)) {
                res.errorCode = "EMPTY_NODE_LABEL";
                res.ruleFailed = "Node Value Non-Empty Label Check";
                res.message = "Malformed node token on line " + std::to_string(humanLine) + ": " + labelErr;
                res.lineNumber = humanLine;
                return res;
            }
            res.tokens.push_back(tok);
        } else {
            res.errorCode = "INVALID_TOKEN_PREFIX";
            res.ruleFailed = "Token Prefix Grammar (V:<label> or N)";
            res.message = "Invalid token on line " + std::to_string(humanLine) + ": '" + tok + "'. Every token must be 'N' or start with 'V:'.";
            res.lineNumber = humanLine;
            return res;
        }
    }

    if (actualCount < res.expectedTokens) {
        res.errorCode = "MISSING_TOKENS";
        res.ruleFailed = "Token Count Integrity (Missing Tokens)";
        res.message = "Archive is truncated or incomplete. Header declared " + std::to_string(res.expectedTokens) +
                      " token(s), but only " + std::to_string(actualCount) + " token(s) were received.";
        res.lineNumber = static_cast<int>(lines.size());
        return res;
    }

    if (actualCount > res.expectedTokens) {
        res.errorCode = "EXTRA_TOKENS";
        res.ruleFailed = "Token Count Integrity (Extra Tokens)";
        res.message = "Archive contains unexpected trailing data. Header declared " + std::to_string(res.expectedTokens) +
                      " token(s), but " + std::to_string(actualCount) + " token(s) were received.";
        res.lineNumber = static_cast<int>(tokenStartIdx + res.expectedTokens + 1);
        return res;
    }

    res.valid = true;
    return res;
}

} // namespace treevault
