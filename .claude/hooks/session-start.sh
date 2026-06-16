#!/bin/bash
set -euo pipefail

# Lead Generation Tool - Session Start Hook
# Installs dependencies and checks environment configuration

echo "🚀 Lead Generation Tool - Starting session..."

# Install npm dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "✅ Dependencies already installed"
fi

# Check and report environment configuration
echo ""
echo "🔍 Environment Configuration Check:"
echo "=================================="

# Check for Supabase
if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "⚠️  NEXT_PUBLIC_SUPABASE_URL - NOT SET (required for Supabase)"
else
  echo "✅ NEXT_PUBLIC_SUPABASE_URL - SET"
fi

if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY - NOT SET (required)"
else
  echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY - SET"
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "⚠️  SUPABASE_SERVICE_ROLE_KEY - NOT SET (required for server-side)"
else
  echo "✅ SUPABASE_SERVICE_ROLE_KEY - SET"
fi

# Check for AI providers
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "⚠️  No AI provider key found (ANTHROPIC_API_KEY or OPENAI_API_KEY)"
else
  if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    echo "✅ ANTHROPIC_API_KEY - SET"
  fi
  if [ -n "${OPENAI_API_KEY:-}" ]; then
    echo "✅ OPENAI_API_KEY - SET"
  fi
fi

# Check for OAuth (optional)
if [ -z "${LINKEDIN_CLIENT_ID:-}" ]; then
  echo "ℹ️  LINKEDIN_CLIENT_ID - NOT SET (optional for OAuth)"
else
  echo "✅ LINKEDIN_CLIENT_ID - SET"
fi

if [ -z "${HUBSPOT_CLIENT_ID:-}" ]; then
  echo "ℹ️  HUBSPOT_CLIENT_ID - NOT SET (optional for OAuth)"
else
  echo "✅ HUBSPOT_CLIENT_ID - SET"
fi

echo ""
echo "=================================="
echo "✅ Session ready!"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev       (start development server)"
echo "2. Run: npm run build     (production build)"
echo "3. Run: npm run lint      (check code quality)"
echo ""
echo "Missing required env vars? Add them to:"
echo "- .env.local (local development)"
echo "- Vercel project settings (production)"
