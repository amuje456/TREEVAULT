#include "Serializer.h"
#include <sstream>

namespace treevault {

void Serializer::serializeRec(
    const TreeNode* node,
    const std::string& parentId,
    const std::string& branch,
    std::vector<std::string>& tokens,
    std::vector<TraceStep>& trace
) {
    if (node == nullptr) {
        tokens.push_back("N");
        TraceStep step;
        step.step = static_cast<int>(trace.size() + 1);
        step.nodeId = "";
        step.nodeLabel = "NULL";
        step.parentId = parentId;
        step.branch = branch;
        step.operation = "EMIT_NULL";
        step.token = "N";
        if (parentId.empty()) {
            step.description = "Tree is empty (NULL root) -> emit null marker N";
        } else {
            step.description = branch + " child of parent is NULL -> emit null marker N";
        }
        step.tokensSoFar = tokens;
        trace.push_back(std::move(step));
        return;
    }

    std::string tok = "V:" + node->label;
    tokens.push_back(tok);

    TraceStep step;
    step.step = static_cast<int>(trace.size() + 1);
    step.nodeId = node->id;
    step.nodeLabel = node->label;
    step.parentId = parentId;
    step.branch = branch;
    step.operation = "VISIT_NODE";
    step.token = tok;
    if (branch == "root") {
        step.description = "Visit root node '" + node->label + "' -> emit " + tok;
    } else {
        step.description = "Visit " + branch + " child '" + node->label + "' -> emit " + tok;
    }
    step.tokensSoFar = tokens;
    trace.push_back(std::move(step));

    serializeRec(node->left.get(), node->id, "left", tokens, trace);
    serializeRec(node->right.get(), node->id, "right", tokens, trace);
}

SerializeResult Serializer::serialize(const BinaryTree& tree) {
    SerializeResult res;
    res.ok = true;
    res.nodeCount = tree.nodeCount();

    serializeRec(tree.getRoot(), "", "root", res.tokens, res.trace);
    res.tokenCount = static_cast<int>(res.tokens.size());

    std::ostringstream oss;
    oss << "TREEVAULT_V1\n";
    oss << "TOKENS: " << res.tokenCount << "\n\n";
    for (size_t i = 0; i < res.tokens.size(); ++i) {
        oss << res.tokens[i];
        if (i + 1 < res.tokens.size()) {
            oss << "\n";
        }
    }
    res.archiveText = oss.str();
    return res;
}

bool Serializer::deserializeRec(
    const std::vector<std::string>& tokens,
    size_t& index,
    int& nextNodeId,
    int& nodeCount,
    std::unique_ptr<TreeNode>& outNode,
    DeserializeResult& errOut
) {
    if (index >= tokens.size()) {
        errOut.ok = false;
        errOut.errorCode = "INCOMPLETE_TREE_STRUCTURE";
        errOut.ruleFailed = "Preorder Structural Completeness";
        errOut.message = "Unexpected end of token stream while reconstructing child branch. Missing 'N' null marker(s) or child node(s).";
        errOut.expectedTokens = static_cast<int>(tokens.size());
        errOut.receivedTokens = static_cast<int>(index);
        errOut.reconstructionPrevented = true;
        return false;
    }

    const std::string& tok = tokens[index++];
    if (tok == "N") {
        outNode.reset();
        return true;
    }

    if (tok.rfind("V:", 0) != 0) {
        errOut.ok = false;
        errOut.errorCode = "INVALID_TOKEN_PREFIX";
        errOut.ruleFailed = "Token Prefix Grammar";
        errOut.message = "Unexpected token '" + tok + "' during reconstruction.";
        errOut.reconstructionPrevented = true;
        return false;
    }

    if (nodeCount >= BinaryTree::MAX_NODES) {
        errOut.ok = false;
        errOut.errorCode = "MAX_NODES_EXCEEDED";
        errOut.ruleFailed = "Node Limit Enforcement (Max 2,000)";
        errOut.message = "Archive exceeds maximum supported limit of 2,000 nodes.";
        errOut.reconstructionPrevented = true;
        return false;
    }

    std::string label = tok.substr(2);
    auto node = std::make_unique<TreeNode>("n" + std::to_string(nextNodeId++), label);
    ++nodeCount;

    if (!deserializeRec(tokens, index, nextNodeId, nodeCount, node->left, errOut)) {
        return false;
    }
    if (!deserializeRec(tokens, index, nextNodeId, nodeCount, node->right, errOut)) {
        return false;
    }

    outNode = std::move(node);
    return true;
}

DeserializeResult Serializer::deserialize(const std::string& archiveText, BinaryTree& targetTree) {
    ValidationResult val = Validator::validateArchive(archiveText);
    if (!val.valid) {
        DeserializeResult err;
        err.ok = false;
        err.errorCode = val.errorCode;
        err.ruleFailed = val.ruleFailed;
        err.message = val.message;
        err.expectedTokens = val.expectedTokens;
        err.receivedTokens = val.receivedTokens;
        err.lineNumber = val.lineNumber;
        err.reconstructionPrevented = true;
        return err;
    }

    std::unique_ptr<TreeNode> tempRoot;
    size_t idx = 0;
    int nextId = 1;
    int nodeCount = 0;
    DeserializeResult errOut;
    errOut.expectedTokens = val.expectedTokens;
    errOut.receivedTokens = val.receivedTokens;

    if (!deserializeRec(val.tokens, idx, nextId, nodeCount, tempRoot, errOut)) {
        return errOut;
    }

    if (idx < val.tokens.size()) {
        DeserializeResult err;
        err.ok = false;
        err.errorCode = "EXTRA_TOKENS_AFTER_TREE";
        err.ruleFailed = "Preorder Stream Termination";
        err.message = "Tree reconstruction finished at token #" + std::to_string(idx) +
                      ", but " + std::to_string(val.tokens.size() - idx) +
                      " unconsumed token(s) remain in the archive.";
        err.expectedTokens = static_cast<int>(idx);
        err.receivedTokens = static_cast<int>(val.tokens.size());
        err.reconstructionPrevented = true;
        return err;
    }

    // Transactional commit: only replace targetTree once full validation & reconstruction succeed
    targetTree.assignRoot(std::move(tempRoot), nextId);

    DeserializeResult success;
    success.ok = true;
    success.expectedTokens = val.expectedTokens;
    success.receivedTokens = val.receivedTokens;
    success.restoredNodeCount = nodeCount;
    success.tokenCount = static_cast<int>(val.tokens.size());
    return success;
}

} // namespace treevault
