#include "BinaryTree.h"
#include "JsonUtil.h"
#include "Serializer.h"
#include "Validator.h"

#include <cassert>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace treevault;

static std::string stringArrayToJson(const std::vector<std::string>& items) {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < items.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "\"" << escapeJson(items[i]) << "\"";
    }
    oss << "]";
    return oss.str();
}

static std::string traceToJson(const std::vector<TraceStep>& trace) {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < trace.size(); ++i) {
        const auto& s = trace[i];
        if (i > 0) oss << ",";
        oss << "{\"step\":" << s.step
            << ",\"nodeId\":\"" << escapeJson(s.nodeId) << "\""
            << ",\"nodeLabel\":\"" << escapeJson(s.nodeLabel) << "\""
            << ",\"parentId\":\"" << escapeJson(s.parentId) << "\""
            << ",\"branch\":\"" << escapeJson(s.branch) << "\""
            << ",\"operation\":\"" << escapeJson(s.operation) << "\""
            << ",\"token\":\"" << escapeJson(s.token) << "\""
            << ",\"description\":\"" << escapeJson(s.description) << "\""
            << ",\"tokensSoFar\":" << stringArrayToJson(s.tokensSoFar)
            << "}";
    }
    oss << "]";
    return oss.str();
}

static std::string treeBundleJson(const BinaryTree& tree) {
    std::ostringstream oss;
    oss << "{\"tree\":" << tree.toTreeJson()
        << ",\"metrics\":" << tree.toMetricsAndTraversalsJson() << "}";
    return oss.str();
}

static std::string makeErrorJson(const std::string& code, const std::string& message) {
    std::ostringstream oss;
    oss << "{\"ok\":false,\"errorCode\":\"" << escapeJson(code)
        << "\",\"message\":\"" << escapeJson(message) << "\"}";
    return oss.str();
}

// Parses bracket notation like A(B(,D),C) in C++
static std::string trimWs(const std::string& s) {
    size_t start = 0;
    while (start < s.size() && std::isspace(static_cast<unsigned char>(s[start]))) ++start;
    size_t end = s.size();
    while (end > start && std::isspace(static_cast<unsigned char>(s[end - 1]))) --end;
    return s.substr(start, end - start);
}

static bool parseBracketRec(
    const std::string& s,
    size_t& pos,
    int& nextId,
    int& count,
    std::unique_ptr<TreeNode>& outNode,
    std::string& errOut
) {
    while (pos < s.size() && std::isspace(static_cast<unsigned char>(s[pos]))) ++pos;
    if (pos >= s.size() || s[pos] == ',' || s[pos] == ')') {
        outNode.reset();
        return true;
    }

    size_t labelStart = pos;
    while (pos < s.size() && s[pos] != '(' && s[pos] != ')' && s[pos] != ',') {
        ++pos;
    }
    std::string label = trimWs(s.substr(labelStart, pos - labelStart));
    std::string labelErr;
    if (!Validator::isValidLabel(label, labelErr)) {
        errOut = labelErr;
        return false;
    }
    if (count >= BinaryTree::MAX_NODES) {
        errOut = "Tree exceeds maximum limit of 2,000 nodes.";
        return false;
    }

    auto node = std::make_unique<TreeNode>("n" + std::to_string(nextId++), label);
    ++count;

    while (pos < s.size() && std::isspace(static_cast<unsigned char>(s[pos]))) ++pos;
    if (pos < s.size() && s[pos] == '(') {
        ++pos; // consume '('
        if (!parseBracketRec(s, pos, nextId, count, node->left, errOut)) return false;
        while (pos < s.size() && std::isspace(static_cast<unsigned char>(s[pos]))) ++pos;
        if (pos < s.size() && s[pos] == ',') {
            ++pos; // consume ','
            if (!parseBracketRec(s, pos, nextId, count, node->right, errOut)) return false;
        }
        while (pos < s.size() && std::isspace(static_cast<unsigned char>(s[pos]))) ++pos;
        if (pos >= s.size() || s[pos] != ')') {
            errOut = "Missing closing ')' in bracket notation near position " + std::to_string(pos) + ".";
            return false;
        }
        ++pos; // consume ')'
    }

    outNode = std::move(node);
    return true;
}

