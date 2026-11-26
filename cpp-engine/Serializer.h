#ifndef TREEVAULT_SERIALIZER_H
#define TREEVAULT_SERIALIZER_H

#include "BinaryTree.h"
#include "Validator.h"
#include <string>
#include <vector>

namespace treevault {

struct TraceStep {
    int step = 0;
    std::string nodeId;
    std::string nodeLabel;
    std::string parentId;
    std::string branch;     // "root", "left", "right"
    std::string operation;  // "VISIT_NODE", "EMIT_NULL"
    std::string token;      // "V:A" or "N"
    std::string description;
    std::vector<std::string> tokensSoFar;
};

struct SerializeResult {
    bool ok = false;
    std::string archiveText;
    int tokenCount = 0;
    int nodeCount = 0;
    std::vector<std::string> tokens;
    std::vector<TraceStep> trace;
};

struct DeserializeResult {
    bool ok = false;
    std::string errorCode;
    std::string ruleFailed;
    std::string message;
    int expectedTokens = 0;
    int receivedTokens = 0;
    int lineNumber = 0;
    bool reconstructionPrevented = false;
    int restoredNodeCount = 0;
    int tokenCount = 0;
};

class Serializer {
public:
    static SerializeResult serialize(const BinaryTree& tree);
    static DeserializeResult deserialize(const std::string& archiveText, BinaryTree& targetTree);

private:
    static void serializeRec(
        const TreeNode* node,
        const std::string& parentId,
        const std::string& branch,
        std::vector<std::string>& tokens,
        std::vector<TraceStep>& trace
    );

    static bool deserializeRec(
        const std::vector<std::string>& tokens,
        size_t& index,
        int& nextNodeId,
        int& nodeCount,
        std::unique_ptr<TreeNode>& outNode,
        DeserializeResult& errOut
    );
};

} // namespace treevault

#endif // TREEVAULT_SERIALIZER_H
