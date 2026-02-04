#!/bin/bash

# ==========================================
# SIPWise Project Reorganization Script
# Run this in your project root directory
# ==========================================

echo "🚀 Starting SIPWise project reorganization..."

# Create new directory structure
mkdir -p assets/css
mkdir -p assets/js
mkdir -p assets/images
mkdir -p docs/screenshots

echo "✅ Created directory structure"

# Move CSS files
mv style.css assets/css/ 2>/dev/null
mv portfolio-style.css assets/css/ 2>/dev/null
mv onboarding.css assets/css/ 2>/dev/null

echo "✅ Moved CSS files"

# Move JavaScript files
mv script.js assets/js/ 2>/dev/null
mv portfolio-script.js assets/js/ 2>/dev/null
mv portfolio-enhancements.js assets/js/ 2>/dev/null
mv portfolio-onboarding-fixed.js assets/js/ 2>/dev/null
mv onboarding.js assets/js/ 2>/dev/null

echo "✅ Moved JavaScript files"

# Move images
mv favicon.ico assets/images/ 2>/dev/null

echo "✅ Moved image files"

# HTML files stay in root
# (index.html, portfolio.html, about.html, etc.)

echo "✅ HTML files remain in root"

echo ""
echo "📁 New Project Structure:"
echo "├── index.html"
echo "├── portfolio.html"
echo "├── about.html"
echo "├── contact.html"
echo "├── pricing.html"
echo "├── privacy.html"
echo "├── README.md"
echo "│"
echo "├── assets/"
echo "│   ├── css/"
echo "│   │   ├── style.css"
echo "│   │   ├── portfolio-style.css"
echo "│   │   └── onboarding.css"
echo "│   │"
echo "│   ├── js/"
echo "│   │   ├── script.js"
echo "│   │   ├── portfolio-script.js"
echo "│   │   ├── portfolio-enhancements.js"
echo "│   │   ├── portfolio-onboarding-fixed.js"
echo "│   │   └── onboarding.js"
echo "│   │"
echo "│   └── images/"
echo "│       └── favicon.ico"
echo "│"
echo "└── docs/"
echo "    └── screenshots/"

echo ""
echo "⚠️  IMPORTANT: Update all HTML files to use new paths!"
echo "   Example: <link rel='stylesheet' href='assets/css/style.css'>"
echo "   Example: <script src='assets/js/script.js'></script>"
echo ""
echo "🎉 Reorganization complete!"