static OperationResult importNotation(const std::string& mode, const std::string& input, BinaryTree& target) {
    std::string trimmed = trimWs(input);
    if (trimmed.empty()) {
        return {false, "EMPTY_INPUT", "Import text cannot be empty.", 0};
    }

    if (mode == "preorder_csv") {
        // Parse comma-separated tokens: A, B, N, D, N, N, C, N, N
        std::vector<std::string> lines;
        std::stringstream ss(trimmed);
        std::string item;
        while (std::getline(ss, item, ',')) {
            std::string tok = trimWs(item);
            if (tok.empty()) {
                return {false, "EMPTY_TOKEN", "Found an empty token between commas.", 0};
            }
            if (tok == "N" || tok == "null" || tok == "NULL") {
                lines.push_back("N");
            } else if (tok.rfind("V:", 0) == 0) {
                lines.push_back(tok);
            } else {
                lines.push_back("V:" + tok);
            }
        }
        std::ostringstream archive;
        archive << "TREEVAULT_V1\nTOKENS: " << lines.size() << "\n\n";
        for (size_t i = 0; i < lines.size(); ++i) {
            archive << lines[i];
            if (i + 1 < lines.size()) archive << "\n";
        }
        DeserializeResult dr = Serializer::deserialize(archive.str(), target);
        if (!dr.ok) {
            return {false, dr.errorCode, dr.message, 0};
        }
        return {true, "", "Imported preorder sequence with " + std::to_string(dr.restoredNodeCount) + " node(s).", 0};
    }

    // Default: bracket notation A(B(,D),C)
    size_t pos = 0;
    int nextId = 1;
    int count = 0;
    std::unique_ptr<TreeNode> tempRoot;
    std::string errOut;
    if (!parseBracketRec(trimmed, pos, nextId, count, tempRoot, errOut)) {
        return {false, "INVALID_BRACKET_SYNTAX", errOut, 0};
    }
    while (pos < trimmed.size() && std::isspace(static_cast<unsigned char>(trimmed[pos]))) ++pos;
    if (pos != trimmed.size()) {
        return {false, "TRAILING_INPUT", "Unexpected characters at position " + std::to_string(pos) + ": '" + trimmed.substr(pos) + "'.", 0};
    }
    if (!tempRoot) {
        return {false, "EMPTY_INPUT", "No root node found in bracket notation.", 0};
    }
    target.assignRoot(std::move(tempRoot), nextId);
    return {true, "", "Imported bracket tree with " + std::to_string(count) + " node(s).", 0};
}

