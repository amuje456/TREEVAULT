#ifndef TREEVAULT_JSON_UTIL_H
#define TREEVAULT_JSON_UTIL_H

#include <cctype>
#include <iomanip>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace treevault {

enum class JsonType { Null, Bool, Number, String, Array, Object };

struct JsonValue {
    JsonType type = JsonType::Null;
    bool boolVal = false;
    double numVal = 0.0;
    std::string strVal;
    std::vector<JsonValue> arrVal;
    std::map<std::string, JsonValue> objVal;

    bool isNull() const { return type == JsonType::Null; }
    bool isBool() const { return type == JsonType::Bool; }
    bool isNumber() const { return type == JsonType::Number; }
    bool isString() const { return type == JsonType::String; }
    bool isArray() const { return type == JsonType::Array; }
    bool isObject() const { return type == JsonType::Object; }

    std::string getString(const std::string& key, const std::string& def = "") const {
        if (type != JsonType::Object) return def;
        auto it = objVal.find(key);
        if (it != objVal.end() && it->second.isString()) return it->second.strVal;
        return def;
    }

    bool hasKey(const std::string& key) const {
        if (type != JsonType::Object) return false;
        return objVal.find(key) != objVal.end();
    }

    const JsonValue* get(const std::string& key) const {
        if (type != JsonType::Object) return nullptr;
        auto it = objVal.find(key);
        if (it == objVal.end()) return nullptr;
        return &it->second;
    }
};

inline std::string escapeJson(const std::string& s) {
    std::ostringstream oss;
    for (unsigned char c : s) {
        switch (c) {
            case '"': oss << "\\\""; break;
            case '\\': oss << "\\\\"; break;
            case '\b': oss << "\\b"; break;
            case '\f': oss << "\\f"; break;
            case '\n': oss << "\\n"; break;
            case '\r': oss << "\\r"; break;
            case '\t': oss << "\\t"; break;
            default:
                if (c < 0x20) {
                    oss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c) << std::dec;
                } else {
                    oss << static_cast<char>(c);
                }
        }
    }
    return oss.str();
}

class JsonParser {
public:
    explicit JsonParser(const std::string& src) : s_(src), pos_(0) {}

    JsonValue parse() {
        skipWs();
        JsonValue val = parseValue();
        skipWs();
        if (pos_ != s_.size()) {
            throw std::runtime_error("Trailing characters in JSON input");
        }
        return val;
    }

private:
    const std::string& s_;
    size_t pos_;

    void skipWs() {
        while (pos_ < s_.size() && std::isspace(static_cast<unsigned char>(s_[pos_]))) {
            ++pos_;
        }
    }

    char peek() const {
        if (pos_ >= s_.size()) throw std::runtime_error("Unexpected end of JSON");
        return s_[pos_];
    }

    char get() {
        char c = peek();
        ++pos_;
        return c;
    }

    JsonValue parseValue() {
        skipWs();
        char c = peek();
        if (c == '{') return parseObject();
        if (c == '[') return parseArray();
        if (c == '"') {
            JsonValue v;
            v.type = JsonType::String;
            v.strVal = parseString();
            return v;
        }
        if (c == 't') {
            expectLiteral("true");
            JsonValue v;
            v.type = JsonType::Bool;
            v.boolVal = true;
            return v;
        }
        if (c == 'f') {
            expectLiteral("false");
            JsonValue v;
            v.type = JsonType::Bool;
            v.boolVal = false;
            return v;
        }
        if (c == 'n') {
            expectLiteral("null");
            return JsonValue{};
        }
        if (c == '-' || std::isdigit(static_cast<unsigned char>(c))) {
            return parseNumber();
        }
        throw std::runtime_error("Invalid JSON value");
    }

    void expectLiteral(const char* lit) {
        for (const char* p = lit; *p; ++p) {
            if (get() != *p) throw std::runtime_error("Invalid JSON literal");
        }
    }

    std::string parseString() {
        if (get() != '"') throw std::runtime_error("Expected '\"'");
        std::string out;
        while (pos_ < s_.size()) {
            char c = get();
            if (c == '"') return out;
            if (c == '\\') {
                char esc = get();
                switch (esc) {
                    case '"': out.push_back('"'); break;
                    case '\\': out.push_back('\\'); break;
                    case '/': out.push_back('/'); break;
                    case 'b': out.push_back('\b'); break;
                    case 'f': out.push_back('\f'); break;
                    case 'n': out.push_back('\n'); break;
                    case 'r': out.push_back('\r'); break;
                    case 't': out.push_back('\t'); break;
                    case 'u': {
                        if (pos_ + 4 > s_.size()) throw std::runtime_error("Invalid unicode escape");
                        unsigned int code = 0;
                        for (int i = 0; i < 4; ++i) {
                            char h = get();
                            code <<= 4;
                            if (h >= '0' && h <= '9') code |= (h - '0');
                            else if (h >= 'a' && h <= 'f') code |= (h - 'a' + 10);
                            else if (h >= 'A' && h <= 'F') code |= (h - 'A' + 10);
                            else throw std::runtime_error("Invalid hex in unicode escape");
                        }
                        if (code <= 0x7F) {
                            out.push_back(static_cast<char>(code));
                        } else if (code <= 0x7FF) {
                            out.push_back(static_cast<char>(0xC0 | (code >> 6)));
                            out.push_back(static_cast<char>(0x80 | (code & 0x3F)));
                        } else {
                            out.push_back(static_cast<char>(0xE0 | (code >> 12)));
                            out.push_back(static_cast<char>(0x80 | ((code >> 6) & 0x3F)));
                            out.push_back(static_cast<char>(0x80 | (code & 0x3F)));
                        }
                        break;
                    }
                    default: throw std::runtime_error("Unknown JSON escape");
                }
            } else {
                out.push_back(c);
            }
        }
        throw std::runtime_error("Unterminated JSON string");
    }

    JsonValue parseNumber() {
        size_t start = pos_;
        if (s_[pos_] == '-') ++pos_;
        while (pos_ < s_.size() && (std::isdigit(static_cast<unsigned char>(s_[pos_])) || s_[pos_] == '.' || s_[pos_] == 'e' || s_[pos_] == 'E' || s_[pos_] == '+' || s_[pos_] == '-')) {
            ++pos_;
        }
        JsonValue v;
        v.type = JsonType::Number;
        v.numVal = std::stod(s_.substr(start, pos_ - start));
        return v;
    }

    JsonValue parseArray() {
        get(); // '['
        JsonValue v;
        v.type = JsonType::Array;
        skipWs();
        if (peek() == ']') {
            get();
            return v;
        }
        while (true) {
            v.arrVal.push_back(parseValue());
            skipWs();
            char c = get();
            if (c == ']') break;
            if (c != ',') throw std::runtime_error("Expected ',' or ']' in JSON array");
        }
        return v;
    }

    JsonValue parseObject() {
        get(); // '{'
        JsonValue v;
        v.type = JsonType::Object;
        skipWs();
        if (peek() == '}') {
            get();
            return v;
        }
        while (true) {
            skipWs();
            std::string key = parseString();
            skipWs();
            if (get() != ':') throw std::runtime_error("Expected ':' in JSON object");
            v.objVal[key] = parseValue();
            skipWs();
            char c = get();
            if (c == '}') break;
            if (c != ',') throw std::runtime_error("Expected ',' or '}' in JSON object");
        }
        return v;
    }
};

} // namespace treevault

#endif // TREEVAULT_JSON_UTIL_H
