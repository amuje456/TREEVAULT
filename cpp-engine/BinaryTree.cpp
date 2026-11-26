#include "BinaryTree.h"
#include "Validator.h"
#include <algorithm>
#include <queue>
#include <sstream>

namespace treevault {

void BinaryTree::clear() {
    root_.reset();
    nextIdCounter_ = 1;
}

bool BinaryTree::isEmpty() const {
    return root_ == nullptr;
}

const TreeNode* BinaryTree::getRoot() const {
    return root_.get();
}

std::string BinaryTree::generateNodeId() {
    return "n" + std::to_string(nextIdCounter_++);
}

void BinaryTree::assignRoot(std::unique_ptr<TreeNode> newRoot, int nextId) {
    root_ = std::move(newRoot);
    nextIdCounter_ = nextId;
}

OperationResult BinaryTree::setRoot(const std::string& label) {
    std::string cleanErr;
    if (!Validator::isValidLabel(label, cleanErr)) {
        return {false, "INVALID_LABEL", cleanErr, 0};
    }
    if (root_ != nullptr) {
        return {false, "ROOT_EXISTS", "Root node already exists. Select a node to add children or edit its label.", 0};
    }
    root_ = std::make_unique<TreeNode>(generateNodeId(), label);
    return {true, "", "Root node '" + label + "' created.", 0};
}

TreeNode* BinaryTree::findNodeById(TreeNode* node, const std::string& id) {
    if (!node) return nullptr;
    if (node->id == id) return node;
    if (TreeNode* foundLeft = findNodeById(node->left.get(), id)) return foundLeft;
    return findNodeById(node->right.get(), id);
}

OperationResult BinaryTree::insertChild(const std::string& parentId, const std::string& side, const std::string& label) {
    std::string cleanErr;
    if (!Validator::isValidLabel(label, cleanErr)) {
        return {false, "INVALID_LABEL", cleanErr, 0};
    }
    if (side != "left" && side != "right") {
        return {false, "INVALID_SIDE", "Child branch must be 'left' or 'right'.", 0};
    }
    if (!root_) {
        return {false, "EMPTY_TREE", "Cannot add child to an empty tree. Add a root node first.", 0};
    }
    if (nodeCount() >= MAX_NODES) {
        return {false, "MAX_NODES_EXCEEDED", "Maximum supported node limit (2000) reached.", 0};
    }

    TreeNode* parent = findNodeById(root_.get(), parentId);
    if (!parent) {
        return {false, "PARENT_NOT_FOUND", "Selected parent node '" + parentId + "' does not exist.", 0};
    }

    if (side == "left") {
        if (parent->left != nullptr) {
            return {false, "CHILD_ALREADY_EXISTS", "Parent '" + parent->label + "' already has a left child.", 0};
        }
        parent->left = std::make_unique<TreeNode>(generateNodeId(), label);
    } else {
        if (parent->right != nullptr) {
            return {false, "CHILD_ALREADY_EXISTS", "Parent '" + parent->label + "' already has a right child.", 0};
        }
        parent->right = std::make_unique<TreeNode>(generateNodeId(), label);
    }

    return {true, "", "Inserted " + side + " child '" + label + "' under '" + parent->label + "'.", 0};
}

OperationResult BinaryTree::editLabel(const std::string& nodeId, const std::string& newLabel) {
    std::string cleanErr;
    if (!Validator::isValidLabel(newLabel, cleanErr)) {
        return {false, "INVALID_LABEL", cleanErr, 0};
    }
    TreeNode* target = findNodeById(root_.get(), nodeId);
    if (!target) {
        return {false, "NODE_NOT_FOUND", "Target node '" + nodeId + "' not found.", 0};
    }
    std::string old = target->label;
    target->label = newLabel;
    return {true, "", "Updated node '" + old + "' to '" + newLabel + "'.", 0};
}

bool BinaryTree::deleteChildRec(std::unique_ptr<TreeNode>& current, const std::string& targetId, int& removedCount) {
    if (!current) return false;
    if (current->id == targetId) {
        removedCount = countNodesRec(current.get());
        current.reset();
        return true;
    }
    if (deleteChildRec(current->left, targetId, removedCount)) return true;
    return deleteChildRec(current->right, targetId, removedCount);
}

OperationResult BinaryTree::deleteNode(const std::string& nodeId) {
    if (!root_) {
        return {false, "EMPTY_TREE", "Tree is already empty.", 0};
    }
    int removed = 0;
    if (!deleteChildRec(root_, nodeId, removed)) {
        return {false, "NODE_NOT_FOUND", "Node '" + nodeId + "' does not exist.", 0};
    }
    return {true, "", "Deleted subtree containing " + std::to_string(removed) + " node(s).", removed};
}

OperationResult BinaryTree::buildFromJsonRec(const JsonValue& val, std::unique_ptr<TreeNode>& outNode, int& count) {
    if (val.isNull()) {
        outNode.reset();
        return {true, "", "", 0};
    }
    if (!val.isObject()) {
        return {false, "INVALID_TREE_JSON", "Each node must be a JSON object or null.", 0};
    }
    if (count >= MAX_NODES) {
        return {false, "MAX_NODES_EXCEEDED", "Imported tree exceeds the 2000-node limit.", 0};
    }
    std::string label = val.getString("label");
    std::string cleanErr;
    if (!Validator::isValidLabel(label, cleanErr)) {
        return {false, "INVALID_LABEL", cleanErr, 0};
    }

    auto node = std::make_unique<TreeNode>(generateNodeId(), label);
    ++count;

    if (const JsonValue* leftVal = val.get("left")) {
        auto res = buildFromJsonRec(*leftVal, node->left, count);
        if (!res.ok) return res;
    }
    if (const JsonValue* rightVal = val.get("right")) {
        auto res = buildFromJsonRec(*rightVal, node->right, count);
        if (!res.ok) return res;
    }
    outNode = std::move(node);
    return {true, "", "", 0};
}

OperationResult BinaryTree::loadFromJson(const JsonValue& jsonNode) {
    int prevCounter = nextIdCounter_;
    nextIdCounter_ = 1;
    std::unique_ptr<TreeNode> tempRoot;
    int count = 0;
    OperationResult res = buildFromJsonRec(jsonNode, tempRoot, count);
    if (!res.ok) {
        nextIdCounter_ = prevCounter;
        return res;
    }
    root_ = std::move(tempRoot);
    return {true, "", "Constructed binary tree with " + std::to_string(count) + " node(s).", 0};
}

int BinaryTree::countNodesRec(const TreeNode* node) {
    if (!node) return 0;
    return 1 + countNodesRec(node->left.get()) + countNodesRec(node->right.get());
}

int BinaryTree::nodeCount() const {
    return countNodesRec(root_.get());
}

int BinaryTree::heightRec(const TreeNode* node) {
    if (!node) return 0;
    return 1 + std::max(heightRec(node->left.get()), heightRec(node->right.get()));
}

int BinaryTree::height() const {
    return heightRec(root_.get());
}

int BinaryTree::countLeavesRec(const TreeNode* node) {
    if (!node) return 0;
    if (!node->left && !node->right) return 1;
    return countLeavesRec(node->left.get()) + countLeavesRec(node->right.get());
}

int BinaryTree::leafCount() const {
    return countLeavesRec(root_.get());
}

void BinaryTree::preorderRec(const TreeNode* node, std::vector<TraversalItem>& out) {
    if (!node) return;
    out.push_back({node->id, node->label});
    preorderRec(node->left.get(), out);
    preorderRec(node->right.get(), out);
}

std::vector<TraversalItem> BinaryTree::preorder() const {
    std::vector<TraversalItem> out;
    preorderRec(root_.get(), out);
    return out;
}

void BinaryTree::inorderRec(const TreeNode* node, std::vector<TraversalItem>& out) {
    if (!node) return;
    inorderRec(node->left.get(), out);
    out.push_back({node->id, node->label});
    inorderRec(node->right.get(), out);
}

std::vector<TraversalItem> BinaryTree::inorder() const {
    std::vector<TraversalItem> out;
    inorderRec(root_.get(), out);
    return out;
}

void BinaryTree::postorderRec(const TreeNode* node, std::vector<TraversalItem>& out) {
    if (!node) return;
    postorderRec(node->left.get(), out);
    postorderRec(node->right.get(), out);
    out.push_back({node->id, node->label});
}

std::vector<TraversalItem> BinaryTree::postorder() const {
    std::vector<TraversalItem> out;
    postorderRec(root_.get(), out);
    return out;
}

std::vector<TraversalItem> BinaryTree::levelOrder() const {
    std::vector<TraversalItem> out;
    if (!root_) return out;
    std::queue<const TreeNode*> q;
    q.push(root_.get());
    while (!q.empty()) {
        const TreeNode* curr = q.front();
        q.pop();
        out.push_back({curr->id, curr->label});
        if (curr->left) q.push(curr->left.get());
        if (curr->right) q.push(curr->right.get());
    }
    return out;
}

void BinaryTree::compareRec(const TreeNode* a, const TreeNode* b, const std::string& path, StructuralComparisonResult& res) {
    if (!res.identical) return;
    if (a == nullptr && b == nullptr) {
        return;
    }
    if (a == nullptr && b != nullptr) {
        res.identical = false;
        res.mismatchPath = path;
        res.mismatchReason = "Original branch at '" + path + "' is NULL, but restored tree has node '" + b->label + "'.";
        res.originalLabel = "NULL";
        res.restoredLabel = b->label;
        return;
    }
    if (a != nullptr && b == nullptr) {
        res.identical = false;
        res.mismatchPath = path;
        res.mismatchReason = "Original tree has node '" + a->label + "' at '" + path + "', but restored branch is NULL.";
        res.originalLabel = a->label;
        res.restoredLabel = "NULL";
        return;
    }
    if (a->label != b->label) {
        res.identical = false;
        res.mismatchPath = path;
        res.mismatchReason = "Label mismatch at '" + path + "': expected '" + a->label + "', got '" + b->label + "'.";
        res.originalLabel = a->label;
        res.restoredLabel = b->label;
        return;
    }
    compareRec(a->left.get(), b->left.get(), path + ".left", res);
    compareRec(a->right.get(), b->right.get(), path + ".right", res);
}

StructuralComparisonResult BinaryTree::compareStructure(const BinaryTree& orig, const BinaryTree& rest) {
    StructuralComparisonResult res;
    res.identical = true;
    compareRec(orig.getRoot(), rest.getRoot(), "root", res);
    return res;
}

std::string BinaryTree::nodeToJsonRec(const TreeNode* node) {
    if (!node) return "null";
    std::ostringstream oss;
    oss << "{\"id\":\"" << escapeJson(node->id) << "\","
        << "\"label\":\"" << escapeJson(node->label) << "\","
        << "\"left\":" << nodeToJsonRec(node->left.get()) << ","
        << "\"right\":" << nodeToJsonRec(node->right.get()) << "}";
    return oss.str();
}

std::string BinaryTree::toTreeJson() const {
    return nodeToJsonRec(root_.get());
}

static std::string traversalToJson(const std::vector<TraversalItem>& items) {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < items.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "{\"id\":\"" << escapeJson(items[i].id) << "\",\"label\":\"" << escapeJson(items[i].label) << "\"}";
    }
    oss << "]";
    return oss.str();
}

std::string BinaryTree::toMetricsAndTraversalsJson() const {
    std::ostringstream oss;
    oss << "{\"isEmpty\":" << (isEmpty() ? "true" : "false") << ","
        << "\"nodeCount\":" << nodeCount() << ","
        << "\"height\":" << height() << ","
        << "\"leafCount\":" << leafCount() << ","
        << "\"preorder\":" << traversalToJson(preorder()) << ","
        << "\"inorder\":" << traversalToJson(inorder()) << ","
        << "\"postorder\":" << traversalToJson(postorder()) << ","
        << "\"levelOrder\":" << traversalToJson(levelOrder()) << "}";
    return oss.str();
}

} // namespace treevault