static std::string handleCommand(const std::string& line, BinaryTree& originalTree, BinaryTree& restoredTree) {
    try {
        JsonValue req = JsonParser(line).parse();
        if (!req.isObject()) {
            return makeErrorJson("INVALID_REQUEST", "Request must be a JSON object.");
        }
        std::string cmd = req.getString("cmd");

        if (cmd == "ping") {
            return "{\"ok\":true,\"engine\":\"treevault-cpp\",\"maxNodes\":2000}";
        }

        if (cmd == "state") {
            std::ostringstream oss;
            oss << "{\"ok\":true,\"original\":" << treeBundleJson(originalTree)
                << ",\"restored\":" << treeBundleJson(restoredTree) << "}";
            return oss.str();
        }

        if (cmd == "create_tree") {
            const JsonValue* treeVal = req.get("tree");
            if (!treeVal) {
                return makeErrorJson("MISSING_TREE", "Missing 'tree' field.");
            }
            OperationResult res = originalTree.loadFromJson(*treeVal);
            if (!res.ok) {
                return makeErrorJson(res.errorCode, res.message);
            }
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"" << escapeJson(res.message)
                << "\",\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "import_text") {
            std::string mode = req.getString("mode", "bracket");
            std::string input = req.getString("input");
            OperationResult res = importNotation(mode, input, originalTree);
            if (!res.ok) {
                return makeErrorJson(res.errorCode, res.message);
            }
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"" << escapeJson(res.message)
                << "\",\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "add_root") {
            OperationResult res = originalTree.setRoot(req.getString("label"));
            if (!res.ok) return makeErrorJson(res.errorCode, res.message);
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"" << escapeJson(res.message)
                << "\",\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "insert_child") {
            OperationResult res = originalTree.insertChild(
                req.getString("parentId"),
                req.getString("side"),
                req.getString("label")
            );
            if (!res.ok) return makeErrorJson(res.errorCode, res.message);
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"" << escapeJson(res.message)
                << "\",\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "edit_label") {
            OperationResult res = originalTree.editLabel(req.getString("nodeId"), req.getString("label"));
            if (!res.ok) return makeErrorJson(res.errorCode, res.message);
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"" << escapeJson(res.message)
                << "\",\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "delete_node") {
            OperationResult res = originalTree.deleteNode(req.getString("nodeId"));
            if (!res.ok) return makeErrorJson(res.errorCode, res.message);
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"" << escapeJson(res.message)
                << "\",\"removedCount\":" << res.removedCount
                << ",\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "clear_original") {
            originalTree.clear();
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"Original in-memory C++ tree object destroyed and released.\","
                << "\"originalCleared\":true,\"original\":" << treeBundleJson(originalTree) << "}";
            return oss.str();
        }

        if (cmd == "clear_restored") {
            restoredTree.clear();
            std::ostringstream oss;
            oss << "{\"ok\":true,\"message\":\"Restored tree cleared.\","
                << "\"restored\":" << treeBundleJson(restoredTree) << "}";
            return oss.str();
        }

        if (cmd == "serialize") {
            SerializeResult sres = Serializer::serialize(originalTree);
            std::ostringstream oss;
            oss << "{\"ok\":true"
                << ",\"archiveText\":\"" << escapeJson(sres.archiveText) << "\""
                << ",\"tokenCount\":" << sres.tokenCount
                << ",\"nodeCount\":" << sres.nodeCount
                << ",\"tokens\":" << stringArrayToJson(sres.tokens)
                << ",\"trace\":" << traceToJson(sres.trace)
                << ",\"original\":" << treeBundleJson(originalTree)
                << "}";
            return oss.str();
        }

        if (cmd == "restore") {
            std::string archiveText = req.getString("archiveText");
            DeserializeResult dres = Serializer::deserialize(archiveText, restoredTree);
            if (!dres.ok) {
                std::ostringstream oss;
                oss << "{\"ok\":false"
                    << ",\"errorCode\":\"" << escapeJson(dres.errorCode) << "\""
                    << ",\"ruleFailed\":\"" << escapeJson(dres.ruleFailed) << "\""
                    << ",\"message\":\"" << escapeJson(dres.message) << "\""
                    << ",\"expectedTokens\":" << dres.expectedTokens
                    << ",\"receivedTokens\":" << dres.receivedTokens
                    << ",\"lineNumber\":" << dres.lineNumber
                    << ",\"reconstructionPrevented\":" << (dres.reconstructionPrevented ? "true" : "false")
                    << "}";
                return oss.str();
            }
            std::ostringstream oss;
            oss << "{\"ok\":true"
                << ",\"message\":\"Tree successfully validated and reconstructed from archive text.\""
                << ",\"tokenCount\":" << dres.tokenCount
                << ",\"restoredNodeCount\":" << dres.restoredNodeCount
                << ",\"restored\":" << treeBundleJson(restoredTree)
                << "}";
            return oss.str();
        }

        if (cmd == "verify") {
            BinaryTree referenceTemp;
            const BinaryTree* compareBase = &originalTree;
            bool usedReferenceSnapshot = false;

            if (const JsonValue* expectedTreeVal = req.get("expectedTree")) {
                if (!expectedTreeVal->isNull() || originalTree.isEmpty()) {
                    OperationResult loadRes = referenceTemp.loadFromJson(*expectedTreeVal);
                    if (!loadRes.ok) {
                        return makeErrorJson(loadRes.errorCode, loadRes.message);
                    }
                    compareBase = &referenceTemp;
                    usedReferenceSnapshot = true;
                }
            }

            StructuralComparisonResult cmp = BinaryTree::compareStructure(*compareBase, restoredTree);
            auto origPre = compareBase->preorder();
            auto restPre = restoredTree.preorder();
            auto origIn = compareBase->inorder();
            auto restIn = restoredTree.inorder();

            auto labelsEqual = [](const std::vector<TraversalItem>& a, const std::vector<TraversalItem>& b) {
                if (a.size() != b.size()) return false;
                for (size_t i = 0; i < a.size(); ++i) {
                    if (a[i].label != b[i].label) return false;
                }
                return true;
            };

            bool preMatch = labelsEqual(origPre, restPre);
            bool inMatch = labelsEqual(origIn, restIn);
            bool passed = cmp.identical && preMatch && inMatch;

            std::ostringstream oss;
            oss << "{\"ok\":true"
                << ",\"identical\":" << (cmp.identical ? "true" : "false")
                << ",\"passed\":" << (passed ? "true" : "false")
                << ",\"preorderMatch\":" << (preMatch ? "true" : "false")
                << ",\"inorderMatch\":" << (inMatch ? "true" : "false")
                << ",\"usedReferenceSnapshot\":" << (usedReferenceSnapshot ? "true" : "false")
                << ",\"mismatchPath\":\"" << escapeJson(cmp.mismatchPath) << "\""
                << ",\"mismatchReason\":\"" << escapeJson(cmp.mismatchReason) << "\""
                << ",\"originalLabel\":\"" << escapeJson(cmp.originalLabel) << "\""
                << ",\"restoredLabel\":\"" << escapeJson(cmp.restoredLabel) << "\""
                << ",\"original\":" << treeBundleJson(*compareBase)
                << ",\"restored\":" << treeBundleJson(restoredTree)
                << "}";
            return oss.str();
        }

        return makeErrorJson("UNKNOWN_COMMAND", "Unknown engine command '" + cmd + "'.");
    } catch (const std::exception& ex) {
        return makeErrorJson("ENGINE_EXCEPTION", ex.what());
    }
}

