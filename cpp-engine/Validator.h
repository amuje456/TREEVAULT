#ifndef TREEVAULT_VALIDATOR_H
#define TREEVAULT_VALIDATOR_H

#include <string>
#include <vector>

namespace treevault {

struct ValidationResult {
    bool valid = false;
    std::string errorCode;
    std::string ruleFailed;
    std::string message;
    int expectedTokens = 0;
    int receivedTokens = 0;
    int lineNumber = 0;
    std::vector<std::string> tokens;
};

class Validator {
public:
    static bool isValidLabel(const std::string& label, std::string& outError);
    static ValidationResult validateArchive(const std::string& archiveText);
};

} // namespace treevault

#endif // TREEVAULT_VALIDATOR_H
