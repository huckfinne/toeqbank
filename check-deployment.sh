#!/bin/bash

echo "Checking TOEQbank deployment status..."
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check backend health
echo "1. Checking Backend API..."
if curl -s https://toeqbank-wxhxl.ondigitalocean.app/api/health > /dev/null 2>&1; then
    HEALTH=$(curl -s https://toeqbank-wxhxl.ondigitalocean.app/api/health)
    echo -e "${GREEN}✓ Backend is running${NC}"
    echo "   Response: $HEALTH"
else
    echo -e "${RED}✗ Backend is not responding${NC}"
fi

echo ""

# Check frontend
echo "2. Checking Frontend..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://toeqbank-wxhxl.ondigitalocean.app/)
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ Frontend returned HTTP $HTTP_STATUS${NC}"
fi

echo ""

# Test login endpoint
echo "3. Testing Login Endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST https://toeqbank-wxhxl.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"huckfinne","password":"admin123"}' \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Login endpoint is working (HTTP $HTTP_CODE)${NC}"
    echo "   You can now login with username: huckfinne, password: admin123"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${YELLOW}⚠ Login endpoint working but credentials rejected (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
elif [ -z "$HTTP_CODE" ]; then
    echo -e "${RED}✗ Login endpoint is not responding${NC}"
else
    echo -e "${RED}✗ Login endpoint returned HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi

echo ""
echo "======================================="
echo "Deployment check complete!"