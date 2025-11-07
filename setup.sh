#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  RAG Chatbot - Setup Script"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose is installed${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your OPENAI_API_KEY${NC}"
    echo ""
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Check if Node.js is installed (for local development)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js is installed: ${NODE_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js is not installed (required for local development)${NC}"
fi

# Create necessary directories
echo ""
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p .cache
echo -e "${GREEN}✅ Directories created${NC}"

# Build Docker images
echo ""
echo -e "${YELLOW}🏗️  Building Docker images...${NC}"
docker-compose build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker images built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Docker images${NC}"
    exit 1
fi

# Start services
echo ""
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Services started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi

# Wait for services to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check health
echo ""
echo -e "${YELLOW}🏥 Checking service health...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API is responding${NC}"
    echo ""
    echo "=========================================="
    echo "  Setup Complete! 🎉"
    echo "=========================================="
    echo ""
    echo "📍 Access points:"
    echo "   - UI:      http://localhost:3000"
    echo "   - API:     http://localhost:3000/api"
    echo "   - Qdrant:  http://localhost:6333"
    echo ""
    echo "🔧 Useful commands:"
    echo "   - View logs:    docker-compose logs -f rag-api"
    echo "   - Stop:         docker-compose down"
    echo "   - Restart:      docker-compose restart"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Visit http://localhost:3000"
    echo "   2. Upload documents (password: adrigdeva)"
    echo "   3. Start chatting!"
    echo ""
else
    echo -e "${RED}❌ API is not responding${NC}"
    echo "Please check logs: docker-compose logs -f rag-api"
    exit 1
fi