// =========================================================================
// AUTOMATED C++ TEST SUITE (--test)
// Covers tests A through J from the specification
// =========================================================================
static std::string joinLabels(const std::vector<TraversalItem>& items) {
    std::string out;
    for (size_t i = 0; i < items.size(); ++i) {
        if (i > 0) out += ", ";
        out += items[i].label;
    }
    return out;
}

static int runAllTests() {
    int passed = 0;
    int failed = 0;

    auto report = [&](const std::string& name, bool ok, const std::string& detail) {
        if (ok) {
            ++passed;
            std::cout << "[PASS] " << name << " — " << detail << "\n";
        } else {
            ++failed;
            std::cout << "[FAIL] " << name << " — " << detail << "\n";
        }
    };

    // Test A: Normal Tree (Illustrative Example: A -> B(right:D), C)
    {
        BinaryTree orig;
        orig.setRoot("A");
        orig.insertChild("n1", "left", "B");
        orig.insertChild("n1", "right", "C");
        orig.insertChild("n2", "right", "D");

        SerializeResult s = Serializer::serialize(orig);
        orig.clear(); // Destroy original!
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);

        BinaryTree expected;
        expected.setRoot("A");
        expected.insertChild("n1", "left", "B");
        expected.insertChild("n1", "right", "C");
        expected.insertChild("n2", "right", "D");
        auto cmp = BinaryTree::compareStructure(expected, rest);

        std::string pre = joinLabels(rest.preorder());
        std::string in = joinLabels(rest.inorder());
        bool ok = d.ok && cmp.identical && pre == "A, B, D, C" && in == "B, D, A, C" && s.tokenCount == 9;
        report("Test A: Normal Tree (Illustrative Example)", ok,
               "Tokens=" + std::to_string(s.tokenCount) + ", Pre=[" + pre + "], In=[" + in + "]");
    }

    // Test B: Left-Only Skewed Tree (A -> B -> C)
    {
        BinaryTree orig;
        orig.setRoot("A");
        orig.insertChild("n1", "left", "B");
        orig.insertChild("n2", "left", "C");
        SerializeResult s = Serializer::serialize(orig);
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(orig, rest);
        bool ok = d.ok && cmp.identical && rest.getRoot()->right == nullptr && rest.getRoot()->left->left->label == "C";
        report("Test B: Left-Only Tree", ok, "Pre=[" + joinLabels(rest.preorder()) + "], In=[" + joinLabels(rest.inorder()) + "]");
    }

    // Test C: Right-Only Skewed Tree (A -> right B -> right C)
    {
        BinaryTree orig;
        orig.setRoot("A");
        orig.insertChild("n1", "right", "B");
        orig.insertChild("n2", "right", "C");
        SerializeResult s = Serializer::serialize(orig);
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(orig, rest);
        bool ok = d.ok && cmp.identical && rest.getRoot()->left == nullptr && rest.getRoot()->right->right->label == "C";
        report("Test C: Right-Only Tree", ok, "Pre=[" + joinLabels(rest.preorder()) + "], In=[" + joinLabels(rest.inorder()) + "]");
    }

    // Test D: Mixed Tree (alternating left/right missing branches)
    {
        BinaryTree orig;
        orig.setRoot("Root");
        orig.insertChild("n1", "left", "L1");
        orig.insertChild("n1", "right", "R1");
        orig.insertChild("n2", "right", "L1_R");
        orig.insertChild("n3", "left", "R1_L");
        orig.insertChild("n4", "left", "L1_R_L");
        SerializeResult s = Serializer::serialize(orig);
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(orig, rest);
        bool ok = d.ok && cmp.identical && rest.nodeCount() == 6 && rest.height() == 4;
        report("Test D: Mixed Tree", ok, "Nodes=" + std::to_string(rest.nodeCount()) + ", Height=" + std::to_string(rest.height()));
    }

    // Test E: Single Node Tree
    {
        BinaryTree orig;
        orig.setRoot("Solo");
        SerializeResult s = Serializer::serialize(orig);
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(orig, rest);
        bool ok = d.ok && cmp.identical && s.tokenCount == 3 && rest.nodeCount() == 1 && rest.leafCount() == 1;
        report("Test E: Single Node Tree", ok, "Tokens=" + std::to_string(s.tokenCount));
    }

    // Test F: Empty Tree
    {
        BinaryTree orig;
        SerializeResult s = Serializer::serialize(orig);
        BinaryTree rest;
        rest.setRoot("Previous"); // verify transactional replacement to empty
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(orig, rest);
        bool ok = d.ok && cmp.identical && rest.isEmpty() && s.tokenCount == 1;
        report("Test F: Empty Tree", ok, "Tokens=" + std::to_string(s.tokenCount) + ", isEmpty=true");
    }

    // Test G: Duplicate Labels (identical labels at different structural positions)
    {
        BinaryTree orig;
        orig.setRoot("X");
        orig.insertChild("n1", "left", "X");
        orig.insertChild("n1", "right", "X");
        orig.insertChild("n2", "right", "X");
        // Label literally named "N" must NOT collide with null marker N!
        orig.insertChild("n3", "left", "N");
        SerializeResult s = Serializer::serialize(orig);
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(orig, rest);
        bool ok = d.ok && cmp.identical && rest.nodeCount() == 5 && rest.getRoot()->right->left->label == "N";
        report("Test G: Duplicate Labels & Literal 'N' Label", ok, "Nodes=" + std::to_string(rest.nodeCount()));
    }

    // Test H: Damaged Archives (missing tokens, invalid header, unsupported version, empty label, incomplete structure)
    {
        BinaryTree rest;
        rest.setRoot("KeepIntact");
        DeserializeResult d1 = Serializer::deserialize("TREEVAULT_V1\nTOKENS: 9\n\nV:A\nV:B\nN", rest);
        DeserializeResult d2 = Serializer::deserialize("BAD_HEADER\nTOKENS: 1\n\nN", rest);
        DeserializeResult d3 = Serializer::deserialize("TREEVAULT_V2\nTOKENS: 1\n\nN", rest);
        DeserializeResult d4 = Serializer::deserialize("TREEVAULT_V1\nTOKENS: 3\n\nV:\nN\nN", rest);
        DeserializeResult d5 = Serializer::deserialize("TREEVAULT_V1\nTOKENS: 3\n\nV:A\nV:B\nN", rest);
        bool ok = !d1.ok && d1.errorCode == "MISSING_TOKENS" &&
                  !d2.ok && d2.errorCode == "INVALID_HEADER" &&
                  !d3.ok && d3.errorCode == "UNSUPPORTED_VERSION" &&
                  !d4.ok && d4.errorCode == "EMPTY_NODE_LABEL" &&
                  !d5.ok && d5.errorCode == "INCOMPLETE_TREE_STRUCTURE" &&
                  rest.nodeCount() == 1 && rest.getRoot()->label == "KeepIntact";
        report("Test H: Damaged Archives & Transactional Rollback", ok, "All 5 damaged formats rejected; existing tree untouched");
    }

    // Test I: Extra Tokens (both header mismatch and leftover after root)
    {
        BinaryTree rest;
        DeserializeResult d1 = Serializer::deserialize("TREEVAULT_V1\nTOKENS: 3\n\nV:A\nN\nN\nN", rest);
        DeserializeResult d2 = Serializer::deserialize("TREEVAULT_V1\nTOKENS: 5\n\nV:A\nN\nN\nV:B\nN", rest);
        bool ok = !d1.ok && d1.errorCode == "EXTRA_TOKENS" && !d2.ok && d2.errorCode == "EXTRA_TOKENS_AFTER_TREE" && rest.isEmpty();
        report("Test I: Extra Tokens Detection", ok, "Detected both count overflow and post-root leftover tokens");
    }

    // Test J: Maximum 2,000-Node Limit (2,000 passes; 2,001 rejected)
    {
        BinaryTree maxTree;
        maxTree.setRoot("N1");
        std::string lastId = "n1";
        for (int i = 2; i <= 2000; ++i) {
            auto r = maxTree.insertChild(lastId, (i % 2 == 0) ? "left" : "right", "N" + std::to_string(i));
            if (!r.ok) {
                report("Test J: 2,000-Node Stress Test", false, "Failed inserting node " + std::to_string(i));
                return 1;
            }
            lastId = "n" + std::to_string(i);
        }
        auto overLimit = maxTree.insertChild(lastId, "left", "N2001");
        SerializeResult s = Serializer::serialize(maxTree);
        BinaryTree rest;
        DeserializeResult d = Serializer::deserialize(s.archiveText, rest);
        auto cmp = BinaryTree::compareStructure(maxTree, rest);
        bool ok = !overLimit.ok && overLimit.errorCode == "MAX_NODES_EXCEEDED" &&
                  d.ok && cmp.identical && rest.nodeCount() == 2000 && s.tokenCount == 4001;
        report("Test J: Maximum 2,000-Node Skewed Round-Trip & Overflow Guard", ok,
               "Nodes=" + std::to_string(rest.nodeCount()) + ", Tokens=" + std::to_string(s.tokenCount));
    }

    std::cout << "\nSummary: " << passed << " passed, " << failed << " failed.\n";
    return failed == 0 ? 0 : 1;
}

int main(int argc, char* argv[]) {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    if (argc >= 2 && std::string(argv[1]) == "--test") {
        return runAllTests();
    }

    BinaryTree originalTree;
    BinaryTree restoredTree;

    if (argc >= 3 && std::string(argv[1]) == "--cli") {
        std::cout << handleCommand(argv[2], originalTree, restoredTree) << "\n";
        return 0;
    }

    // Default or --daemon: newline-delimited JSON RPC loop over stdin/stdout
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        std::string resp = handleCommand(line, originalTree, restoredTree);
        std::cout << resp << "\n" << std::flush;
    }
    return 0;
}
