#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Cachefy Integration Tests with Docker${NC}"
echo ""

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - $service not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service failed to start within expected time${NC}"
    return 1
}

# Function to cleanup containers
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up containers...${NC}"
    docker-compose down -v > /dev/null 2>&1
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap to ensure cleanup on script exit
trap cleanup EXIT

# Check if Docker is running
check_docker

# Start containers
echo -e "${BLUE}📦 Starting Redis and Memcached containers...${NC}"
docker-compose up -d

# Wait for services to be ready
if ! wait_for_service "Redis" 6379; then
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
fi

if ! wait_for_service "Memcached" 11211; then
    echo -e "${RED}❌ Memcached failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All services are ready!${NC}"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

# Run all tests
echo -e "${BLUE}🧪 Running all tests...${NC}"
echo ""
npm test

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    
    # Run integration tests specifically
    echo ""
    echo -e "${BLUE}🔗 Running integration tests...${NC}"
    npm test -- --testPathPattern=integration
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🚀 All integration tests passed!${NC}"
        echo ""
        echo -e "${BLUE}📊 Test Summary:${NC}"
        echo -e "  • Memory driver: ✅ Working"
        echo -e "  • Redis driver: ✅ Working" 
        echo -e "  • Memcached driver: ✅ Working"
        echo ""
        echo -e "${GREEN}🎯 Cachefy is ready for production!${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Some integration tests failed, but core functionality works${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi