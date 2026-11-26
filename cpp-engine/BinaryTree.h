#ifndef TREEVAULT_BINARY_TREE_H
#define TREEVAULT_BINARY_TREE_H

#include "JsonUtil.h"
#include <memory>
#include <string>
#include <vector>

namespace treevault {

struct TreeNode {
    std::string id;
    std::string label;
    std::unique_ptr<TreeNode> left;
    std::unique_ptr<TreeNode> right;

    TreeNode(std::string nodeId, std::string nodeLabel)
        : id(std::move(nodeId)), label(std::move(nodeLabel)), left(nullptr), right(nullptr) {}
};

struct TraversalItem {
    std::string id;
    std::string label;
};

struct StructuralComparisonResult {
    bool identical = false;
    std::string mismatchPath;
    std::string mismatchReason;
    std::string originalLabel;
    std::string restoredLabel;
};

struct OperationResult {
    bool ok = false;
    std::string errorCode;
    std::string message;
    int removedCount = 0;
};

class BinaryTree {
public:
    static constexpr int MAX_NODES = 2000;
    static constexpr size_t MAX_LABEL_LENGTH = 64;

    BinaryTree() = default;

    // Delete copy to enforce unique ownership; allow move
    BinaryTree(const BinaryTree&) = delete;
    BinaryTree& operator=(const BinaryTree&) = delete;
    BinaryTree(BinaryTree&&) noexcept = default;
    BinaryTree& operator=(BinaryTree&&) noexcept = default;

    void clear();
    bool isEmpty() const;
    const TreeNode* getRoot() const;

    // Tree construction and modification
    OperationResult setRoot(const std::string& label);
    OperationResult insertChild(const std::string& parentId, const std::string& side, const std::string& label);
    OperationResult editLabel(const std::string& nodeId, const std::string& newLabel);
    OperationResult deleteNode(const std::string& nodeId);

    // Import from JSON tree structure
    OperationResult loadFromJson(const JsonValue& jsonNode);

    // Replace root atomically (used by Serializer::deserialize)
    void assignRoot(std::unique_ptr<TreeNode> newRoot, int nextId);
    std::string generateNodeId();

    // Metrics
    int nodeCount() const;
    int height() const;
    int leafCount() const;

    // Traversals
    std::vector<TraversalItem> preorder() const;
    std::vector<TraversalItem> inorder() const;
    std::vector<TraversalItem> postorder() const;
    std::vector<TraversalItem> levelOrder() const;

    // Structural Equality
    static StructuralComparisonResult compareStructure(const BinaryTree& orig, const BinaryTree& rest);

    // JSON export
    std::string toTreeJson() const;
    std::string toMetricsAndTraversalsJson() const;

private:
    std::unique_ptr<TreeNode> root_;
    int nextIdCounter_ = 1;

    static int countNodesRec(const TreeNode* node);
    static int heightRec(const TreeNode* node);
    static int countLeavesRec(const TreeNode* node);
    static void preorderRec(const TreeNode* node, std::vector<TraversalItem>& out);
    static void inorderRec(const TreeNode* node, std::vector<TraversalItem>& out);
    static void postorderRec(const TreeNode* node, std::vector<TraversalItem>& out);
    static TreeNode* findNodeById(TreeNode* node, const std::string& id);
    static bool deleteChildRec(std::unique_ptr<TreeNode>& current, const std::string& targetId, int& removedCount);
    static void compareRec(const TreeNode* a, const TreeNode* b, const std::string& path, StructuralComparisonResult& res);
    static std::string nodeToJsonRec(const TreeNode* node);
    OperationResult buildFromJsonRec(const JsonValue& val, std::unique_ptr<TreeNode>& outNode, int& count);
};

} // namespace treevault

#endif // TREEVAULT_BINARY_TREE_H
