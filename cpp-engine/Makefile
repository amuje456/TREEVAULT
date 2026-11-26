CXX = g++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra -pedantic

TARGET = treevault_engine
SRCS = main.cpp BinaryTree.cpp Serializer.cpp Validator.cpp
OBJS = $(SRCS:.cpp=.o)

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRCS)

test: $(TARGET)
	./$(TARGET) --test

clean:
	rm -f $(TARGET) $(OBJS)
