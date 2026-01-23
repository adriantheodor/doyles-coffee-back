#!/bin/bash

# ========================================
# RATE LIMITING TEST SCRIPT
# ========================================
# This script tests the rate limiting implementation on various endpoints

API_URL="http://localhost:4000"

echo "========================================"
echo "🚀 RATE LIMITING IMPLEMENTATION TEST"
echo "========================================"
echo ""

# Test 1: Test global rate limiting on a general endpoint
echo "Test 1️⃣: Global Rate Limiting (100 requests per 15 minutes)"
echo "Testing with multiple rapid requests to a GET endpoint..."
echo ""

# Test 2: Login rate limiting
echo "Test 2️⃣: Login Rate Limiting (5 attempts per 15 minutes)"
echo "Making multiple login requests..."
for i in {1..7}; do
  echo "Attempt $i:"
  curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
done

echo ""
echo "Test 3️⃣: Signup Rate Limiting (3 attempts per hour)"
echo "Making multiple signup requests..."
for i in {1..5}; do
  echo "Attempt $i:"
  curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"User$i\",\"email\":\"user$i@example.com\",\"password\":\"Test123!\"}" \
    -w "\nStatus: %{http_code}\n\n"
done

echo ""
echo "Test 4️⃣: Email Verification Resend Rate Limiting (3 attempts per 15 minutes)"
echo "Making multiple verification email requests..."
for i in {1..5}; do
  echo "Attempt $i:"
  curl -s -X POST "$API_URL/api/auth/resend-verification-email" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -w "\nStatus: %{http_code}\n\n"
done

echo ""
echo "========================================"
echo "✅ TEST COMPLETE"
echo "========================================"
echo ""
echo "Expected Results:"
echo "- 5+ login attempts: 429 (Too Many Requests)"
echo "- 3+ signup attempts: 429 (Too Many Requests)"
echo "- 3+ verification email requests: 429 (Too Many Requests)"
